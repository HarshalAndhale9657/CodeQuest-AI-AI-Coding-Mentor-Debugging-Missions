"""Counterexample finder: bounded exhaustive enumeration of small inputs.

Inputs are generated in increasing size, so the first failure is (near) minimal.
The sandbox only ever sees generated inputs: hidden-test inputs are excluded
before anything is sent, and reference outputs are computed on the host.
"""

from __future__ import annotations

import copy
import itertools
from dataclasses import dataclass
from typing import Any

from codequest.compare import DecodeError, decode, encode_args, short_repr, values_equal
from codequest.content import Challenge, InputSpec
from codequest.sandbox.runner import Limits, Runner

MAX_CANDIDATES = 300
PROBE_TIME_S = 3.0


@dataclass(frozen=True)
class Counterexample:
    args: list[Any]
    expected: Any
    got: Any = None
    error: str | None = None

    def describe(self) -> str:
        inputs = ", ".join(short_repr(a) for a in self.args)
        outcome = f"your code raised {self.error}" if self.error else f"your code returned {short_repr(self.got)}"
        return f"For input {inputs} the answer should be {short_repr(self.expected)}, but {outcome}."


def _values(spec: InputSpec) -> list[Any]:
    if spec.kind == "int":
        return sorted(set(spec.values), key=lambda v: (abs(v), v))
    if spec.kind == "list_int":
        base = sorted(set(spec.values), key=lambda v: (abs(v), v))
        out: list[Any] = []
        for length in range(spec.max_len + 1):
            out.extend(list(p) for p in itertools.product(base, repeat=length))
        return out
    alphabet = list(dict.fromkeys(spec.alphabet))
    out = []
    for length in range(spec.max_len + 1):
        out.extend("".join(p) for p in itertools.product(alphabet, repeat=length))
    return out


def _size(value: Any) -> int:
    if isinstance(value, (list, str)):
        return len(value) * 10 + sum(abs(v) if isinstance(v, int) else 1 for v in value)
    if isinstance(value, int):
        return abs(value)
    return 0


def candidate_inputs(ch: Challenge) -> list[list[Any]]:
    if not ch.small_inputs:
        return []
    names = list(ch.small_inputs)
    pools = [_values(ch.small_inputs[n]) for n in names]
    combos = [list(c) for c in itertools.product(*pools)]
    combos.sort(key=lambda args: (sum(_size(a) for a in args), repr(args)))
    excluded = {repr(t.args) for t in ch.tests}  # never re-derive a hidden (or already visible) test
    return [c for c in combos if repr(c) not in excluded][:MAX_CANDIDATES]


@dataclass(frozen=True)
class ProbeReport:
    """One bounded search. `complete` is False when the batch did not finish, so silence proves nothing."""

    checked: int
    counterexample: Counterexample | None    # the first (near-minimal) failing input
    complete: bool
    failed: int = 0                          # how many checked inputs the code got wrong


_reference_cache: dict[str, Any] = {}


def reference_fn(ch: Challenge):
    """The mission's first reference solution, compiled once on the host (trusted content)."""
    fn = _reference_cache.get(ch.id)
    if fn is None:
        namespace: dict[str, Any] = {}
        exec(compile(ch.references[0], f"<reference:{ch.id}>", "exec"), namespace)  # trusted content
        fn = namespace[ch.function]
        _reference_cache[ch.id] = fn
    return fn


def domain(ch: Challenge) -> list[tuple[list[Any], Any]]:
    """Generated inputs the reference accepts, each with the reference's answer. Never a test input."""
    reference = reference_fn(ch) if ch.small_inputs else None
    out: list[tuple[list[Any], Any]] = []
    for args in candidate_inputs(ch):
        try:
            out.append((args, reference(*copy.deepcopy(args))))  # type: ignore[misc]
        except Exception:  # noqa: BLE001 - input outside the reference's domain: skip it
            continue
    return out


def probe(ch: Challenge, code: str, runner: Runner) -> ProbeReport | None:
    """Search the small-input domain for an input the code gets wrong. None if the mission has no domain."""
    cases = domain(ch)
    if not cases:
        return None
    request = {"code": code, "function": ch.function, "batch": [encode_args(args) for args, _ in cases]}
    raw = runner.run(request, Limits(time_limit_s=PROBE_TIME_S))
    payload = raw.payload or {}
    if payload.get("kind") != "batch":
        return ProbeReport(0, None, complete=False)
    results = payload.get("results") or []
    first: Counterexample | None = None
    failed = 0
    for (args, exp), item in zip(cases, results):
        kind = item.get("kind") if isinstance(item, dict) else None
        found: Counterexample | None = None
        if kind == "ok":
            try:
                got = decode(item.get("value"))
            except DecodeError:
                continue
            if not values_equal(got, exp):
                found = Counterexample(args, exp, got=got)
        elif kind == "exception":
            found = Counterexample(args, exp, error=str(item.get("exc_type") or "an error"))
        if found is not None:
            failed += 1
            first = first or found
    checked = min(len(cases), len(results))
    if payload.get("timed_out") and checked < len(cases):
        # The batch shares one small budget, so the input after the last answered one is the one that hung.
        args, exp = cases[checked]
        hung = Counterexample(args, exp, error="no answer in time (an endless loop?)")
        first, checked, failed = first or hung, checked + 1, failed + 1
    return ProbeReport(checked, first, complete=first is not None or checked == len(cases), failed=failed)


def find_counterexample(ch: Challenge, code: str, runner: Runner) -> Counterexample | None:
    report = probe(ch, code, runner)
    return report.counterexample if report else None
