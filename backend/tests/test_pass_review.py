"""Why did you pass? Fragile passes (a bounded search beyond the tests) and mission rules on passing code."""

import pytest

from codequest.analysis.probe import domain, probe
from codequest.content import Challenge
from codequest.judge import judge
from codequest.sandbox.runner import LocalRunner

# Counting each bracket type on its own passes every test, but accepts interleaved pairs like "([)]".
PER_TYPE_COUNTERS = '''def valid_brackets(s):
    depth = {"(": 0, "[": 0, "{": 0}
    pairs = {")": "(", "]": "[", "}": "{"}
    for c in s:
        if c in depth:
            depth[c] += 1
        else:
            depth[pairs[c]] -= 1
            if depth[pairs[c]] < 0:
                return False
    return all(v == 0 for v in depth.values())
'''


@pytest.fixture(scope="module")
def local():
    return LocalRunner()


def test_a_fragile_pass_passes_every_test_but_not_the_search(challenges, local):
    ch = challenges["valid_brackets"]
    assert judge(ch, PER_TYPE_COUNTERS, local).all_passed
    report = probe(ch, PER_TYPE_COUNTERS, local)
    assert report is not None and report.complete
    assert report.counterexample.args == ["([)]"] and report.counterexample.got is True
    assert report.checked == len(domain(ch)) and 0 < report.failed < report.checked


def test_a_correct_solution_survives_the_search(challenges, local):
    ch = challenges["valid_brackets"]
    report = probe(ch, ch.references[0], local)
    assert report.counterexample is None and report.complete and report.failed == 0


def test_a_hang_inside_the_search_is_a_counterexample(challenges, local):
    code = "def total(nums):\n    if len(nums) == 3:\n        while True:\n            pass\n    return sum(nums)\n"
    report = probe(challenges["total"], code, local)
    assert report.counterexample is not None and len(report.counterexample.args[0]) == 3
    assert "in time" in report.counterexample.error


def test_missions_without_a_domain_cannot_be_searched(challenges, local):
    assert probe(challenges["flatten"], challenges["flatten"].references[0], local) is None


# --------------------------------------------------------------------------- mission rules

USES_MAX = "def largest(nums):\n    if not nums:\n        return None\n    return max(nums)\n"


def test_a_banned_builtin_is_reported_with_its_line(challenges, local):
    result = judge(challenges["largest"], USES_MAX, local)
    assert result.all_passed  # the tests themselves pass...
    assert result.violations == [{"call": "max", "line": 4}]  # ...but the mission said "without max()"
    public = result.public()
    assert public["rule_violations"] == [{"call": "max", "line": 4}]
    assert "rule" in public["summary"].lower()


def test_rules_only_flag_calls_not_names(challenges, local):
    code = "def largest(nums):\n    best = None\n    for n in nums:\n        if best is None or n > best:\n            best = n\n    max_seen = best\n    return max_seen\n"
    assert judge(challenges["largest"], code, local).violations == []


def test_method_rules_match_attribute_calls(challenges, local):
    data = challenges["largest"].model_dump() | {"forbidden_calls": [".sort"]}
    ch = Challenge.model_validate(data)
    code = "def largest(nums):\n    if not nums:\n        return None\n    nums.sort()\n    return nums[-1]\n"
    assert judge(ch, code, local).violations == [{"call": ".sort", "line": 4}]


def test_references_must_follow_their_own_rules(challenges):
    data = challenges["largest"].model_dump() | {"forbidden_calls": ["max"],
                                                 "references": ["def largest(nums):\n    return max(nums) if nums else None\n"]}
    with pytest.raises(ValueError, match="forbidden"):
        Challenge.model_validate(data)


def test_rule_names_are_validated(challenges):
    data = challenges["largest"].model_dump() | {"forbidden_calls": ["max()"]}
    with pytest.raises(ValueError):
        Challenge.model_validate(data)
