"""End-to-end API flow: session -> submit -> per-test results -> recurring mistake -> hints -> solve."""

import time

import pytest
from fastapi.testclient import TestClient

from codequest.api import create_app
from codequest.content import load_all
from codequest.sandbox.runner import LocalRunner
from codequest.service import CodeQuestService
from codequest.store import Store
from tests.conftest import PRIYA_CLASS_AVERAGE


@pytest.fixture()
def client():
    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    with TestClient(create_app(service)) as c:
        yield c


def login(client, persona="guest"):
    token = client.post("/api/session", json={"persona": persona}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def wait_result(client, headers, sid, timeout=60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        body = client.get(f"/api/submissions/{sid}", headers=headers).json()
        if body["status"] in ("done", "error"):
            return body
        time.sleep(0.2)
    raise AssertionError("submission did not finish")


def test_auth_required(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_challenge_view_hides_secrets(client):
    h = login(client)
    body = client.get("/api/challenges/class_average", headers=h).json()
    assert body["hidden_test_count"] == 6
    assert "references" not in body and "tests" not in body
    listing = client.get("/api/challenges", headers=h).json()
    assert [c["tier"] for c in listing] == sorted(c["tier"] for c in listing)


def test_priya_demo_flow(client):
    h = login(client, "priya")
    sid = client.post("/api/submissions", json={"challenge_id": "class_average", "code": PRIYA_CLASS_AVERAGE},
                      headers=h).json()["submission_id"]
    body = wait_result(client, h, sid)
    assert body["status"] == "done"
    result = body["result"]
    assert all(result["counts"][k] >= 1 for k in ("passed", "wrong_output", "runtime_error", "timeout"))
    hidden = [t for t in result["tests"] if t["visibility"] == "hidden"]
    assert hidden and all(set(t) == {"test_id", "index", "visibility", "status", "category", "explanation"} for t in hidden)

    events = result["events"]
    assert events["newly_recurring"] == ["off_by_one"]  # the demo story: exactly one pattern spotted, live
    assert events["adaptation"]["debug_mission"]["id"] == "debug_average"
    assert events["adaptation"]["next_up"][0]["reason"].startswith("Targets your recurring mistake")

    me = client.get("/api/me", headers=h).json()
    assert "off_by_one" in me["mistakes"]["recurring"]

    first = client.post("/api/challenges/class_average/hint", headers=h)
    assert first.status_code == 200 and first.json()["hint"]["level"] == 1
    locked = client.post("/api/challenges/class_average/hint", headers=h)
    assert locked.status_code == 423 and locked.json()["unlocks_in_s"] > 0

    fixed = PRIYA_CLASS_AVERAGE.replace("while i < len(scores) - 1:", "while i < len(scores):")
    sid2 = client.post("/api/submissions", json={"challenge_id": "class_average", "code": fixed}, headers=h).json()["submission_id"]
    assert wait_result(client, h, sid2)["status"] == "done"
    second = client.post("/api/challenges/class_average/hint", headers=h)
    assert second.status_code == 200 and second.json()["hint"]["level"] == 2

    solution = load_all()["class_average"].references[1]
    sid3 = client.post("/api/submissions", json={"challenge_id": "class_average", "code": solution}, headers=h).json()["submission_id"]
    solved = wait_result(client, h, sid3)["result"]
    assert solved["all_passed"] and solved["events"]["solved"]
    assert solved["events"]["score"] == pytest.approx(0.75)  # H2 credit; 2 failures is under the 3-failure penalty
    me = client.get("/api/me", headers=h).json()
    assert "class_average" not in me["solved"]  # solved with hints -> not a verified solve
    assert client.post("/api/challenges/class_average/hint", headers=h).status_code == 409


def test_rate_limit(client):
    h = login(client)
    codes = []
    for _ in range(8):
        r = client.post("/api/submissions", json={"challenge_id": "total", "code": "def total(nums):\n    return 0\n"}, headers=h)
        codes.append(r.status_code)
    assert codes.count(202) == 6 and codes[-1] == 429


def test_arena_accepts_index_only(client):
    h = login(client)
    attacks = client.get("/api/arena/attacks").json()
    assert len(attacks) == 8
    r = client.post("/api/arena/run", json={"index": 0}, headers=h).json()
    assert r["contained"] is True and r["verdict"] == "runtime_error"
    assert client.post("/api/arena/run", json={"index": 99}, headers=h).status_code == 422
    assert client.post("/api/arena/run", json={"code": "print(1)"}, headers=h).status_code == 422


def test_priya_seed_is_a_consistent_story(client):
    h = login(client, "priya")
    me = client.get("/api/me", headers=h).json()
    assert set(me["solved"]) == {"count_evens", "largest", "reverse_words"}
    assert me["mistakes"]["recurring"] == []                      # nothing recurring until the live demo
    assert me["mistakes"]["strength"]["off_by_one"] == pytest.approx(1.0)
    assert {b["concept"] for b in me["skills"] if b["attempts"]} >= {"loops", "conditionals", "strings"}
