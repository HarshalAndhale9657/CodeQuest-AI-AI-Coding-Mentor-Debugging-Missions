"""The judge: run every test in a fresh sandbox process, compare on the host,
diagnose, and produce a disclosure-safe public result.
"""

from __future__ import annotations

import ast
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any

from codequest.analysis import explain
from codequest.analysis.detectors import Finding, run_detectors
from codequest.analysis.shape import LABELS, ShapeLabel, classify
from codequest.compare import DecodeError, decode, encode_args, short_repr, values_equal
from codequest.content import Challenge, TestCase
from codequest.sandbox.runner import Limits, RawRun, Runner

VERDICTS = ("passed", "wrong_output", "runtime_error", "timeout")
MAX_CODE_BYTES = 64 * 1024


@dataclass
class TestOutcome:
    test_id: str
    index: int
    visibility: str
    status: str                           # one of VERDICTS
    tags: list[str]
    coarse_category: str
    subtype: str | None = None            # exception | memory_limit | blocked | sandbox_terminated | syntax | output_limit
    exc_type: str | None = None
    exc_message: str | None = None
    line: int | None = None
    locals: dict[str, str] = field(default_factory=dict)
    label: ShapeLabel | None = None
    got: Any = None
    expected: Any = None
    args: list[Any] = field(default_factory=list)
    stdout: str = ""
    explanation: str = ""

    def public(self) -> dict[str, Any]:
        """Disclosure policy (plan §5.5 + §16): hidden tests expose only #, verdict, coarse category."""
        if self.visibility == "hidden":
            return {
                "test_id": self.test_id,
                "index": self.index,
                "visibility": "hidden",
                "status": self.status,
                "category": self.coarse_category,
                "explanation": self.explanation,
            }
        return {
            "test_id": self.test_id,
            "index": self.index,
            "visibility": "visible",
            "status": self.status,
            "category": self.tags[0],
            "subtype": self.subtype,
            "input": ", ".join(short_repr(a) for a in self.args),
            "expected": short_repr(self.expected),
            "actual": None if self.status in ("runtime_error", "timeout") else short_repr(self.got),
            "exception_type": self.exc_type,
            "raw_message": self.exc_message,
            "line": self.line,
            "locals": self.locals,
            "label": self.label.key if self.label else None,
            "stdout": self.stdout[:2000],
            "explanation": self.explanation,
        }


@dataclass
class MistakeEvent:
    key: str
    evidence: str            # "static+dynamic" | "dynamic"
    line: int | None = None


@dataclass
class JudgeResult:
    challenge_id: str
    outcomes: list[TestOutcome]
    findings: list[Finding]
    mistakes: list[MistakeEvent]
    syntax_error: dict[str, Any] | None = None
    summary: str = ""
    runner: str = ""

    @property
    def counts(self) -> dict[str, int]:
        counts = {v: 0 for v in VERDICTS}
        for o in self.outcomes:
            counts[o.status] += 1
        return counts

    @property
    def all_passed(self) -> bool:
        return all(o.status == "passed" for o in self.outcomes)

    def hidden_pass_fraction(self) -> float:
        hidden = [o for o in self.outcomes if o.visibility == "hidden"]
        return sum(o.status == "passed" for o in hidden) / len(hidden) if hidden else 0.0

    def public(self) -> dict[str, Any]:
        return {
            "challenge_id": self.challenge_id,
            "counts": self.counts,
            "all_passed": self.all_passed,
            "syntax_error": self.syntax_error,
            "summary": self.summary,
            "tests": [o.public() for o in self.outcomes],
            "notes": [{"line": f.line, "message": f.message, "key": f.key} for f in self.findings],
            "runner": self.runner,
        }


# --------------------------------------------------------------------------- verdict mapping

