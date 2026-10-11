"""Syntax Warm-up: accuracy-first code typing drills, personalised to the learner (plan §5.13).

* Corpus: `content/typing/snippets.json`, real Python idioms validated on load.
* Own code: 3-15 line functions from the learner's own *passing* submissions (re-printed by `ast`,
  so comments are dropped and indentation is a clean 4 spaces). Never code from unsolved missions.
* Ranking: snippets for the learner's weakest concepts and dense in the characters behind their
  recurring `syntax:*` mistakes come first; snippets typed in the last few runs go last.
* Results are computed on the server from the snippet the learner actually typed: the client sends
  how many characters were typed and which keys were wrong, never its own speed or accuracy.
"""

from __future__ import annotations

import ast
import json
import statistics
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

CORPUS_PATH = Path(__file__).resolve().parents[2] / "content" / "typing" / "snippets.json"

SYNTAX_CHARS = frozenset(":()[]{}'\"=,")
MAX_HUMAN_CPM = 1500          # ~300 WPM: faster than any human typist, so a result above it is rejected
PACE_STEP = 1.05              # pace caret: recent median + 5%
PACE_MIN_ACCURACY = 0.95      # ...shown only once accuracy is high enough (accuracy before speed)
MAX_OWN_LINES = 15
MAX_OWN_CHARS = 700

# Which characters each syntax mistake is about (used to rank snippets for that learner).
SYNTAX_FOCUS: dict[str, frozenset[str]] = {
    "syntax:missing_colon": frozenset(":"),
    "syntax:brackets": frozenset("()[]{}"),
    "syntax:string": frozenset("'\""),
    "syntax:assign_vs_compare": frozenset("="),
    "syntax:indentation": frozenset(" "),
    "syntax:other": frozenset(":()[]{}'\"=,"),
}


@dataclass(frozen=True)
class Snippet:
    id: str
    title: str
    concept: str
    code: str
    source: str = "corpus"       # "corpus" | "own"

    def public(self) -> dict[str, Any]:
        return {"id": self.id, "title": self.title, "concept": self.concept, "code": self.code,
                "source": self.source, "lines": self.code.count("\n") + 1, "chars": len(self.code)}


def _check_code(code: str, where: str) -> None:
    if not code or "\t" in code or "\r" in code:
        raise ValueError(f"{where}: empty, or contains tabs or carriage returns")
    if any(not (32 <= ord(c) < 127 or c == "\n") for c in code):
        raise ValueError(f"{where}: only printable ASCII can be typed")
    if any(line != line.rstrip() for line in code.split("\n")):
        raise ValueError(f"{where}: trailing whitespace can't be seen, so it can't be typed")
    try:
        ast.parse(code)
    except SyntaxError as exc:
        raise ValueError(f"{where}: not valid Python ({exc.msg})") from exc


@lru_cache(maxsize=1)
def load_corpus() -> tuple[Snippet, ...]:
    raw = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    seen: set[str] = set()
    out = []
    for i, item in enumerate(raw):
        sid = item.get("id", "")
        if not sid or sid in seen or sid.startswith("own-"):
            raise ValueError(f"typing snippet {i}: missing, duplicate or reserved id {sid!r}")
        _check_code(item.get("code", ""), sid)
        seen.add(sid)
        out.append(Snippet(sid, item["title"], item["concept"], item["code"]))
    return tuple(out)


def own_snippets(solved: Iterable[tuple[str, str, str, str]]) -> list[Snippet]:
    """(challenge_id, title, concept, code) of passing submissions -> typeable snippets of the learner's code."""
    out: list[Snippet] = []
    for challenge_id, title, concept, code in solved:
        try:
            tree = ast.parse(code)
        except (SyntaxError, ValueError):
            continue
        func = next((n for n in tree.body if isinstance(n, ast.FunctionDef)), None)
        if func is None:
            continue
        text = ast.unparse(func)
        lines = text.split("\n")
        if not 3 <= len(lines) <= MAX_OWN_LINES or len(text) > MAX_OWN_CHARS:
            continue
        try:
            _check_code(text, challenge_id)
        except ValueError:
            continue
        out.append(Snippet(f"own-{challenge_id}", f"Your solution: {title}", concept, text, "own"))
    return out


def syntax_char_count(code: str) -> int:
    return sum(1 for c in code if c in SYNTAX_CHARS)


def _focus_density(code: str, focus: list[str]) -> float:
    chars = set().union(*(SYNTAX_FOCUS.get(k, frozenset()) for k in focus)) if focus else set()
    if not chars:
        return 0.0
    if chars == {" "}:  # indentation: share of indented lines
        lines = code.split("\n")
        return sum(1 for l in lines if l.startswith("    ")) / len(lines)
    return sum(1 for c in code if c in chars) / max(1, len(code))


