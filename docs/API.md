# API Reference

Base URL (local): `http://localhost:8000`. Interactive OpenAPI docs are served by FastAPI at **`/docs`** (Swagger UI) and `/redoc`.

All bodies are JSON. Errors have the shape `{"error": "<human message>", ...extra}`.

## Authentication

| Scheme | Header | Obtained from | Works on |
|---|---|---|---|
| **Web session** | `Authorization: Bearer <token>` | `POST /api/session` | everything except `/api/ext/*` (other than `pairing-code`) |
| **Extension token** | `Authorization: Bearer <ext token>` | `POST /api/ext/pair` | `/api/ext/*` only. Expires after 7 days |
| Public | none | | `health`, `portfolio`, `arena/attacks`, `GET settings/ai` |

## Status codes

| Code | Meaning |
|---|---|
| `200` / `202` | OK / accepted for background processing (submissions, imports) |
| `400` | Invalid input (unknown persona, invalid handle, non-Python analysis, bad pairing code) |
| `401` | Missing, unknown or expired token |
| `404` | Unknown mission, submission or portfolio handle |
| `409` | Hint not possible yet: no attempt, still judging, or already solved |
| `413` | Code larger than 64 KiB |
| `422` | Request failed schema validation (FastAPI) |
| `423` | Next hint is locked: `{"error", "next_level", "available": false, "unlocks_in_s", "reason"}` |
| `429` | Rate limited; `Retry-After` header and `retry_after` field (seconds) |

---

## Core

### `GET /api/health`
```json
{"status": "ok", "runner": "docker", "sandboxed": true, "missions": 20}
```

### `POST /api/session`
Start an anonymous learner. `persona: "priya"` seeds the demo history.
```json
// request
{"persona": "priya", "name": "Priya"}
// response
{"token": "…", "user": {"id": "…", "name": "Priya", "handle": "priya-3f9a1c"}}
```

### `GET /api/challenges` · web auth
List of missions: `[{id, type: "build"|"debug", tier, title, concepts, hidden_test_count, solved}]`.

### `GET /api/challenges/{id}` · web auth
Public view: description, starter code, **visible** tests, `hidden_test_count`, `edge_cases`, `max_hint_level`, plus the current `hints` state `{ladder, max_level, next}`. Hidden tests and references are never included.

### `POST /api/submissions` · web auth · 6/min
```json
// request
{"challenge_id": "class_average", "code": "def class_average(scores): ..."}
// 202 response
{"submission_id": "…", "status": "queued", "hidden_test_count": 6, "visible_test_count": 4}
```

### `GET /api/submissions/{id}` · web auth
Poll until `status` is `done` or `error`.
```json
{
  "submission_id": "…", "status": "done", "challenge_id": "class_average",
  "result": {
    "counts": {"passed": 1, "wrong_output": 4, "runtime_error": 2, "timeout": 3},
    "all_passed": false,
    "summary": "1/10 passed, 4 wrong output, 2 runtime error, 3 timeout.",
    "syntax_error": null,
    "tests": [
      {"index": 3, "visibility": "visible", "status": "runtime_error", "category": "empty",
       "subtype": "exception", "input": "[]", "expected": "0.0", "actual": null,
       "exception_type": "ZeroDivisionError", "raw_message": "division by zero", "line": 11,
       "locals": {"scores": "[]", "total": "0", "count": "0", "i": "0"},
       "label": null, "stdout": "", "explanation": "On line 11 (`return total / count`) your code divided by zero. …"},
      {"index": 5, "visibility": "hidden", "status": "wrong_output", "category": "boundary",
       "explanation": "On a hidden boundary test your code returned a wrong answer. …"}
    ],
    "notes": [{"line": 5, "message": "`< len(...) - 1` stops one element early.", "key": "off_by_one"}],
    "runner": "docker",
    "events": {
      "mistakes": ["empty_input", "off_by_one", "infinite_loop"],
      "newly_recurring": ["off_by_one"],
      "solved": false, "skill_changes": {},
      "adaptation": {
        "recurring": ["off_by_one"],
        "debug_mission": {"id": "debug_average", "title": "Debug Mission: The Broken Average"},
        "next_up": [{"challenge_id": "debug_average", "reason": "Targets your recurring mistake: off by one", "…": "…"}],
        "preflight": ["Before you submit: check the first and the last position your loop visits."]
      }
    }
  }
}
```

