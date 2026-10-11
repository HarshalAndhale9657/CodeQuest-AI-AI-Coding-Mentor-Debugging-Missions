"""Host-side decoding and comparison of learner values (never inside the sandbox)."""

from __future__ import annotations

import math
from collections import Counter
from typing import Any

FLOAT_REL_TOL = 1e-9
FLOAT_ABS_TOL = 1e-9


class DecodeError(ValueError):
    pass


def decode(value: Any, depth: int = 0) -> Any:
    if depth > 80:
        raise DecodeError("value nested too deeply")
    if isinstance(value, list):
        return [decode(v, depth + 1) for v in value]
    if isinstance(value, dict):
        if set(value) == {"__tuple__"}:
            return tuple(decode(v, depth + 1) for v in value["__tuple__"])
        if set(value) == {"__set__"}:
            try:
                return frozenset(decode(v, depth + 1) for v in value["__set__"])
            except TypeError as exc:
                raise DecodeError("set contains unhashable values") from exc
        if set(value) == {"__dict__"}:
            try:
                return {decode(k, depth + 1): decode(v, depth + 1) for k, v in value["__dict__"]}
            except TypeError as exc:
                raise DecodeError("dict has unhashable keys") from exc
        if set(value) == {"__float__"}:
            text = value["__float__"]
            if text not in ("nan", "inf", "-inf"):
                raise DecodeError("bad float literal")
            return float(text)
        raise DecodeError("unknown typed value")
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    raise DecodeError(f"unexpected JSON type {type(value).__name__}")


def encode_args(args: list[Any]) -> list[Any]:
    """Encode YAML/JSON test arguments for the harness (lists stay lists)."""

    def enc(v: Any) -> Any:
        if isinstance(v, tuple):
            return {"__tuple__": [enc(x) for x in v]}
        if isinstance(v, (set, frozenset)):
            return {"__set__": [enc(x) for x in v]}
        if isinstance(v, dict):
            return {"__dict__": [[enc(k), enc(x)] for k, x in v.items()]}
        if isinstance(v, list):
            return [enc(x) for x in v]
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return {"__float__": repr(v)}
        return v

    return [enc(a) for a in args]


def _is_number(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def values_equal(got: Any, expected: Any, *, unordered: bool = False) -> bool:
    if unordered and isinstance(got, list) and isinstance(expected, list):
        if len(got) != len(expected):
            return False
        remaining = list(expected)
        for item in got:
            for i, candidate in enumerate(remaining):
                if values_equal(item, candidate):
                    del remaining[i]
                    break
            else:
                return False
        return True
    if isinstance(expected, bool) or isinstance(got, bool):
        return type(got) is type(expected) and got == expected
    if _is_number(got) and _is_number(expected):
        if isinstance(got, float) or isinstance(expected, float):
            if math.isnan(got) or math.isnan(expected):
                return math.isnan(got) and math.isnan(expected)
            return math.isclose(got, expected, rel_tol=FLOAT_REL_TOL, abs_tol=FLOAT_ABS_TOL)
        return got == expected
    if type(got) is not type(expected):
        # tuple vs list, set vs frozenset are distinct shapes; frozenset decodes sets
        if {type(got), type(expected)} <= {set, frozenset}:
            return set(got) == set(expected)
        return False
    if isinstance(got, (list, tuple)):
        return len(got) == len(expected) and all(values_equal(a, b) for a, b in zip(got, expected))
    if isinstance(got, dict):
        if set(got) != set(expected):
            return False
        return all(values_equal(got[k], expected[k]) for k in got)
    return got == expected


def multiset_equal(a: list[Any], b: list[Any]) -> bool:
    try:
        return Counter(map(repr, a)) == Counter(map(repr, b))
    except Exception:  # noqa: BLE001 - repr of decoded primitives cannot fail, belt and braces
        return False


def short_repr(value: Any, limit: int = 120) -> str:
    text = repr(value)
    return text if len(text) <= limit else text[: limit - 3] + "..."
