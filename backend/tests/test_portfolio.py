"""Portfolio, platform imports (with fake fetchers: no network) and typing results."""

import time

import pytest
from fastapi.testclient import TestClient

from codequest import portfolio
from codequest.api import create_app
from codequest.content import load_all
from codequest.sandbox.runner import LocalRunner
from codequest.service import CodeQuestService
from codequest.store import Store

CF = {"handle": "tourist", "rating": 3500, "max_rating": 3800, "rank": "legendary grandmaster",
      "solved": 2, "top_tags": [["implementation", 2], ["greedy", 1]]}


def fake_cf(handle):
    if handle == "ghost":
        raise portfolio.ImportError_("Codeforces user not found")
    return dict(CF, handle=handle)


def broken(handle):
    raise OSError("network down")


@pytest.fixture()
def env():
    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    service.fetchers = {"codeforces": fake_cf, "leetcode": broken}
    with TestClient(create_app(service)) as c:
        yield c, service


def login(client, persona="priya"):
    body = client.post("/api/session", json={"persona": persona}).json()
    return {"Authorization": f"Bearer {body['token']}"}, body["user"]["handle"]


def wait_import(client, handle, platform, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        row = client.get(f"/api/portfolio/{handle}").json()["imports"].get(platform)
        if row:
            return row
        time.sleep(0.05)
    raise AssertionError("import did not finish")


def test_portfolio_is_public_and_has_verified_section(env):
    client, _ = env
    h, handle = login(client)
    assert handle.startswith("priya-")
    assert client.get("/api/me", headers=h).json()["user"]["handle"] == handle
    body = client.get(f"/api/portfolio/{handle}").json()  # no auth header: shareable
    assert body["name"] == "Priya"
    assert {"concepts", "mistakes", "stats", "solved"} <= body["verified"].keys()
    assert body["imports"] == {} and body["typing"] is None


def test_unknown_handle_404(env):
    client, _ = env
    assert client.get("/api/portfolio/nobody-abcdef").status_code == 404
    assert client.get("/api/portfolio/no-prefix").status_code == 404


def test_codeforces_import_then_cache(env):
    client, _ = env
    h, handle = login(client)
    assert client.post("/api/imports", json={"platform": "codeforces", "handle": "tourist"}, headers=h).json() \
        == {"status": "queued"}
    row = wait_import(client, handle, "codeforces")
    assert row["status"] == "ok" and row["rating"] == 3500 and row["solved"] == 2
    again = client.post("/api/imports", json={"platform": "codeforces", "handle": "tourist"}, headers=h)
    assert again.json() == {"status": "cached"}


def test_failed_import_is_recorded_not_raised(env):
    client, _ = env
    h, handle = login(client)
    client.post("/api/imports", json={"platform": "leetcode", "handle": "someone"}, headers=h)
    row = wait_import(client, handle, "leetcode")
    assert row["status"] == "error" and "network down" in row["error"]


def test_refresh_keeps_last_good_snapshot_when_platform_is_down():
    store = Store(":memory:")
    portfolio.refresh_import(store, "u1", "codeforces", "tourist", {"codeforces": fake_cf})
    portfolio.refresh_import(store, "u1", "codeforces", "tourist", {"codeforces": broken})
    row = store.get_import("u1", "codeforces")
    assert row["status"] == "stale" and row["data"]["rating"] == 3500


@pytest.mark.parametrize("handle", ["../etc", "a b", "x" * 41, "http://evil", ""])
def test_import_rejects_bad_handles(env, handle):
    client, _ = env
    h, _ = login(client)
    r = client.post("/api/imports", json={"platform": "codeforces", "handle": handle}, headers=h)
    assert r.status_code in (400, 422)


def test_import_rejects_unknown_platform_and_requires_auth(env):
    client, _ = env
    h, _ = login(client)
    assert client.post("/api/imports", json={"platform": "evil", "handle": "x"}, headers=h).status_code == 422
    assert client.post("/api/imports", json={"platform": "codeforces", "handle": "x"}).status_code == 401


def test_typing_results_feed_portfolio(env):
    client, _ = env
    h, handle = login(client)
    drill = client.get("/api/typing/drills", headers=h).json()["drills"][0]
    body = {"snippet_id": drill["id"], "duration_ms": 30000, "errors": {"(": 2}, "syntax_errors": 2}
    best = client.post("/api/typing/results", json=body, headers=h).json()["summary"]["best_cpm"]
    client.post("/api/typing/results", json=body | {"duration_ms": 45000}, headers=h)
    assert client.get(f"/api/portfolio/{handle}").json()["typing"]["best_cpm"] == best
    assert client.post("/api/typing/results", json=body | {"duration_ms": 1000}, headers=h).status_code == 422


def test_mistakes_timeline_orders_recurring_first():
    rows = portfolio.mistakes_timeline([["off_by_one"], ["empty_input", "off_by_one"]], ["off_by_one"], ["empty_input"])
    assert rows[0]["key"] == "off_by_one" and rows[0]["recurring"] and rows[0]["times"] == 2
    assert rows[1]["beaten"] and rows[1]["first_seen"] == 2


def test_tag_mapping_uses_concept_map(monkeypatch):
    monkeypatch.setattr(portfolio, "load_concept_map", lambda: {"codeforces": {"greedy": ["loops", "lists"]}})
    assert portfolio.map_tags("codeforces", [["greedy", 4], ["dp", 1]]) == ["loops", "lists"]
