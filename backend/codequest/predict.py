"""Predict Before You Run: one question before the first judged submission of an attempt.

The learner predicts what THEIR code returns for one small input. Comparing the prediction (P) with what
the code actually returned (A) and the correct answer (E) separates kinds of understanding that a
pass/fail verdict cannot. Evidence: predicting before running is PRIMM's first step (Sentance et al. 2019,
though there learners predict given code); tracing and explaining code account for much of novices'
code-writing ability (Lister et al. 2004; Lopez et al. 2008); and working out one input's expected output
before coding raised completion rates in an autograder (Prather et al. 2019). Predicting one's OWN code is
closest to the tracing work, so we treat it as a diagnostic signal, kept out of the Elo skill estimate:

    P = A = E    aligned        understands both the code and the problem
    P = E != A   slip           knows the answer, but the code does not do what they think
    P = A != E   misconception  traced their own code perfectly; the plan itself is wrong
    A = E != P   lucky          the code is right, but not for the reason they think
    all differ   lost

Prompts come from the counterexample finder's small-input domain, which excludes every visible and hidden
test input: a shown example would let the learner copy its expected output, a hidden one would leak.
The correct answer comes from the trusted reference on the host. The correct answer is only shown when the
learner already knows it (slip) or their code produced it (aligned, lucky): otherwise it would be a
counterexample handed out before the hint ladder allows one.
"""

from __future__ import annotations

import ast
import hashlib
import json
from dataclasses import dataclass
from typing import Any

from codequest.analysis.probe import domain
from codequest.compare import short_repr, values_equal
from codequest.content import Challenge
from codequest.judge import run_case
from codequest.sandbox.runner import Runner

MAX_ANSWER_CHARS = 200
POOL_SIZE = 6
STATES = ("aligned", "slip", "misconception", "lucky", "lost")
TRACED = frozenset({"aligned", "misconception"})       # P = A: the learner can read their own code
KNEW_ANSWER = frozenset({"aligned", "slip"})            # P = E: the learner understands the task
LUCKY_FLAG = 2               # lucky passes in one concept before it is flagged
UNTRACED_MIN = 3             # predictions in a concept before low tracing is flagged
UNTRACED_RATE = 0.5

# Which input features expose each trap. A prompt that hits the mission's trap is the most informative one.
TRAP_FEATURES: dict[str, dict[str, float]] = {
    "bad_initial_value": {"all_negative": 3},
    "negatives": {"has_negative": 2},
    "empty_input": {"empty": 1},
    "off_by_one": {"long": 2, "last_matters": 1},
    "window_off_by_one": {"long": 2},
    "duplicates": {"duplicates": 3},
    "mutate_while_iterating": {"adjacent_dupes": 3},
    "base_case": {"tiny_int": 2},
    "case_sensitivity": {"mixed_case": 3},
    "whitespace": {"edge_space": 2, "double_space": 2},
    "closer_first": {"starts_closer": 3},
    "leftover_openers": {"ends_opener": 3},
}
GENERIC_FEATURES = {"traceable": 1.0, "varied": 0.5}   # small enough to trace by hand, not all one value


class AnswerError(ValueError):
    pass


@dataclass(frozen=True)
class Prompt:
    id: str
    args: list[Any]

    def call(self, ch: Challenge) -> str:
        return f"{ch.function}({', '.join(short_repr(a) for a in self.args)})"

    def public(self, ch: Challenge) -> dict[str, Any]:
        return {"prompt_id": self.id, "call": self.call(ch)}


@dataclass(frozen=True)
class Guess:
    text: str = ""
    crash: bool = False      # "it raises an error (or never finishes)"
    skipped: bool = False


@dataclass(frozen=True)
class Observed:
    kind: str                # "value" | "error" | "timeout"
    value: Any = None
    error: str | None = None


# --------------------------------------------------------------------------- answers

_WORDS = {"none": None, "null": None, "true": True, "false": False}


def parse_answer(text: str) -> Any:
    """A Python or JSON literal; anything else is taken as a plain string (learners rarely type quotes)."""
    stripped = (text or "").strip()
    if not stripped:
        raise AnswerError("Type what you think your code returns, or choose \"it raises an error\".")
    if len(stripped) > MAX_ANSWER_CHARS:
        raise AnswerError(f"Keep the prediction under {MAX_ANSWER_CHARS} characters.")
    if stripped.lower() in _WORDS:
        return _WORDS[stripped.lower()]
    try:
        return ast.literal_eval(stripped)
    except (ValueError, SyntaxError, TypeError, MemoryError, RecursionError):
        pass
    try:
        return json.loads(stripped)
    except ValueError:
        return stripped