def recommend(corpus: Iterable[Snippet], own: list[Snippet], weak_concepts: list[str],
              syntax_focus: list[str], recent_ids: list[str]) -> list[dict[str, Any]]:
    """All drills, best first, each with the reason it was picked."""
    recent = set(recent_ids[-5:])
    weak_rank = {c: i for i, c in enumerate(weak_concepts)}
    scored: list[tuple[float, int, dict[str, Any]]] = []
    for order, snippet in enumerate([*own, *corpus]):
        score = 0.0
        if snippet.source == "own":
            score += 2.5 if syntax_focus else 1.0
            reason = "Built from your own passing code"
        elif snippet.concept in weak_rank:
            score += 2.0 - 0.1 * weak_rank[snippet.concept]
            reason = f"Practises {snippet.concept.replace('_', ' ')}, which you're still learning"
        else:
            reason = "General Python fluency"
        density = _focus_density(snippet.code, syntax_focus)
        if syntax_focus and density > 0:
            score += min(1.5, density * 15)
            if snippet.source != "own" and snippet.concept not in weak_rank:
                reason = "Lots of the characters behind your recurring syntax slip"
        if snippet.id in recent:
            score -= 3.0
        scored.append((score, order, snippet.public() | {"reason": reason}))
    scored.sort(key=lambda s: (-s[0], s[1]))
    drills = [s[2] for s in scored]
    for i, drill in enumerate(drills):
        drill["recommended"] = i < 3
    return drills


def typed_chars(code: str, auto_indent: bool) -> int:
    """Characters the learner must type: everything, minus leading indentation when the trainer auto-indents."""
    if not auto_indent:
        return len(code)
    return len(code) - sum(len(line) - len(line.lstrip(" ")) for line in code.split("\n"))


def compute_run(code: str, auto_indent: bool, errors: dict[str, int], duration_ms: int,
                syntax_errors: int) -> dict[str, Any]:
    """Server-side scoring of a completed run. Raises ValueError with a learner-facing message if impossible.

    The trainer is accuracy-first: a wrong key never advances the caret, so a finished run typed every
    character once correctly, and keystrokes = characters + wrong keys.
    """
    chars = typed_chars(code, auto_indent)
    if any(v < 0 for v in errors.values()):
        raise ValueError("Error counts can't be negative.")
    error_total = sum(errors.values())
    if syntax_errors < 0 or syntax_errors > error_total:
        raise ValueError("Syntax errors can't exceed the total number of errors.")
    cpm = chars / (duration_ms / 60_000)
    if cpm > MAX_HUMAN_CPM:
        raise ValueError("That run is faster than humanly possible, so it wasn't saved.")
    accuracy = chars / (chars + error_total)
    syntax_total = syntax_char_count(code)
    syntax_accuracy = syntax_total / (syntax_total + syntax_errors) if syntax_total else None
    return {"cpm": round(cpm, 1), "wpm": round(cpm / 5, 1), "accuracy": round(accuracy, 4),
            "syntax_accuracy": round(syntax_accuracy, 4) if syntax_accuracy is not None else None,
            "chars": chars, "errors": error_total, "duration_ms": duration_ms}


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Rows newest first (cpm, accuracy, syntax_accuracy, errors JSON, snippet_id, created)."""
    if not rows:
        return None
    last10 = rows[:10]
    accurate = [r["cpm"] for r in last10 if r["accuracy"] >= PACE_MIN_ACCURACY]
    pace = round(statistics.median(accurate[:5]) * PACE_STEP, 1) if len(accurate) >= 3 else None
    syntax = [r["syntax_accuracy"] for r in last10 if r.get("syntax_accuracy") is not None]
    errors: Counter[str] = Counter()
    for r in rows[:20]:
        try:
            errors.update({k: int(v) for k, v in json.loads(r["errors"] or "{}").items()})
        except (ValueError, TypeError, AttributeError):
            continue
    best = max(r["cpm"] for r in rows)
    return {
        "best_cpm": round(best, 1),
        "best_wpm": round(best / 5, 1),
        "accuracy": round(statistics.fmean(r["accuracy"] for r in last10), 3),
        "syntax_accuracy": round(statistics.fmean(syntax), 3) if syntax else None,
        "runs": len(rows),
        "pace_cpm": pace,
        "top_errors": [[k, n] for k, n in errors.most_common(6)],
        "recent": [{"cpm": round(r["cpm"], 1), "wpm": round(r["cpm"] / 5, 1), "accuracy": round(r["accuracy"], 3),
                    "snippet_id": r["snippet_id"], "created": r["created"]} for r in reversed(rows[:20])],
    }
