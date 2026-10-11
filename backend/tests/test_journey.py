"""Debug Journey: step classification, diffs and the debugging-style summary over one attempt."""

import json

from codequest import journey


def sub(i, code, passed, total=8, *, all_passed=None, syntax=False, failing=None, mistakes=(), status="done"):
    tests = [{"test_id": f"t{n}", "visibility": "visible" if n <= 3 else "hidden",
              "status": "passed" if n <= passed else "wrong_output"} for n in range(1, total + 1)]
    if failing is not None:
        tests = [{"test_id": f"t{n}", "visibility": "visible" if n <= 3 else "hidden",
                  "status": "wrong_output" if n in failing else "passed"} for n in range(1, total + 1)]
    result = {"all_passed": passed == total if all_passed is None else all_passed,
              "counts": {"passed": passed}, "tests": tests,
              "syntax_error": {"message": "x"} if syntax else None,
              "events": {"mistakes": list(mistakes)}}
    return {"id": f"s{i}", "code": code, "status": status, "result": json.dumps(result), "created": 1000.0 + i}


V1 = "def f(xs):\n    best = 0\n    for x in xs:\n        if x > best:\n            best = x\n    return best\n"
V2 = V1.replace("best = 0", "best = xs[0]")
V2_COMMENTED = V2.replace("return best", "return best  # done")


def test_steps_are_classified_by_outcome_and_by_code_identity():
    steps = journey.build([
        sub(1, V1, 5),
        sub(2, V1, 5),                                  # identical code resubmitted
        sub(3, V1.replace("x > best", "x >= best"), 4),  # worse
        sub(4, V1, 5),                                  # back to attempt 1
        sub(5, V2_COMMENTED, 6),                        # better
        sub(6, V2, 8),                                  # solved
    ])["steps"]
    assert [s["kind"] for s in steps] == ["first", "resubmit", "regression", "revert", "progress", "solved"]
    assert steps[3]["revert_of"] == 1
    assert [s["delta"] for s in steps] == [None, 0, -1, 1, 1, 2]


def test_comment_only_edits_count_as_resubmits():
    steps = journey.build([sub(1, V2, 6), sub(2, V2_COMMENTED, 6)])["steps"]
    assert steps[1]["kind"] == "resubmit"


def test_same_score_with_different_failures_is_sideways():
    steps = journey.build([sub(1, V1, 6, failing={7, 8}), sub(2, V2, 6, failing={4, 5})])["steps"]
    assert steps[1]["kind"] == "sideways"


def test_diff_reports_changed_lines_with_numbers():
    step = journey.build([sub(1, V1, 5), sub(2, V2, 8)])["steps"][1]
    change = step["change"]
    assert change["added"] == 1 and change["removed"] == 1 and change["focused"] is True
    rows = [r for h in change["hunks"] for r in h["rows"]]
    assert {"t": "-", "a": 2, "b": None, "text": "    best = 0"} in rows
    assert {"t": "+", "a": None, "b": 2, "text": "    best = xs[0]"} in rows
    assert any(r["t"] == " " for r in rows)  # context lines around the change


def test_counts_split_visible_and_hidden_and_skip_unjudged_rows():
    view = journey.build([sub(1, V1, 5), sub(2, V1, 0, status="error"), sub(3, V2, 8)])
    assert [s["index"] for s in view["steps"]] == [1, 2]
    first = view["steps"][0]
    assert (first["passed"], first["total"], first["hidden_passed"], first["hidden_total"]) == (5, 8, 2, 5)


def test_style_first_try_and_quick_fix():
    assert journey.build([sub(1, V2, 8)])["summary"]["style"] == "first_try"
    assert journey.build([sub(1, V1, 5), sub(2, V2, 8)])["summary"]["style"] == "quick_fix"
    assert journey.build([sub(1, V1, 5)])["summary"]["style"] == "single"


def test_style_methodical_needs_small_productive_steps():
    v3 = V2.replace("for x in xs:", "for x in xs[1:]:")
    summary = journey.build([sub(1, V1, 4), sub(2, V2, 6), sub(3, v3, 8)])["summary"]
    assert summary["style"] == "methodical"
    assert summary["productive_ratio"] == 1.0 and summary["focused_share"] == 1.0


def test_style_trial_and_error_on_churn():
    summary = journey.build([sub(1, V1, 5), sub(2, V1, 5), sub(3, V2, 5), sub(4, V1, 5)])["summary"]
    assert summary["style"] == "trial_and_error"
    assert summary["resubmits"] == 1 and summary["reverts"] == 1


def test_big_rewrites_are_not_focused():
    rewrite = "def f(xs):\n    if not xs:\n        return None\n    xs = sorted(xs)\n    top = xs[-1]\n    return top\n"
    step = journey.build([sub(1, V1, 5), sub(2, rewrite, 6)])["steps"][1]
    assert step["change"]["focused"] is False


def test_syntax_errors_are_marked():
    step = journey.build([sub(1, "def f(:\n", 0, syntax=True)])["steps"][0]
    assert step["syntax_error"] is True and step["passed"] == 0


def test_error_quotient_weights_repeated_failures_like_jadud():
    # Pair 1: both fail (+2), same failing tests (+3). Pair 2: also the same edit spot as the step before (+1).
    b, c = V1.replace("best = 0", "best = -1"), V1.replace("best = 0", "best = -2")
    summary = journey.build([sub(1, V1, 5, failing={6, 7, 8}), sub(2, b, 5, failing={6, 7, 8}),
                             sub(3, c, 5, failing={6, 7, 8})])["summary"]
    assert summary["error_quotient"] == round((5 / 9 + 6 / 9) / 2, 3)


def test_error_quotient_counts_the_same_crash_line():
    def crash(i, code, line):
        row = sub(i, code, 0)
        import json as _json
        result = _json.loads(row["result"])
        result["tests"][0].update(status="runtime_error", line=line)
        row["result"] = _json.dumps(result)
        return row
    summary = journey.build([crash(1, V1, 4), crash(2, V1.replace("x > best", "x >= best"), 4)])["summary"]
    assert summary["error_quotient"] == round((2 + 3 + 3) / 9, 3)


def test_error_quotient_is_zero_when_the_next_submission_passes():
    assert journey.build([sub(1, V1, 5), sub(2, V2, 8)])["summary"]["error_quotient"] == 0.0
    assert journey.build([sub(1, V2, 8)])["summary"]["error_quotient"] is None


def test_agreement_compares_self_report_with_the_data():
    assert journey.agreement("methodical", {"strategy": "systematic"}) == "agrees"
    assert journey.agreement("trial_and_error", {"strategy": "systematic"}) == "differs"
    assert journey.agreement("too_short", {"strategy": "random"}) is None
    assert journey.agreement("methodical", None) is None
