"""Per-test verdicts, explanations, mistake fusion and the hidden-test disclosure policy."""

import json

from codequest.judge import judge
from tests.conftest import PRIYA_CLASS_AVERAGE


def test_showcase_submission_produces_all_four_verdicts(challenges, runner):
    result = judge(challenges["class_average"], PRIYA_CLASS_AVERAGE, runner)
    by_id = {o.test_id: o for o in result.outcomes}
    assert by_id["v1"].status == "passed"
    assert by_id["v2"].status == "wrong_output"
    assert by_id["v3"].status == "runtime_error" and by_id["v3"].exc_type == "ZeroDivisionError"
    assert by_id["v4"].status == "timeout"
    assert set(result.counts) == {"passed", "wrong_output", "runtime_error", "timeout"}
    assert all(result.counts[k] >= 1 for k in result.counts)


def test_showcase_mistakes_are_fused(challenges, runner):
    result = judge(challenges["class_average"], PRIYA_CLASS_AVERAGE, runner)
    keys = {m.key for m in result.mistakes}
    assert {"off_by_one", "empty_input", "infinite_loop"} <= keys
    assert all(m.evidence in ("static+dynamic", "dynamic") for m in result.mistakes)


def test_visible_explanations_are_specific(challenges, runner):
    result = judge(challenges["class_average"], PRIYA_CLASS_AVERAGE, runner)
    by_id = {o.test_id: o for o in result.outcomes}
    assert "divided by zero" in by_id["v3"].explanation
    assert by_id["v3"].line == 11
    assert by_id["v3"].locals.get("count") == "0"
    assert "ran out of time" in by_id["v4"].explanation and "line 6" in by_id["v4"].explanation


def test_hidden_tests_never_leak(challenges, runner):
    ch = challenges["class_average"]
    leaky = PRIYA_CLASS_AVERAGE.replace("def class_average(scores):",
                                        "def class_average(scores):\n    print('LEAK', scores)\n    raise ValueError(repr(scores))", 1)
    result = judge(ch, leaky, runner)
    public = json.dumps(result.public())
    for hidden in ch.hidden_tests:
        assert json.dumps(hidden.args[0]) not in public or hidden.args[0] in [t.args[0] for t in ch.visible_tests]
        assert repr(hidden.args[0]) not in public or hidden.args[0] in [t.args[0] for t in ch.visible_tests]
    for test in result.public()["tests"]:
        if test["visibility"] == "hidden":
            assert set(test) == {"test_id", "index", "visibility", "status", "category", "explanation"}
            assert test["category"] in {"typical case", "edge case", "boundary", "tricky values", "large input"}
            assert "LEAK" not in test["explanation"] and "ValueError" not in test["explanation"]
    for o in result.outcomes:
        if o.visibility == "hidden":
            assert o.stdout == "" and o.locals == {} and o.exc_message is None


def test_syntax_error_reports_every_test(challenges, runner):
    result = judge(challenges["total"], "def total(nums)\n    return sum(nums)\n", runner)
    assert result.syntax_error is not None
    assert result.syntax_error["mistake"] == "syntax:missing_colon"
    assert all(o.status == "runtime_error" and o.subtype == "syntax" for o in result.outcomes)


def test_print_instead_of_return(challenges, runner):
    result = judge(challenges["total"], "def total(nums):\n    print(sum(nums))\n", runner)
    visible = [o for o in result.outcomes if o.visibility == "visible"]
    assert all(o.status == "wrong_output" for o in visible if o.expected is not None)
    assert visible[0].label.key == "printed_not_returned"
    assert {m.key for m in result.mistakes} >= {"print_vs_return"}


def test_bad_initial_value_detected(challenges, runner):
    code = ("def largest(nums):\n    if not nums:\n        return None\n    best = 0\n"
            "    for n in nums:\n        if n > best:\n            best = n\n    return best\n")
    result = judge(challenges["largest"], code, runner)
    assert {m.key for m in result.mistakes} == {"bad_initial_value"}


def test_missing_base_case(challenges, runner):
    result = judge(challenges["factorial"], "def factorial(n):\n    return n * factorial(n - 1)\n", runner)
    assert all(o.status == "runtime_error" for o in result.outcomes)
    assert "base_case" in {m.key for m in result.mistakes}


def test_missing_function(challenges, runner):
    result = judge(challenges["total"], "def add(nums):\n    return sum(nums)\n", runner)
    first = result.outcomes[0]
    assert first.status == "runtime_error"
    assert "does not define a function named `total`" in first.explanation
