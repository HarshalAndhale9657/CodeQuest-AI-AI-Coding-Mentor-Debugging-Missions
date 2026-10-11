"""Debug Journey: replay every judged submission of one attempt as a timeline of changes.

Each step compares a submission with the one before it: what changed in the code (a line diff) and what
changed in the results (tests passed, which tests fail). Code identity uses the AST, so a comment or
whitespace edit is a resubmission, and returning to an earlier version is a revert.

The summary labels the debugging style from the shape of the attempt: small changes that each move the
results forward look methodical; resubmitting the same code and flipping back and forth look like trial and
error, the "tinkering" Perkins et al. (1986) saw in weak novices. One or two submissions are too few to
judge, so short attempts get their own labels instead of a style.

It also reports an Error Quotient adapted from Jadud (2006) to test results instead of compiler errors.
Each consecutive pair scores +2 if both submissions fail, +3 if the same tests fail, +3 if they crash on the
same line and +1 if the edit touches the same spot as the previous one, divided by 9; the attempt's EQ is
the mean over pairs (0 = every resubmission changed the picture, 1 = stuck on the same failure).
"""

from __future__ import annotations

import ast
import difflib
import json
from typing import Any

FOCUSED_MAX_LINES = 3        # a change touching at most this many lines tests one idea
CONTEXT_LINES = 2
MAX_DIFF_ROWS = 400
PRODUCTIVE = frozenset({"progress", "solved"})
STYLES = ("first_try", "single", "quick_fix", "too_short", "methodical", "exploratory", "trial_and_error")
SELF_REPORTS = ("systematic", "mixed", "random")
MAX_NOTE_CHARS = 280
_STYLE_TO_SELF = {"first_try": "systematic", "quick_fix": "systematic", "methodical": "systematic",
                  "exploratory": "mixed", "trial_and_error": "random"}


def _result(row: dict[str, Any]) -> dict[str, Any] | None:
    raw = row.get("result")
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return None
    return raw if isinstance(raw, dict) and "tests" in raw else None


def fingerprint(code: str) -> str:
    """Equal for code that differs only in comments, blank lines or formatting."""
    try:
        return ast.dump(ast.parse(code))
    except SyntaxError:
        return "\n".join(line.rstrip() for line in code.strip().splitlines() if line.strip())


def _diff(before: str, after: str) -> dict[str, Any]:
    a, b = before.splitlines(), after.splitlines()
    matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
    added = removed = 0
    hunks: list[dict[str, Any]] = []
    rows_left = MAX_DIFF_ROWS
    for group in matcher.get_grouped_opcodes(CONTEXT_LINES):
        rows: list[dict[str, Any]] = []
        for tag, i1, i2, j1, j2 in group:
            if tag == "equal":
                rows += [{"t": " ", "a": i + 1, "b": j + 1, "text": a[i]} for i, j in zip(range(i1, i2), range(j1, j2))]
                continue
            removed += i2 - i1
            added += j2 - j1
            rows += [{"t": "-", "a": i + 1, "b": None, "text": a[i]} for i in range(i1, i2)]
            rows += [{"t": "+", "a": None, "b": j + 1, "text": b[j]} for j in range(j1, j2)]
        if rows_left > 0:
            hunks.append({"rows": rows[:rows_left]})
            rows_left -= len(rows)
    return {"added": added, "removed": removed, "focused": 0 < max(added, removed) <= FOCUSED_MAX_LINES,
            "hunks": hunks, "truncated": rows_left < 0}


