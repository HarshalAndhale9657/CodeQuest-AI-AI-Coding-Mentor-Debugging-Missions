"""Predict Before You Run: answer parsing, the P/A/E matrix, prompt choice and evaluation."""

import pytest

from codequest import predict
from codequest.predict import AnswerError, Guess, Observed
from codequest.sandbox.runner import LocalRunner


@pytest.fixture(scope="module")
def local():
    return LocalRunner()


# --------------------------------------------------------------------------- answers

@pytest.mark.parametrize("text, value", [
    ("None", None), ("null", None), ("NULL", None),
    ("true", True), ("False", False),
    ("-1", -1), ("  7 ", 7), ("2.5", 2.5),
    ("[1, 2]", [1, 2]), ("(1, 2)", (1, 2)), ("{'a': 1}", {"a": 1}), ('{"a": 1}', {"a": 1}),
    ("'ab'", "ab"), ('"ab"', "ab"),
    ("ab", "ab"),              # bare text is a string: learners rarely type quotes
    ("[1, 2", "[1, 2"),        # unparseable stays text instead of failing the submission
])
def test_parse_answer_accepts_python_and_json_literals(text, value):
    assert predict.parse_answer(text) == value


@pytest.mark.parametrize("text", ["", "   ", "x" * (predict.MAX_ANSWER_CHARS + 1)])
def test_parse_answer_rejects_empty_and_oversized(text):
    with pytest.raises(AnswerError):
        predict.parse_answer(text)


# --------------------------------------------------------------------------- the P/A/E matrix

def value(v):
    return Observed("value", v)


@pytest.mark.parametrize("guess, actual, expected, state", [
    ("9", value(9), 9, "aligned"),          # knows the code and the problem
    ("9", value(0), 9, "slip"),             # knows the answer; the code doesn't do it
    ("0", value(0), 9, "misconception"),    # traced the code perfectly; the plan is wrong
    ("5", value(9), 9, "lucky"),            # passes, but not for the reason they think
    ("5", value(0), 9, "lost"),             # all three differ
])
def test_classify_covers_every_cell(guess, actual, expected, state):
    assert predict.classify(Guess(text=guess), actual, expected) == state


def test_predicting_a_crash_matches_any_error_or_timeout():
    crash = Guess(crash=True)
    assert predict.classify(crash, Observed("error", error="IndexError"), 3) == "misconception"
    assert predict.classify(crash, Observed("timeout"), 3) == "misconception"
    assert predict.classify(crash, value(3), 3) == "lucky"
    assert predict.classify(Guess(text="3"), Observed("error", error="IndexError"), 3) == "slip"


def test_predictions_compare_values_not_spelling():
    assert predict.classify(Guess(text="[1, 2]"), value((1, 2)), (1, 2)) == "aligned"      # list typed for a tuple
    assert predict.classify(Guess(text="3"), value("3"), "3") == "aligned"                 # unquoted digits for a str
    assert predict.classify(Guess(text="2"), value(2.0), 2.0) == "aligned"
    assert predict.classify(Guess(text="1"), value(True), True) == "lucky"                 # 1 is not True


# --------------------------------------------------------------------------- prompts

def test_prompts_never_reuse_a_test_input(challenges):
    for ch in challenges.values():
        test_args = {repr(t.args) for t in ch.tests}
        for p in predict.prompts(ch):
            assert repr(p.args) not in test_args, ch.id


def test_prompt_choice_is_deterministic_per_seed(challenges):
    ch = challenges["largest"]
    assert predict.prompt_for(ch, "u1:largest:0") == predict.prompt_for(ch, "u1:largest:0")
    seen = {predict.prompt_for(ch, f"u1:largest:{i}").id for i in range(12)}
    assert len(seen) > 1  # a new attempt usually gets a new question


def test_prompts_probe_the_missions_trap(challenges):
    largest = predict.prompts(challenges["largest"])          # trap: starting the max at 0
    assert largest and all(p.args[0] and max(p.args[0]) < 0 for p in largest)
    dedupe = predict.prompts(challenges["dedupe"])            # trap: mutating while iterating
    assert all(any(a == b for a, b in zip(p.args[0], p.args[0][1:])) for p in dedupe)


