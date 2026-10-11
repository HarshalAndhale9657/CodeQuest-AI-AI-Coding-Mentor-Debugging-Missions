"""LeetCode Companion chat tutor: rules first, guarded AI second, deterministic fallback always."""

import pytest
from fastapi.testclient import TestClient

from codequest.ai import AILayer, ProviderError
from codequest.api import create_app
from codequest.companion_chat import ChatRequest, CompanionTutor, reply_is_safe
from codequest.content import load_all
from codequest.sandbox.runner import LocalRunner
from codequest.service import CodeQuestService
from codequest.store import Store

TWO_SUM_PY = """class Solution:
    def twoSum(self, nums, target):
        for i in range(len(nums) - 1):
            for j in range(i + 1, len(nums) - 1):
                if nums[i] + nums[j] == target:
                    return [i, j]
"""


def fake(replies, calls=None, cost=0.0005):
    replies = list(replies)

    def call(messages, max_tokens):
        if calls is not None:
            calls.append(messages)
        reply = replies.pop(0) if len(replies) > 1 else replies[0]
        if isinstance(reply, Exception):
            raise reply
        return reply, cost
    call.name = "fake"
    return call


def wording_provider(system, user):
    return "x", 0.0


wording_provider.name = "wording"


def tutor(replies=("Nice idea. What does your map store?",), calls=None, budget=2.0):
    ai = AILayer(providers=[wording_provider], budget_usd=budget)
    return CompanionTutor(lambda: ai, provider=fake(replies, calls)), ai


def req(**kw):
    base = dict(mode="chat", slug="two-sum", title="Two Sum", difficulty="Easy", tags=["array", "hash-table"])
    base.update(kw)
    return ChatRequest(**base)


# --------------------------------------------------------------------------- rules

@pytest.mark.parametrize("message", ["give me the full code", "Can you write the solution?", "just the code please",
                                     "solve it for me", "show me the complete implementation", "fix my code for me"])
def test_answer_seeking_is_refused_without_a_model_call(message):
    calls = []
    t, _ = tutor(calls=calls)
    out = t.answer(req(message=message), ai_allowed=True)
    assert out.refused and out.source == "rules" and calls == []
    assert "hint" in out.suggestions


@pytest.mark.parametrize("message", ["what is a hash map?", "why is my answer wrong?", "I wrote the code, can you check it?"])
def test_normal_questions_are_not_refused(message):
    t, _ = tutor()
    assert not t.answer(req(message=message), ai_allowed=True).refused


def test_deterministic_modes_without_ai():
    t, _ = tutor()
    hint = t.answer(req(mode="hint", hint_level=2), ai_allowed=False)
    assert hint.source == "rules" and hint.reply.startswith("Hint 2 of 3")
    approach = t.answer(req(mode="approach", message="nested loops over every pair"), ai_allowed=False)
    assert approach.reply.startswith("Part of this works")
    review = t.answer(req(mode="review", code=TWO_SUM_PY, language="python3"), ai_allowed=False)
    assert review.reply.startswith("Line 4") and any(f["key"] == "off_by_one" for f in review.findings)
    java = t.answer(req(mode="review", code="class Solution {}", language="java"), ai_allowed=False)
    assert "Python only" in java.reply
    empty = t.answer(req(mode="review", code="", language="python3"), ai_allowed=False)
    assert "couldn't read any code" in empty.reply
    for mode in ("edge_cases", "complexity", "explain", "chat"):
        assert t.answer(req(mode=mode), ai_allowed=False).reply


# --------------------------------------------------------------------------- AI path

def test_ai_reply_is_grounded_in_problem_code_notes_and_history():
    calls = []
    t, ai = tutor(calls=calls)
    history = [{"role": "user", "content": f"q{i}"} for i in range(12)]
    out = t.answer(req(mode="review", code=TWO_SUM_PY, language="python3", statement="Return indices of two numbers.",
                       message="is this right?", history=history), ai_allowed=True)
    assert out.source == "ai" and out.reply.startswith("Nice idea")
    sent = calls[0]
    assert sent[0]["role"] == "system" and "never hand over the solution" in sent[0]["content"]
    assert [m["content"] for m in sent[1:-1]] == [f"q{i}" for i in range(4, 12)]  # last 8 turns only
    final = sent[-1]["content"]
    assert "Return indices of two numbers." in final and "range(len(nums) - 1)" in final
    assert "VERIFIED NOTES" in final and "line 4" in final.lower()
    assert ai.spent_usd == pytest.approx(0.0005)