### `POST /api/challenges/{id}/hint` · web auth
Unlocks the next level. Requires a judged, failing submission; later levels need a changed resubmission or a 45 s cooldown (`423` otherwise).
```json
{
  "hint": {"level": 2, "title": "What is going wrong", "text": "…", "region": [2, 4], "source": "template"},
  "ladder": [ /* all hints shown so far */ ],
  "max_level": 4,
  "next": {"next_level": 3, "available": false, "unlocks_in_s": 45, "reason": "Try a change and resubmit, …"}
}
```
`source` is `template`, `fallback` (leak guard replaced the text) or `ai` (hint 1 reworded by the AI layer).

### `GET /api/me` · web auth
`{user, skills: [{concept, band, attempts, verified, p_median}], mistakes: {recurring, beaten, strength, history}, solved, next_up, profile, onboarded}`.

---

## Learning signals

Four signals that go beyond pass/fail. Design and evidence: [MENTOR_ENGINE.md §10](MENTOR_ENGINE.md#10-learning-signals) and [research/learning-signals-evidence.md](research/learning-signals-evidence.md).

### Predict Before You Run
`GET /api/challenges/{id}` also returns `prediction: {prompt_id, call} | null` (the attempt's one question; `null` once answered or skipped) and `forbidden_calls` (e.g. `["max"]`).
`POST /api/submissions` accepts an optional `prediction: {prompt_id: 12 hex, answer?: str ≤200, crash?: bool, skipped?: bool}`; an empty answer without `crash`/`skipped` is a 422. Only the first prediction of an attempt counts, and an unknown `prompt_id` is ignored (the submission still runs).
The judged result then carries `prediction: {state, call, traced, predicted, actual, expected, message}` where `state` is `aligned | slip | misconception | lucky | lost` (or `unrun` when a syntax error stopped the code; the question is asked again). `expected` is `null` unless the learner already knew it or their code produced it.

### Pass review
- `rule_violations: [{call, line}]`: a passing submission that uses a forbidden call. Tests pass, but the attempt stays open (not solved) and the hint endpoint answers 409 with the rule.
- `robustness`: `null` (no search domain, or not a pass) · `{status: "checking"}` right after the verdict · then `{status: "robust", checked, message}`, `{status: "fragile", checked, failed, counterexample: {call, expected, got, error}, held_back: {concept: elo}, message}` or `{status: "unchecked"}`. Poll `GET /api/submissions/{id}` until it leaves `checking`. A fragile pass keeps the solve but holds back half its Elo gain and its verified credit.

### `GET /api/challenges/{id}/journey?attempt_id=` · web auth
Replay of the latest attempt with a judged submission (or `attempt_id`). Private: it contains the learner's code.
`{attempt: {id, created, open, solved} | null, attempts: [{id, created, open, submissions}], steps: [{index, kind, revert_of, passed, total, hidden_passed, hidden_total, failing, error_line, mistakes, delta, change: {added, removed, focused, hunks: [{rows: [{t, a, b, text}]}]}, code}], summary: {submissions, productive, regressions, resubmits, reverts, productive_ratio, focused_share, error_quotient, style}, reflection, agreement}`.
`kind`: `first | progress | regression | sideways | resubmit | revert | solved`. `style`: `first_try | single | quick_fix | too_short | methodical | exploratory | trial_and_error`.

### `POST /api/challenges/{id}/reflection` · web auth
`{strategy: "systematic" | "mixed" | "random", note?: str ≤280}` on the latest judged attempt; returns the journey with `agreement: agrees | close | differs`. 409 before any judged submission.

### Portfolio growth
`GET /api/portfolio/{handle}` adds `verified.growth: {solves: {count, hint_free, first_try, series, rolling, trend}, struggle: [{challenge_id, tier, state, effort, submissions, hints}], lanes: {attempts, lanes: [{key, hits, state}]}, prediction: {total, traced, knew_answer, by_state, by_concept} | null, debugging: {journeys, styles, productive_ratio, error_quotient, self_report}, robustness: {checked, robust, fragile}}`. Aggregates only: no code, inputs or reflection notes.

---

## Profile, roadmap and your data

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/me/profile` | web | `{name, handle, profile \| null, onboarded, options: {goals, levels, topics}}` |
| `PUT` | `/api/me/profile` | web | `{name?, goal, deadline_weeks (2–26) \| null, hours_per_week (1–40), level, premium_ok, comfortable: [topic]}`. The level sets the skill prior for concepts with no evidence yet |
| `GET` | `/api/me/roadmap` | web | The current plan with live progress. `409 {code: "profile_required"}` before onboarding. Built deterministically on first view (no AI spend) |
| `POST` | `/api/me/roadmap` | web · 4/min | `{use_ai: bool}`: re-plan now; AI coach notes only if the learner's AI switch is on and budget allows |
| `POST` | `/api/me/roadmap/items` | web | `{item_id: "lc:<slug>", done}`: tick a LeetCode problem. Missions tick themselves when their hidden tests pass; an accepted Companion submission ticks its problem too |
| `GET` | `/api/me/export` | web | Everything stored about the learner, as JSON |
| `DELETE` | `/api/me` | web | Erase the learner and all their rows; the session token stops working |

The roadmap response carries `weeks[{week, focus, items[{id, kind: mission\|leetcode\|warmup, title, difficulty, minutes, url, reason, trap, done}], review, note}]`, `topics` (status per topic: planned, mastered, skipped, trimmed), `warnings`, `progress`, `coach: {summary, tips, source: ai\|template}` and `replan: {suggested, reasons}`.

---

## Portfolio and practice

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/portfolio/{handle}` | public | `{handle, name, verified: {concepts, all_concepts, mistakes, stats, solved}, imports: {codeforces?, leetcode?}, typing}` |
| `POST` | `/api/imports` | web · 6/min | `{platform: "codeforces"\|"leetcode", handle}` → `202 {status: "queued"\|"cached"}`; poll the portfolio |
| `GET` | `/api/typing/drills` | web | `{drills: [{id, title, concept, code, source: corpus\|own, reason, recommended}], focus: {syntax, concepts}, summary}` |
| `POST` | `/api/typing/results` | web · 20/min | `{snippet_id, auto_indent, duration_ms, errors: {expected_char: wrong_keys}, syntax_errors}` → `{run: {cpm, wpm, accuracy, syntax_accuracy, chars, personal_best}, summary}`. Speed and accuracy are computed on the server from the snippet; impossible runs (over 1,500 chars/min) are rejected with `422` |

Imported stats are mapped onto the same concept ids and shown as **imported**, separate from skills **verified** by CodeQuest's hidden tests.

## AI settings

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings/ai` | optional | `{enabled, available, provider, budget_left_usd, rephrased, leaks_blocked}`; with a session, `enabled` reflects that learner's preference |
| `POST` | `/api/settings/ai` | web | `{enabled: bool}`: per-learner switch; never turns AI off for others |

## Sandbox Arena

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/arena/attacks` | public | `[{index, id, title, code}]`, the 8 fixed attacks |
| `POST` | `/api/arena/run` | web · 6/min | `{index}` → `{verdict, subtype, detail, contained, runner, sandboxed}` |

---

## LeetCode Companion

| Method | Path | Auth | Body → response |
|---|---|---|---|
| `POST` | `/api/ext/pairing-code` | **web** | → `{code: "K7PX2M", expires_in_s: 600}` (single use) |
| `POST` | `/api/ext/pair` | none | `{code}` → `{token, user: {id, name}}` |
| `POST` | `/api/ext/chat` | ext · 8/min | see below → `{reply, source: "ai"\|"rules", mode, refused, suggestions, findings}` |
| `POST` | `/api/ext/analyze` | ext | `{code, language: "python"}` → `{syntax_error, findings: [{key, line, message}]}` |
| `POST` | `/api/ext/approach` | ext | `{text, tags}` → `{verdict: "on_track"\|"partially"\|"off_track"\|"unclear", mentioned, brute_force, question}` |
| `POST` | `/api/ext/hint` | ext | `{tags, level: 1–3}` → `{level, max_level, text, concept}` |
| `POST` | `/api/ext/sync` | ext | `{slug, tags, verdict: "accepted"\|"wrong_answer"\|"runtime_error"\|"time_limit"\|"other", code}` → `{recorded_mistakes, newly_recurring, concepts, slug}` |
| `GET` | `/api/ext/me` | ext | `{user, recurring, beaten, solved, ai: {available, enabled}, next_up}` |

`POST /api/ext/chat` body:

| Field | Type | Notes |
|---|---|---|
| `mode` | `chat` · `hint` · `approach` · `review` · `explain` · `edge_cases` · `complexity` | |
| `message` | string ≤ 2,000 | the learner's text (their plan, for `approach`) |
| `slug`, `title`, `difficulty`, `tags` | problem metadata | `slug` matches `^[a-z0-9-]*$`, ≤ 30 tags |
| `statement` | string ≤ 12,000 | used for this reply only, never stored |
| `code`, `language` | string ≤ 32,000 | optional; static checks run on Python only |
| `history` | ≤ 20 `{role, content}` turns | the server uses the last 8 |
| `hint_level` | 1–3 | for `mode: "hint"` |
