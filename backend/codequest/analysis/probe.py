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


_reference_cache: dict[str, Any] = {}


def _reference_fn(ch: Challenge):
    fn = _reference_cache.get(ch.id)
    if fn is None:
        namespace: dict[str, Any] = {}
        exec(compile(ch.references[0], f"<reference:{ch.id}>", "exec"), namespace)  # trusted content
        fn = namespace[ch.function]
        _reference_cache[ch.id] = fn
    return fn


def find_counterexample(ch: Challenge, code: str, runner: Runner) -> Counterexample | None:
    candidates = candidate_inputs(ch)
    if not candidates:
        return None
    reference = _reference_fn(ch)
    expected: list[Any] = []
    usable: list[list[Any]] = []
    for args in candidates:
        try:
            expected.append(reference(*copy.deepcopy(args)))
            usable.append(args)
        except Exception:  # noqa: BLE001 - input outside the reference's domain: skip it
            continue
    request = {"code": code, "function": ch.function, "batch": [encode_args(a) for a in usable]}
    raw = runner.run(request, Limits(time_limit_s=PROBE_TIME_S))
    payload = raw.payload or {}
    if payload.get("kind") != "batch":
        return None
    for args, exp, item in zip(usable, expected, payload.get("results") or []):
        kind = item.get("kind") if isinstance(item, dict) else None
        if kind == "ok":
            try:
                got = decode(item.get("value"))
            except DecodeError:
                continue
            if not values_equal(got, exp):
                return Counterexample(args, exp, got=got)
        elif kind == "exception":
            return Counterexample(args, exp, error=str(item.get("exc_type") or "an error"))
    return None
