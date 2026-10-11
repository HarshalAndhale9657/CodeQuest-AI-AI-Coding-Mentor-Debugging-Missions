"""Growth analytics for the portfolio: how the learner is changing, not just what they have solved.

Everything here is derived from data CodeQuest already keeps (attempts, judged submissions and the learner
state), so it needs no extra tracking and stays deterministic. The portfolio is public, so only
aggregates leave this module: never code, test inputs or reflection notes.

* solves      hint-free and first-try rates per completed attempt, with a rolling window and a trend
* struggle    one tile per mission: untouched, stuck, or solved with clean / worked / hard effort
* lanes       each mistake as a lane across the full attempt log (missions and LeetCode Companion)
* prediction  Predict Before You Run accuracy by concept (see predict.summarize)
* debugging   Debug Journey styles across attempts with more than one submission
* robustness  latest small-input search per solved mission: robust or fragile
"""

from __future__ import annotations

import json
from collections import Counter
from typing import Any

from codequest import journey, predict
from codequest.content import Challenge
from codequest.learner import LearnerState

ROLLING_WINDOW = 5
TREND_MIN_SOLVES = 4
TREND_DELTA = 0.15
LANE_ATTEMPTS = 30          # most recent attempts drawn as lanes
HARD_SUBMISSIONS = 4
HARD_HINTS = 2


def _json(text: Any) -> Any:
    if isinstance(text, (dict, list)) or text is None:
        return text
    try:
        return json.loads(text)
    except ValueError:
        return None


def _hints(attempt: dict[str, Any]) -> int:
    ladder = _json(attempt.get("ladder")) or {}
    return len(ladder.get("shown") or [])


