"""Learner model: Elo skill per concept + Mistake Memory + next-mission selection.

Elo (Pelanek 2016) on a 400-point scale:
    p = 1 / (1 + 10 ** ((d - theta) / 400)),   theta += K(n) * w * (s - p),   K(n) = 174 / (1 + 0.05 n)
Mistake Memory, per attempt: m_k <- 0.8 * m_k at attempt start, +1 on the first fused detection in that attempt.
A mistake is RECURRING when m_k >= 1.5 and it appeared in >= 2 of the last 5 attempts.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from typing import Any

from codequest.content import Challenge

TIER_DIFFICULTY = {1: 900, 2: 1050, 3: 1200, 4: 1350, 5: 1500}
LEVEL_PRIOR = {"new": 900, "basics": 1100, "some_leetcode": 1250, "intermediate": 1450, "advanced": 1650}
DECAY = 0.8
RECURRING_THRESHOLD = 1.5
RECURRING_MIN_ATTEMPTS = 2
HISTORY = 5
MASTERY_MARGIN = 147        # theta - d_med >= 147  <=>  p >= 0.70 on the concept's median mission
VERIFIED_SCORE = 0.85
TARGET_SUCCESS = 0.75
CREDIT = {0: 1.0, 1: 0.9, 2: 0.75, 3: 0.6, 4: 0.4}


def k_factor(n: int) -> float:
    return 174.0 / (1.0 + 0.05 * n)


def predict(theta: float, difficulty: float) -> float:
    return 1.0 / (1.0 + 10 ** ((difficulty - theta) / 400.0))


def difficulty(ch: Challenge) -> float:
    return float(TIER_DIFFICULTY[ch.tier] - (50 if ch.type == "debug" else 0))


def attempt_score(hidden_pass_fraction: float, max_hint_level: int, failed_submissions: int) -> float:
    s = max(0.0, min(1.0, hidden_pass_fraction)) * CREDIT.get(max_hint_level, 0.4)
    if failed_submissions >= 3:
        s *= 0.85
    return round(s, 4)


@dataclass
class LearnerState:
    prior: float = LEVEL_PRIOR["basics"]
    theta: dict[str, float] = field(default_factory=dict)
    n: dict[str, int] = field(default_factory=dict)
    verified: dict[str, int] = field(default_factory=dict)
    mistakes: dict[str, float] = field(default_factory=dict)
    history: list[list[str]] = field(default_factory=list)   # mistake keys per attempt, newest last
    recurring: list[str] = field(default_factory=list)
    beaten: list[str] = field(default_factory=list)
    solved: list[str] = field(default_factory=list)
    attempts: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {k: getattr(self, k) for k in self.__dataclass_fields__}

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "LearnerState":
        state = cls()
        for key, value in (data or {}).items():
            if key in cls.__dataclass_fields__:
                setattr(state, key, value)
        return state

    def skill(self, concept: str) -> float:
        return float(self.theta.get(concept, self.prior))


# --------------------------------------------------------------------------- Mistake Memory

def start_attempt(state: LearnerState) -> None:
    state.mistakes = {k: round(v * DECAY, 4) for k, v in state.mistakes.items()}
    state.history.append([])
    state.history = state.history[-HISTORY:]
    state.attempts += 1


def record_mistakes(state: LearnerState, keys: list[str]) -> list[str]:
    """Count each mistake once per attempt. Returns mistakes that BECAME recurring now."""
    if not state.history:
        start_attempt(state)
    current = state.history[-1]
    newly: list[str] = []
    for key in keys:
        if key in current:
            continue
        current.append(key)
        state.mistakes[key] = round(state.mistakes.get(key, 0.0) + 1.0, 4)
        seen_in = sum(1 for attempt in state.history if key in attempt)
        if (state.mistakes[key] >= RECURRING_THRESHOLD and seen_in >= RECURRING_MIN_ATTEMPTS
                and key not in state.recurring):
            state.recurring.append(key)
            if key in state.beaten:
                state.beaten.remove(key)
            newly.append(key)
    return newly


def _update_beaten(state: LearnerState) -> None:
    for key in list(state.recurring):
        if state.mistakes.get(key, 0.0) < 0.5:
            state.recurring.remove(key)
            if key not in state.beaten:
                state.beaten.append(key)


# --------------------------------------------------------------------------- Elo

def finish_attempt(state: LearnerState, ch: Challenge, score: float) -> dict[str, float]:
    """Update concept skills once per attempt. Returns the change per concept."""
    d = difficulty(ch)
    weights = {ch.concepts.primary: 0.7}
    if ch.concepts.secondary:
        share = 0.3 / len(ch.concepts.secondary)
        for c in ch.concepts.secondary:
            weights[c] = weights.get(c, 0.0) + share
    else:
        weights[ch.concepts.primary] = 1.0
    combined = sum(state.skill(c) * w for c, w in weights.items())
    p = predict(combined, d)
    deltas: dict[str, float] = {}
    for concept, w in weights.items():
        n = state.n.get(concept, 0)
        delta = k_factor(n) * w * (score - p)
        state.theta[concept] = round(state.skill(concept) + delta, 2)
        state.n[concept] = n + 1
        deltas[concept] = round(delta, 2)
        if score >= VERIFIED_SCORE:
            state.verified[concept] = state.verified.get(concept, 0) + 1
    if score >= VERIFIED_SCORE and ch.id not in state.solved:
        state.solved.append(ch.id)
    _update_beaten(state)
    return deltas


def concept_bands(state: LearnerState, challenges: dict[str, Challenge]) -> list[dict[str, Any]]:
    by_concept: dict[str, list[float]] = {}
    for ch in challenges.values():
        for c in ch.concepts.all:
            by_concept.setdefault(c, []).append(difficulty(ch))
    out = []
    for concept, ds in sorted(by_concept.items()):
        d_med = statistics.median(ds)
        theta = state.skill(concept)
        p_med = predict(theta, d_med)
        if theta - d_med >= MASTERY_MARGIN and state.verified.get(concept, 0) >= 2:
            band = "mastered"
        elif state.n.get(concept, 0) == 0:
            band = "ready"
        elif p_med >= 0.5:
            band = "almost"
        else:
            band = "learning"
        out.append({"concept": concept, "band": band, "attempts": state.n.get(concept, 0),
                    "verified": state.verified.get(concept, 0), "p_median": round(p_med, 3)})
    return out


# --------------------------------------------------------------------------- next mission

def next_up(state: LearnerState, challenges: dict[str, Challenge], limit: int = 3) -> list[dict[str, Any]]:
    bands = {b["concept"]: b["band"] for b in concept_bands(state, challenges)}
    scored = []
    for ch in challenges.values():
        if ch.id in state.solved:
            continue
        theta = sum(state.skill(c) for c in ch.concepts.all) / len(ch.concepts.all)
        p = predict(theta, difficulty(ch))
        fit = max(0.0, 1.0 - abs(p - TARGET_SUCCESS) / 0.35)
        band = bands.get(ch.concepts.primary, "ready")
        frontier = {"ready": 1.0, "learning": 0.6, "almost": 0.6, "mastered": 0.0}[band]
        trap_hits = [k for k in state.recurring if k in ch.traps]
        trap = min(1.0, sum(state.mistakes.get(k, 0.0) for k in trap_hits) / 3.0)
        debug_bonus = 0.1 if trap_hits and ch.type == "debug" else 0.0
        score = 0.35 * fit + 0.20 * frontier + 0.35 * trap + debug_bonus
        if trap_hits:
            reason = "Targets your recurring mistake: " + ", ".join(k.replace("_", " ") for k in trap_hits)
        elif fit >= 0.7:
            reason = f"Right difficulty for you now (about {round(p * 100)}% chance on first try)"
        else:
            reason = f"Builds {ch.concepts.primary.replace('_', ' ')}"
        scored.append({"challenge_id": ch.id, "title": ch.title, "type": ch.type, "tier": ch.tier,
                       "score": round(score, 4), "predicted_success": round(p, 3), "reason": reason})
    scored.sort(key=lambda x: (-x["score"], x["tier"], x["challenge_id"]))
    return scored[:limit]