def test_missions_without_a_small_input_domain_get_no_prompt(challenges):
    assert predict.prompts(challenges["flatten"]) == []
    assert predict.prompt_for(challenges["flatten"], "seed") is None


def test_find_prompt_round_trips_and_rejects_unknown_ids(challenges):
    ch = challenges["total"]
    p = predict.prompt_for(ch, "seed")
    assert predict.find_prompt(ch, p.id) == p
    assert predict.find_prompt(ch, "0" * 12) is None
    assert predict.find_prompt(challenges["largest"], p.id) is None  # ids are bound to their mission


def test_prompt_public_view_reads_like_a_call(challenges):
    ch = challenges["largest"]
    p = predict.find_prompt(ch, predict.prompt_id(ch.id, [[-3, -1]]))
    assert p is not None
    assert p.public(ch) == {"prompt_id": p.id, "call": "largest([-3, -1])"}


# --------------------------------------------------------------------------- evaluation in the sandbox

ZERO_START = "def largest(nums):\n    if not nums:\n        return None\n    best = 0\n    for n in nums:\n        if n > best:\n            best = n\n    return best\n"
CORRECT = "def largest(nums):\n    if not nums:\n        return None\n    best = nums[0]\n    for n in nums:\n        if n > best:\n            best = n\n    return best\n"


def prompt(challenges, args):
    ch = challenges["largest"]
    return ch, predict.find_prompt(ch, predict.prompt_id(ch.id, args))


def test_slip_shows_the_answer_the_learner_already_knows(challenges, local):
    ch, p = prompt(challenges, [[-3, -1]])
    block = predict.evaluate(ch, ZERO_START, local, p, Guess(text="-1"))
    assert block["state"] == "slip" and block["traced"] is False
    assert block["predicted"] == "-1" and block["actual"] == "0" and block["expected"] == "-1"
    assert block["call"] == "largest([-3, -1])" and block["message"]


def test_misconception_never_reveals_the_correct_answer(challenges, local):
    ch, p = prompt(challenges, [[-3, -1]])
    block = predict.evaluate(ch, ZERO_START, local, p, Guess(text="0"))
    assert block["state"] == "misconception" and block["traced"] is True
    assert block["expected"] is None  # the hint ladder decides when a counterexample is shown


def test_lucky_pass_is_flagged(challenges, local):
    ch, p = prompt(challenges, [[-3, -1]])
    block = predict.evaluate(ch, CORRECT, local, p, Guess(text="-3"))
    assert block["state"] == "lucky" and block["expected"] == "-1"


def test_crash_is_reported_by_exception_name(challenges, local):
    ch, p = prompt(challenges, [[-3, -1]])
    code = "def largest(nums):\n    return nums[5]\n"
    block = predict.evaluate(ch, code, local, p, Guess(crash=True))
    assert block["state"] == "misconception" and block["actual"] == "raised IndexError"
    assert block["predicted"] == "an error"


# --------------------------------------------------------------------------- learner summary

def rec(concepts, state):
    return {"challenge_id": "x", "concepts": concepts, "state": state, "t": 0.0}


def test_summary_counts_tracing_and_flags_passing_without_understanding():
    records = [rec(["loops"], "lucky"), rec(["loops"], "lucky"), rec(["loops"], "aligned"),
               rec(["strings"], "slip"), rec(["strings"], "aligned")]
    bands = [{"concept": "loops", "band": "mastered"}, {"concept": "strings", "band": "learning"}]
    summary = predict.summarize(records, bands)
    assert summary["total"] == 5 and summary["traced"] == 2
    assert summary["by_state"]["lucky"] == 2
    loops = next(c for c in summary["by_concept"] if c["concept"] == "loops")
    assert loops == {"concept": "loops", "total": 3, "traced": 1, "lucky": 2, "flag": "lucky_passes"}
    assert next(c for c in summary["by_concept"] if c["concept"] == "strings")["flag"] is None


def test_summary_is_none_without_answered_predictions():
    assert predict.summarize([], []) is None


def test_off_by_one_prompts_make_the_last_element_count(challenges):
    # class_average's trap is a loop that stops one early; a trailing 0 or absent (-1) would hide it.
    for p in predict.prompts(challenges["class_average"]):
        nums = p.args[0]
        assert len(nums) >= 3 and nums[-1] > 0 and nums.count(nums[-1]) == 1
