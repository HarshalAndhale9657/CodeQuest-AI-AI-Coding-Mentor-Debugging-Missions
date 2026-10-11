"""Growth analytics for the portfolio: hint independence, first-try rate, struggle map, mistake lanes."""

import json

import pytest

from codequest import insights
from codequest.learner import LearnerState, record_mistakes, start_attempt


def attempt(aid, challenge, *, open_=False, hints=0, failed=0, created=0.0, reflection=None):
    return {"id": aid, "challenge_id": challenge, "open": int(open_), "failed": failed, "best_hidden": 1.0,
            "ladder": json.dumps({"shown": [{"level": n + 1} for n in range(hints)]}), "created": created,
            "prediction": None, "reflection": json.dumps(reflection) if reflection else None}


def submission(sid, aid, challenge, passed, *, created, code="def f():\n    return 1\n", robustness=None):
    tests = [{"test_id": f"t{n}", "visibility": "hidden", "status": "passed" if n <= passed else "wrong_output"}
             for n in range(1, 9)]
    result = {"all_passed": passed == 8, "tests": tests, "events": {"mistakes": []}}
    if robustness:
        result["robustness"] = robustness
    return {"id": sid, "attempt_id": aid, "challenge_id": challenge, "code": code, "status": "done",
            "result": json.dumps(result), "created": created}


@pytest.fixture()
def data(challenges):
    attempts = [
        attempt("a1", "count_evens", created=1),
        attempt("a2", "largest", hints=1, failed=1, created=2),
        attempt("a3", "total", open_=True, hints=2, failed=3, created=3),
        attempt("a4", "reverse_words", created=4, reflection={"strategy": "systematic"}),
    ]
    subs = [
        submission("s1", "a1", "count_evens", 8, created=1.1, robustness={"status": "robust", "checked": 60}),
        submission("s2", "a2", "largest", 5, created=2.1, code="def largest(nums):\n    best = 0\n    return best\n"),
        submission("s3", "a2", "largest", 8, created=2.2, code="def largest(nums):\n    best = nums[0]\n    return best\n",
                   robustness={"status": "fragile", "checked": 60}),
        submission("s4", "a3", "total", 5, created=3.1),
        submission("s5", "a3", "total", 5, created=3.2),
        submission("s6", "a3", "total", 5, created=3.3, code="def total(nums):\n    return 0\n"),
        submission("s7", "a4", "reverse_words", 8, created=4.1),
    ]
    state = LearnerState()
    for ref, keys in (("count_evens", []), ("largest", ["bad_initial_value"]), ("total", ["off_by_one"]),
                      ("reverse_words", []), ("lc:two-sum", ["off_by_one"])):
        start_attempt(state, ref)
        record_mistakes(state, keys)
    return attempts, subs, state, challenges


def build(data):
    attempts, subs, state, challenges = data
    return insights.build(attempts, subs, state, challenges, bands=[])


def test_solves_track_hint_independence_and_first_try(data):
    solves = build(data)["solves"]
    assert [s["challenge_id"] for s in solves["series"]] == ["count_evens", "largest", "reverse_words"]
    assert solves["count"] == 3 and solves["hint_free"] == 2 and solves["first_try"] == 2
    largest = solves["series"][1]
    assert largest["hints"] == 1 and largest["submissions"] == 2 and largest["first_try"] is False
    assert largest["robust"] is False and solves["series"][0]["robust"] is True
    assert solves["series"][2]["robust"] is None  # never searched


def test_rolling_rates_are_cumulative_over_a_window(data):
    rolling = build(data)["solves"]["rolling"]
    assert [round(r["hint_free_rate"], 2) for r in rolling] == [1.0, 0.5, 0.67]


def test_struggle_map_covers_every_mission(data, challenges):
    tiles = {t["challenge_id"]: t for t in build(data)["struggle"]}
    assert set(tiles) == set(challenges)
    assert tiles["count_evens"]["state"] == "solved" and tiles["count_evens"]["effort"] == "clean"
    assert tiles["largest"]["effort"] == "worked"
    assert tiles["total"]["state"] == "stuck" and tiles["total"]["submissions"] == 3 and tiles["total"]["hints"] == 2
    assert tiles["factorial"]["state"] == "untouched" and tiles["factorial"]["effort"] is None


def test_mistake_lanes_use_the_full_attempt_log(data):
    lanes = build(data)["lanes"]
    assert [a["ref"] for a in lanes["attempts"]] == ["count_evens", "largest", "total", "reverse_words", "lc:two-sum"]
    assert lanes["attempts"][4]["title"] == "LeetCode: two-sum"
    off = next(lane for lane in lanes["lanes"] if lane["key"] == "off_by_one")
    assert off["hits"] == [3, 5] and off["state"] == "recurring"


def test_debugging_summarises_multi_submission_attempts(data):
    debugging = build(data)["debugging"]
    assert debugging["journeys"] == 2
    assert debugging["styles"] == {"quick_fix": 1, "trial_and_error": 1}


def test_robustness_counts_latest_search_per_mission(data):
    assert build(data)["robustness"] == {"checked": 2, "robust": 1, "fragile": 1}


def test_empty_learner_has_empty_sections(challenges):
    view = insights.build([], [], LearnerState(), challenges, bands=[])
    assert view["solves"]["count"] == 0 and view["solves"]["rolling"] == [] and view["solves"]["trend"] is None
    assert view["lanes"]["attempts"] == [] and view["prediction"] is None and view["debugging"]["journeys"] == 0


def test_an_abandoned_attempt_is_not_a_solve(challenges):
    attempts = [attempt("a1", "total", hints=2, failed=2, created=1)]       # closed, but it never passed
    subs = [submission("s1", "a1", "total", 5, created=1.1), submission("s2", "a1", "total", 6, created=1.2)]
    view = insights.build(attempts, subs, LearnerState(), challenges, bands=[])
    assert view["solves"]["count"] == 0
    assert next(t for t in view["struggle"] if t["challenge_id"] == "total")["state"] == "stuck"


def test_hint_free_trend_needs_enough_solves(challenges):
    attempts = [attempt(f"a{i}", "count_evens", hints=0 if i >= 3 else 2, created=i) for i in range(6)]
    subs = [submission(f"s{i}", f"a{i}", "count_evens", 8, created=i + 0.1) for i in range(6)]
    view = insights.build(attempts, subs, LearnerState(), challenges, bands=[])
    assert view["solves"]["trend"] == "up"


# --------------------------------------------------------------------------- learner log

def test_attempt_log_is_capped_and_keeps_refs():
    state = LearnerState()
    for i in range(insights_cap() + 5):
        start_attempt(state, f"m{i}")
    assert len(state.attempt_log) == insights_cap()
    assert state.attempt_log[-1] == {"ref": f"m{insights_cap() + 4}", "mistakes": []}
    assert len(state.history) == 5  # the recurring-mistake window is unchanged


def insights_cap():
    from codequest.learner import LOG_CAP
    return LOG_CAP


def test_old_saved_states_load_without_the_new_fields():
    state = LearnerState.from_dict({"theta": {"loops": 1200.0}, "history": [["off_by_one"]]})
    assert state.attempt_log == [] and state.predictions == []