def _judged(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [r for r in sorted(rows, key=lambda r: r["created"]) if r.get("status") == "done" and _json(r.get("result"))]


def _solved(attempt: dict[str, Any], judged: list[dict[str, Any]]) -> bool:
    """Closed AND its last judged submission passed within the rules (an abandoned attempt is closed too)."""
    if attempt["open"] or not judged:
        return False
    last = _json(judged[-1]["result"]) or {}
    return bool(last.get("all_passed")) and not last.get("rule_violations")


def _rate(values: list[bool]) -> float:
    return sum(values) / len(values) if values else 0.0


def _trend(flags: list[bool]) -> str | None:
    if len(flags) < TREND_MIN_SOLVES:
        return None
    half = len(flags) // 2
    delta = _rate(flags[half:]) - _rate(flags[:half])
    if delta > TREND_DELTA:
        return "up"
    if delta < -TREND_DELTA:
        return "down"
    return "steady"


def _effort(submissions: int, hints: int) -> str:
    if submissions <= 1 and hints == 0:
        return "clean"
    if submissions >= HARD_SUBMISSIONS or hints >= HARD_HINTS:
        return "hard"
    return "worked"


def _title(ref: str, challenges: dict[str, Challenge]) -> str:
    if ref.startswith("lc:"):
        return f"LeetCode: {ref[3:]}"
    ch = challenges.get(ref)
    return ch.title if ch else ref or "Attempt"


def build(attempts: list[dict[str, Any]], submissions: list[dict[str, Any]], state: LearnerState,
          challenges: dict[str, Challenge], bands: list[dict[str, Any]]) -> dict[str, Any]:
    by_attempt: dict[str, list[dict[str, Any]]] = {}
    for row in submissions:
        by_attempt.setdefault(row["attempt_id"], []).append(row)
    ordered = sorted(attempts, key=lambda a: a["created"])

    # ---- solves: completed attempts, oldest first
    series = []
    for a in ordered:
        judged = _judged(by_attempt.get(a["id"], []))
        if a["challenge_id"] not in challenges or not _solved(a, judged):
            continue
        last = _json(judged[-1]["result"])
        robustness = (last or {}).get("robustness") or {}
        ch = challenges[a["challenge_id"]]
        hints = _hints(a)
        series.append({
            "challenge_id": ch.id, "title": ch.title, "tier": ch.tier, "type": ch.type, "t": a["created"],
            "hints": hints, "submissions": len(judged), "hint_free": hints == 0, "first_try": int(a["failed"]) == 0,
            "robust": {"robust": True, "fragile": False}.get(robustness.get("status")),
        })
    rolling = []
    for i in range(len(series)):
        window = series[max(0, i + 1 - ROLLING_WINDOW): i + 1]
        rolling.append({"n": i + 1, "hint_free_rate": round(_rate([s["hint_free"] for s in window]), 3),
                        "first_try_rate": round(_rate([s["first_try"] for s in window]), 3)})
    solves = {
        "count": len(series),
        "hint_free": sum(s["hint_free"] for s in series),
        "first_try": sum(s["first_try"] for s in series),
        "series": series,
        "rolling": rolling,
        "trend": _trend([s["hint_free"] for s in series]),
    }

    # ---- struggle map: one tile per mission, in content order
    per_mission: dict[str, list[dict[str, Any]]] = {}
    for a in ordered:
        per_mission.setdefault(a["challenge_id"], []).append(a)
    struggle = []
    for ch in challenges.values():
        tries = per_mission.get(ch.id, [])
        first_solve = next((a for a in tries if _solved(a, _judged(by_attempt.get(a["id"], [])))), None)
        focus = first_solve or (tries[-1] if tries else None)
        subs = len(_judged(by_attempt.get(focus["id"], []))) if focus else 0
        hints = _hints(focus) if focus else 0
        state_ = "solved" if first_solve else ("stuck" if tries else "untouched")
        struggle.append({"challenge_id": ch.id, "title": ch.title, "tier": ch.tier, "type": ch.type, "state": state_,
                         "effort": _effort(subs, hints) if first_solve else None,
                         "submissions": subs, "hints": hints})

    # ---- mistake lanes over the full attempt log
    log = state.attempt_log[-LANE_ATTEMPTS:]
    offset = len(state.attempt_log) - len(log)
    lane_hits: dict[str, list[int]] = {}
    for n, entry in enumerate(log, start=1):
        for key in entry.get("mistakes") or []:
            lane_hits.setdefault(key, []).append(n)
    lanes = {
        "attempts": [{"n": n, "number": offset + n, "ref": e.get("ref", ""), "title": _title(e.get("ref", ""), challenges)}
                     for n, e in enumerate(log, start=1)],
        "lanes": sorted(({"key": k, "hits": hits,
                          "state": "beaten" if k in state.beaten else "recurring" if k in state.recurring else "seen"}
                         for k, hits in lane_hits.items()),
                        key=lambda lane: ({"recurring": 0, "seen": 1, "beaten": 2}[lane["state"]], lane["hits"][0])),
    }

    # ---- debugging style across multi-submission attempts
    styles: Counter[str] = Counter()
    agreement: Counter[str] = Counter()
    ratios, quotients, dseries = [], [], []
    for a in ordered:
        judged = _judged(by_attempt.get(a["id"], []))
        if len(judged) < 2:
            continue
        summary = journey.build(judged)["summary"]
        styles[summary["style"]] += 1
        if summary["productive_ratio"] is not None:
            ratios.append(summary["productive_ratio"])
        if summary["error_quotient"] is not None:
            quotients.append(summary["error_quotient"])
        verdict = journey.agreement(summary["style"], _json(a.get("reflection")))
        if verdict:
            agreement[verdict] += 1
        title = challenges[a["challenge_id"]].title if a["challenge_id"] in challenges else a["challenge_id"]
        dseries.append({"challenge_id": a["challenge_id"], "title": title, "style": summary["style"],
                        "productive_ratio": summary["productive_ratio"],
                        "error_quotient": summary["error_quotient"], "t": a["created"]})
    debugging = {"journeys": len(dseries), "styles": dict(styles), "series": dseries,
                 "productive_ratio": round(sum(ratios) / len(ratios), 3) if ratios else None,
                 "error_quotient": round(sum(quotients) / len(quotients), 3) if quotients else None,
                 "self_report": dict(agreement)}

    # ---- robustness: the latest search per mission
    latest: dict[str, str] = {}
    for row in sorted(submissions, key=lambda r: r["created"]):
        status = ((_json(row.get("result")) or {}).get("robustness") or {}).get("status")
        if status in ("robust", "fragile"):
            latest[row["challenge_id"]] = status
    robustness = {"checked": len(latest), "robust": sum(v == "robust" for v in latest.values()),
                  "fragile": sum(v == "fragile" for v in latest.values())}

    return {
        "solves": solves,
        "struggle": struggle,
        "lanes": lanes,
        "prediction": predict.summarize(state.predictions, bands),
        "debugging": debugging,
        "robustness": robustness,
    }
