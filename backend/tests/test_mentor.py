"""Counterexamples, the hint ladder, the leak guard and the learner model."""

import re

import pytest

from codequest.analysis.probe import candidate_inputs, find_counterexample
from codequest.hints import (AUTHORED_SPANS, MISTAKES, LadderState, code_hash, gate, leak_check, max_level,
                             safe_hint)
from codequest.judge import judge
from codequest.learner import (LearnerState, attempt_score, concept_bands, finish_attempt, next_up,
                               record_mistakes, start_attempt)
from tests.conftest import PRIYA_CLASS_AVERAGE

OFF_BY_ONE_TOTAL = "def total(nums):\n    result = 0\n    for i in range(len(nums) - 1):\n        result += nums[i]\n    return result\n"


# --------------------------------------------------------------------------- counterexamples

def test_candidates_exclude_every_test_input(challenges):
    for ch in challenges.values():
        test_inputs = {repr(t.args) for t in ch.tests}
        assert not test_inputs & {repr(c) for c in candidate_inputs(ch)}


def test_counterexample_is_small_and_correct(challenges, runner):
    ce = find_counterexample(challenges["total"], OFF_BY_ONE_TOTAL, runner)
    assert ce is not None
    assert ce.expected != ce.got
    assert len(ce.args[0]) <= 2
    assert repr(ce.args) not in {repr(t.args) for t in challenges["total"].tests}


def test_no_counterexample_for_correct_code(challenges, runner):
    assert find_counterexample(challenges["total"], challenges["total"].references[1], runner) is None


def test_counterexample_survives_infinite_loop(challenges, runner):
    ce = find_counterexample(challenges["class_average"], PRIYA_CLASS_AVERAGE, runner)
    assert ce is not None  # an earlier small input already exposes a bug before any hang


# --------------------------------------------------------------------------- hints

def test_ladder_is_monotonic_and_guarded(challenges, runner):
    ch = challenges["total"]
    result = judge(ch, OFF_BY_ONE_TOTAL, runner)
    ce = find_counterexample(ch, OFF_BY_ONE_TOTAL, runner)
    shown: list[str] = []
    levels = []
    for level in range(1, max_level(ch) + 1):
        hint = safe_hint(level, ch, result, OFF_BY_ONE_TOTAL, ce, shown)
        ok, reason = leak_check([*shown, hint.text], ch, OFF_BY_ONE_TOTAL)
        assert ok, reason
        shown.append(hint.text)
        levels.append(hint)
    assert [h.level for h in levels] == list(range(1, max_level(ch) + 1))
    assert levels[0].region is not None and levels[0].region[0] <= 3 <= levels[0].region[1]
    assert "loop boundaries" in levels[0].text


def test_h4_blanks_the_learners_own_line(challenges, runner):
    ch = challenges["class_average"]
    result = judge(ch, PRIYA_CLASS_AVERAGE, runner)
    hint = safe_hint(4, ch, result, PRIYA_CLASS_AVERAGE, None, [])
    assert "____" in hint.text


def test_tiny_missions_stop_at_h3(challenges):
    assert max_level(challenges["total"]) == 3
    assert max_level(challenges["class_average"]) == 4


def test_leak_guard_blocks_reference_code(challenges):
    ch = challenges["class_average"]
    assert not leak_check(["Try `present = [s for s in scores if s != -1]`"], ch, ch.starter_code)[0]
    assert not leak_check(["Just do: return sum(present) / len(present)"], ch, ch.starter_code)[0]
    assert not leak_check(["```python\nprint(1)\n```"], ch, ch.starter_code)[0]
    assert leak_check(["Look closely at lines 3-5."], ch, ch.starter_code)[0]


def test_leak_guard_resists_unicode_tricks(challenges):
    ch = challenges["class_average"]
    sneaky = "Use `pre​sent` and return sum(ｐresent) / len(present)"
    assert not leak_check([sneaky], ch, ch.starter_code)[0]


@pytest.mark.parametrize("key", sorted(MISTAKES))
def test_authored_lessons_never_contain_reference_statements(challenges, key):
    for ch in challenges.values():
        texts = list(MISTAKES[key].values())
        ok, reason = leak_check(texts, ch, ch.starter_code)
        assert ok, (key, ch.id, reason)
    mission_functions = {ch.function for ch in challenges.values()}
    for span in AUTHORED_SPANS:
        for name in re.findall(r"\bdef\s+(\w+)", span):
            assert name not in mission_functions, f"lesson defines mission function {name}"


def test_gate_requires_change_or_cooldown(challenges):
    ch = challenges["class_average"]
    state = LadderState()
    assert gate(state, ch, "x", now=1000)["available"]
    state = LadderState(unlocked=1, unlocked_at=1000, code_hash_at_unlock=code_hash("x"))
    locked = gate(state, ch, "x", now=1010)
    assert not locked["available"] and 0 < locked["unlocks_in_s"] <= 45
    assert gate(state, ch, "y", now=1010)["available"]
    assert gate(state, ch, "x", now=1050)["available"]
    assert gate(LadderState(unlocked=4), ch, "x")["next_level"] is None


# --------------------------------------------------------------------------- learner model

def test_mistake_becomes_recurring_on_second_attempt():
    state = LearnerState()
    start_attempt(state)
    assert record_mistakes(state, ["off_by_one"]) == []
    assert record_mistakes(state, ["off_by_one"]) == []  # same attempt counts once
    start_attempt(state)
    assert record_mistakes(state, ["off_by_one"]) == ["off_by_one"]
    assert state.mistakes["off_by_one"] == pytest.approx(1.8)


def test_recurring_mistake_is_beaten_after_clean_attempts(challenges):
    state = LearnerState()
    for _ in range(2):
        start_attempt(state)
        record_mistakes(state, ["off_by_one"])
    for _ in range(6):
        start_attempt(state)
        finish_attempt(state, challenges["total"], 1.0)
    assert "off_by_one" in state.beaten and "off_by_one" not in state.recurring


def test_elo_moves_toward_outcome_and_masters(challenges):
    state = LearnerState()
    before = state.skill("loops")
    finish_attempt(state, challenges["total"], 1.0)
    assert state.skill("loops") > before
    finish_attempt(state, challenges["class_average"], 1.0)
    finish_attempt(state, challenges["debug_average"], 1.0)
    bands = {b["concept"]: b["band"] for b in concept_bands(state, challenges)}
    assert bands["loops"] in ("almost", "mastered")
    weak = LearnerState()
    finish_attempt(weak, challenges["total"], 0.0)
    assert weak.skill("loops") < before


def test_attempt_score_credit():
    assert attempt_score(1.0, 0, 0) == 1.0
    assert attempt_score(1.0, 2, 0) == 0.75
    assert attempt_score(1.0, 1, 3) == pytest.approx(0.765)


def test_next_up_adapts_to_recurring_mistake(challenges):
    state = LearnerState()
    baseline = [x["challenge_id"] for x in next_up(state, challenges)]
    for _ in range(2):
        start_attempt(state)
        record_mistakes(state, ["off_by_one"])
    adapted = next_up(state, challenges)
    assert adapted[0]["reason"].startswith("Targets your recurring mistake")
    assert "off_by_one" in challenges[adapted[0]["challenge_id"]].traps
    assert [x["challenge_id"] for x in adapted] != baseline or adapted[0]["reason"] != ""
