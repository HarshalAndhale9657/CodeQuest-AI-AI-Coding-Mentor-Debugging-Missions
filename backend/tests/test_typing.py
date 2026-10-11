"""Syntax Warm-up: corpus validity, personalised drills, own-code snippets and server-side scoring."""

import pytest
from fastapi.testclient import TestClient

from codequest import typing_drills as td
from codequest.api import create_app
from codequest.content import load_all
from codequest.sandbox.runner import LocalRunner
from codequest.service import CodeQuestService
from codequest.store import Store
from tests.test_api import wait_result

SOLVED_TOTAL = "def total(nums):\n    result = 0\n    for n in nums:\n        result += n\n    return result\n"


@pytest.fixture()
def env():
    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    with TestClient(create_app(service)) as c:
        yield c, service


def login(client, persona="priya"):
    body = client.post("/api/session", json={"persona": persona}).json()
    return {"Authorization": f"Bearer {body['token']}"}, body["user"]["handle"]


def run_body(snippet, seconds=30.0, errors=None, syntax_errors=0, auto_indent=True):
    return {"snippet_id": snippet["id"], "auto_indent": auto_indent, "duration_ms": int(seconds * 1000),
            "errors": errors or {}, "syntax_errors": syntax_errors}


# ---------------------------------------------------------------------- pure functions

def test_corpus_is_typeable_python():
    corpus = td.load_corpus()
    assert len(corpus) >= 30
    assert len({s.id for s in corpus}) == len(corpus)
    for s in corpus:
        assert "\t" not in s.code and all(line == line.rstrip() for line in s.code.split("\n"))


def test_typed_chars_skips_indentation_only_in_auto_indent_mode():
    code = "def f():\n    return 1"
    assert td.typed_chars(code, auto_indent=False) == len(code)
    assert td.typed_chars(code, auto_indent=True) == len(code) - 4


def test_compute_run_is_server_side_and_rejects_impossible_runs():
    code = "x = [1, 2]\nprint(x)"
    run = td.compute_run(code, True, {"[": 1, ",": 1, "p": 2}, 12_000, syntax_errors=2)
    assert run["chars"] == len(code)
    assert run["cpm"] == pytest.approx(len(code) / 0.2, abs=0.1)
    assert run["accuracy"] == pytest.approx(len(code) / (len(code) + 4), abs=1e-4)
    syntax_total = td.syntax_char_count(code)
    assert run["syntax_accuracy"] == pytest.approx(syntax_total / (syntax_total + 2), abs=1e-4)
    with pytest.raises(ValueError):
        td.compute_run(code, True, {}, 100, 0)                 # 11k chars per minute
    with pytest.raises(ValueError):
        td.compute_run(code, True, {"x": 1}, 12_000, 5)        # more syntax errors than errors


def test_own_snippets_use_only_parseable_functions():
    snippets = td.own_snippets([("total", "Add Them Up", "loops", SOLVED_TOTAL),
                                ("broken", "Broken", "loops", "def f(:\n  pass"),
                                ("tiny", "Tiny", "loops", "def f(): return 1")])
    assert [s.id for s in snippets] == ["own-total"]
    assert snippets[0].code.startswith("def total(nums):") and snippets[0].source == "own"


def test_recommend_prefers_weak_concepts_and_syntax_focus_and_skips_recent():
    corpus = td.load_corpus()
    drills = td.recommend(corpus, [], ["stack"], ["syntax:brackets"], [])
    assert drills[0]["concept"] == "stack" and drills[0]["recommended"]
    recent = [d["id"] for d in drills[:5]]
    again = td.recommend(corpus, [], ["stack"], ["syntax:brackets"], recent)
    assert again[0]["id"] not in recent


