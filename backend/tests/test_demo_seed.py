"""The committed demo fixture must say exactly what the real judge says about Priya's scripted code."""

import pytest

from codequest import demo_seed, journey
from codequest.judge import judge
from codequest.sandbox.runner import LocalRunner


@pytest.fixture(scope="module")
def fixture():
    data = demo_seed.load()
    assert data is not None, "run `python -m codequest.demo_seed` from backend/ to regenerate the fixture"
    return data


def test_fixture_follows_the_script(fixture):
    assert [a["challenge_id"] for a in fixture["attempts"]] == [s.challenge_id for s in demo_seed.PRIYA]
    for attempt, scripted in zip(fixture["attempts"], demo_seed.PRIYA):
        assert [s["code"] for s in attempt["submissions"]] == [s.code for s in scripted.steps]
        assert len(attempt["ladder"]["shown"]) == scripted.hints
        assert attempt["abandoned"] == scripted.abandoned
        last = attempt["submissions"][-1]["result"]
        assert last["all_passed"] is not scripted.abandoned


def test_fixture_matches_a_fresh_judge_run(fixture, challenges):
    runner = LocalRunner()
    for attempt, scripted in zip(fixture["attempts"], demo_seed.PRIYA):
        ch = challenges[attempt["challenge_id"]]
        recorded = set()
        for sub in attempt["submissions"]:
            fresh = judge(ch, sub["code"], runner)
            assert fresh.counts == sub["result"]["counts"], ch.id
            assert [m.key for m in fresh.mistakes] == sub["result"]["events"]["mistakes"], ch.id
            recorded |= {m.key for m in fresh.mistakes}
        assert recorded == set(scripted.mistakes), ch.id  # Mistake Memory gets the same story as the rows


def test_predictions_land_in_the_scripted_cells(fixture):
    for attempt, scripted in zip(fixture["attempts"], demo_seed.PRIYA):
        assert attempt["submissions"][0]["result"]["prediction"]["state"] == scripted.prediction_state
        assert attempt["prediction"]["state"] == scripted.prediction_state


def test_solved_attempts_are_robust_and_journeys_have_their_shapes(fixture):
    styles = {}
    for attempt in fixture["attempts"]:
        if not attempt["abandoned"]:
            assert attempt["submissions"][-1]["result"]["robustness"]["status"] == "robust"
        rows = [{"id": str(i), "code": s["code"], "status": "done", "result": s["result"], "created": i}
                for i, s in enumerate(attempt["submissions"])]
        styles[attempt["challenge_id"]] = journey.build(rows)["summary"]["style"]
    assert styles == {"count_evens": "first_try", "largest": "quick_fix", "reverse_words": "first_try",
                      "total": "trial_and_error"}


def test_a_missing_fixture_degrades_to_state_only(tmp_path):
    assert demo_seed.load(tmp_path / "absent.json") is None
