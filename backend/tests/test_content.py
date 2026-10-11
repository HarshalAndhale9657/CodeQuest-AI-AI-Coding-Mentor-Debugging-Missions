"""Every mission must be valid and every reference solution must pass every test."""

import pytest

from codequest.content import public_challenge
from codequest.judge import judge


def test_missions_load(challenges):
    assert len(challenges) >= 7
    tiers = [c.tier for c in challenges.values()]
    assert tiers == sorted(tiers), "missions are ordered by increasing difficulty"


def test_public_view_has_no_secrets(challenges):
    for ch in challenges.values():
        view = public_challenge(ch)
        text = repr(view)
        assert "references" not in view and "tests" not in view
        assert view["hidden_test_count"] == len(ch.hidden_tests)
        for hidden in ch.hidden_tests:
            assert hidden.id not in [t["id"] for t in view["visible_tests"]]
        for ref in ch.references:
            assert ref.strip() not in text


@pytest.mark.parametrize("challenge_id", [
    "class_average", "total", "largest", "count_evens", "binary_search", "factorial", "debug_average",
])
def test_references_pass_all_tests(challenges, runner, challenge_id):
    ch = challenges[challenge_id]
    for ref in ch.references:
        result = judge(ch, ref, runner)
        failing = [(o.test_id, o.status, o.exc_type) for o in result.outcomes if o.status != "passed"]
        assert result.all_passed, f"{challenge_id} reference failed: {failing}"
        assert result.mistakes == []


def test_debug_starter_is_actually_buggy(challenges, runner):
    ch = challenges["debug_average"]
    result = judge(ch, ch.starter_code, runner)
    assert not result.all_passed
