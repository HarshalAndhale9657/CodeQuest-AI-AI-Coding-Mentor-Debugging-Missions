"""Onboarding profile, the deterministic roadmap planner, AI coach notes (fake provider) and data rights."""

import json

import pytest
from fastapi.testclient import TestClient

from codequest import roadmap
from codequest.ai import AILayer
from codequest.api import create_app
from codequest.content import load_all
from codequest.learner import LearnerState
from codequest.sandbox.runner import LocalRunner
from codequest.service import CodeQuestService
from codequest.store import Store

PROFILE = {"goal": "product_placement", "deadline_weeks": 12, "hours_per_week": 8, "level": "basics",
           "premium_ok": False, "comfortable": []}


@pytest.fixture()
def env():
    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    with TestClient(create_app(service)) as c:
        yield c, service


def login(client, persona="guest"):
    body = client.post("/api/session", json={"persona": persona}).json()
    return {"Authorization": f"Bearer {body['token']}"}


def inputs(challenges, **profile):
    return roadmap.PlanInputs(profile=PROFILE | profile, state=LearnerState(), challenges=challenges,
                              mastered=set(), imported=set(), done_external=set())


# ---------------------------------------------------------------------- catalog and graph

def test_catalog_is_valid_and_covers_every_topic():
    catalog = roadmap.load_catalog()
    assert len(catalog) >= 150
    assert {item["topic"] for item in catalog} == set(roadmap.TOPIC_IDS)
    assert all(item["slug"] in roadmap.lc_url(item["slug"]) for item in catalog)


def test_topological_order_respects_prerequisites():
    for goal in roadmap.GOALS.values():
        order = roadmap.topo_order(goal.scope)
        assert sorted(order) == sorted(goal.scope)
        for topic_id in order:
            for pre in roadmap.TOPIC_BY_ID[topic_id].prereqs:
                if pre in goal.scope:
                    assert order.index(pre) < order.index(topic_id), (pre, topic_id)


# ---------------------------------------------------------------------- planner

def test_plan_is_deterministic_and_fits_the_week(challenges):
    a = roadmap.build_plan(inputs(challenges))
    b = roadmap.build_plan(inputs(challenges))
    assert a == b
    usable = a["weekly_minutes"] - round(a["weekly_minutes"] * roadmap.REVIEW_SHARE / 5) * 5
    for week in a["weeks"]:
        assert week["minutes"] <= usable or len(week["items"]) == 1
    assert len(a["weeks"]) <= 12


def test_beginners_get_easy_problems_and_no_premium(challenges):
    plan = roadmap.build_plan(inputs(challenges, goal="learn_python", level="new", deadline_weeks=None))
    lc = [i for w in plan["weeks"] for i in w["items"] if i["kind"] == "leetcode"]
    assert lc and all(i["difficulty"] == "Easy" for i in lc)
    assert not any(i.get("premium") for i in lc)
    assert all(i["url"].startswith("https://leetcode.com/problems/") for i in lc)


def test_premium_problems_only_when_allowed(challenges):
    plan = roadmap.build_plan(inputs(challenges, goal="faang", level="intermediate", deadline_weeks=None,
                                     premium_ok=True, hours_per_week=40))
    free = roadmap.build_plan(inputs(challenges, goal="faang", level="intermediate", deadline_weeks=None,
                                     premium_ok=False, hours_per_week=40))
    def items(p):
        return [i for w in p["weeks"] for i in w["items"] if i["kind"] == "leetcode"]
    assert not any(i["premium"] for i in items(free))
    assert {i["topic"] for i in items(plan)} == {i["topic"] for i in items(free)}


def test_tight_deadline_compresses_then_trims_and_says_so(challenges):
    plan = roadmap.build_plan(inputs(challenges, goal="faang", level="new", hours_per_week=2, deadline_weeks=2))
    assert len(plan["weeks"]) <= 2
    assert plan["compressed"] and plan["trimmed"]
    assert any("deadline" in w for w in plan["warnings"])
    assert all(t["status"] == "trimmed" for t in plan["topics"] if t["id"] in plan["trimmed"])


def test_mastered_and_comfortable_topics_shrink_the_plan(challenges):
    base = roadmap.build_plan(inputs(challenges))
    comfy = roadmap.build_plan(inputs(challenges, comfortable=["conditionals", "loops", "strings", "lists"]))
    count = lambda p: sum(len(w["items"]) for w in p["weeks"])  # noqa: E731
    assert count(comfy) < count(base)
    mastered = roadmap.PlanInputs(profile=PROFILE, state=LearnerState(), challenges=challenges,
                                  mastered={"loops"}, imported=set(), done_external=set())
    plan = roadmap.build_plan(mastered)
    row = next(t for t in plan["topics"] if t["id"] == "loops")
    assert row["status"] == "mastered"
    assert not any(i["topic"] == "loops" for w in plan["weeks"] for i in w["items"])


