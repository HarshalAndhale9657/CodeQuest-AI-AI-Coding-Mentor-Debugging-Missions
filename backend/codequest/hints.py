"""The never-the-answer hint ladder.

H1 Where  -> concept + a 2-4 line region
H2 What   -> mistake category + a generated counterexample (or the public edge-case list)
H3 Teach  -> mini-lesson on a DIFFERENT example + a self-explanation question
H4 Shape  -> the learner's OWN faulty line with one expression blanked
             (only when the reference has more than 2 statements)

Facts only accumulate (each level strictly extends the previous one), and the
union of everything unlocked passes the leak guard before it is shown.
"""

from __future__ import annotations

import ast
import hashlib
import io
import keyword
import re
import time
import tokenize
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from codequest.analysis.detectors import Finding
from codequest.analysis.probe import Counterexample
from codequest.content import Challenge
from codequest.judge import JudgeResult

COOLDOWN_S = 45
MAX_LEVEL = 4
CREDIT = {0: 1.0, 1: 0.9, 2: 0.75, 3: 0.6, 4: 0.4}
BLANK = "____"
ZERO_WIDTH = dict.fromkeys(map(ord, "​‌‍⁠﻿"), None)

MISTAKES: dict[str, dict[str, str]] = {
    "off_by_one": {
        "concept": "loop boundaries",
        "what": "Your loop seems to visit one position too few or too many.",
        "lesson": ("`range(a, b)` produces a, a+1, ... up to b-1: it stops *before* b. "
                   "Example on a different task: to print 1..n you write `range(1, n + 1)`."),
        "question": "Which index should the very last step of your loop use, and does your loop reach it?",
    },
    "empty_input": {
        "concept": "edge cases",
        "what": "Your code assumes there is at least one element, but some inputs have none.",
        "lesson": ("Guard clauses handle special inputs before the main work. Example on a different task: "
                   "`if not words: return \"\"` before joining words."),
        "question": "What should your function return when there is nothing to process, and where would you check that?",
    },
    "print_vs_return": {
        "concept": "functions and return values",
        "what": "Your function shows the answer with print() but gives nothing back to the caller.",
        "lesson": ("`print` only displays text; `return` hands a value back. Example on a different task: "
                   "a function that doubles x must `return x * 2`, not print it."),
        "question": "What value does a function give back if it never reaches a `return` statement?",
    },
    "missing_return": {
        "concept": "functions and return values",
        "what": "On some paths your function ends without returning a value, so it returns None.",
        "lesson": "Every path through a function should end in a `return` with the value the caller expects.",
        "question": "Which path through your function finishes without a `return`?",
    },
    "infinite_loop": {
        "concept": "loop termination",
        "what": "A loop can keep running forever because its condition never becomes false.",
        "lesson": ("A `while` loop stops only when its condition turns false, so every path through the body "
                   "must move it closer to that. Example: `while k < 10:` needs `k += 1` on every path, "
                   "even before a `continue`."),
        "question": "On which path through the loop body does the loop variable stay the same?",
    },
    "base_case": {
        "concept": "recursion",
        "what": "The recursion never reaches a stopping point.",
        "lesson": ("A recursive function needs a base case checked *before* the recursive call. "
                   "Example on a different task: `def countdown(k): if k == 0: return` comes first."),
        "question": "For which smallest input should your function answer directly, without calling itself?",
    },
    "bad_initial_value": {
        "concept": "initial values",
        "what": "A starting value is chosen so that some inputs can never beat it.",
        "lesson": ("Start a 'best so far' variable from a real element (or None), not from a guess like 0. "
                   "Example: the smallest of temperatures that are all above 50 is not 0."),
        "question": "If every number in the input is negative, what does your starting value do?",
    },
    "mutate_while_iterating": {
        "concept": "lists and loops",
        "what": "The list is changed while a loop is walking over it, so elements get skipped.",
        "lesson": "Build a new list instead of removing from the one you are looping over.",
        "question": "What happens to the loop's position when an element before it disappears?",
    },
    "shadow_builtin": {
        "concept": "names and built-ins",
        "what": "A variable reuses the name of a Python built-in, hiding the original.",
        "lesson": "Pick names like `total_sum` or `biggest` so built-ins like `sum()` and `max()` keep working.",
        "question": "Which of your variable names is also the name of a built-in function?",
    },
    "int_division": {
        "concept": "numbers and division",
        "what": "A division gives a slightly different number than expected.",
        "lesson": "`/` always gives a float; `//` rounds down to a whole number.",
        "question": "Should this result keep its decimal part?",
    },
}
GENERIC = {
    "concept": "reading your own code",
    "what": "Some inputs make your code give a different result than expected.",
    "lesson": "Trace your code by hand on a tiny input, writing down every variable after each line.",
    "question": "Which is the smallest input where your result would differ from the expected one?",
}