def _verdict(raw: RawRun, test: TestCase) -> tuple[str, dict[str, Any]]:
    """Map a raw run to one of the 4 verdicts plus details. Comparison happens here, on the host."""
    p = raw.payload
    if raw.outcome == "output_limit":
        return "wrong_output", {"subtype": "output_limit", "label": LABELS["output_limit"]}
    if p is None:
        if raw.outcome == "timeout":
            return "timeout", {}
        if raw.oom_killed:
            return "runtime_error", {"subtype": "memory_limit", "exc_type": "MemoryError", "exc_message": "memory limit exceeded"}
        return "runtime_error", {"subtype": "sandbox_terminated", "exc_type": "SandboxTerminated",
                                 "exc_message": "the program stopped without producing a result"}
    kind = p.get("kind")
    stdout = p.get("stdout") or ""
    if kind == "timeout":
        return "timeout", {"stdout": stdout}
    if kind == "exception":
        message = str(p.get("message") or "")
        subtype = "blocked" if message.startswith("CodeQuest sandbox: ") else (
            "memory_limit" if p.get("exc_type") == "MemoryError" else "exception")
        return "runtime_error", {
            "subtype": subtype, "exc_type": p.get("exc_type"), "exc_message": message,
            "line": p.get("line") if isinstance(p.get("line"), int) else None,
            "locals": {str(k): str(v)[:200] for k, v in (p.get("locals") or {}).items()} if isinstance(p.get("locals"), dict) else {},
            "stdout": stdout,
        }
    if kind == "missing_function":
        return "runtime_error", {"subtype": "exception", "exc_type": "NameError",
                                 "exc_message": "function not defined"}
    if kind == "unencodable":
        return "wrong_output", {"label": LABELS["unsupported_type"], "stdout": stdout}
    if kind == "syntax_error":
        return "runtime_error", {"subtype": "syntax"}
    if kind == "ok":
        try:
            got = decode(p.get("value"))
        except DecodeError:
            return "wrong_output", {"label": LABELS["unsupported_type"], "stdout": stdout}
        if values_equal(got, test.expected, unordered=test.compare == "unordered"):
            return "passed", {"got": got, "stdout": stdout}
        return "wrong_output", {"got": got, "stdout": stdout,
                                "label": classify(got, test.expected, test.args, stdout)}
    return "runtime_error", {"subtype": "sandbox_terminated", "exc_type": "SandboxTerminated",
                             "exc_message": "unexpected result"}


# --------------------------------------------------------------------------- mistake fusion

SYNTAX_PATTERNS = (
    ("expected ':'", "syntax:missing_colon"),
    ("was never closed", "syntax:brackets"),
    ("unmatched", "syntax:brackets"),
    ("does not match opening", "syntax:brackets"),
    ("indent", "syntax:indentation"),
    ("Maybe you meant '=='", "syntax:assign_vs_compare"),
    ("unterminated string", "syntax:string"),
)


def classify_syntax(message: str) -> str:
    for needle, key in SYNTAX_PATTERNS:
        if needle in message:
            return key
    return "syntax:other"


def fuse_mistakes(findings: list[Finding], outcomes: list[TestOutcome]) -> list[MistakeEvent]:
    """Record a mistake only on an unambiguous runtime signal, or when static and runtime evidence agree."""
    failing = [o for o in outcomes if o.status != "passed"]
    static = {}
    for f in findings:
        static.setdefault(f.key, f)
    events: dict[str, MistakeEvent] = {}

    def add(key: str, evidence: str) -> None:
        if key not in events:
            finding = static.get(key)
            events[key] = MistakeEvent(key, evidence, finding.line if finding else None)

    labels = [o.label.key for o in failing if o.label]
    exc = [(o.exc_type or "", o.exc_message or "", set(o.tags)) for o in failing if o.status == "runtime_error"]

    # Unambiguous runtime signatures.
    if "printed_not_returned" in labels:
        add("print_vs_return", "dynamic")
    if any(t == "RecursionError" for t, _, _ in exc):
        add("base_case", "static+dynamic" if "base_case" in static else "dynamic")
    if any(t == "TypeError" and "not callable" in m for t, m, _ in exc) and "shadow_builtin" in static:
        add("shadow_builtin", "static+dynamic")
    if labels.count("returned_none") >= 2 and "print_vs_return" not in events:
        add("missing_return", "dynamic")
    if labels.count("close_float") >= 2:
        add("int_division", "dynamic")
    empty_crash = any(tags & {"empty", "zero", "absent"} and t in ("ZeroDivisionError", "IndexError", "ValueError")
                      for t, _, tags in exc)
    if empty_crash:
        add("empty_input", "static+dynamic" if "empty_input" in static else "dynamic")

    # Static + dynamic agreement.
    off_signal = (
        sum(1 for k in labels if LABELS[k].mistake == "off_by_one") >= 1
        or any(t == "IndexError" for t, _, _ in exc)
        or any("boundary" in o.tags for o in failing)
    )
    if "off_by_one" in static and off_signal:
        add("off_by_one", "static+dynamic")
    if "empty_input" in static and any(set(o.tags) & {"empty", "zero", "absent"} for o in failing):
        add("empty_input", "static+dynamic")
    if "infinite_loop" in static and any(o.status == "timeout" for o in failing):
        add("infinite_loop", "static+dynamic")
    if "mutate_while_iterating" in static and failing:
        add("mutate_while_iterating", "static+dynamic")
    if "bad_initial_value" in static and any("negative" in o.tags for o in failing):
        add("bad_initial_value", "static+dynamic")
    return list(events.values())


# --------------------------------------------------------------------------- judge

class SubmissionTooLarge(ValueError):
    pass