def _loose(value: Any) -> Any:
    """Predictions are about values, not container spelling: a typed list matches a returned tuple."""
    if isinstance(value, (list, tuple)):
        return [_loose(v) for v in value]
    if isinstance(value, dict):
        return {k: _loose(v) for k, v in value.items()}
    return value


def _guess_matches(guess: Guess, kind: str, value: Any, unordered: bool) -> bool:
    if guess.crash:
        return kind != "value"
    if kind != "value":
        return False
    if values_equal(_loose(parse_answer(guess.text)), _loose(value), unordered=unordered):
        return True
    return isinstance(value, str) and guess.text.strip() == value  # unquoted text for a string answer


def classify(guess: Guess, actual: Observed, expected: Any, *, unordered: bool = False) -> str:
    knows_code = _guess_matches(guess, actual.kind, actual.value, unordered)
    if actual.kind == "value" and values_equal(actual.value, expected, unordered=unordered):
        return "aligned" if knows_code else "lucky"
    if knows_code:
        return "misconception"
    if _guess_matches(guess, "value", expected, unordered):
        return "slip"
    return "lost"


# --------------------------------------------------------------------------- prompts

def prompt_id(challenge_id: str, args: list[Any]) -> str:
    return hashlib.sha256(f"{challenge_id}\0{args!r}".encode()).hexdigest()[:12]


def _features(args: list[Any]) -> set[str]:
    found: set[str] = set()
    for a in args:
        if isinstance(a, list):
            if not a:
                found.add("empty")
                continue
            distinct = len({repr(x) for x in a})
            numbers = [x for x in a if isinstance(x, int) and not isinstance(x, bool)]
            if numbers and len(numbers) == len(a) and all(x < 0 for x in numbers):
                found.add("all_negative")
            if any(x < 0 for x in numbers):
                found.add("has_negative")
            if distinct < len(a):
                found.add("duplicates")
            if any(x == y for x, y in zip(a, a[1:])):
                found.add("adjacent_dupes")
            if len(a) >= 3:
                found.add("long")
            if numbers and a[-1] in numbers and a[-1] > 0 and a.count(a[-1]) == 1:
                found.add("last_matters")  # a loop that stops one early visibly loses it
            if 2 <= len(a) <= 3:
                found.add("traceable")
            if len(a) >= 2 and distinct == len(a):
                found.add("varied")
        elif isinstance(a, str):
            if not a:
                found.add("empty")
                continue
            if any(c.isupper() for c in a) and any(c.islower() for c in a):
                found.add("mixed_case")
            if a[0] == " " or a[-1] == " ":
                found.add("edge_space")
            if "  " in a:
                found.add("double_space")
            if a[0] in ")]}":
                found.add("starts_closer")
            if a[-1] in "([{":
                found.add("ends_opener")
            if len(a) >= 3:
                found.add("long")
            if 2 <= len(a) <= 4:
                found.add("traceable")
            if len(set(a)) > 1:
                found.add("varied")
        elif isinstance(a, int) and not isinstance(a, bool):
            if a in (0, 1):
                found.add("tiny_int")
            found.add("traceable")
    return found


def _score(features: set[str], traps: list[str]) -> float:
    score = sum(GENERIC_FEATURES.get(f, 0.0) for f in features)
    for trap in traps:
        weights = TRAP_FEATURES.get(trap, {})
        score += sum(weights.get(f, 0.0) for f in features)
    return score


_pool_cache: dict[str, list[Prompt]] = {}


def prompts(ch: Challenge) -> list[Prompt]:
    """The best few questions for this mission: they hit its trap and are small enough to trace by hand."""
    pool = _pool_cache.get(ch.id)
    if pool is None:
        cases = [args for args, _ in domain(ch)]
        ranked = sorted(range(len(cases)), key=lambda i: (-_score(_features(cases[i]), ch.traps), i))
        pool = [Prompt(prompt_id(ch.id, cases[i]), cases[i]) for i in ranked[:POOL_SIZE]]
        _pool_cache[ch.id] = pool
    return pool


def prompt_for(ch: Challenge, seed: str) -> Prompt | None:
    """A stable question per seed (learner + mission + attempt), so a reload asks the same thing."""
    pool = prompts(ch)
    if not pool:
        return None
    return pool[int(hashlib.sha256(seed.encode()).hexdigest(), 16) % len(pool)]


