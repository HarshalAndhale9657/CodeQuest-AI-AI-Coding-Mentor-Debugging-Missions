"""Priya's demo history: the attempts, submissions and predictions behind the "priya" persona.

The script below is the single source of the story. `python -m codequest.demo_seed` judges every scripted
submission with the real judge, prediction check, hint ladder and robustness search, and writes the results
to content/demo/priya.json. Sessions then copy that fixture into the store instantly, without running a
sandbox, and tests re-judge the fixture so it can never drift from what the judge really says.

The story, oldest first (scores and mistakes feed the Elo model and Mistake Memory exactly as live play would):

    count_evens    solved first try; predicted the output exactly                    (aligned)
    largest        started `best` at 0; predicted 0 for an all-negative list, so the
                   plan itself was wrong; fixed it after hint 1                     (misconception)
    reverse_words  solved first try, but expected the double space to survive       (lucky)
    total          `range(len(nums) - 1)`; knew the sum but the loop skipped the last
                   number; tinkered, reverted, gave up after two hints              (slip)

Exactly one off-by-one is on record, in the latest attempt: her next off-by-one in a different mission
makes it recurring live during the demo.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from codequest import predict
from codequest.content import Challenge
from codequest.learner import LearnerState, finish_attempt, record_mistakes, record_prediction, start_attempt

FIXTURE = Path(__file__).resolve().parents[2] / "content" / "demo" / "priya.json"
FIXTURE_VERSION = 1
DAY = 86_400.0


@dataclass(frozen=True)
class Step:
    code: str
    minutes: float = 0.0                       # after the attempt started
    prediction: dict[str, Any] | None = None   # {"args": [...], "answer": "..."} on the first submission


@dataclass(frozen=True)
class ScriptedAttempt:
    challenge_id: str
    days_ago: float
    steps: tuple[Step, ...]
    mistakes: tuple[str, ...]                  # what the judge must record (checked by the tests)
    score: float                               # attempt score fed to the Elo model
    hints: int = 0
    abandoned: bool = False
    reflection: dict[str, Any] | None = None
    prediction_state: str | None = None        # what the prediction check must conclude
    extra: dict[str, Any] = field(default_factory=dict)


COUNT_EVENS = '''def count_evens(nums):
    count = 0
    for n in nums:
        if n % 2 == 0:
            count += 1
    return count
'''

LARGEST_ZERO = '''def largest(nums):
    if not nums:
        return None
    best = 0
    for n in nums:
        if n > best:
            best = n
    return best
'''

REVERSE_WORDS = '''def reverse_words(s):
    words = s.split()
    words.reverse()
    return " ".join(words)
'''

TOTAL_SKIPS_LAST = '''def total(nums):
    result = 0
    for i in range(len(nums) - 1):
        result += nums[i]
    return result
'''

PRIYA: tuple[ScriptedAttempt, ...] = (
    ScriptedAttempt("count_evens", 6.0, (Step(COUNT_EVENS, prediction={"args": [[-2, 3]], "answer": "1"}),),
                    mistakes=(), score=1.0, prediction_state="aligned"),
    ScriptedAttempt("largest", 5.0, (
        Step(LARGEST_ZERO, prediction={"args": [[-3, -1]], "answer": "0"}),
        Step(LARGEST_ZERO.replace("best = 0", "best = nums[0]"), minutes=7),
    ), mistakes=("bad_initial_value",), score=0.9, hints=1, prediction_state="misconception",
        reflection={"strategy": "systematic", "note": "Hint 1 pointed at my starting value."}),
    ScriptedAttempt("reverse_words", 3.0, (Step(REVERSE_WORDS, prediction={"args": ["a  b"], "answer": "b  a"}),),
                    mistakes=(), score=1.0, prediction_state="lucky"),
    ScriptedAttempt("total", 1.0, (
        Step(TOTAL_SKIPS_LAST, prediction={"args": [[1, 3]], "answer": "4"}),
        Step(TOTAL_SKIPS_LAST.replace("range(len(nums) - 1)", "range(1, len(nums))"), minutes=4),
        Step(TOTAL_SKIPS_LAST, minutes=9),
    ), mistakes=("off_by_one",), score=0.55, hints=2, abandoned=True, prediction_state="slip"),
)


# --------------------------------------------------------------------------- generation (real judge)

def generate(challenges: dict[str, Challenge], runner) -> dict[str, Any]:
    """Judge the whole script for real. Slow (one sandbox run per test); run it when the story changes."""
    from codequest.analysis.probe import find_counterexample, probe
    from codequest.hints import LadderState, safe_hint
    from codequest.judge import judge
    from codequest.service import _internal, _robustness

    attempts = []
    for scripted in PRIYA:
        ch = challenges[scripted.challenge_id]
        ladder = LadderState()
        submissions, failed, best, record = [], 0, 0.0, None
        for n, step in enumerate(scripted.steps):
            result = judge(ch, step.code, runner)
            public = result.public() | {"events": {"mistakes": [m.key for m in result.mistakes]},
                                        "prediction": None, "robustness": None}
            if step.prediction:
                prompt = predict.find_prompt(ch, predict.prompt_id(ch.id, step.prediction["args"]))
                if prompt is None:
                    raise ValueError(f"{ch.id}: scripted prediction input {step.prediction['args']} is not a prompt")
                guess = predict.Guess(text=step.prediction["answer"])
                public["prediction"] = predict.evaluate(ch, step.code, runner, prompt, guess)
                record = {"prompt_id": prompt.id, "call": prompt.call(ch), "answer": guess.text, "crash": False,
                          "skipped": False, "state": public["prediction"]["state"]}
            if result.all_passed and not result.violations:
                public["robustness"] = _robustness(ch, probe(ch, step.code, runner))
            else:
                failed += 1
            best = max(best, result.hidden_pass_fraction())
            # One hint after each failing submission, as the live ladder's gate allows.
            while not result.all_passed and len(ladder.shown) < min(scripted.hints, n + 1):
                level = len(ladder.shown) + 1
                ce = find_counterexample(ch, step.code, runner) if level >= 2 else None
                hint = safe_hint(level, ch, result, step.code, ce, [h["text"] for h in ladder.shown])
                ladder.unlocked = level
                ladder.shown.append({"level": hint.level, "title": hint.title, "text": hint.text,
                                     "region": list(hint.region) if hint.region else None, "source": hint.source})
            submissions.append({"minutes": step.minutes, "code": step.code, "result": public,
                                "internal": _internal(result)})
        attempts.append({
            "challenge_id": ch.id, "days_ago": scripted.days_ago, "open": False,
            "abandoned": scripted.abandoned, "score": scripted.score, "mistakes": list(scripted.mistakes),
            "failed": failed, "best_hidden": best,
            "ladder": ladder.to_dict(), "prediction": record, "reflection": scripted.reflection,
            "submissions": submissions,
        })
    return {"version": FIXTURE_VERSION, "persona": "priya", "attempts": attempts}


# --------------------------------------------------------------------------- loading

_cache: dict[str, Any] = {}


def load(path: Path = FIXTURE) -> dict[str, Any] | None:
    """The committed fixture, or None if it is missing or from another version (the seed degrades to state only)."""
    key = str(path)
    if key not in _cache:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            _cache[key] = data if data.get("version") == FIXTURE_VERSION else None
        except (OSError, ValueError):
            _cache[key] = None
    return _cache[key]


def seed_state(state: LearnerState, challenges: dict[str, Challenge]) -> None:
    """Replay the story through the real learner-model functions so bands, Elo and Mistake Memory agree."""
    for scripted in PRIYA:
        ch = challenges.get(scripted.challenge_id)
        if ch is None:
            continue  # content changed; the remaining history still tells a consistent story
        start_attempt(state, ch.id)
        record_mistakes(state, list(scripted.mistakes))
        finish_attempt(state, ch, scripted.score)
        if scripted.prediction_state:
            record_prediction(state, {"challenge_id": ch.id, "concepts": ch.concepts.all,
                                      "state": scripted.prediction_state, "t": time.time() - scripted.days_ago * DAY})


def seed_rows(store, user_id: str, challenges: dict[str, Challenge], now: float | None = None) -> int:
    """Copy the fixture's attempts and submissions into the store. Returns the number of attempts written."""
    fixture = load()
    if fixture is None:
        return 0
    now = time.time() if now is None else now
    written = 0
    for a in fixture["attempts"]:
        if a["challenge_id"] not in challenges:
            continue
        started = now - a["days_ago"] * DAY
        attempt_id = store.import_attempt(user_id, a["challenge_id"], open_=a["open"], ladder=a["ladder"],
                                          failed=a["failed"], best_hidden=a["best_hidden"], created=started,
                                          prediction=a["prediction"], reflection=a["reflection"])
        for s in a["submissions"]:
            store.import_submission(user_id, attempt_id, a["challenge_id"], s["code"], s["result"], s["internal"],
                                    started + s["minutes"] * 60 + 1)
        written += 1
    return written


if __name__ == "__main__":  # pragma: no cover - maintenance command
    from codequest.content import load_all
    from codequest.sandbox.runner import LocalRunner

    data = generate(load_all(), LocalRunner())
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {FIXTURE} ({len(data['attempts'])} attempts)")
