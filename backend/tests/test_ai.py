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
    # Only the note: given the exercise, real models start solving it (verified live with gpt-4.1-nano).
    assert "the deterministic hint" in calls[0] and "the exercise text" not in calls[0]


def test_sentence_final_numbers_count_and_note_named_code_is_allowed():
    from codequest.ai import _NUMBER, _clean, facts_preserved

    assert _NUMBER.findall("Look closely at lines 4-6.") == ["4", "6"]
    assert _NUMBER.findall("a ratio of 2.5 here") == ["2.5"]
    note = "This is about loop boundaries. Look closely at lines 4-6."
    assert facts_preserved(note, "Let's focus on loop boundaries. Can you examine lines 4-6 carefully?")
    named = "This is about recursion. Look closely at your `factorial` function."
    assert _clean("Look at your `factorial` function: what stops it?", named)
    assert _clean("Look at `factorial(n - 1)` here?", named) == ""     # code the note didn't contain
    assert _clean("Look at `factorial here?", named) == ""              # unbalanced backtick


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


# --------------------------------------------------------------------------- hardening (review fixes)

def test_refusal_or_malformed_response_never_crashes(monkeypatch):
    import codequest.ai as ai_module

    for body in ({"choices": [{"message": {"content": None, "refusal": "no"}}]}, {"choices": []}, {"error": "x"}):
        monkeypatch.setattr(ai_module, "_post", lambda url, b, h, body=body: body)
        layer = AILayer(providers=[ai_module.openai_provider("sk-test")])
        assert layer.rephrase("Look closely at lines 3-5.", "desc", ALLOW) is None


def test_fact_check_keeps_line_numbers_and_invents_none():
    from codequest.ai import facts_preserved

    note = "This is about loop boundaries. Look closely at lines 3-5."
    assert facts_preserved(note, "Your loop's edges matter here: check lines 3-5. Which index is skipped?")
    assert not facts_preserved(note, "Check your loop. Which index is skipped?")            # dropped the lines
    assert not facts_preserved(note, "Check lines 3-5 and line 9. Which index is skipped?")  # invented a line
    ai = AILayer(providers=[provider("Check your loop carefully. What does it skip?")])
    assert ai.rephrase(note, "desc", ALLOW) is None and ai.status()["leaks_blocked"] == 1


def test_inline_code_is_refused():
    for reply in ("Try `range(len(nums))` instead?", "Set total = 0 first. Then?", "Write for(i): what next?"):
        ai = AILayer(providers=[provider(reply)])
        assert ai.rephrase("note", "desc", ALLOW) is None, reply


def test_spend_is_persisted_and_restored():
    saved = []
    ai = AILayer(providers=[provider("Hmm?", cost=0.25)], budget_usd=1.0, on_spend=saved.append)
    ai.rephrase("a", "d", ALLOW)
    assert saved == [0.25]
    restarted = AILayer(providers=[provider("Hmm?", cost=0.25)], budget_usd=1.0, spent_usd=saved[-1])
    assert restarted.status()["budget_left_usd"] == 0.75


def test_budget_reserve_blocks_call_that_could_overshoot():
    calls = []
    ai = AILayer(providers=[provider("Hmm?", calls=calls)], budget_usd=0.0005)
    assert ai.rephrase("a", "d", ALLOW) is None and calls == []


def _client_with(ai_layer):
    from fastapi.testclient import TestClient

    from codequest.api import create_app
    from codequest.content import load_all
    from codequest.sandbox.runner import LocalRunner
    from codequest.service import CodeQuestService
    from codequest.store import Store

    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    service.ai = ai_layer
    return TestClient(create_app(service)), service


def _submit_and_wait(client, h, code):
    import time

    sid = client.post("/api/submissions", json={"challenge_id": "class_average", "code": code}, headers=h).json()["submission_id"]
    for _ in range(300):
        if client.get(f"/api/submissions/{sid}", headers=h).json()["status"] == "done":
            return
        time.sleep(0.2)
    raise AssertionError("submission did not finish")


def test_only_h1_is_ai_worded_and_preference_is_per_user():
    from tests.conftest import PRIYA_CLASS_AVERAGE

    calls = []

    def faithful(system, user):  # rewords the note while keeping its facts, like a well-behaved model
        calls.append(user)
        note = user.split("<<<\n", 1)[1].split("\n>>>", 1)[0]
        return f"You're close! {note} What would you check first?", 0.0001

    faithful.name = "faithful"
    friendly = AILayer(providers=[faithful])
    client, _ = _client_with(friendly)
    with client:
        a = {"Authorization": f"Bearer {client.post('/api/session', json={'persona': 'guest'}).json()['token']}"}
        b = {"Authorization": f"Bearer {client.post('/api/session', json={'persona': 'guest'}).json()['token']}"}
        _submit_and_wait(client, a, PRIYA_CLASS_AVERAGE)
        h1 = client.post("/api/challenges/class_average/hint", headers=a).json()["hint"]
        assert h1["source"] == "ai" and h1["text"].startswith("You're close!")
        _submit_and_wait(client, a, PRIYA_CLASS_AVERAGE.replace("- 1:", ":"))
        h2 = client.post("/api/challenges/class_average/hint", headers=a).json()["hint"]
        assert h2["source"] != "ai" and len(calls) == 1  # H2 is never sent to the model

        assert client.post("/api/settings/ai", json={"enabled": False}, headers=a).json()["enabled"] is False
        assert client.get("/api/settings/ai", headers=a).json()["enabled"] is False
        assert client.get("/api/settings/ai", headers=b).json()["enabled"] is True   # other learners unaffected
        assert client.get("/api/settings/ai").json()["enabled"] is True              # global switch untouched