def test_summary_pace_caret_needs_accurate_runs():
    rows = [{"cpm": 200 + i, "accuracy": 0.97, "syntax_accuracy": 0.9, "errors": '{"(": 1}', "snippet_id": "a",
             "created": float(i)} for i in range(4)]
    summary = td.summarize(rows)
    assert summary["pace_cpm"] == pytest.approx(201.5 * 1.05, abs=0.1)
    assert summary["top_errors"] == [["(", 4]] and summary["runs"] == 4
    sloppy = [r | {"accuracy": 0.8} for r in rows]
    assert td.summarize(sloppy)["pace_cpm"] is None
    assert td.summarize([]) is None


# ---------------------------------------------------------------------- API

def test_drills_then_result_updates_summary_and_portfolio(env):
    client, _ = env
    h, handle = login(client)
    body = client.get("/api/typing/drills", headers=h).json()
    assert body["summary"] is None and len(body["drills"]) >= 30
    drill = body["drills"][0]
    first = client.post("/api/typing/results", json=run_body(drill, errors={"(": 2}, syntax_errors=2),
                        headers=h).json()
    assert first["run"]["personal_best"] and first["summary"]["runs"] == 1
    slower = client.post("/api/typing/results", json=run_body(drill, seconds=60), headers=h).json()
    assert not slower["run"]["personal_best"]
    typing = client.get(f"/api/portfolio/{handle}").json()["typing"]
    assert typing["runs"] == 2 and typing["best_cpm"] == first["run"]["cpm"]
    assert typing["best_wpm"] == pytest.approx(typing["best_cpm"] / 5, abs=0.1)


def test_results_are_validated(env):
    client, _ = env
    h, _ = login(client)
    drill = client.get("/api/typing/drills", headers=h).json()["drills"][0]
    assert client.post("/api/typing/results", json=run_body(drill, seconds=1), headers=h).status_code == 422
    assert client.post("/api/typing/results", json=run_body({"id": "nope"}), headers=h).status_code == 404
    assert client.post("/api/typing/results", json=run_body(drill, errors={"ab": 1}), headers=h).status_code == 422
    assert client.post("/api/typing/results", json=run_body(drill, errors={"a": -1}), headers=h).status_code == 422
    assert client.post("/api/typing/results", json=run_body(drill)).status_code == 401


def test_own_code_becomes_a_drill_after_a_solve(env):
    client, _ = env
    h, _ = login(client, "guest")
    sid = client.post("/api/submissions", json={"challenge_id": "total", "code": SOLVED_TOTAL},
                      headers=h).json()["submission_id"]
    assert wait_result(client, h, sid)["result"]["all_passed"]
    drills = client.get("/api/typing/drills", headers=h).json()["drills"]
    own = next(d for d in drills if d["id"] == "own-total")
    assert own["source"] == "own" and "def total" in own["code"]
    r = client.post("/api/typing/results", json=run_body(own), headers=h)
    assert r.status_code == 200 and r.json()["run"]["chars"] == td.typed_chars(own["code"], True)
    # another learner can't type (or probe) someone else's code
    other, _ = login(client, "guest")
    assert client.post("/api/typing/results", json=run_body(own), headers=other).status_code == 404


def test_typing_counts_towards_the_roadmap_warmup(env):
    client, service = env
    h, _ = login(client)
    token = h["Authorization"][7:]
    user = service.store.user_by_token(token)
    state = service._state(user)
    state.recurring.append("syntax:missing_colon")
    service.store.save_state(user["id"], state.to_dict())
    plan = client.post("/api/me/roadmap", json={"use_ai": False}, headers=h).json()
    warmup = next(i for i in plan["weeks"][0]["items"] if i["kind"] == "warmup")
    assert not warmup["done"]
    drill = client.get("/api/typing/drills", headers=h).json()["drills"][0]
    client.post("/api/typing/results", json=run_body(drill), headers=h)
    plan = client.get("/api/me/roadmap", headers=h).json()
    assert next(i for i in plan["weeks"][0]["items"] if i["kind"] == "warmup")["done"]
