"""Every mission must be valid and every reference solution must pass every test."""

import pytest

from codequest.analysis.probe import find_counterexample
from codequest.content import load_all, public_challenge
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


ALL_IDS = sorted(load_all())


@pytest.mark.parametrize("challenge_id", ALL_IDS)
def test_references_pass_all_tests(challenges, runner, challenge_id):
    ch = challenges[challenge_id]
    for ref in ch.references:
        result = judge(ch, ref, runner)
        failing = [(o.test_id, o.status, o.exc_type) for o in result.outcomes if o.status != "passed"]
        assert result.all_passed, f"{challenge_id} reference failed: {failing}"
        assert result.mistakes == []


@pytest.mark.parametrize("challenge_id", ALL_IDS)
def test_starter_code_does_not_already_pass(challenges, runner, challenge_id):
    ch = challenges[challenge_id]
    assert not judge(ch, ch.starter_code, runner).all_passed


@pytest.mark.parametrize("challenge_id", [i for i in ALL_IDS if load_all()[i].small_inputs])
def test_counterexample_finder_never_flags_a_reference(challenges, runner, challenge_id):
    ch = challenges[challenge_id]
    for ref in ch.references:
        assert find_counterexample(ch, ref, runner) is None


@pytest.mark.parametrize("challenge_id", [i for i in ALL_IDS if load_all()[i].type == "debug" and load_all()[i].small_inputs])
def test_counterexample_finder_exposes_debug_starters(challenges, runner, challenge_id):
    ch = challenges[challenge_id]
    assert find_counterexample(ch, ch.starter_code, runner) is not None


def test_tiers_and_debug_missions_cover_the_ladder(challenges):
    assert {c.tier for c in challenges.values()} == {1, 2, 3, 4, 5}
    assert sum(c.type == "debug" for c in challenges.values()) >= 5
