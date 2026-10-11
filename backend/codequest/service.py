"""Application service: attempts, submissions, hints and the learner model, independent of HTTP."""

from __future__ import annotations

import collections
import json
import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from codequest.analysis.detectors import Finding
from codequest import extension
from codequest.analysis.probe import Counterexample, ProbeReport, find_counterexample, probe
from codequest.compare import short_repr
from codequest.content import Challenge, public_challenge
from codequest.hints import LadderState, code_hash, gate, leak_check, max_level, safe_hint
from codequest.judge import JudgeResult, MistakeEvent, SubmissionTooLarge, TestOutcome, judge
from codequest.learner import (LEVEL_PRIOR, VERIFIED_SCORE, LearnerState, attempt_score, concept_bands, finish_attempt,
                               next_up, record_mistakes, record_prediction, start_attempt)
from codequest import demo_seed, insights, journey, portfolio, predict, roadmap, typing_drills
from codequest.ai import AILayer
from codequest.companion_chat import CHAT_MODEL_DEFAULT, ChatRequest, CompanionTutor
from codequest.sandbox.runner import Runner
from codequest.store import Store

log = logging.getLogger("codequest.service")

RATE_PER_MINUTE = 6
CHAT_PER_MINUTE = 30        # all tutor messages (rule replies are free, this only protects the server)
CHAT_AI_PER_MINUTE = 8      # paid model calls; past this the learner gets the rule-based reply
AI_SPENT_KEY = "ai_spent_usd"
AI_WORDED_LEVEL = 1
ROADMAP_PER_MINUTE = 4      # re-plans (each may call the model once)
FRAGILE_HOLDBACK = 0.5      # share of a fragile solve's Elo gain held back (the tests passed; the search did not)
TYPING_PER_MINUTE = 20      # drill results


def _float(value: str | None) -> float:
    try:
        return max(0.0, float(value)) if value else 0.0
    except ValueError:
        return 0.0
MAX_CODE_CHARS = 64 * 1024


class ServiceError(Exception):
    def __init__(self, status: int, message: str, **extra: Any):
        super().__init__(message)
        self.status = status
        self.message = message
        self.extra = extra


class RateLimiter:
    def __init__(self, per_minute: int,
                 message: str = "Too many submissions. Take a breath and read the feedback first."):
        self.per_minute = per_minute
        self.message = message
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
                raise ServiceError(429, self.message, retry_after=retry)
            hits.append(now)


# Priya's onboarding answers: a product-company placement in 12 weeks at 8 hours a week.
PRIYA_PROFILE: dict[str, Any] = {"goal": "product_placement", "deadline_weeks": 12, "hours_per_week": 8,
                                 "level": "basics", "premium_ok": False, "comfortable": []}


def _seed_state(persona: str, challenges: dict[str, Challenge]) -> LearnerState:
    state = LearnerState(prior=LEVEL_PRIOR["basics"])
    if persona == "priya":
        state.profile = dict(PRIYA_PROFILE, updated=time.time())
        demo_seed.seed_state(state, challenges)  # the story itself lives in codequest/demo_seed.py
    return state


