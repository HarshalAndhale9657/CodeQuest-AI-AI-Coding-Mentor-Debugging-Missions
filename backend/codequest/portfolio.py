"""Unified portfolio: verified CodeQuest skills + imported stats from other platforms.

Imports call fixed hosts only (Codeforces official API, LeetCode public GraphQL), with
validated handles, short timeouts and a 24h cache. A failed refresh keeps the last good
snapshot ("stale") so the portfolio page never breaks because a third party is down.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any, Callable

HANDLE_RE = re.compile(r"^[A-Za-z0-9_.\-]{1,40}$")
PLATFORMS = ("codeforces", "leetcode")
CACHE_TTL_S = 24 * 3600
TIMEOUT_S = 8
USER_AGENT = "CodeQuestAI/0.1 (hackathon portfolio importer)"
CONCEPT_MAP_PATH = Path(__file__).resolve().parents[2] / "content" / "concept_map.json"


class ImportError_(Exception):
    """A platform could not be reached or the handle does not exist."""


# ---------------------------------------------------------------------- handles

def slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s[:24] or "learner"


def public_handle(user: dict[str, Any]) -> str:
    """Stable public handle: name slug + first 6 hex chars of the user id."""
    return f"{slug(user['name'])}-{user['id'][:6]}"


def handle_id_prefix(handle: str) -> str | None:
    m = re.search(r"-([0-9a-f]{6})$", handle)
    return m.group(1) if m else None


# ---------------------------------------------------------------------- fetchers

def _http_json(url: str, *, data: bytes | None = None, headers: dict[str, str] | None = None) -> Any:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT, **(headers or {})})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:  # noqa: S310 (fixed https hosts)
        # a prolific Codeforces submission history is ~10 MB
        return json.loads(resp.read(25_000_000))


def fetch_codeforces(handle: str) -> dict[str, Any]:
    q = urllib.parse.quote(handle)
    try:
        info = _http_json(f"https://codeforces.com/api/user.info?handles={q}")
    except urllib.error.HTTPError as exc:
        if exc.code == 400:  # Codeforces answers 400 for unknown handles
            raise ImportError_(f"No Codeforces user named {handle!r}") from exc
        raise
    if info.get("status") != "OK":
        raise ImportError_(info.get("comment", "Codeforces user not found"))
    user = info["result"][0]
    status = _http_json(f"https://codeforces.com/api/user.status?handle={q}&from=1&count=5000")
    solved: dict[str, list[str]] = {}
    for sub in status.get("result", []):
        if sub.get("verdict") == "OK":
            p = sub.get("problem", {})
            solved[f"{p.get('contestId')}{p.get('index')}"] = p.get("tags", [])
    tags = Counter(t for ts in solved.values() for t in ts)
    return {
        "handle": user.get("handle", handle),
        "rating": user.get("rating"),
        "max_rating": user.get("maxRating"),
        "rank": user.get("rank"),
        "solved": len(solved),
        "top_tags": tags.most_common(8),
    }


LEETCODE_QUERY = """
query profile($username: String!) {
  matchedUser(username: $username) {
    username
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    tagProblemCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
  }
}"""


def fetch_leetcode(handle: str) -> dict[str, Any]:
    body = json.dumps({"query": LEETCODE_QUERY, "variables": {"username": handle}}).encode()
    data = _http_json("https://leetcode.com/graphql", data=body, headers={
        "Content-Type": "application/json", "Referer": "https://leetcode.com/"})
    user = (data.get("data") or {}).get("matchedUser")
    if not user:
        raise ImportError_("LeetCode user not found")
    counts = {row["difficulty"].lower(): row["count"] for row in user["submitStatsGlobal"]["acSubmissionNum"]}
    tags = Counter()
    for level in ("fundamental", "intermediate", "advanced"):
        for row in user["tagProblemCounts"].get(level) or []:
            tags[row["tagName"]] += row["problemsSolved"]
    return {
        "handle": user["username"],
        "solved": {"easy": counts.get("easy", 0), "medium": counts.get("medium", 0),
                   "hard": counts.get("hard", 0), "total": counts.get("all", 0)},
        "top_tags": [t for t in tags.most_common(8) if t[1] > 0],
    }


FETCHERS: dict[str, Callable[[str], dict[str, Any]]] = {
    "codeforces": fetch_codeforces,
    "leetcode": fetch_leetcode,
}


def refresh_import(store, user_id: str, platform: str, handle: str,
                   fetchers: dict[str, Callable[[str], dict[str, Any]]] | None = None) -> None:
    """Fetch one platform and save it. Never raises: errors are recorded on the row."""
    fetch = (fetchers or FETCHERS)[platform]
    try:
        data = fetch(handle)
        data["concepts"] = map_tags(platform, data.get("top_tags", []))
        store.save_import(user_id, platform, handle, "ok", data, None)
    except Exception as exc:  # network, JSON, unknown user: keep the last good snapshot
        message = str(exc)[:200] or type(exc).__name__
        previous = store.get_import(user_id, platform)
        if previous and previous["data"] and previous["handle"] == handle:
            store.save_import(user_id, platform, handle, "stale", previous["data"], message)
        else:
            store.save_import(user_id, platform, handle, "error", None, message)


def is_fresh(row: dict[str, Any] | None, handle: str) -> bool:
    return bool(row and row["handle"] == handle and row["status"] == "ok"
                and time.time() - row["fetched"] < CACHE_TTL_S)


# ---------------------------------------------------------------------- concept mapping

def load_concept_map() -> dict[str, dict[str, list[str]]]:
    try:
        return json.loads(CONCEPT_MAP_PATH.read_text())
    except (OSError, ValueError):
        return {}


def map_tags(platform: str, top_tags: list) -> list[str]:
    mapping = load_concept_map().get(platform, {})
    concepts: list[str] = []
    for tag, _count in top_tags:
        for c in mapping.get(tag, []):
            if c not in concepts:
                concepts.append(c)
    return concepts


# ---------------------------------------------------------------------- portfolio view

def mistakes_timeline(history: list[list[str]], recurring: list[str], beaten: list[str]) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    for attempt_no, keys in enumerate(history, start=1):
        for key in keys:
            row = seen.setdefault(key, {"key": key, "label": key.replace("_", " "),
                                        "first_seen": attempt_no, "times": 0})
            row["last_seen"] = attempt_no
            row["times"] += 1
    for key in set(recurring) | set(beaten):
        seen.setdefault(key, {"key": key, "label": key.replace("_", " "), "first_seen": None,
                              "last_seen": None, "times": 0})
    out = []
    for row in seen.values():
        row["recurring"] = row["key"] in recurring
        row["beaten"] = row["key"] in beaten
        out.append(row)
    return sorted(out, key=lambda r: (not r["recurring"], r["beaten"], -r["times"]))