def test_recurring_mistakes_put_drills_first(challenges):
    state = LearnerState(recurring=["off_by_one", "syntax:missing_colon"], mistakes={"off_by_one": 1.8})
    inp = roadmap.PlanInputs(profile=PROFILE, state=state, challenges=challenges, mastered=set(),
                             imported=set(), done_external=set())
    first = roadmap.build_plan(inp)["weeks"][0]["items"]
    assert first[0]["trap"] and first[0]["kind"] == "mission"
    assert "off_by_one" in challenges[first[0]["id"][2:]].traps
    assert any(i["kind"] == "warmup" for i in first)


def test_replan_reasons():
    old = {"profile": {"goal": "faang"}, "recurring": [], "mastered": [], "imported": []}
    new = {"profile": {"goal": "faang"}, "recurring": ["off_by_one"], "mastered": ["loops"], "imported": []}
    reasons = roadmap.replan_reasons(old, new)
    assert any("off by one" in r for r in reasons) and any("Loops" in r for r in reasons)
    assert roadmap.replan_reasons(old, old) == []


# ---------------------------------------------------------------------- AI coach notes

def good_notes(plan):
    facts = roadmap.coach_facts(plan)
    return {"summary": "This plan builds your foundations first, then interview topics, at your own pace.",
            "weeks": [{"week": w["week"], "note": f"Week {w['week']}: steady practice on {', '.join(w['topics'])}."}
                      for w in facts["weeks"]],
            "tips": ["Test the empty input first.", "Say your plan out loud.", "Take one hint, not the answer."]}


class FakeProvider:
    def __init__(self, reply):
        self.reply = reply
        self.calls = 0
        self.seen = []

    def __call__(self, messages):
        self.calls += 1
        self.seen.append(messages)
        return (self.reply if isinstance(self.reply, str) else json.dumps(self.reply)), 0.002


def coach_with(service, provider):
    def unused(system, user):
        return "", 0.0
    unused.name = "fake"
    service.ai = AILayer(providers=[unused], budget_usd=1.0)
    service.coach = roadmap.RoadmapCoach(lambda: service.ai, provider, service.store.get_kv, service.store.set_kv)


def test_validate_coach_rejects_code_links_and_invented_numbers(challenges):
    plan = roadmap.build_plan(inputs(challenges))
    facts = roadmap.coach_facts(plan)
    notes = good_notes(plan)
    assert roadmap.validate_coach(json.dumps(notes), facts) is not None
    for bad in ({"summary": "Solve 50 problems a day and you'll be fine, trust me on that one."},
                {"summary": "Start with `for i in range(n): total += i` and build from there."},
                {"summary": "Read https://example.com before week one so the plan makes sense."},
                {"tips": ["only one tip"]},
                {"weeks": notes["weeks"][:-1]}):
        assert roadmap.validate_coach(json.dumps(notes | bad), facts) is None, bad
    assert roadmap.validate_coach("not json", facts) is None


class FactsAwareProvider(FakeProvider):
    """Answers with valid notes for exactly the weeks in the facts it was sent."""

    def __call__(self, messages):
        facts = json.loads(messages[1]["content"].split("\n", 1)[1])
        self.reply = {"summary": "Built around your goal, with your weak spots first.",
                      "weeks": [{"week": w["week"], "note": "Steady practice this week."} for w in facts["weeks"]],
                      "tips": ["Test empty input.", "Plan before coding.", "One hint at a time."]}
        return super().__call__(messages)


def test_ai_notes_are_used_cached_and_charged(env):
    client, service = env
    h = login(client, "priya")
    fake = FactsAwareProvider(None)
    coach_with(service, fake)
    first = client.post("/api/me/roadmap", json={"use_ai": True}, headers=h).json()
    assert first["coach"]["source"] == "ai" and first["weeks"][0]["note"] == "Steady practice this week."
    assert first["ai"] == {"available": True, "enabled": True}
    second = client.post("/api/me/roadmap", json={"use_ai": True}, headers=h).json()
    assert second["coach"]["source"] == "ai" and fake.calls == 1      # identical facts: served from cache
    assert service.ai.spent_usd == pytest.approx(0.002)
    assert second["version"] == 2


def test_rejected_ai_notes_fall_back_to_the_template(env):
    client, service = env
    h = login(client, "priya")
    coach_with(service, FakeProvider({"summary": "Do `x = 1` first.", "weeks": [], "tips": []}))
    body = client.post("/api/me/roadmap", json={"use_ai": True}, headers=h).json()
    assert body["coach"]["source"] == "template" and body["weeks"][0]["note"]
    assert service.ai.blocked == 1


def test_model_sees_no_code_or_problem_content(env):
    client, service = env
    h = login(client, "priya")
    fake = FakeProvider("{}")
    coach_with(service, fake)
    client.post("/api/me/roadmap", json={"use_ai": True}, headers=h)
    sent = json.dumps(fake.seen)
    assert "leetcode.com" not in sent and "def " not in sent and "/m/" not in sent


