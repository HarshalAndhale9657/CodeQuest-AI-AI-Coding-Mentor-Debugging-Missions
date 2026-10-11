"""LeetCode Companion: pairing, analysis, approach check, hints and sync."""

import pytest
from fastapi.testclient import TestClient

from codequest import extension
from codequest.api import create_app
from codequest.content import load_all
from codequest.sandbox.runner import LocalRunner
from codequest.service import CodeQuestService
from codequest.store import Store

LEETCODE_CODE = '''class Solution:
    def maxSum(self, nums: list[int]) -> int:
        best = 0
        for i in range(len(nums) - 1):
            if nums[i] > best:
                best = nums[i]
        return best
'''


def test_analyze_finds_mistakes_inside_class_methods():
    keys = {f["key"] for f in extension.analyze(LEETCODE_CODE)["findings"]}
    assert {"off_by_one", "bad_initial_value"} <= keys
    assert "shadow_builtin" not in keys  # `self` is never reported


def test_analyze_reports_syntax_errors():
    result = extension.analyze("class Solution:\n    def f(self)\n        pass\n")
    assert result["syntax_error"]["line"] == 2


@pytest.mark.parametrize("text,tags,verdict", [
    ("I will use a hash map to remember indices", ["array", "hash-table"], "on_track"),
    ("nested loops over every pair", ["array", "hash-table"], "partially"),
    ("binary search on the answer", ["array", "hash-table"], "off_track"),
    ("", ["array"], "unclear"),
    ("hash map plus nested loops", ["hash-table"], "partially"),
])
def test_approach_check(text, tags, verdict):
    assert extension.check_approach(text, tags)["verdict"] == verdict


def test_hints_are_concept_level_and_progressive():
    first = extension.hint(["array", "hash-table"], 1)
    third = extension.hint(["array", "hash-table"], 3)
    assert first["concept"] == "hashing" and first["level"] == 1 and third["level"] == 3
    assert len(third["text"]) > len(first["text"])
    assert "def " not in third["text"] and "return" not in third["text"]
    assert extension.hint(["unknown-tag"], 9)["level"] == 3


@pytest.fixture()
def client():
    service = CodeQuestService(Store(":memory:"), LocalRunner(), load_all())
    with TestClient(create_app(service)) as c:
        yield c


def test_pairing_and_ext_endpoints(client):
    web = client.post("/api/session", json={"persona": "guest"}).json()["token"]
    web_h = {"Authorization": f"Bearer {web}"}
    assert client.post("/api/ext/analyze", json={"code": "x = 1"}).status_code == 401
    code = client.post("/api/ext/pairing-code", headers=web_h).json()["code"]
    assert len(code) == 6
    paired = client.post("/api/ext/pair", json={"code": code.lower()}).json()
    ext_h = {"Authorization": f"Bearer {paired['token']}"}
    assert client.post("/api/ext/pair", json={"code": code}).status_code == 400  # single use

    assert client.post("/api/ext/analyze", json={"code": LEETCODE_CODE}, headers=ext_h).status_code == 200
    assert client.post("/api/ext/analyze", json={"code": "int main(){}", "language": "cpp"}, headers=ext_h).status_code == 400
    assert client.post("/api/ext/approach", json={"text": "two pointers", "tags": ["two-pointers"]},
                       headers=ext_h).json()["verdict"] == "on_track"
    assert client.post("/api/ext/hint", json={"tags": ["stack"], "level": 2}, headers=ext_h).json()["level"] == 2
    # the web token is not an extension token
    assert client.post("/api/ext/hint", json={"tags": []}, headers=web_h).status_code == 401


def test_sync_feeds_mistake_memory(client):
    web = client.post("/api/session", json={"persona": "guest"}).json()["token"]
    web_h = {"Authorization": f"Bearer {web}"}
    code = client.post("/api/ext/pairing-code", headers=web_h).json()["code"]
    ext_h = {"Authorization": f"Bearer {client.post('/api/ext/pair', json={'code': code}).json()['token']}"}
    body = {"slug": "max-sum", "tags": ["array"], "verdict": "wrong_answer", "code": LEETCODE_CODE}
    first = client.post("/api/ext/sync", json=body, headers=ext_h).json()
    assert "off_by_one" in first["recorded_mistakes"] and first["newly_recurring"] == []
    second = client.post("/api/ext/sync", json=body, headers=ext_h).json()
    assert "off_by_one" in second["newly_recurring"]
    accepted = client.post("/api/ext/sync", json=body | {"verdict": "accepted"}, headers=ext_h).json()
    assert accepted["recorded_mistakes"] == []
    me = client.get("/api/me", headers=web_h).json()
    assert "off_by_one" in me["mistakes"]["recurring"]
    assert client.post("/api/ext/sync", json=body | {"slug": "Bad Slug!"}, headers=ext_h).status_code == 422
