"""Wrong-answer shape classifier: HOW a returned value differs from the expected one.

Pure host-side function over decoded values. For hidden tests the label is used
internally only (mistake detection); it is never shown to the learner.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from codequest.compare import multiset_equal, values_equal


@dataclass(frozen=True)
class ShapeLabel:
    key: str
    message: str
    mistake: str | None = None  # mistake key this label is evidence for


LABELS: dict[str, ShapeLabel] = {
    "printed_not_returned": ShapeLabel(
        "printed_not_returned", "You printed the answer instead of returning it.", "print_vs_return"),
    "returned_none": ShapeLabel(
        "returned_none", "Your function returned nothing (None). Is there a `return` on every path?", "missing_return"),
    "text_vs_number": ShapeLabel(
        "text_vs_number", "You returned text where a number was expected (or the other way round).", None),
    "close_float": ShapeLabel(
        "close_float", "Very close: a rounding or division step is slightly off.", "int_division"),
    "off_by_one_number": ShapeLabel(
        "off_by_one_number", "Your answer is off by exactly one.", "off_by_one"),
    "skipped_end_element": ShapeLabel(
        "skipped_end_element", "It looks like the first or last element was skipped.", "off_by_one"),
    "missing_last": ShapeLabel(
        "missing_last", "Your result is missing the last element: the loop may stop one step early.", "off_by_one"),
    "missing_first": ShapeLabel(
        "missing_first", "Your result is missing the first element: the loop may start one step late.", "off_by_one"),
    "extra_element": ShapeLabel(
        "extra_element", "Your result has one extra element at the start or end.", "off_by_one"),
    "reversed": ShapeLabel("reversed", "Right items, but in reversed order.", None),
    "wrong_order": ShapeLabel("wrong_order", "Right items, wrong order.", None),
    "duplicates_differ": ShapeLabel("duplicates_differ", "The same values, but duplicates are handled differently.", None),
    "whitespace_or_case": ShapeLabel(
        "whitespace_or_case", "Almost: the difference is only spaces or capital letters.", None),
    "inverted_bool": ShapeLabel("inverted_bool", "Your condition looks inverted (True and False swapped).", None),
    "constant_output": ShapeLabel(
        "constant_output", "Your result does not change with the input. Is a parameter ignored or a value hard-coded?", None),
    "output_limit": ShapeLabel("output_limit", "Your code printed too much output, so it was stopped.", None),
    "unsupported_type": ShapeLabel(
        "unsupported_type", "Your function returned a kind of object that can't be compared with the answer.", None),
}


def _num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def classify(got: Any, expected: Any, args: list[Any], stdout: str) -> ShapeLabel | None:
    """Return the most specific shape label, or None if nothing specific applies."""
    if got is None and expected is not None:
        if stdout and str(expected) in stdout:
            return LABELS["printed_not_returned"]
        return LABELS["returned_none"]
    if isinstance(got, bool) and isinstance(expected, bool):
        return LABELS["inverted_bool"] if got == (not expected) else None
    if (isinstance(got, str) and _num(expected)) or (_num(got) and isinstance(expected, str)):
        return LABELS["text_vs_number"]
    if _num(got) and _num(expected):
        if isinstance(got, float) or isinstance(expected, float):
            if math.isfinite(got) and math.isfinite(expected) and math.isclose(got, expected, rel_tol=1e-4):
                return LABELS["close_float"]
        diff = got - expected
        if diff in (1, -1):
            return LABELS["off_by_one_number"]
        first_list = next((a for a in args if isinstance(a, list) and a and all(_num(x) for x in a)), None)
        if first_list is not None and diff != 0:
            if -diff in (first_list[0], first_list[-1]) or diff in (first_list[0], first_list[-1]):
                return LABELS["skipped_end_element"]
        return None
    if isinstance(got, str) and isinstance(expected, str):
        if got.strip() == expected.strip() or got.lower() == expected.lower() or " ".join(got.split()) == " ".join(expected.split()):
            return LABELS["whitespace_or_case"]
        return None
    if isinstance(got, (list, tuple)) and isinstance(expected, (list, tuple)) and type(got) is type(expected):
        g, e = list(got), list(expected)
        if e and values_equal(g, e[:-1]):
            return LABELS["missing_last"]
        if e and values_equal(g, e[1:]):
            return LABELS["missing_first"]
        if g and (values_equal(g[:-1], e) or values_equal(g[1:], e)):
            return LABELS["extra_element"]
        if len(g) > 1 and values_equal(g, e[::-1]):
            return LABELS["reversed"]
        if len(g) == len(e) and multiset_equal(g, e):
            return LABELS["wrong_order"]
        try:
            if set(map(repr, g)) == set(map(repr, e)) and len(g) != len(e):
                return LABELS["duplicates_differ"]
        except TypeError:
            return None
    return None