class CodeQuestService:
    def __init__(self, store: Store, runner: Runner, challenges: dict[str, Challenge], workers: int = 2):
        self.store = store
        self.runner = runner
        self.challenges = challenges
        self._pool = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="judge")
        # Robustness searches run after the verdict on their own worker, so they never delay anyone's verdict.
        self._review_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="review")
        self._user_locks: dict[str, threading.Lock] = collections.defaultdict(threading.Lock)
        self._submit_limit = RateLimiter(RATE_PER_MINUTE)
        # off unless an API key is configured; spend survives restarts so the budget is a real cap
        self.ai = AILayer(spent_usd=_float(store.get_kv(AI_SPENT_KEY)),
                          on_spend=lambda spent: store.set_kv(AI_SPENT_KEY, repr(spent)))
        # LeetCode Companion chat tutor: shares the AI layer's budget, kill switch and counters.
        self.tutor = CompanionTutor(lambda: self.ai, api_key=os.environ.get("OPENAI_API_KEY") or None,
                                    model=os.environ.get("CQ_CHAT_MODEL", CHAT_MODEL_DEFAULT))
        self._chat_limit = RateLimiter(CHAT_PER_MINUTE)
        self._chat_ai_limit = RateLimiter(CHAT_AI_PER_MINUTE)
        self.fetchers = portfolio.FETCHERS  # tests swap in fakes; no network in CI
        # Roadmap coach notes: same budget and kill switch; notes are cached in kv so equal plans cost once.
        coach_key = os.environ.get("OPENAI_API_KEY") or None
        coach_model = os.environ.get("CQ_ROADMAP_MODEL", roadmap.COACH_MODEL_DEFAULT)
        self.coach = roadmap.RoadmapCoach(
            lambda: self.ai, roadmap.openai_coach_provider(coach_key, coach_model) if coach_key else None,
            store.get_kv, store.set_kv, model=coach_model)
        self._roadmap_limit = RateLimiter(ROADMAP_PER_MINUTE, "You've re-planned a lot in a minute. "
                                                              "Give the current plan a try first.")
        self._typing_limit = RateLimiter(TYPING_PER_MINUTE, "That's a lot of runs in a minute. "
                                                            "Take a short break and come back.")

    def shutdown(self) -> None:
        self._pool.shutdown(wait=True)
        self._review_pool.shutdown(wait=True)

    # ------------------------------------------------------------------ sessions
    def create_session(self, persona: str | None, name: str | None) -> dict[str, Any]:
        persona = (persona or "guest").lower()
        if persona not in {"priya", "guest"}:
            raise ServiceError(400, "Unknown persona.")
        display = (name or ("Priya" if persona == "priya" else "Guest")).strip()[:40] or "Guest"
        state = _seed_state(persona, self.challenges)
        user = self.store.create_user(display, state.to_dict())
        if persona == "priya":
            demo_seed.seed_rows(self.store, user["id"], self.challenges)  # attempts + submissions behind the story
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
    def submit(self, user: dict[str, Any], challenge_id: str, code: str,
               prediction: dict[str, Any] | None = None) -> dict[str, Any]:
        """Queue a submission. `prediction` answers this attempt's Predict Before You Run question, if any."""
        ch = self._challenge(challenge_id)
        if not isinstance(code, str) or not code.strip():
            raise ServiceError(400, "Write some code before submitting.")
        if len(code) > MAX_CODE_CHARS:
            raise ServiceError(413, "Submission is larger than 64 KiB.")
        guess = prompt = None
        if prediction is not None:
            guess = predict.Guess(text=prediction.get("answer") or "", crash=bool(prediction.get("crash")),
                                  skipped=bool(prediction.get("skipped")))
            if not guess.skipped and not guess.crash:
                try:
                    predict.parse_answer(guess.text)
                except predict.AnswerError as exc:
                    raise ServiceError(422, str(exc)) from exc
            prompt = predict.find_prompt(ch, str(prediction.get("prompt_id") or ""))  # None: stale, ignored
        self._submit_limit.check(user["id"])
        asked: tuple[predict.Prompt, predict.Guess] | None = None
        with self._user_locks[user["id"]]:
            attempt = self.store.open_attempt(user["id"], ch.id)
            if attempt is None:
                attempt = self.store.create_attempt(user["id"], ch.id)
                state = self._state(self.store.user_by_token(user["token"]) or user)
                start_attempt(state, ch.id)
                self.store.save_state(user["id"], state.to_dict())
            sid = self.store.create_submission(user["id"], attempt["id"], ch.id, code)
            if guess is not None and prompt is not None and not _json(attempt.get("prediction")):
                self.store.update_attempt(attempt["id"], prediction={
                    "prompt_id": prompt.id, "call": prompt.call(ch), "answer": guess.text, "crash": guess.crash,
                    "skipped": guess.skipped, "submission_id": sid, "t": time.time()})
                asked = None if guess.skipped else (prompt, guess)
        self._pool.submit(self._process, sid, user["id"], user["token"], attempt["id"], ch, code, asked)
        return {"submission_id": sid, "status": "queued", "hidden_test_count": len(ch.hidden_tests),
                "visible_test_count": len(ch.visible_tests)}

    def _process(self, sid: str, user_id: str, token: str, attempt_id: str, ch: Challenge, code: str,
                 asked: tuple[predict.Prompt, predict.Guess] | None = None) -> None:
        try:
            self.store.set_status(sid, "running")
            try:
                result = judge(ch, code, self.runner)
            except SubmissionTooLarge:
                raise
            except Exception:  # noqa: BLE001 - a sandbox blip (e.g. Docker hiccup): judging is pure, so retry once
                log.warning("judging %s failed, retrying once", sid, exc_info=True)
                result = judge(ch, code, self.runner)
            prediction = self._check_prediction(attempt_id, ch, code, result, asked) if asked else None
            events = self._apply_learning(user_id, token, attempt_id, ch, result, prediction)
            searchable = result.all_passed and not result.violations and bool(ch.small_inputs)
            public = result.public() | {"events": events, "prediction": prediction,
                                        "robustness": {"status": "checking"} if searchable else None}
            self.store.finish_submission(sid, "done", public, _internal(result))
        except SubmissionTooLarge as exc:
            self.store.finish_submission(sid, "error", {"error": str(exc)}, None)
            return
        except Exception:  # noqa: BLE001 - never leave a submission stuck; infra errors are not the learner's fault
            log.exception("judging %s failed", sid)
            self.store.finish_submission(sid, "error", {"error": "System error while judging. This is not your fault; please resubmit."}, None)
            return
        if searchable:
            self._review_pool.submit(self._review_pass, sid, user_id, token, ch, code, public)

    def _check_prediction(self, attempt_id: str, ch: Challenge, code: str, result: JudgeResult,
                          asked: tuple[predict.Prompt, predict.Guess]) -> dict[str, Any] | None:
        """Run the code on the prediction's input. If it can't be judged, the question is asked again next time."""
        prompt, guess = asked
        if result.syntax_error is None:
            try:
                return predict.evaluate(ch, code, self.runner, prompt, guess)
            except Exception:  # noqa: BLE001 - a sandbox blip must not cost the learner their verdict
                log.warning("prediction check for attempt %s failed", attempt_id, exc_info=True)
        self.store.update_attempt(attempt_id, prediction=None)
        if result.syntax_error is None:
            return None
        return {"state": "unrun", "prompt_id": prompt.id, "call": prompt.call(ch),
                "message": "Your code has a syntax error, so it couldn't run on your prediction. "
                           "Fix it, and CodeQuest will ask again on your next submission."}

    def _review_pass(self, sid: str, user_id: str, token: str, ch: Challenge, code: str,
                     public: dict[str, Any]) -> None:
        """Why did you pass? Search small inputs beyond the tests for one the passing code gets wrong."""
        try:
            robustness = _robustness(ch, probe(ch, code, self.runner))
            if robustness["status"] == "fragile":
                robustness["held_back"] = self._hold_back(user_id, token, public.get("events") or {})
        except Exception:  # noqa: BLE001 - the verdict already stands; an inconclusive search changes nothing
            log.warning("robustness search for %s failed", sid, exc_info=True)
            robustness = {"status": "unchecked"}
        self.store.update_result(sid, public | {"robustness": robustness})

    def _hold_back(self, user_id: str, token: str, events: dict[str, Any]) -> dict[str, float]:
        """A fragile pass isn't a real pass: keep the solve, but hold back part of its Elo gain and its
        verified-evidence credit, so concept mastery only counts code that survives inputs the tests missed."""
        held: dict[str, float] = {}
        with self._user_locks[user_id]:
            user = self.store.user_by_token(token)
            if user is None:
                return held
            state = self._state(user)
            verified = float(events.get("score") or 0.0) >= VERIFIED_SCORE
            for concept, delta in (events.get("skill_changes") or {}).items():
                if delta > 0:
                    held[concept] = round(delta * FRAGILE_HOLDBACK, 2)
                    state.theta[concept] = round(state.skill(concept) - held[concept], 2)
                if verified and state.verified.get(concept, 0) > 0:
                    state.verified[concept] -= 1
            self.store.save_state(user_id, state.to_dict())
        return held

    def _apply_learning(self, user_id: str, token: str, attempt_id: str, ch: Challenge,
                        result: JudgeResult, prediction: dict[str, Any] | None = None) -> dict[str, Any]:
        with self._user_locks[user_id]:
            user = self.store.user_by_token(token)
            assert user is not None
            state = self._state(user)
            attempt = self.store.attempt(attempt_id)
            assert attempt is not None
            newly = record_mistakes(state, [m.key for m in result.mistakes])
            events: dict[str, Any] = {"mistakes": [m.key for m in result.mistakes], "newly_recurring": newly,
                                      "solved": False, "skill_changes": {}, "adaptation": None}
            solved = result.all_passed and not result.violations  # passing while breaking the mission rule isn't done
            failed = int(attempt["failed"]) + (0 if solved else 1)
            best = max(float(attempt["best_hidden"]), result.hidden_pass_fraction())
            if prediction and prediction.get("state") in predict.STATES:
                record_prediction(state, {"challenge_id": ch.id, "concepts": ch.concepts.all,
                                          "state": prediction["state"], "t": time.time()})
                stored = _json(attempt.get("prediction")) or {}
                self.store.update_attempt(attempt_id, prediction=stored | {"state": prediction["state"]})
            if solved:
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
                violations = result_view.get("rule_violations") or []
                if violations:
                    calls = ", ".join(dict.fromkeys(f"{v['call']}()" for v in violations))
                    raise ServiceError(409, f"All tests pass. To finish the mission, solve it without {calls}.")
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
            # Optional wording pass, H1 only (plan §16): H2-H4 carry generated values or the learner's own
            # code, which a model must never paraphrase. Same leak guard over everything shown so far.
            if level == AI_WORDED_LEVEL and self._state(self.store.user_by_token(user["token"]) or user).ai_enabled:
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

    # ------------------------------------------------------------------ Predict Before You Run
    def prediction_prompt(self, user: dict[str, Any], challenge_id: str) -> dict[str, Any] | None:
        """This attempt's question, or None once it has been answered or skipped (one per attempt)."""
        ch = self._challenge(challenge_id)
        attempt = self.store.open_attempt(user["id"], ch.id)
        if attempt is not None and _json(attempt.get("prediction")):
            return None
        # Seeded by mission and attempt number, not by learner: everyone's first question on a mission is the same
        # (so a live demo is predictable), and a new attempt usually gets a new one.
        earlier = len(self.store.challenge_attempts(user["id"], ch.id)) - (1 if attempt is not None else 0)
        prompt = predict.prompt_for(ch, f"{ch.id}:{earlier}")
        return prompt.public(ch) if prompt else None

    # ------------------------------------------------------------------ Debug Journey
    def journey(self, user: dict[str, Any], challenge_id: str, attempt_id: str | None = None) -> dict[str, Any]:
        """Replay of one attempt (default: the latest with a judged submission). Private: it shows code."""
        ch = self._challenge(challenge_id)
        attempts = [a for a in self.store.challenge_attempts(user["id"], ch.id) if a["judged"]]
        if attempt_id:
            attempt = next((a for a in attempts if a["id"] == attempt_id), None)
            if attempt is None:
                raise ServiceError(404, "Unknown attempt.")
        else:
            attempt = attempts[0] if attempts else None
        if attempt is None:
            return {"attempt": None, "attempts": [], "steps": [], "summary": None, "reflection": None, "agreement": None}
        view = journey.build(self.store.attempt_submissions(attempt["id"]))
        reflection = _json(attempt.get("reflection"))
        return {
            "attempt": {"id": attempt["id"], "created": attempt["created"], "open": bool(attempt["open"]),
                        "solved": not attempt["open"] and bool(view["summary"]["solved"])},
            "attempts": [{"id": a["id"], "created": a["created"], "open": bool(a["open"]), "submissions": a["judged"]}
                         for a in attempts],
            **view,
            "reflection": reflection,
            "agreement": journey.agreement(view["summary"]["style"], reflection),
        }

    def reflect(self, user: dict[str, Any], challenge_id: str, strategy: str, note: str | None) -> dict[str, Any]:
        """Save the learner's own reading of how they debugged their latest attempt."""
        ch = self._challenge(challenge_id)
        if strategy not in journey.SELF_REPORTS:
            raise ServiceError(422, "Unknown strategy.")
        with self._user_locks[user["id"]]:
            attempt = next((a for a in self.store.challenge_attempts(user["id"], ch.id) if a["judged"]), None)
            if attempt is None:
                raise ServiceError(409, "Submit an attempt first: the reflection is about how you debugged it.")
            text = " ".join((note or "").split())[:journey.MAX_NOTE_CHARS] or None
            self.store.update_attempt(attempt["id"], reflection={"strategy": strategy, "note": text, "t": time.time()})
        return self.journey(user, challenge_id, attempt["id"])

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
            "profile": state.profile,
            "onboarded": state.profile is not None,
        }

    # ------------------------------------------------------------------ AI preference
    def ai_status(self, user: dict[str, Any] | None) -> dict[str, Any]:
        status = self.ai.status()
        if user is not None:
            fresh = self.store.user_by_token(user["token"]) or user
            status["enabled"] = status["enabled"] and self._state(fresh).ai_enabled
        return status

    def set_ai_preference(self, user: dict[str, Any], enabled: bool) -> dict[str, Any]:
        with self._user_locks[user["id"]]:
            fresh = self.store.user_by_token(user["token"]) or user
            state = self._state(fresh)
            state.ai_enabled = bool(enabled)
            self.store.save_state(user["id"], state.to_dict())
        return self.ai_status(user)

    def ext_chat(self, user: dict[str, Any], req: ChatRequest) -> dict[str, Any]:
        try:
            self._chat_limit.check(user["id"])
        except ServiceError as exc:
            raise ServiceError(429, "That's a lot of questions in a minute. Try the hint you have first, "
                                    "then ask again.", **exc.extra) from exc
        fresh = self.store.user_by_token(user["token"]) or user

        def ai_quota() -> bool:
            try:
                self._chat_ai_limit.check(user["id"])
                return True
            except ServiceError:
                return False  # degrade to the rule-based reply instead of an error

        return self.tutor.answer(req, ai_allowed=self._state(fresh).ai_enabled, ai_quota=ai_quota).to_dict()

    def ext_summary(self, user: dict[str, Any]) -> dict[str, Any]:
        """Compact profile for the extension panel (reads fresh state: the extension user row is a join)."""
        fresh = self.store.user_by_token(user["token"]) or user
        state = self._state(fresh)
        return {
            "user": {"name": fresh["name"], "handle": portfolio.public_handle(fresh)},
            "recurring": state.recurring,
            "beaten": state.beaten,
            "solved": len(state.solved),
            "ai": {"available": self.tutor.available, "enabled": self.tutor.available and state.ai_enabled},
            "next_up": [{"challenge_id": n["challenge_id"], "title": n["title"], "reason": n["reason"]}
                        for n in next_up(state, self.challenges)],
        }

    # ------------------------------------------------------------------ portfolio
    def portfolio(self, handle: str) -> dict[str, Any]:
        prefix = portfolio.handle_id_prefix(handle)
        candidates = self.store.users_by_id_prefix(prefix) if prefix else []
        matches = [u for u in candidates if portfolio.public_handle(u) == handle]
        if not matches and len(candidates) == 1:
            matches = candidates  # the learner renamed themselves: old links still resolve (to the new handle)
        if not matches:
            raise ServiceError(404, "No portfolio with that handle.")
        user = matches[0]
        handle = portfolio.public_handle(user)
        state = self._state(user)
        bands = concept_bands(state, self.challenges)
        attempts = self.store.user_attempts(user["id"])
        hints = sum(len(_json(a["ladder"]).get("shown", [])) for a in attempts if a["ladder"])
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
                "growth": insights.build(attempts, self.store.user_submissions(user["id"]), state, self.challenges,
                                         bands),
            },
            "imports": imports,
            "typing": typing_drills.summarize(self.store.typing_runs(user["id"])),
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

    # ------------------------------------------------------------------ personal profile
    def _fresh(self, user: dict[str, Any]) -> tuple[dict[str, Any], LearnerState]:
        fresh = self.store.user_by_token(user["token"]) or user
        return fresh, self._state(fresh)

    def _profile_view(self, user: dict[str, Any], state: LearnerState) -> dict[str, Any]:
        return {
            "name": user["name"],
            "handle": portfolio.public_handle(user),
            "profile": state.profile,
            "onboarded": state.profile is not None,
            "options": {
                "goals": [{"id": k, "label": g.label} for k, g in roadmap.GOALS.items()],
                "levels": [{"id": k, "label": v} for k, v in roadmap.LEVELS.items()],
                "topics": [{"id": t.id, "label": t.label, "layer": t.layer} for t in roadmap.TOPICS],
            },
        }

    def get_profile(self, user: dict[str, Any]) -> dict[str, Any]:
        return self._profile_view(*self._fresh(user))

    def update_profile(self, user: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
        """Save onboarding answers. The level sets the skill prior for concepts with no evidence yet."""
        with self._user_locks[user["id"]]:
            _, state = self._fresh(user)
            state.profile = {
                "goal": data["goal"],
                "deadline_weeks": data.get("deadline_weeks"),
                "hours_per_week": int(data["hours_per_week"]),
                "level": data["level"],
                "premium_ok": bool(data.get("premium_ok")),
                "comfortable": list(dict.fromkeys(data.get("comfortable") or [])),
                "updated": time.time(),
            }
            state.prior = float(LEVEL_PRIOR[data["level"]])
            self.store.save_state(user["id"], state.to_dict())
            if data.get("name"):
                self.store.update_name(user["id"], data["name"])
        return self.get_profile(user)

    # ------------------------------------------------------------------ roadmap
    def _plan_inputs(self, user_id: str, state: LearnerState) -> roadmap.PlanInputs:
        mastered = {b["concept"] for b in concept_bands(state, self.challenges)
                    if b["band"] == "mastered" and b["concept"] in roadmap.TOPIC_BY_ID}
        imported: set[str] = set()
        for row in self.store.imports_for(user_id):
            if row["status"] in ("ok", "stale") and row["data"]:
                imported.update(c for c in row["data"].get("concepts", []) if c in roadmap.TOPIC_BY_ID)
        return roadmap.PlanInputs(profile=state.profile or {}, state=state, challenges=self.challenges,
                                  mastered=mastered, imported=imported, done_external=set(state.roadmap_done))

    def _require_profile(self, state: LearnerState) -> None:
        if state.profile is None:
            raise ServiceError(409, "Tell CodeQuest your goal and schedule first, then it can plan your roadmap.",
                               code="profile_required")

    def _build_roadmap(self, user: dict[str, Any], state: LearnerState, use_ai: bool) -> dict[str, Any]:
        plan = roadmap.build_plan(self._plan_inputs(user["id"], state))
        # The model call can take seconds: no learner lock is held here, and only the notes come from AI.
        coach = self.coach.notes(plan, ai_allowed=use_ai and state.ai_enabled)
        previous = self.store.get_roadmap(user["id"])
        version = int(previous.get("version", 0)) + 1 if previous else 1
        plan = roadmap.stamp(plan, coach, version)
        self.store.save_roadmap(user["id"], version, plan)
        return plan

    def get_roadmap(self, user: dict[str, Any]) -> dict[str, Any]:
        fresh, state = self._fresh(user)
        self._require_profile(state)
        plan = self.store.get_roadmap(fresh["id"])
        if plan is None or "weeks" not in plan or "coach" not in plan:
            plan = self._build_roadmap(fresh, state, use_ai=False)  # first view: no surprise spend
        return self._roadmap_view(fresh, state, plan)

    def replan(self, user: dict[str, Any], use_ai: bool) -> dict[str, Any]:
        fresh, state = self._fresh(user)
        self._require_profile(state)
        self._roadmap_limit.check(user["id"])
        plan = self._build_roadmap(fresh, state, use_ai)
        return self._roadmap_view(fresh, state, plan)

    def mark_roadmap_item(self, user: dict[str, Any], item_id: str, done: bool) -> dict[str, Any]:
        if not item_id.startswith("lc:"):
            raise ServiceError(400, "CodeQuest missions are marked done automatically when their hidden tests pass.")
        slug = item_id[3:]
        if slug not in {item["slug"] for item in roadmap.load_catalog()}:
            raise ServiceError(404, "That problem isn't in the roadmap catalog.")
        with self._user_locks[user["id"]]:
            _, state = self._fresh(user)
            self._require_profile(state)
            if done and slug not in state.roadmap_done:
                state.roadmap_done.append(slug)
            elif not done and slug in state.roadmap_done:
                state.roadmap_done.remove(slug)
            self.store.save_state(user["id"], state.to_dict())
        return self.get_roadmap(user)

    def _roadmap_view(self, user: dict[str, Any], state: LearnerState, plan: dict[str, Any]) -> dict[str, Any]:
        solved, done_lc = set(state.solved), set(state.roadmap_done)
        warmup_done = self.store.typing_run_count(user["id"], since=float(plan.get("created", 0))) > 0
        coach = plan["coach"]
        weeks, total, done, minutes_left = [], 0, 0, 0
        for week in plan["weeks"]:
            items = []
            for item in week["items"]:
                if item["kind"] == "mission":
                    is_done = item["id"][2:] in solved
                elif item["kind"] == "leetcode":
                    is_done = item["id"][3:] in done_lc
                else:
                    is_done = warmup_done
                items.append(item | {"done": is_done})
                total += 1
                done += is_done
                minutes_left += 0 if is_done else item["minutes"]
            weeks.append(week | {"items": items, "done": sum(i["done"] for i in items),
                                 "note": coach["weeks"].get(str(week["week"]), "")})
        reasons = roadmap.replan_reasons(plan.get("inputs", {}),
                                         roadmap.plan_inputs_snapshot(self._plan_inputs(user["id"], state)))
        return {
            "version": plan.get("version", 1),
            "created": plan.get("created"),
            "goal_label": plan["goal_label"],
            "level_label": plan["level_label"],
            "profile": plan["profile"],
            "weekly_minutes": plan["weekly_minutes"],
            "pace": plan["pace"],
            "topics": plan["topics"],
            "warnings": plan["warnings"],
            "compressed": plan["compressed"],
            "weeks": weeks,
            "current_week": next((w["week"] for w in weeks if w["done"] < len(w["items"])), None),
            "progress": {"done": done, "total": total, "minutes_left": minutes_left},
            "coach": {"summary": coach["summary"], "tips": coach["tips"], "source": coach["source"],
                      "model": coach.get("model")},
            "replan": {"suggested": bool(reasons), "reasons": reasons},
            "ai": {"available": self.coach.available, "enabled": self.coach.available and state.ai_enabled},
        }

    # ------------------------------------------------------------------ Syntax Warm-up (typing)
    def _own_snippets(self, user_id: str) -> list[typing_drills.Snippet]:
        rows = [(r["challenge_id"], self.challenges[r["challenge_id"]].title,
                 self.challenges[r["challenge_id"]].concepts.primary, r["code"])
                for r in self.store.passing_submissions(user_id) if r["challenge_id"] in self.challenges]
        return typing_drills.own_snippets(rows)

    def _find_snippet(self, user_id: str, snippet_id: str) -> typing_drills.Snippet:
        pool = self._own_snippets(user_id) if snippet_id.startswith("own-") else typing_drills.load_corpus()
        snippet = next((s for s in pool if s.id == snippet_id), None)
        if snippet is None:
            raise ServiceError(404, "Unknown typing drill.")
        return snippet

    def typing_drills(self, user: dict[str, Any]) -> dict[str, Any]:
        fresh, state = self._fresh(user)
        bands = sorted(concept_bands(state, self.challenges), key=lambda b: b["p_median"])
        weak = [b["concept"] for b in bands if b["band"] in ("learning", "almost")]
        for item in next_up(state, self.challenges):
            concept = self.challenges[item["challenge_id"]].concepts.primary
            if concept not in weak:
                weak.append(concept)
        syntax = [k for k in state.recurring if k.startswith("syntax:")]
        syntax += [k for k, m in state.mistakes.items() if k.startswith("syntax:") and m >= 1.0 and k not in syntax]
        runs = self.store.typing_runs(fresh["id"])
        recent = [r["snippet_id"] for r in reversed(runs[:5])]
        drills = typing_drills.recommend(typing_drills.load_corpus(), self._own_snippets(fresh["id"]), weak,
                                         syntax, recent)
        return {"drills": drills, "focus": {"syntax": syntax, "concepts": weak[:5]},
                "summary": typing_drills.summarize(runs)}

    def typing_result(self, user: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
        self._typing_limit.check(user["id"])
        snippet = self._find_snippet(user["id"], body["snippet_id"])
        errors = body.get("errors") or {}
        try:
            run = typing_drills.compute_run(snippet.code, bool(body.get("auto_indent", True)), errors,
                                            int(body["duration_ms"]), int(body.get("syntax_errors", 0)))
        except ValueError as exc:
            raise ServiceError(422, str(exc)) from exc
        before = typing_drills.summarize(self.store.typing_runs(user["id"]))
        self.store.add_typing_result(user["id"], snippet.id, snippet.concept, run, errors)
        personal_best = before is None or run["cpm"] > before["best_cpm"]
        return {"run": run | {"personal_best": personal_best},
                "summary": typing_drills.summarize(self.store.typing_runs(user["id"]))}

    # ------------------------------------------------------------------ your data
    def export_data(self, user: dict[str, Any]) -> dict[str, Any]:
        """Everything CodeQuest stores about this learner, as JSON (data portability)."""
        fresh, state = self._fresh(user)
        return {
            "exported_at": time.time(),
            "user": {"name": fresh["name"], "handle": portfolio.public_handle(fresh), "created": fresh["created"]},
            "learner": state.to_dict(),
            "attempts": [{"challenge_id": a["challenge_id"], "open": bool(a["open"]), "failed": a["failed"],
                          "best_hidden": a["best_hidden"], "hints": (_json(a["ladder"]) or {}).get("shown", []),
                          "prediction": _json(a.get("prediction")), "reflection": _json(a.get("reflection")),
                          "created": a["created"]} for a in self.store.user_attempts(fresh["id"])],
            "submissions": [{"challenge_id": r["challenge_id"], "code": r["code"], "status": r["status"],
                             "result": _json(r["result"]), "created": r["created"]}
                            for r in self.store.user_submissions(fresh["id"])],
            "imports": self.store.imports_for(fresh["id"]),
            "typing": self.store.typing_runs(fresh["id"], limit=100_000),
            "roadmap": self.store.get_roadmap(fresh["id"]),
        }

    def delete_account(self, user: dict[str, Any]) -> dict[str, Any]:
        with self._user_locks[user["id"]]:
            self.store.delete_user(user["id"])
        return {"deleted": True}

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
            start_attempt(state, f"lc:{slug}")
            newly = record_mistakes(state, keys)
            if verdict == "accepted" and slug not in state.roadmap_done:
                state.roadmap_done.append(slug)  # an accepted LeetCode problem ticks off its roadmap item
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


def _robustness(ch: Challenge, report: ProbeReport | None) -> dict[str, Any]:
    """Public result of the small-input search on a passing submission."""
    if report is None or not report.complete:
        return {"status": "unchecked"}
    if report.counterexample is None:
        return {"status": "robust", "checked": report.checked,
                "message": f"CodeQuest also tried {report.checked} small inputs beyond the tests, and your code got "
                           "every one right."}
    ce = report.counterexample
    call = f"{ch.function}({', '.join(short_repr(a) for a in ce.args)})"
    if ce.error is None:
        did = f"returned {short_repr(ce.got)}"
    elif ce.error.startswith("no answer"):
        did = "never finished"
    else:
        did = f"raised {ce.error}"
    return {
        "status": "fragile",
        "checked": report.checked,
        "failed": report.failed,
        "held_back": {},
        "counterexample": {"call": call, "expected": short_repr(ce.expected),
                           "got": None if ce.error else short_repr(ce.got), "error": ce.error},
        "message": f"Every test passed, but CodeQuest searched {report.checked} small inputs beyond them and your code "
                   f"gets {report.failed} wrong. For {call} the answer is {short_repr(ce.expected)}, but your code "
                   f"{did}. Tests can't cover everything: make this case work too.",
    }


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