AUTHORED_SPANS = {
    span
    for info in [*MISTAKES.values(), GENERIC]
    for text in info.values()
    for span in re.findall(r"`([^`]+)`", text)
}


@dataclass
class Hint:
    level: int
    title: str
    text: str
    region: tuple[int, int] | None = None
    source: str = "template"


@dataclass
class LadderState:
    """Per-attempt hint state (persisted by the API)."""

    unlocked: int = 0
    unlocked_at: float = 0.0
    code_hash_at_unlock: str = ""
    shown: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"unlocked": self.unlocked, "unlocked_at": self.unlocked_at,
                "code_hash_at_unlock": self.code_hash_at_unlock, "shown": self.shown}

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "LadderState":
        data = data or {}
        return cls(int(data.get("unlocked", 0)), float(data.get("unlocked_at", 0.0)),
                   str(data.get("code_hash_at_unlock", "")), list(data.get("shown", [])))


def code_hash(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def max_level(ch: Challenge) -> int:
    return MAX_LEVEL if ch.reference_statement_count > 2 else 3


def gate(state: LadderState, ch: Challenge, latest_code: str, now: float | None = None) -> dict[str, Any]:
    """Whether the next level can unlock: needs a changed resubmission or the cooldown."""
    now = time.time() if now is None else now
    nxt = state.unlocked + 1
    if nxt > max_level(ch):
        return {"next_level": None, "available": False, "unlocks_in_s": None, "reason": "This is the last hint."}
    if state.unlocked == 0:
        return {"next_level": nxt, "available": True, "unlocks_in_s": 0, "reason": ""}
    changed = code_hash(latest_code) != state.code_hash_at_unlock
    waited = now - state.unlocked_at
    if changed or waited >= COOLDOWN_S:
        return {"next_level": nxt, "available": True, "unlocks_in_s": 0, "reason": ""}
    return {"next_level": nxt, "available": False, "unlocks_in_s": int(COOLDOWN_S - waited) + 1,
            "reason": "Try a change and resubmit, or wait a moment, before the next hint."}


# --------------------------------------------------------------------------- focus selection

def _focus(result: JudgeResult) -> tuple[str | None, Finding | None, int | None]:
    """Pick the mistake to hint about: fused mistakes first, then static findings, then a crash line."""
    by_key = {f.key: f for f in result.findings}
    for m in sorted(result.mistakes, key=lambda m: (m.line or 10**6)):
        if m.key in MISTAKES:
            return m.key, by_key.get(m.key), m.line
    if result.findings:
        f = result.findings[0]
        return f.key if f.key in MISTAKES else None, f, f.line
    crash = next((o.line for o in result.outcomes if o.visibility == "visible" and o.line), None)
    return None, None, crash


def _region(line: int | None, code: str, function: str) -> tuple[int, int] | None:
    if line is None:
        return None
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return (max(1, line - 1), line + 1)
    fn = next((n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == function), None)
    lo, hi = (fn.lineno, fn.end_lineno or line) if fn else (1, len(code.splitlines()))
    start, end = max(lo, line - 1), min(hi, line + 1)
    if end - start < 1:
        end = min(hi, start + 1)
    return (start, end)


def _blank_line(code: str, finding: Finding | None) -> str | None:
    if finding is None or finding.blank is None:
        return None
    line_no, start, end = finding.blank
    lines = code.splitlines()
    if not 0 < line_no <= len(lines):
        return None
    line = lines[line_no - 1]
    # ast columns are UTF-8 byte offsets
    raw = line.encode("utf-8")
    if not 0 <= start < end <= len(raw):
        return None
    blanked = (raw[:start] + BLANK.encode() + raw[end:]).decode("utf-8", "replace")
    return blanked.strip()


def build_hint(level: int, ch: Challenge, result: JudgeResult, code: str,
               counterexample: Counterexample | None) -> Hint:
    key, finding, line = _focus(result)
    info = MISTAKES.get(key or "", GENERIC)
    region = _region(line, code, ch.function)
    where = f"lines {region[0]}-{region[1]}" if region else f"your `{ch.function}` function"
    if level == 1:
        return Hint(1, "Where to look", f"This is about {info['concept']}. Look closely at {where}.", region)
    if level == 2:
        detail = counterexample.describe() if counterexample else (
            "Edge cases worth trying: " + "; ".join(ch.edge_cases) + "." if ch.edge_cases else "")
        return Hint(2, "What is going wrong", f"{info['what']} {detail}".strip(), region)
    if level == 3:
        return Hint(3, "Learn the idea", f"{info['lesson']} Now explain to yourself: {info['question']}", region)
    blanked = _blank_line(code, finding)
    if blanked and finding is not None:
        text = f"Line {finding.blank[0]} of your code: `{blanked}`. What belongs in the blank?"
    else:
        text = f"{info['question']} Write the answer as a one-line comment above {where}, then change the code to match."
    return Hint(4, "Fill the blank", text, region)


# --------------------------------------------------------------------------- leak guard

def _normalise(text: str) -> str:
    return unicodedata.normalize("NFKC", text).translate(ZERO_WIDTH)


def _code_tokens(code: str) -> list[str]:
    out = []
    try:
        for tok in tokenize.generate_tokens(io.StringIO(code).readline):
            if tok.type in (tokenize.NAME, tokenize.NUMBER, tokenize.OP, tokenize.STRING):
                out.append(tok.string)
    except (tokenize.TokenError, IndentationError, SyntaxError):
        out = re.findall(r"[A-Za-z_]\w*|\d+|\S", code)
    return out


def _statements(code: str) -> list[str]:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    stmts = []
    for node in ast.walk(tree):
        if isinstance(node, ast.stmt) and not isinstance(node, (ast.FunctionDef, ast.Pass)):
            if isinstance(node, (ast.If, ast.For, ast.While)):
                text = ast.unparse(node).split("\n", 1)[0]
            else:
                text = ast.unparse(node)
            stmts.append(re.sub(r"\s+", "", text))
    return stmts


def leak_check(texts: list[str], ch: Challenge, learner_code: str) -> tuple[bool, str]:
    """Deterministic guard over the UNION of all hint texts that would be visible."""
    union = _normalise("\n".join(texts))
    if "```" in union:
        return False, "fenced code is never allowed in hints"
    allowed = set(_code_tokens(learner_code)) | set(_code_tokens(ch.starter_code)) \
        | set(re.findall(r"[A-Za-z_]\w*|\d+", ch.description)) | set(keyword.kwlist) | {BLANK}
    avoid = set()
    for ref in ch.references:
        avoid |= {t for t in _code_tokens(ref) if re.fullmatch(r"[A-Za-z_]\w*|\d+", t)} - allowed
    spans = re.findall(r"`([^`]+)`", union)
    for span in spans:
        if BLANK in span or span in AUTHORED_SPANS:
            continue  # the learner's own blanked line, or vetted lesson text (checked in CI)
        for tok in re.findall(r"[A-Za-z_]\w*|\d+", span):
            if tok in avoid:
                return False, f"code token {tok!r} comes from the reference solution"
    squashed = re.sub(r"\s+", "", union.replace("`", ""))
    learner_stmts = set(_statements(learner_code))
    for ref in ch.references:
        for stmt in _statements(ref):
            if len(stmt) >= 10 and stmt not in learner_stmts and stmt in squashed:
                return False, "a statement of the reference solution appears in the hint"
    return True, ""


def safe_hint(level: int, ch: Challenge, result: JudgeResult, code: str,
              counterexample: Counterexample | None, previous_texts: list[str]) -> Hint:
    """Build the hint, check the union with everything already shown, fall back if needed."""
    hint = build_hint(level, ch, result, code, counterexample)
    ok, _ = leak_check([*previous_texts, hint.text], ch, code)
    if ok:
        return hint
    key, _, _ = _focus(result)
    info = MISTAKES.get(key or "", GENERIC)
    fallback = Hint(level, hint.title, f"{info['question']}", hint.region, source="fallback")
    ok, _ = leak_check([*previous_texts, fallback.text], ch, code)
    return fallback if ok else Hint(level, hint.title, GENERIC["question"], hint.region, source="fallback")