def judge(challenge: Challenge, code: str, runner: Runner, *, parallel: int = 4) -> JudgeResult:
    if len(code.encode("utf-8")) > MAX_CODE_BYTES:
        raise SubmissionTooLarge("submission is larger than 64 KiB")
    tests = challenge.visible_tests + challenge.hidden_tests  # visible first, then hidden
    source_lines = code.splitlines()

    # Static checks happen on the host and never execute learner code.
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        syntax = {"message": exc.msg, "line": exc.lineno, "offset": exc.offset,
                  "explanation": explain.explain_syntax(exc.msg, exc.lineno, exc.offset),
                  "mistake": classify_syntax(exc.msg)}
        outcomes = [
            TestOutcome(t.id, i + 1, t.visibility, "runtime_error", t.tags, t.coarse_category, subtype="syntax",
                        args=t.args, expected=t.expected,
                        explanation="Not run: the code has a syntax error (see above).")
            for i, t in enumerate(tests)
        ]
        return JudgeResult(challenge.id, outcomes, [], [MistakeEvent(syntax["mistake"], "dynamic", exc.lineno)],
                           syntax_error=syntax, summary=syntax["explanation"], runner=runner.name)

    findings = run_detectors(code, challenge.function)
    defines_function = any(isinstance(n, ast.FunctionDef) and n.name == challenge.function for n in ast.walk(tree))
    limits = Limits(time_limit_s=challenge.time_limit_s)

    def run_one(test: TestCase) -> RawRun:
        request = {"code": code, "function": challenge.function, "args": encode_args(test.args),
                   "capture_context": test.visibility == "visible"}
        return runner.run(request, limits)

    with ThreadPoolExecutor(max_workers=max(1, parallel)) as pool:
        raws = list(pool.map(run_one, tests))

    outcomes: list[TestOutcome] = []
    for i, (test, raw) in enumerate(zip(tests, raws)):
        status, d = _verdict(raw, test)
        o = TestOutcome(
            test_id=test.id, index=i + 1, visibility=test.visibility, status=status, tags=test.tags,
            coarse_category=test.coarse_category, subtype=d.get("subtype"), exc_type=d.get("exc_type"),
            exc_message=d.get("exc_message"), line=d.get("line"), locals=d.get("locals", {}),
            label=d.get("label"), got=d.get("got"), expected=test.expected, args=test.args,
            stdout=d.get("stdout", ""),
        )
        outcomes.append(o)

    _apply_constant_output_rule(outcomes)
    for o in outcomes:
        o.explanation = _explain_outcome(o, findings, source_lines, challenge.function, defines_function)
        if o.visibility == "hidden":
            # Hidden data must never be retained in the outcome beyond what the policy allows.
            o.locals, o.stdout, o.exc_message = {}, "", None

    mistakes = fuse_mistakes(findings, outcomes)
    result = JudgeResult(challenge.id, outcomes, findings, mistakes, runner=runner.name)
    result.summary = _summary(result)
    return result


def _apply_constant_output_rule(outcomes: list[TestOutcome]) -> None:
    visible_ok = [o for o in outcomes if o.visibility == "visible" and o.status in ("passed", "wrong_output")
                  and o.subtype is None]
    if len(visible_ok) < 3 or not any(o.status == "wrong_output" for o in visible_ok):
        return
    distinct_inputs = {repr(o.args) for o in visible_ok}
    results = {repr(o.got) for o in visible_ok}
    expected = {repr(o.expected) for o in visible_ok}
    if len(distinct_inputs) >= 3 and len(results) == 1 and len(expected) > 1:
        for o in visible_ok:
            if o.status == "wrong_output" and o.label is None:
                o.label = LABELS["constant_output"]


def _explain_outcome(o: TestOutcome, findings: list[Finding], lines: list[str], function: str,
                     defines_function: bool) -> str:
    if o.status == "passed":
        return ""
    if o.visibility == "hidden":
        return explain.explain_hidden(o.status, o.coarse_category, findings)
    if o.status == "timeout":
        return explain.explain_timeout(findings, visible=True)
    if o.status == "wrong_output":
        return explain.explain_wrong_output(o.label.message if o.label else None)
    if not defines_function and o.exc_type == "NameError":
        return explain.explain_missing_function(function)
    source_line = lines[o.line - 1] if o.line and 0 < o.line <= len(lines) else None
    return explain.explain_exception(o.exc_type or "Error", o.exc_message or "", o.line, o.locals, source_line)


def _summary(result: JudgeResult) -> str:
    c = result.counts
    total = len(result.outcomes)
    if result.all_passed:
        return f"All {total} tests passed, including the hidden ones."
    parts = [f"{c['passed']}/{total} passed"]
    for key, word in (("wrong_output", "wrong output"), ("runtime_error", "runtime error"), ("timeout", "timeout")):
        if c[key]:
            parts.append(f"{c[key]} {word}")
    return ", ".join(parts) + "."