def test_ai_off_or_opted_out_never_calls_the_model(env):
    client, service = env
    h = login(client, "priya")
    fake = FakeProvider("{}")
    coach_with(service, fake)
    client.post("/api/settings/ai", json={"enabled": False}, headers=h)
    assert client.post("/api/me/roadmap", json={"use_ai": True}, headers=h).json()["coach"]["source"] == "template"
    client.post("/api/settings/ai", json={"enabled": True}, headers=h)
    assert client.post("/api/me/roadmap", json={"use_ai": False}, headers=h).json()["coach"]["source"] == "template"
    assert fake.calls == 0


# ---------------------------------------------------------------------- API

def test_roadmap_requires_a_profile(env):
    client, _ = env
    h = login(client)
    r = client.get("/api/me/roadmap", headers=h)
    assert r.status_code == 409 and r.json()["code"] == "profile_required"
    assert client.get("/api/me/roadmap").status_code == 401


def test_onboarding_then_roadmap_then_progress(env):
    client, _ = env
    h = login(client)
    profile = client.put("/api/me/profile", json=PROFILE | {"name": "  Asha   K "}, headers=h).json()
    assert profile["onboarded"] and profile["name"] == "Asha K" and profile["handle"].startswith("asha-k-")
    assert {g["id"] for g in profile["options"]["goals"]} == set(roadmap.GOALS)
    me = client.get("/api/me", headers=h).json()
    assert me["onboarded"] and me["profile"]["goal"] == "product_placement"

    plan = client.get("/api/me/roadmap", headers=h).json()
    assert plan["progress"]["done"] == 0 and plan["current_week"] == 1 and not plan["replan"]["suggested"]
    lc = next(i for w in plan["weeks"] for i in w["items"] if i["kind"] == "leetcode")
    marked = client.post("/api/me/roadmap/items", json={"item_id": lc["id"], "done": True}, headers=h).json()
    assert marked["progress"]["done"] == 1
    assert next(i for w in marked["weeks"] for i in w["items"] if i["id"] == lc["id"])["done"]
    undone = client.post("/api/me/roadmap/items", json={"item_id": lc["id"], "done": False}, headers=h).json()
    assert undone["progress"]["done"] == 0

    client.put("/api/me/profile", json=PROFILE | {"hours_per_week": 20}, headers=h)
    stale = client.get("/api/me/roadmap", headers=h).json()
    assert stale["replan"]["suggested"] and stale["version"] == 1
    fresh = client.post("/api/me/roadmap", json={"use_ai": False}, headers=h).json()
    assert not fresh["replan"]["suggested"] and fresh["version"] == 2 and fresh["weekly_minutes"] == 1200


def test_profile_validation(env):
    client, _ = env
    h = login(client)
    for bad in ({"goal": "astronaut"}, {"level": "guru"}, {"hours_per_week": 0}, {"hours_per_week": 41},
                {"deadline_weeks": 1}, {"comfortable": ["cooking"]}, {"name": "   "}):
        assert client.put("/api/me/profile", json=PROFILE | bad, headers=h).status_code == 422, bad


def test_mark_item_rejects_missions_and_unknown_slugs(env):
    client, _ = env
    h = login(client, "priya")
    assert client.post("/api/me/roadmap/items", json={"item_id": "m:total", "done": True},
                       headers=h).status_code == 422
    assert client.post("/api/me/roadmap/items", json={"item_id": "lc:not-a-real-problem", "done": True},
                       headers=h).status_code == 404


def test_extension_accept_ticks_off_the_roadmap_item(env):
    client, service = env
    h = login(client, "priya")
    plan = client.get("/api/me/roadmap", headers=h).json()
    lc = next(i for w in plan["weeks"] for i in w["items"] if i["kind"] == "leetcode")
    user = service.store.user_by_token(h["Authorization"][7:])
    service.ext_sync(user, lc["id"][3:], [], "accepted", "")
    after = client.get("/api/me/roadmap", headers=h).json()
    assert next(i for w in after["weeks"] for i in w["items"] if i["id"] == lc["id"])["done"]


def test_rename_keeps_old_portfolio_links_working(env):
    client, _ = env
    h = login(client, "priya")
    old = client.get("/api/me", headers=h).json()["user"]["handle"]
    new = client.put("/api/me/profile", json=PROFILE | {"name": "Priya S"}, headers=h).json()["handle"]
    assert new != old
    assert client.get(f"/api/portfolio/{old}").json()["handle"] == new


def test_export_and_delete_account(env):
    client, _ = env
    h = login(client, "priya")
    client.get("/api/me/roadmap", headers=h)
    data = client.get("/api/me/export", headers=h).json()
    assert data["learner"]["profile"]["goal"] == "product_placement" and data["roadmap"]["weeks"]
    handle = data["user"]["handle"]
    assert client.delete("/api/me", headers=h).json() == {"deleted": True}
    assert client.get("/api/me", headers=h).status_code == 401
    assert client.get(f"/api/portfolio/{handle}").status_code == 404
