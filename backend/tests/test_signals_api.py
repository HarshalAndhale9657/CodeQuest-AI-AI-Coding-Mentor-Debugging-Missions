"""Learning signals over HTTP: Predict Before You Run, pass review, Debug Journey and portfolio growth."""

import time

import pytest
from fastapi.testclient import TestClient

from codequest.api import create_app
from codequest.content import load_all
from codequest.sandbox.runner import LocalRunner
from codequest.service import CodeQuestService
from codequest.store import Store
from tests.test_pass_review import PER_TYPE_COUNTERS, USES_MAX
from tests.test_predict import CORRECT, ZERO_START


@pytest.fixture()
def client():
    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    with TestClient(create_app(service)) as c:
        yield c


def login(client, persona="guest"):
    body = client.post("/api/session", json={"persona": persona}).json()
    return {"Authorization": f"Bearer {body['token']}"}, body["user"]["handle"]


def wait(client, headers, sid, *, settled=True, timeout=60):
    """Poll until judged; with `settled`, also until the robustness search has finished."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        body = client.get(f"/api/submissions/{sid}", headers=headers).json()
        if body["status"] in ("done", "error"):
            robustness = (body.get("result") or {}).get("robustness")
            if not settled or not robustness or robustness["status"] != "checking":
                return body
        time.sleep(0.1)
    raise AssertionError("submission did not settle")


def submit(client, headers, challenge, code, prediction=None):
    payload = {"challenge_id": challenge, "code": code}
    if prediction is not None:
        payload["prediction"] = prediction
    r = client.post("/api/submissions", json=payload, headers=headers)
    assert r.status_code == 202, r.text
    return wait(client, headers, r.json()["submission_id"])


def prompt_of(client, headers, challenge):
    return client.get(f"/api/challenges/{challenge}", headers=headers).json()["prediction"]


# --------------------------------------------------------------------------- Predict Before You Run

def test_first_submission_carries_one_prediction_per_attempt(client):
    h, _ = login(client)
    prompt = prompt_of(client, h, "largest")
    assert prompt["call"].startswith("largest(") and len(prompt["prompt_id"]) == 12
    body = submit(client, h, "largest", ZERO_START, {"prompt_id": prompt["prompt_id"], "answer": "0"})
    block = body["result"]["prediction"]
    assert block["call"] == prompt["call"] and block["state"] in {"misconception", "lost", "aligned"}
    assert prompt_of(client, h, "largest") is None  # asked once per attempt

    again = submit(client, h, "largest", CORRECT, {"prompt_id": prompt["prompt_id"], "answer": "0"})
    assert again["result"]["prediction"] is None  # a second prediction in the same attempt is ignored


def test_skipping_counts_as_asked(client):
    h, _ = login(client)
    prompt = prompt_of(client, h, "total")
    body = submit(client, h, "total", "def total(nums):\n    return 0\n", {"prompt_id": prompt["prompt_id"], "skipped": True})
    assert body["result"]["prediction"] is None
    assert prompt_of(client, h, "total") is None


def test_a_prediction_needs_an_answer_unless_crash_or_skip(client):
    h, _ = login(client)
    prompt = prompt_of(client, h, "total")
    r = client.post("/api/submissions", headers=h, json={"challenge_id": "total", "code": "def total(nums):\n    return 0\n",
                                                         "prediction": {"prompt_id": prompt["prompt_id"], "answer": "  "}})
    assert r.status_code == 422
    r = client.post("/api/submissions", headers=h, json={"challenge_id": "total", "code": "def total(nums):\n    return 0\n",
                                                         "prediction": {"prompt_id": "not-hex!", "answer": "1"}})
    assert r.status_code == 422


def test_a_stale_prompt_never_blocks_a_submission(client):
    h, _ = login(client)
    body = submit(client, h, "total", "def total(nums):\n    return 0\n", {"prompt_id": "0" * 12, "answer": "1"})
    assert body["status"] == "done" and body["result"]["prediction"] is None
    assert prompt_of(client, h, "total") is not None  # still unanswered, so asked again


def test_a_syntax_error_defers_the_prediction(client):
    h, _ = login(client)
    prompt = prompt_of(client, h, "total")
    body = submit(client, h, "total", "def total(nums)\n    return 0\n", {"prompt_id": prompt["prompt_id"], "answer": "1"})
    assert body["result"]["prediction"]["state"] == "unrun"
    assert prompt_of(client, h, "total") is not None


def test_predictions_feed_the_portfolio(client):
    h, handle = login(client)
    prompt = prompt_of(client, h, "largest")
    submit(client, h, "largest", ZERO_START, {"prompt_id": prompt["prompt_id"], "crash": True})
    growth = client.get(f"/api/portfolio/{handle}").json()["verified"]["growth"]
    assert growth["prediction"]["total"] == 1


# --------------------------------------------------------------------------- pass review

def test_a_fragile_pass_is_reported_after_the_verdict(client):
    h, _ = login(client)
    body = submit(client, h, "valid_brackets", PER_TYPE_COUNTERS)
    result = body["result"]
    assert result["all_passed"] and result["events"]["solved"]
    robustness = result["robustness"]
    assert robustness["status"] == "fragile" and robustness["failed"] >= 1
    assert robustness["counterexample"] == {"call": "valid_brackets('([)]')", "expected": "False", "got": "True",
                                            "error": None}


def test_a_correct_solution_is_robust(client, challenges):
    h, _ = login(client)
    result = submit(client, h, "valid_brackets", challenges["valid_brackets"].references[0])["result"]
    assert result["robustness"]["status"] == "robust" and result["robustness"]["checked"] > 100


def test_missions_without_a_search_domain_report_nothing(client, challenges):
    h, _ = login(client)
    result = submit(client, h, "flatten", challenges["flatten"].references[0])["result"]
    assert result["all_passed"] and result["robustness"] is None


def test_breaking_a_mission_rule_is_not_a_solve(client):
    h, _ = login(client)
    detail = client.get("/api/challenges/largest", headers=h).json()
    assert detail["forbidden_calls"] == ["max"]
    result = submit(client, h, "largest", USES_MAX)["result"]
    assert result["all_passed"] and result["rule_violations"] == [{"call": "max", "line": 4}]
    assert result["events"]["solved"] is False and result["robustness"] is None
    assert "largest" not in client.get("/api/me", headers=h).json()["solved"]
    hint = client.post("/api/challenges/largest/hint", headers=h)
    assert hint.status_code == 409 and "max()" in hint.json()["error"]
    fixed = submit(client, h, "largest", CORRECT)["result"]
    assert fixed["events"]["solved"] is True


# --------------------------------------------------------------------------- Debug Journey

def test_journey_replays_the_latest_attempt(client):
    h, _ = login(client)
    assert client.get("/api/challenges/largest/journey", headers=h).json()["attempt"] is None
    submit(client, h, "largest", ZERO_START)
    submit(client, h, "largest", CORRECT)
    view = client.get("/api/challenges/largest/journey", headers=h).json()
    assert view["attempt"]["solved"] is True and [s["kind"] for s in view["steps"]] == ["first", "solved"]
    assert view["summary"]["style"] == "quick_fix" and view["reflection"] is None
    assert view["steps"][1]["change"]["added"] == 1

    r = client.post("/api/challenges/largest/reflection", headers=h, json={"strategy": "systematic", "note": "fixed the start"})
    assert r.status_code == 200
    assert r.json()["reflection"]["strategy"] == "systematic" and r.json()["agreement"] == "agrees"


def test_reflection_needs_a_judged_attempt_and_a_known_strategy(client):
    h, _ = login(client)
    assert client.post("/api/challenges/total/reflection", headers=h, json={"strategy": "systematic"}).status_code == 409
    assert client.post("/api/challenges/total/reflection", headers=h, json={"strategy": "lucky"}).status_code == 422


def test_journey_is_private(client):
    assert client.get("/api/challenges/largest/journey").status_code == 401


# --------------------------------------------------------------------------- portfolio growth + demo seed

def test_portfolio_growth_has_every_section(client, challenges):
    h, handle = login(client)
    submit(client, h, "total", "def total(nums):\n    return sum(nums)\n")
    growth = client.get(f"/api/portfolio/{handle}").json()["verified"]["growth"]
    assert set(growth) == {"solves", "struggle", "lanes", "prediction", "debugging", "robustness"}
    assert len(growth["struggle"]) == len(challenges)
    assert growth["solves"]["count"] == 1 and growth["solves"]["first_try"] == 1


def test_priya_seed_tells_the_same_story_everywhere(client):
    h, handle = login(client, "priya")
    me = client.get("/api/me", headers=h).json()
    assert set(me["solved"]) == {"count_evens", "largest", "reverse_words"}
    growth = client.get(f"/api/portfolio/{handle}").json()["verified"]["growth"]
    assert [s["challenge_id"] for s in growth["solves"]["series"]] == ["count_evens", "largest", "reverse_words"]
    assert {lane["key"] for lane in growth["lanes"]["lanes"]} == {"bad_initial_value", "off_by_one"}
    assert growth["prediction"]["total"] == 4
    assert growth["debugging"]["journeys"] >= 2
    journey = client.get("/api/challenges/largest/journey", headers=h).json()
    assert [s["kind"] for s in journey["steps"]] == ["first", "solved"]
    assert client.get("/api/challenges/class_average", headers=h).json()["prediction"] is not None


def test_a_missions_first_question_is_the_same_for_everyone(client):
    first, _ = login(client)
    second, _ = login(client)
    assert prompt_of(client, first, "class_average") == prompt_of(client, second, "class_average")


def test_a_fragile_pass_holds_back_skill_credit(client):
    robust_h, _ = login(client)
    fragile_h, _ = login(client)
    reference = load_all()["valid_brackets"].references[0]
    submit(client, robust_h, "valid_brackets", reference)
    fragile = submit(client, fragile_h, "valid_brackets", PER_TYPE_COUNTERS)["result"]["robustness"]
    assert fragile["status"] == "fragile" and fragile["held_back"]  # concept -> Elo points held back

    def skill(headers, concept):
        return next(b for b in client.get("/api/me", headers=headers).json()["skills"] if b["concept"] == concept)

    concept = next(iter(fragile["held_back"]))
    robust_band, fragile_band = skill(robust_h, concept), skill(fragile_h, concept)
    assert fragile_band["p_median"] < robust_band["p_median"]
    assert fragile_band["verified"] == robust_band["verified"] - 1  # a fragile pass isn't verified evidence


class GatedProbeRunner(LocalRunner):
    """Holds every small-input search until released, like a slow sandbox."""

    def __init__(self):
        super().__init__()
        import threading
        self.release = threading.Event()

    def run(self, request, limits):
        if "batch" in request:
            self.release.wait(30)
        return super().run(request, limits)


def test_robustness_searches_never_hold_up_other_verdicts():
    """Two searches stuck on a slow sandbox must not starve the judge pool for a third learner."""
    runner = GatedProbeRunner()
    service = CodeQuestService(Store(":memory:"), runner, load_all())
    with TestClient(create_app(service)) as c:
        code = load_all()["valid_brackets"].references[0]
        passing = []
        for _ in range(2):
            h, _ = login(c)
            sid = c.post("/api/submissions", json={"challenge_id": "valid_brackets", "code": code}, headers=h).json()["submission_id"]
            early = wait(c, h, sid, settled=False)
            assert early["result"]["robustness"]["status"] == "checking"
            passing.append((h, sid))
        h3, _ = login(c)
        sid3 = c.post("/api/submissions", json={"challenge_id": "total", "code": "def total(nums):\n    return 0\n"},
                      headers=h3).json()["submission_id"]
        assert wait(c, h3, sid3, settled=False, timeout=15)["status"] == "done"
        runner.release.set()
        for h, sid in passing:
            assert wait(c, h, sid)["result"]["robustness"]["status"] == "robust"
