"""Application service: attempts, submissions, hints and the learner model, independent of HTTP."""

from __future__ import annotations

import collections
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from codequest.analysis.detectors import Finding
from codequest import extension
from codequest.analysis.probe import Counterexample, find_counterexample
from codequest.content import Challenge, public_challenge
from codequest.hints import LadderState, code_hash, gate, leak_check, max_level, safe_hint
from codequest.judge import JudgeResult, MistakeEvent, SubmissionTooLarge, TestOutcome, judge
from codequest.learner import (LEVEL_PRIOR, LearnerState, attempt_score, concept_bands, finish_attempt, next_up,
                               record_mistakes, start_attempt)
from codequest import portfolio
from codequest.ai import AILayer
from codequest.sandbox.runner import Runner
from codequest.store import Store

RATE_PER_MINUTE = 6
MAX_CODE_CHARS = 64 * 1024


class ServiceError(Exception):
    def __init__(self, status: int, message: str, **extra: Any):
        super().__init__(message)
        self.status = status
        self.message = message
        self.extra = extra


class RateLimiter:
    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self._hits: dict[str, collections.deque] = collections.defaultdict(collections.deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > 60:
                hits.popleft()
            if len(hits) >= self.per_minute:
                retry = int(60 - (now - hits[0])) + 1
                raise ServiceError(429, "Too many submissions. Take a breath and read the feedback first.",
                                   retry_after=retry)
            hits.append(now)


def _seed_state(persona: str) -> LearnerState:
    state = LearnerState(prior=LEVEL_PRIOR["basics"])
    if persona == "priya":
        # One earlier off-by-one, so the next one makes it a recurring mistake (the demo moment).
        start_attempt(state)
        record_mistakes(state, ["off_by_one"])
    return state


class CodeQuestService:
    def __init__(self, store: Store, runner: Runner, challenges: dict[str, Challenge], workers: int = 2):
        self.store = store
        self.runner = runner
        self.challenges = challenges
        self._pool = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="judge")
        self._user_locks: dict[str, threading.Lock] = collections.defaultdict(threading.Lock)
        self._submit_limit = RateLimiter(RATE_PER_MINUTE)
        self.ai = AILayer()  # off unless an API key is configured
        self.fetchers = portfolio.FETCHERS  # tests swap in fakes; no network in CI

    def shutdown(self) -> None:
        self._pool.shutdown(wait=True)

    # ------------------------------------------------------------------ sessions
    def create_session(self, persona: str | None, name: str | None) -> dict[str, Any]:
        persona = (persona or "guest").lower()
        if persona not in {"priya", "guest"}:
            raise ServiceError(400, "Unknown persona.")
        display = (name or ("Priya" if persona == "priya" else "Guest")).strip()[:40] or "Guest"
        state = _seed_state(persona)
        if persona == "priya" and "total" in self.challenges:
            finish_attempt(state, self.challenges["total"], 0.55)
        user = self.store.create_user(display, state.to_dict())
        return {"token": user["token"], "user": {"id": user["id"], "name": display,
                                                 "handle": portfolio.public_handle(user)}}

    def user(self, token: str | None) -> dict[str, Any]:
        if not token:
            raise ServiceError(401, "Missing session token.")
        user = self.store.user_by_token(token)
        if user is None:
            raise ServiceError(401, "Unknown or expired session.")
        return user

    def _state(self, user: dict[str, Any]) -> LearnerState:
        return LearnerState.from_dict(json.loads(user["state"]))

    def _challenge(self, challenge_id: str) -> Challenge:
        ch = self.challenges.get(challenge_id)
        if ch is None:
            raise ServiceError(404, "Unknown mission.")
        return ch

    def check_rate(self, user: dict[str, Any]) -> None:
        self._submit_limit.check(user["id"])

    # ------------------------------------------------------------------ challenges
    def list_challenges(self, user: dict[str, Any]) -> list[dict[str, Any]]:
        state = self._state(user)
        out = []
        for ch in self.challenges.values():
            view = public_challenge(ch)
            out.append({k: view[k] for k in ("id", "type", "tier", "title", "concepts", "hidden_test_count")}
                       | {"solved": ch.id in state.solved})
        return out

    def get_challenge(self, challenge_id: str) -> dict[str, Any]:
        ch = self._challenge(challenge_id)
        return public_challenge(ch) | {"max_hint_level": max_level(ch)}

    # ------------------------------------------------------------------ submissions
    def submit(self, user: dict[str, Any], challenge_id: str, code: str) -> dict[str, Any]:
        ch = self._challenge(challenge_id)
        if not isinstance(code, str) or not code.strip():
            raise ServiceError(400, "Write some code before submitting.")
        if len(code) > MAX_CODE_CHARS:
            raise ServiceError(413, "Submission is larger than 64 KiB.")
        self._submit_limit.check(user["id"])
        with self._user_locks[user["id"]]:
            attempt = self.store.open_attempt(user["id"], ch.id)
            if attempt is None:
                attempt = self.store.create_attempt(user["id"], ch.id)
                state = self._state(self.store.user_by_token(user["token"]) or user)
                start_attempt(state)
                self.store.save_state(user["id"], state.to_dict())
            sid = self.store.create_submission(user["id"], attempt["id"], ch.id, code)
        self._pool.submit(self._process, sid, user["id"], user["token"], attempt["id"], ch, code)
        return {"submission_id": sid, "status": "queued", "hidden_test_count": len(ch.hidden_tests),
                "visible_test_count": len(ch.visible_tests)}

    def _process(self, sid: str, user_id: str, token: str, attempt_id: str, ch: Challenge, code: str) -> None:
        try:
            self.store.set_status(sid, "running")
            result = judge(ch, code, self.runner)
            events = self._apply_learning(user_id, token, attempt_id, ch, result)
            public = result.public() | {"events": events}
            self.store.finish_submission(sid, "done", public, _internal(result))
        except SubmissionTooLarge as exc:
            self.store.finish_submission(sid, "error", {"error": str(exc)}, None)
        except Exception:  # noqa: BLE001 - never leave a submission stuck; infra errors are not the learner's fault
            self.store.finish_submission(sid, "error", {"error": "System error while judging. This is not your fault; please resubmit."}, None)

    def _apply_learning(self, user_id: str, token: str, attempt_id: str, ch: Challenge,
                        result: JudgeResult) -> dict[str, Any]:
        with self._user_locks[user_id]:
            user = self.store.user_by_token(token)
            assert user is not None
            state = self._state(user)
            attempt = self.store.attempt(attempt_id)
            assert attempt is not None
            newly = record_mistakes(state, [m.key for m in result.mistakes])
            events: dict[str, Any] = {"mistakes": [m.key for m in result.mistakes], "newly_recurring": newly,
                                      "solved": False, "skill_changes": {}, "adaptation": None}
            failed = int(attempt["failed"]) + (0 if result.all_passed else 1)
            best = max(float(attempt["best_hidden"]), result.hidden_pass_fraction())
            if result.all_passed:
                ladder = LadderState.from_dict(_json(attempt["ladder"]))
                score = attempt_score(1.0, ladder.unlocked, int(attempt["failed"]))
                events["skill_changes"] = finish_attempt(state, ch, score)
                events["solved"] = True
                events["score"] = score
                self.store.update_attempt(attempt_id, open=0, failed=failed, best_hidden=best)
            else:
                self.store.update_attempt(attempt_id, failed=failed, best_hidden=best)
            if newly:
                events["adaptation"] = self._adaptation(state, newly)
            self.store.save_state(user_id, state.to_dict())
            return events

    def _adaptation(self, state: LearnerState, newly: list[str]) -> dict[str, Any]:
        mission = next((c for c in self.challenges.values()
                        if c.type == "debug" and c.id not in state.solved and set(newly) & set(c.traps)), None)
        return {
            "recurring": newly,
            "debug_mission": {"id": mission.id, "title": mission.title} if mission else None,
            "next_up": next_up(state, self.challenges),
            "preflight": [f"Before you submit: {_preflight(k)}" for k in newly],
        }

    def get_submission(self, user: dict[str, Any], sid: str) -> dict[str, Any]:
        sub = self.store.submission(sid)
        if sub is None or sub["user_id"] != user["id"]:
            raise ServiceError(404, "Unknown submission.")
        view = {"submission_id": sid, "status": sub["status"], "challenge_id": sub["challenge_id"]}
        if sub["result"]:
            view["result"] = _json(sub["result"])
        return view

    # ------------------------------------------------------------------ hints
    def hint(self, user: dict[str, Any], challenge_id: str) -> dict[str, Any]:
        ch = self._challenge(challenge_id)
        with self._user_locks[user["id"]]:
            attempt = self.store.open_attempt(user["id"], ch.id)
            if attempt is None:
                raise ServiceError(409, "Submit an attempt first; hints respond to your code.")
            latest = self.store.latest_submission(attempt["id"])
            if latest is None:
                raise ServiceError(409, "Wait for your submission to be judged first.")
            result_view = _json(latest["result"]) or {}
            if result_view.get("all_passed"):
                raise ServiceError(409, "All tests pass. No hint needed.")
            ladder = LadderState.from_dict(_json(attempt["ladder"]))
            status = gate(ladder, ch, latest["code"])
            if not status["available"]:
                raise ServiceError(423, status["reason"], **status)
            level = status["next_level"]
            internal = _json(latest["internal"]) or {}
            restored = _restore(ch, internal)
            counterexample = None
            if level >= 2:
                counterexample = _counterexample_from(internal)
                if counterexample is None and "counterexample" not in internal:
                    counterexample = find_counterexample(ch, latest["code"], self.runner)
                    internal["counterexample"] = _ce_dict(counterexample)
                    self.store.update_internal(latest["id"], internal)
            previous = [h["text"] for h in ladder.shown]
            hint = safe_hint(level, ch, restored, latest["code"], counterexample, previous)
            # optional wording pass: same leak guard over everything shown so far, template on any doubt
            worded = self.ai.rephrase(hint.text, ch.description,
                                      lambda t: leak_check([*previous, t], ch, latest["code"])[0])
            if worded:
                hint.text, hint.source = worded, "ai"
            ladder.unlocked = level
            ladder.unlocked_at = time.time()
            ladder.code_hash_at_unlock = code_hash(latest["code"])
            ladder.shown.append({"level": hint.level, "title": hint.title, "text": hint.text,
                                 "region": list(hint.region) if hint.region else None, "source": hint.source})
            self.store.update_attempt(attempt["id"], ladder=ladder.to_dict())
            return {"hint": ladder.shown[-1], "ladder": ladder.shown, "max_level": max_level(ch),
                    "next": gate(ladder, ch, latest["code"])}

    def hint_state(self, user: dict[str, Any], challenge_id: str) -> dict[str, Any]:
        ch = self._challenge(challenge_id)
        attempt = self.store.open_attempt(user["id"], ch.id)
        if attempt is None:
            return {"ladder": [], "max_level": max_level(ch), "next": None}
        ladder = LadderState.from_dict(_json(attempt["ladder"]))
        latest = self.store.latest_submission(attempt["id"])
        return {"ladder": ladder.shown, "max_level": max_level(ch),
                "next": gate(ladder, ch, latest["code"]) if latest else None}

    # ------------------------------------------------------------------ profile
    def me(self, user: dict[str, Any]) -> dict[str, Any]:
        state = self._state(user)
        return {
            "user": {"id": user["id"], "name": user["name"], "handle": portfolio.public_handle(user)},
            "skills": concept_bands(state, self.challenges),
            "mistakes": {
                "recurring": state.recurring,
                "beaten": state.beaten,
                "strength": state.mistakes,
                "history": state.history,
            },
            "solved": state.solved,
            "next_up": next_up(state, self.challenges),
        }


    # ------------------------------------------------------------------ portfolio
    def portfolio(self, handle: str) -> dict[str, Any]:
        prefix = portfolio.handle_id_prefix(handle)
        matches = [u for u in self.store.users_by_id_prefix(prefix or "") if portfolio.public_handle(u) == handle] \
            if prefix else []
        if not matches:
            raise ServiceError(404, "No portfolio with that handle.")
        user = matches[0]
        state = self._state(user)
        bands = concept_bands(state, self.challenges)
        hints = sum(len(_json(a["ladder"]).get("shown", [])) for a in self.store.user_attempts(user["id"])
                    if a["ladder"])
        solved = state.solved
        debug_solved = [c for c in solved if c in self.challenges and self.challenges[c].type == "debug"]
        imports = {}
        for row in self.store.imports_for(user["id"]):
            imports[row["platform"]] = {"status": row["status"], "handle": row["handle"], "error": row["error"],
                                        "fetched": row["fetched"], **(row["data"] or {})}
        return {
            "handle": handle,
            "name": user["name"],
            "verified": {
                "concepts": [b for b in bands if b["attempts"] or b["verified"]],
                "all_concepts": bands,
                "mistakes": portfolio.mistakes_timeline(state.history, state.recurring, state.beaten),
                "stats": {"solved": len(solved), "missions_total": len(self.challenges),
                          "hints_per_solve": round(hints / len(solved), 2) if solved else None,
                          "debug_missions": len(debug_solved), "attempts": state.attempts},
                "solved": [{"id": c, "title": self.challenges[c].title, "tier": self.challenges[c].tier}
                           for c in solved if c in self.challenges],
            },
            "imports": imports,
            "typing": self.store.typing_summary(user["id"]),
        }

    def request_import(self, user: dict[str, Any], platform: str, handle: str) -> dict[str, Any]:
        if platform not in portfolio.PLATFORMS:
            raise ServiceError(400, "Unsupported platform.")
        if not portfolio.HANDLE_RE.match(handle or ""):
            raise ServiceError(400, "That doesn't look like a valid handle.")
        self.check_rate(user)
        if portfolio.is_fresh(self.store.get_import(user["id"], platform), handle):
            return {"status": "cached"}
        self._pool.submit(portfolio.refresh_import, self.store, user["id"], platform, handle, self.fetchers)
        return {"status": "queued"}

    def typing_result(self, user: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
        self.store.add_typing_result(user["id"], body["snippet_id"], body.get("concept"), body["cpm"],
                                     body["accuracy"], body["duration_ms"], body.get("errors", {}))
        return self.store.typing_summary(user["id"]) or {}

    # ------------------------------------------------------------------ LeetCode Companion
    def create_pairing_code(self, user: dict[str, Any]) -> dict[str, Any]:
        return {"code": self.store.create_pairing_code(user["id"]), "expires_in_s": 600}

    def pair_extension(self, code: str) -> dict[str, Any]:
        paired = self.store.redeem_pairing_code(code)
        if paired is None or paired["user"] is None:
            raise ServiceError(400, "That pairing code is invalid or has expired. Get a new one from CodeQuest.")
        return {"token": paired["token"], "user": {"id": paired["user"]["id"], "name": paired["user"]["name"]}}

    def ext_user(self, token: str | None) -> dict[str, Any]:
        user = self.store.user_by_ext_token(token) if token else None
        if user is None:
            raise ServiceError(401, "The extension is not connected. Pair it with a code from CodeQuest.")
        return user

    def ext_sync(self, user: dict[str, Any], slug: str, tags: list[str], verdict: str, code: str) -> dict[str, Any]:
        """Record a LeetCode attempt. Mistakes count only when a static finding meets a failed verdict."""
        analysis = extension.analyze(code)
        keys = sorted({f["key"] for f in analysis["findings"]}) if verdict != "accepted" else []
        with self._user_locks[user["id"]]:
            fresh = self.store.user_by_token(user["token"]) or user
            state = self._state(fresh)
            start_attempt(state)
            newly = record_mistakes(state, keys)
            self.store.save_state(user["id"], state.to_dict())
        return {"recorded_mistakes": keys, "newly_recurring": newly, "concepts": extension.concepts_for_tags(tags),
                "slug": slug}


# ---------------------------------------------------------------------- serialisation helpers

def _json(text: str | None) -> Any:
    return json.loads(text) if text else None


def _internal(result: JudgeResult) -> dict[str, Any]:
    crash = next((o.line for o in result.outcomes if o.visibility == "visible" and o.line), None)
    return {
        "findings": [{"key": f.key, "line": f.line, "message": f.message, "end_line": f.end_line,
                      "blank": list(f.blank) if f.blank else None} for f in result.findings],
        "mistakes": [{"key": m.key, "evidence": m.evidence, "line": m.line} for m in result.mistakes],
        "crash_line": crash,
    }


def _restore(ch: Challenge, internal: dict[str, Any]) -> JudgeResult:
    findings = [Finding(f["key"], f["line"], f["message"], f.get("end_line"),
                        tuple(f["blank"]) if f.get("blank") else None) for f in internal.get("findings", [])]
    mistakes = [MistakeEvent(m["key"], m["evidence"], m.get("line")) for m in internal.get("mistakes", [])]
    outcomes = []
    if internal.get("crash_line"):
        outcomes.append(TestOutcome("crash", 1, "visible", "runtime_error", ["typical"], "typical case",
                                    line=internal["crash_line"]))
    return JudgeResult(ch.id, outcomes, findings, mistakes)


def _ce_dict(ce: Counterexample | None) -> dict[str, Any] | None:
    if ce is None:
        return None
    return {"args": ce.args, "expected": ce.expected, "got": ce.got, "error": ce.error}


def _counterexample_from(internal: dict[str, Any]) -> Counterexample | None:
    data = internal.get("counterexample")
    if not data:
        return None
    return Counterexample(data["args"], data["expected"], data.get("got"), data.get("error"))


def _preflight(key: str) -> str:
    return {
        "off_by_one": "check the first and the last position your loop visits.",
        "empty_input": "what does your function return for an empty input?",
        "infinite_loop": "does every path through your loop move toward the exit?",
        "print_vs_return": "does your function return its answer instead of printing it?",
        "base_case": "which input stops your recursion?",
        "bad_initial_value": "would your starting value still work if every number were negative?",
        "mutate_while_iterating": "are you changing a list while looping over it?",
        "missing_return": "does every path end with a return?",
    }.get(key, "re-read your code on the smallest possible input.")