def build(submissions: list[dict[str, Any]]) -> dict[str, Any]:
    """Steps and summary for one attempt's submissions (oldest first). Unjudged rows are skipped."""
    steps: list[dict[str, Any]] = []
    prints: list[str] = []
    codes: list[str] = []
    for row in sorted(submissions, key=lambda r: r["created"]):
        result = _result(row) if row.get("status") == "done" else None
        if result is None:
            continue
        tests = result.get("tests") or []
        hidden = [t for t in tests if t.get("visibility") == "hidden"]
        passed = sum(t.get("status") == "passed" for t in tests)
        failing = sorted(t.get("test_id", "") for t in tests if t.get("status") != "passed")
        error_line = next((t["line"] for t in tests if t.get("visibility") == "visible"
                           and t.get("status") == "runtime_error" and isinstance(t.get("line"), int)), None)
        fp = fingerprint(row["code"])
        prev = steps[-1] if steps else None
        revert_of = None
        if result.get("all_passed"):
            kind = "solved"
        elif prev is None:
            kind = "first"
        elif fp == prints[-1]:
            kind = "resubmit"
        elif fp in prints[:-1]:
            kind, revert_of = "revert", prints.index(fp) + 1
        elif passed > prev["passed"]:
            kind = "progress"
        elif passed < prev["passed"]:
            kind = "regression"
        else:
            kind = "sideways"
        steps.append({
            "index": len(steps) + 1,
            "submission_id": row["id"],
            "created": row["created"],
            "kind": kind,
            "revert_of": revert_of,
            "passed": passed,
            "total": len(tests),
            "hidden_passed": sum(t.get("status") == "passed" for t in hidden),
            "hidden_total": len(hidden),
            "all_passed": bool(result.get("all_passed")),
            "syntax_error": bool(result.get("syntax_error")),
            "failing": failing,
            "error_line": error_line,
            "mistakes": list((result.get("events") or {}).get("mistakes") or []),
            "delta": None if prev is None else passed - prev["passed"],
            "change": None if prev is None else _diff(codes[-1], row["code"]),
            "code": row["code"],
        })
        prints.append(fp)
        codes.append(row["code"])
    return {"steps": steps, "summary": summarize(steps)}


def _touched(change: dict[str, Any] | None, side: str) -> set[int]:
    """Line numbers a change wrote ("after", in the new version) or replaced ("before", in the old one)."""
    if not change:
        return set()
    key, mark = ("b", "+") if side == "after" else ("a", "-")
    return {r[key] for h in change["hunks"] for r in h["rows"] if r["t"] == mark}


def error_quotient(steps: list[dict[str, Any]]) -> float | None:
    pairs = list(zip(steps, steps[1:]))
    if not pairs:
        return None
    total = 0.0
    for prev, cur in pairs:
        if prev["all_passed"] or cur["all_passed"]:
            continue
        score = 2
        if prev["failing"] == cur["failing"]:
            score += 3
        if prev["error_line"] is not None and prev["error_line"] == cur["error_line"]:
            score += 3
        before, now = _touched(prev["change"], "after"), _touched(cur["change"], "before")
        if any(abs(a - b) <= 1 for a in before for b in now):
            score += 1
        total += score / 9
    return round(total / len(pairs), 3)


def summarize(steps: list[dict[str, Any]]) -> dict[str, Any]:
    pairs = steps[1:]
    kinds = [s["kind"] for s in pairs]
    productive = sum(k in PRODUCTIVE for k in kinds)
    focused = sum(bool(s["change"] and s["change"]["focused"]) for s in pairs)
    resubmits, reverts = kinds.count("resubmit"), kinds.count("revert")
    ratio = round(productive / len(pairs), 3) if pairs else None
    focused_share = round(focused / len(pairs), 3) if pairs else None
    if not steps:
        style = None
    elif len(steps) == 1:
        style = "first_try" if steps[0]["all_passed"] else "single"
    elif len(pairs) == 1:
        style = "quick_fix" if kinds[0] in PRODUCTIVE and focused else "too_short"
    elif resubmits + reverts >= 2 or (ratio is not None and ratio < 0.34
                                      and ((focused_share or 0) < 0.5 or resubmits + reverts >= 1)):
        style = "trial_and_error"
    elif ratio is not None and ratio >= 0.5 and (focused_share or 0) >= 0.6:
        style = "methodical"
    else:
        style = "exploratory"
    return {
        "submissions": len(steps),
        "solved": bool(steps and steps[-1]["all_passed"]),
        "productive": productive,
        "regressions": kinds.count("regression"),
        "resubmits": resubmits,
        "reverts": reverts,
        "productive_ratio": ratio,
        "focused_share": focused_share,
        "error_quotient": error_quotient(steps),
        "style": style,
    }


def agreement(style: str | None, reflection: dict[str, Any] | None) -> str | None:
    """How the learner's own reading of their debugging compares with the data: agrees | close | differs."""
    if not reflection or style not in _STYLE_TO_SELF:
        return None
    said, data = reflection.get("strategy"), _STYLE_TO_SELF[style]
    if said not in SELF_REPORTS:
        return None
    if said == data:
        return "agrees"
    return "close" if abs(SELF_REPORTS.index(said) - SELF_REPORTS.index(data)) == 1 else "differs"
