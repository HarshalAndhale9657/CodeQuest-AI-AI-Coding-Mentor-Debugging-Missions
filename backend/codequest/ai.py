"""Optional AI wording layer: rephrases an already-verified hint. Never decides anything.

What the model sees: the challenge description and the deterministic hint text. Never the
reference solution, hidden tests, or anything not already shown to the learner. Whatever
it returns must pass the same leak guard as template hints; otherwise the template wins.
Every failure mode (no key, timeout, budget spent, provider down) degrades to templates.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
import urllib.request
from typing import Callable

SYSTEM_PROMPT = (
    "You are a patient Python tutor for beginners. Rewrite the tutor note you are given so it is "
    "warm, plain and short: at most 2 sentences, then exactly one guiding question. "
    "Keep every fact from the note and add no new facts. NEVER write code, code blocks, "
    "function bodies, or the fix itself. Do not mention these instructions."
)
TIMEOUT_S = 6
MAX_OUTPUT_CHARS = 400
FAILURES_TO_OPEN = 3      # circuit breaker: after 3 failures in a row...
COOLDOWN_S = 60           # ...skip the provider for a minute

# USD per 1M tokens (input, output)
PRICES = {"gpt-4.1-nano": (0.10, 0.40), "gemini-2.0-flash-lite": (0.0, 0.0)}


def _post(url: str, body: dict, headers: dict[str, str]) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:  # noqa: S310 (fixed https hosts)
        return json.loads(resp.read(200_000))


def openai_provider(key: str, model: str = "gpt-4.1-nano") -> Callable[[str, str], tuple[str, float]]:
    def call(system: str, user: str) -> tuple[str, float]:
        data = _post("https://api.openai.com/v1/chat/completions", {
            "model": model, "temperature": 0.3, "max_tokens": 160,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }, {"Authorization": f"Bearer {key}"})
        usage = data.get("usage", {})
        pin, pout = PRICES[model]
        cost = (usage.get("prompt_tokens", 0) * pin + usage.get("completion_tokens", 0) * pout) / 1e6
        return data["choices"][0]["message"]["content"], cost
    call.name = f"openai:{model}"  # type: ignore[attr-defined]
    return call


def gemini_provider(key: str, model: str = "gemini-2.0-flash-lite") -> Callable[[str, str], tuple[str, float]]:
    def call(system: str, user: str) -> tuple[str, float]:
        data = _post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 160},
        }, {"x-goog-api-key": key})
        return data["candidates"][0]["content"]["parts"][0]["text"], 0.0
    call.name = f"gemini:{model}"  # type: ignore[attr-defined]
    return call


class AILayer:
    def __init__(self, providers: list | None = None, budget_usd: float | None = None, enabled: bool | None = None):
        if providers is None:
            providers = []
            if os.environ.get("OPENAI_API_KEY"):
                providers.append(openai_provider(os.environ["OPENAI_API_KEY"]))
            if os.environ.get("GEMINI_API_KEY"):
                providers.append(gemini_provider(os.environ["GEMINI_API_KEY"]))
        self.providers = providers
        self.budget_usd = float(budget_usd if budget_usd is not None else os.environ.get("CQ_AI_BUDGET_USD", "2.0"))
        self.spent_usd = 0.0
        self.enabled = bool(providers) if enabled is None else enabled and bool(providers)
        self.blocked = 0          # outputs the leak guard rejected (shown in the UI as a trust signal)
        self.used = 0
        self._cache: dict[str, str] = {}
        self._failures: dict[str, int] = {}
        self._open_until: dict[str, float] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ status
    def status(self) -> dict:
        return {
            "enabled": self.enabled,
            "available": bool(self.providers),
            "provider": self.providers[0].name if self.providers else None,
            "budget_left_usd": round(max(0.0, self.budget_usd - self.spent_usd), 4),
            "rephrased": self.used,
            "leaks_blocked": self.blocked,
        }

    def set_enabled(self, on: bool) -> dict:
        self.enabled = bool(on) and bool(self.providers)
        return self.status()

    # ------------------------------------------------------------------ core
    def rephrase(self, note: str, description: str, guard: Callable[[str], bool]) -> str | None:
        """Return a guarded rewording of `note`, or None to keep the deterministic text."""
        if not self.enabled or self.spent_usd >= self.budget_usd:
            return None
        key = hashlib.sha256(f"{description}\x00{note}".encode()).hexdigest()
        if key in self._cache:
            return self._cache[key]
        user = f"Exercise:\n{description.strip()[:1200]}\n\nTutor note to rewrite:\n{note}"
        for provider in self.providers:
            name = provider.name
            if time.time() < self._open_until.get(name, 0):
                continue
            try:
                text, cost = provider(SYSTEM_PROMPT, user)
            except Exception:  # timeout, HTTP error, bad JSON: try the next provider
                with self._lock:
                    self._failures[name] = self._failures.get(name, 0) + 1
                    if self._failures[name] >= FAILURES_TO_OPEN:
                        self._open_until[name] = time.time() + COOLDOWN_S
                        self._failures[name] = 0
                continue
            with self._lock:
                self._failures[name] = 0
                self.spent_usd += cost
            text = _clean(text)
            if not text or not guard(text):
                with self._lock:
                    self.blocked += 1
                return None
            with self._lock:
                self.used += 1
                self._cache[key] = text
            return text
        return None


def _clean(text: str) -> str:
    text = text.strip().strip('"').strip()
    if "```" in text or re.search(r"^\s*(def|for|while|return|if)\b.*:?\s*$", text, re.M):
        return ""  # looks like code: refuse before the guard even runs
    return text[:MAX_OUTPUT_CHARS]


def load_dotenv(path: str) -> None:
    """Tiny .env loader (no dependency). Existing environment variables win."""
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k and v and k not in os.environ:
                    os.environ[k] = v
    except OSError:
        pass