def find_prompt(ch: Challenge, pid: str) -> Prompt | None:
    for p in prompts(ch):
        if p.id == pid:
            return p
    return next((Prompt(pid, args) for args, _ in domain(ch) if prompt_id(ch.id, args) == pid), None)


# --------------------------------------------------------------------------- evaluation

def _observed(ch: Challenge, code: str, runner: Runner, args: list[Any], expected: Any) -> Observed:
    outcome = run_case(ch, code, runner, args, expected)
    if outcome.status in ("passed", "wrong_output"):
        unreadable = outcome.subtype == "output_limit" or (outcome.label and outcome.label.key == "unsupported_type")
        return Observed("error", error="an unreadable value") if unreadable else Observed("value", outcome.got)
    if outcome.status == "timeout":
        return Observed("timeout")
    return Observed("error", error=outcome.exc_type or "an error")


def _describe(obs: Observed) -> str:
    if obs.kind == "value":
        return short_repr(obs.value)
    if obs.kind == "timeout":
        return "did not finish in time"
    return f"raised {obs.error}"


def _message(state: str, obs: Observed, guess: Guess, predicted: str, expected: str) -> str:
    actual = _describe(obs)
    if state == "aligned":
        return "Spot on: you knew exactly what your code would do, and it is right for this input."
    if state == "slip":
        did = f"returns {actual}" if obs.kind == "value" else actual
        return (f"You know the answer is {expected}, but your code {did}. Your understanding is fine; the code "
                "doesn't do what you think. Trace it line by line with this input.")
    if state == "misconception":
        if obs.kind != "value":
            return "You expected it to fail, and it did. Fix this case before you move on."
        return (f"Your code does exactly what you expected, so it matches your plan. But {actual} is not the right "
                "answer for this input: re-read the task with this case in mind.")
    if state == "lucky":
        return (f"Your code gets this right ({actual}), but you expected {predicted}. Work out why it is right "
                "before you move on: next time it may not be.")
    return ("Your prediction, your code and the correct answer all differ. Walk through the input by hand, "
            "one line at a time.")


def evaluate(ch: Challenge, code: str, runner: Runner, prompt: Prompt, guess: Guess) -> dict[str, Any]:
    """Run the code on the prompt's input and place the learner in the P/A/E matrix (one sandbox call)."""
    expected = next((exp for args, exp in domain(ch) if args == prompt.args), None)
    unordered = bool(ch.tests) and all(t.compare == "unordered" for t in ch.tests)
    observed = _observed(ch, code, runner, prompt.args, expected)
    state = classify(guess, observed, expected, unordered=unordered)
    predicted = "an error" if guess.crash else short_repr(parse_answer(guess.text))
    shown = short_repr(expected)
    return {
        "prompt_id": prompt.id,
        "call": prompt.call(ch),
        "state": state,
        "traced": state in TRACED,
        "predicted": predicted,
        "actual": _describe(observed),
        "expected": shown if state in ("aligned", "slip", "lucky") else None,
        "message": _message(state, observed, guess, predicted, shown),
    }


# --------------------------------------------------------------------------- learner summary

def summarize(records: list[dict[str, Any]], bands: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Prediction accuracy overall and per concept, with flags for skill that tests show but tracing doesn't."""
    answered = [r for r in records if r.get("state") in STATES]
    if not answered:
        return None
    band_of = {b["concept"]: b["band"] for b in bands}
    per: dict[str, dict[str, Any]] = {}
    for r in answered:
        for concept in r.get("concepts") or []:
            row = per.setdefault(concept, {"concept": concept, "total": 0, "traced": 0, "lucky": 0})
            row["total"] += 1
            row["traced"] += r["state"] in TRACED
            row["lucky"] += r["state"] == "lucky"
    by_concept = []
    for concept, row in sorted(per.items()):
        flag = None
        if row["lucky"] >= LUCKY_FLAG:
            flag = "lucky_passes"
        elif (row["total"] >= UNTRACED_MIN and row["traced"] / row["total"] < UNTRACED_RATE
              and band_of.get(concept) in ("almost", "mastered")):
            flag = "untraced_skill"
        by_concept.append(row | {"flag": flag})
    return {
        "total": len(answered),
        "traced": sum(r["state"] in TRACED for r in answered),
        "knew_answer": sum(r["state"] in KNEW_ANSWER for r in answered),
        "by_state": {s: sum(r["state"] == s for r in answered) for s in STATES},
        "by_concept": by_concept,
    }