def test_code_in_reply_triggers_one_strict_retry_then_succeeds():
    calls = []
    t, ai = tutor(replies=["```python\nreturn [i, j]\n```", "Think about what you've already seen. What could you store?"],
                  calls=calls)
    out = t.answer(req(message="help"), ai_allowed=True)
    assert out.source == "ai" and out.reply.startswith("Think about") and len(calls) == 2
    assert "NO code" in calls[1][-1]["content"] and ai.status()["leaks_blocked"] == 1


def test_persistent_code_falls_back_to_rules():
    t, ai = tutor(replies=["seen[num] = i"])
    out = t.answer(req(mode="hint"), ai_allowed=True)
    assert out.source == "rules" and out.reply.startswith("Hint 1 of 3") and ai.status()["leaks_blocked"] == 2


@pytest.mark.parametrize("error", [TimeoutError(), OSError("down"), ProviderError("refusal"), ValueError("bad json")])
def test_provider_failures_fall_back_to_rules(error):
    t, _ = tutor(replies=[error])
    assert t.answer(req(mode="hint"), ai_allowed=True).source == "rules"


def test_budget_and_preference_gate_the_model():
    calls = []
    poor, _ = tutor(calls=calls, budget=0.001)
    assert poor.answer(req(message="hi"), ai_allowed=True).source == "rules" and calls == []
    rich, _ = tutor(calls=calls)
    assert rich.answer(req(message="hi"), ai_allowed=False).source == "rules" and calls == []


def test_guard_examples():
    assert reply_is_safe("For example, an empty array. What would `nums` look like?")[0]
    assert reply_is_safe("Nested loops are O(n^2) here; can you do one pass with `O(1)` lookups?")[0]
    for code in ("for i in range(n):", "seen[x] = i", "return [i, j]", "int x = 0;", "Use `for i in range(n)`"):
        assert not reply_is_safe(code)[0], code


# --------------------------------------------------------------------------- endpoint

@pytest.fixture()
def paired():
    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    with TestClient(create_app(service)) as client:
        web = client.post("/api/session", json={"persona": "guest"}).json()["token"]
        code = client.post("/api/ext/pairing-code", headers={"Authorization": f"Bearer {web}"}).json()["code"]
        ext = client.post("/api/ext/pair", json={"code": code}).json()["token"]
        yield client, {"Authorization": f"Bearer {ext}"}, {"Authorization": f"Bearer {web}"}, service


def test_chat_endpoint_auth_validation_and_rate_limit(paired):
    client, ext_h, web_h, _ = paired
    body = {"mode": "hint", "slug": "two-sum", "tags": ["hash-table"], "hint_level": 1}
    assert client.post("/api/ext/chat", json=body).status_code == 401
    assert client.post("/api/ext/chat", json=body, headers=web_h).status_code == 401
    assert client.post("/api/ext/chat", json=body | {"mode": "solve"}, headers=ext_h).status_code == 422
    assert client.post("/api/ext/chat", json=body | {"slug": "Bad Slug"}, headers=ext_h).status_code == 422
    first = client.post("/api/ext/chat", json=body, headers=ext_h).json()
    assert first["source"] == "rules" and first["reply"].startswith("Hint 1 of 3") and first["suggestions"]
    codes = [client.post("/api/ext/chat", json=body, headers=ext_h).status_code for _ in range(8)]
    assert codes.count(429) >= 1


def test_chat_endpoint_uses_ai_when_available(paired):
    client, ext_h, _, service = paired
    service.ai = AILayer(providers=[wording_provider])
    service.tutor.provider = fake(["Good start! Which numbers have you already seen?"])
    out = client.post("/api/ext/chat", json={"mode": "chat", "message": "how do I start?", "slug": "two-sum"},
                      headers=ext_h).json()
    assert out["source"] == "ai"
    summary = client.get("/api/ext/me", headers=ext_h).json()
    assert summary["ai"] == {"available": True, "enabled": True}
