"""AI wording layer: optional, guarded, and always degrades to deterministic templates."""

from codequest.ai import AILayer


def provider(reply, cost=0.001, calls=None):
    def call(system, user):
        if calls is not None:
            calls.append(user)
        if isinstance(reply, Exception):
            raise reply
        return reply, cost
    call.name = "fake"
    return call


ALLOW = lambda text: True  # noqa: E731
DENY = lambda text: False  # noqa: E731


def test_off_without_providers():
    ai = AILayer(providers=[])
    assert ai.status()["enabled"] is False and ai.status()["available"] is False
    assert ai.set_enabled(True)["enabled"] is False  # can't switch on without a key
    assert ai.rephrase("note", "desc", ALLOW) is None


def test_rephrases_and_caches():
    calls = []
    ai = AILayer(providers=[provider("Look at your loop bounds. Which index is never visited?", calls=calls)])
    assert ai.rephrase("note", "desc", ALLOW).startswith("Look at")
    assert ai.rephrase("note", "desc", ALLOW).startswith("Look at")
    assert len(calls) == 1 and ai.status()["rephrased"] == 1


def test_model_only_sees_description_and_note():
    calls = []
    ai = AILayer(providers=[provider("ok?", calls=calls)])
    ai.rephrase("the deterministic hint", "the exercise text", ALLOW)
    assert "the deterministic hint" in calls[0] and "the exercise text" in calls[0]


def test_guard_rejection_falls_back_and_is_counted():
    ai = AILayer(providers=[provider("Just write return sum(nums) / len(nums).")])
    assert ai.rephrase("note", "desc", DENY) is None
    assert ai.status()["leaks_blocked"] == 1


def test_code_shaped_output_is_refused_before_guard():
    ai = AILayer(providers=[provider("```python\ndef f():\n    return 1\n```")])
    assert ai.rephrase("note", "desc", ALLOW) is None
    assert ai.status()["leaks_blocked"] == 1


def test_provider_failure_falls_through_to_next_then_none():
    ai = AILayer(providers=[provider(TimeoutError()), provider("Second provider here?")])
    assert ai.rephrase("note", "desc", ALLOW) == "Second provider here?"
    dead = AILayer(providers=[provider(OSError("down"))])
    assert dead.rephrase("note", "desc", ALLOW) is None


def test_circuit_breaker_skips_failing_provider():
    calls = []
    ai = AILayer(providers=[provider(OSError("down"), calls=calls)])
    for i in range(5):
        ai.rephrase(f"note {i}", "desc", ALLOW)
    assert len(calls) == 3  # opened after 3 failures


def test_budget_cap_stops_calls():
    ai = AILayer(providers=[provider("Hmm?", cost=1.0)], budget_usd=1.0)
    assert ai.rephrase("a", "d", ALLOW) == "Hmm?"
    assert ai.rephrase("b", "d", ALLOW) is None
    assert ai.status()["budget_left_usd"] == 0


def test_switch_off_stops_calls():
    calls = []
    ai = AILayer(providers=[provider("Hi?", calls=calls)])
    ai.set_enabled(False)
    assert ai.rephrase("note", "desc", ALLOW) is None and calls == []


def test_leaking_ai_is_blocked_end_to_end():
    """A hostile model that pastes the reference solution never reaches the learner."""
    import time

    from fastapi.testclient import TestClient

    from codequest.api import create_app
    from codequest.content import load_all
    from codequest.sandbox.runner import LocalRunner
    from codequest.service import CodeQuestService
    from codequest.store import Store
    from tests.conftest import PRIYA_CLASS_AVERAGE

    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    leak = "Easy: use `present = [s for s in scores if s != -1]` then `sum(present) / len(present)`."
    service.ai = AILayer(providers=[provider(leak)])
    with TestClient(create_app(service)) as client:
        token = client.post("/api/session", json={"persona": "guest"}).json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        sid = client.post("/api/submissions", json={"challenge_id": "class_average", "code": PRIYA_CLASS_AVERAGE},
                          headers=h).json()["submission_id"]
        for _ in range(300):
            if client.get(f"/api/submissions/{sid}", headers=h).json()["status"] == "done":
                break
            time.sleep(0.2)
        hint = client.post("/api/challenges/class_average/hint", headers=h).json()["hint"]
        assert hint["source"] != "ai" and "present" not in hint["text"]
        assert client.get("/api/settings/ai").json()["leaks_blocked"] == 1
        assert client.post("/api/settings/ai", json={"enabled": False}).status_code == 401
        assert client.post("/api/settings/ai", json={"enabled": False}, headers=h).json()["enabled"] is False
