"""SQLite persistence (WAL). Small JSON blobs per row keep the schema simple and migrations trivial."""

from __future__ import annotations

import json
import secrets
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    created REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    open INTEGER NOT NULL,
    ladder TEXT NOT NULL,
    failed INTEGER NOT NULL DEFAULT 0,
    best_hidden REAL NOT NULL DEFAULT 0,
    created REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS attempts_user_challenge ON attempts(user_id, challenge_id, open);
CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    attempt_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL,
    result TEXT,
    internal TEXT,
    created REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_attempt ON submissions(attempt_id, created);
CREATE TABLE IF NOT EXISTS imports (
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    handle TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT,
    error TEXT,
    fetched REAL NOT NULL,
    PRIMARY KEY (user_id, platform)
);
CREATE TABLE IF NOT EXISTS typing_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    snippet_id TEXT NOT NULL,
    concept TEXT,
    cpm REAL NOT NULL,
    accuracy REAL NOT NULL,
    duration_ms INTEGER NOT NULL,
    errors TEXT NOT NULL,
    created REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS typing_user ON typing_results(user_id, created);
"""


class Store:
    def __init__(self, path: str | Path = ":memory:"):
        self._lock = threading.RLock()
        self._db = sqlite3.connect(str(path), check_same_thread=False, isolation_level=None)
        self._db.row_factory = sqlite3.Row
        if str(path) != ":memory:":
            self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("PRAGMA foreign_keys=ON")
        self._db.executescript(SCHEMA)

    # ------------------------------------------------------------------ helpers
    def _one(self, sql: str, args: tuple = ()) -> dict[str, Any] | None:
        with self._lock:
            row = self._db.execute(sql, args).fetchone()
        return dict(row) if row else None

    def _exec(self, sql: str, args: tuple = ()) -> None:
        with self._lock:
            self._db.execute(sql, args)

    def _all(self, sql: str, args: tuple = ()) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(r) for r in self._db.execute(sql, args).fetchall()]

    # ------------------------------------------------------------------ users
    def create_user(self, name: str, state: dict[str, Any]) -> dict[str, Any]:
        user = {"id": uuid.uuid4().hex, "token": secrets.token_urlsafe(32), "name": name,
                "state": json.dumps(state), "created": time.time()}
        self._exec("INSERT INTO users (id, token, name, state, created) VALUES (?, ?, ?, ?, ?)",
                   (user["id"], user["token"], user["name"], user["state"], user["created"]))
        return user

    def user_by_token(self, token: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM users WHERE token = ?", (token,))

    def save_state(self, user_id: str, state: dict[str, Any]) -> None:
        self._exec("UPDATE users SET state = ? WHERE id = ?", (json.dumps(state), user_id))

    # ------------------------------------------------------------------ attempts
    def open_attempt(self, user_id: str, challenge_id: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM attempts WHERE user_id = ? AND challenge_id = ? AND open = 1 "
                         "ORDER BY created DESC LIMIT 1", (user_id, challenge_id))

    def attempt(self, attempt_id: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM attempts WHERE id = ?", (attempt_id,))

    def create_attempt(self, user_id: str, challenge_id: str) -> dict[str, Any]:
        attempt_id = uuid.uuid4().hex
        self._exec("INSERT INTO attempts (id, user_id, challenge_id, open, ladder, failed, best_hidden, created) "
                   "VALUES (?, ?, ?, 1, '{}', 0, 0, ?)", (attempt_id, user_id, challenge_id, time.time()))
        attempt = self.attempt(attempt_id)
        assert attempt is not None
        return attempt

    def update_attempt(self, attempt_id: str, **fields: Any) -> None:
        allowed = {"open", "ladder", "failed", "best_hidden"}
        if not fields or set(fields) - allowed:
            raise ValueError("invalid attempt fields")
        sets = ", ".join(f"{k} = ?" for k in fields)
        values = tuple(json.dumps(v) if k == "ladder" else v for k, v in fields.items())
        self._exec(f"UPDATE attempts SET {sets} WHERE id = ?", (*values, attempt_id))

    # ------------------------------------------------------------------ submissions
    def create_submission(self, user_id: str, attempt_id: str, challenge_id: str, code: str) -> str:
        sid = uuid.uuid4().hex
        self._exec("INSERT INTO submissions (id, user_id, attempt_id, challenge_id, code, status, created) "
                   "VALUES (?, ?, ?, ?, ?, 'queued', ?)", (sid, user_id, attempt_id, challenge_id, code, time.time()))
        return sid

    def finish_submission(self, sid: str, status: str, result: dict[str, Any] | None,
                          internal: dict[str, Any] | None) -> None:
        self._exec("UPDATE submissions SET status = ?, result = ?, internal = ? WHERE id = ?",
                   (status, json.dumps(result) if result is not None else None,
                    json.dumps(internal) if internal is not None else None, sid))

    def set_status(self, sid: str, status: str) -> None:
        self._exec("UPDATE submissions SET status = ? WHERE id = ?", (status, sid))

    def submission(self, sid: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM submissions WHERE id = ?", (sid,))

    def latest_submission(self, attempt_id: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM submissions WHERE attempt_id = ? AND status = 'done' "
                         "ORDER BY created DESC LIMIT 1", (attempt_id,))

    def update_internal(self, sid: str, internal: dict[str, Any]) -> None:
        self._exec("UPDATE submissions SET internal = ? WHERE id = ?", (json.dumps(internal), sid))

    def requeue_stale(self, older_than_s: float = 120) -> int:
        """Crash recovery: anything stuck in queued/running is marked as a system error."""
        cutoff = time.time() - older_than_s
        with self._lock:
            cur = self._db.execute("UPDATE submissions SET status = 'error' WHERE status IN ('queued', 'running') "
                                   "AND created < ?", (cutoff,))
            return cur.rowcount

    # ------------------------------------------------------------------ portfolio
    def users_by_id_prefix(self, prefix: str) -> list[dict[str, Any]]:
        return self._all("SELECT * FROM users WHERE id LIKE ?", (prefix + "%",))

    def user_attempts(self, user_id: str) -> list[dict[str, Any]]:
        return self._all("SELECT * FROM attempts WHERE user_id = ?", (user_id,))

    def save_import(self, user_id: str, platform: str, handle: str, status: str,
                    data: dict[str, Any] | None, error: str | None) -> None:
        self._exec(
            "INSERT INTO imports (user_id, platform, handle, status, data, error, fetched) "
            "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, platform) DO UPDATE SET "
            "handle = excluded.handle, status = excluded.status, data = excluded.data, "
            "error = excluded.error, fetched = excluded.fetched",
            (user_id, platform, handle, status, json.dumps(data) if data is not None else None, error, time.time()))

    def get_import(self, user_id: str, platform: str) -> dict[str, Any] | None:
        row = self._one("SELECT * FROM imports WHERE user_id = ? AND platform = ?", (user_id, platform))
        if row:
            row["data"] = json.loads(row["data"]) if row["data"] else None
        return row

    def imports_for(self, user_id: str) -> list[dict[str, Any]]:
        rows = self._all("SELECT * FROM imports WHERE user_id = ?", (user_id,))
        for row in rows:
            row["data"] = json.loads(row["data"]) if row["data"] else None
        return rows

    def add_typing_result(self, user_id: str, snippet_id: str, concept: str | None, cpm: float,
                          accuracy: float, duration_ms: int, errors: dict[str, int]) -> None:
        self._exec(
            "INSERT INTO typing_results (id, user_id, snippet_id, concept, cpm, accuracy, duration_ms, errors, created) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (uuid.uuid4().hex, user_id, snippet_id, concept, cpm, accuracy, duration_ms, json.dumps(errors), time.time()))

    def typing_summary(self, user_id: str) -> dict[str, Any] | None:
        row = self._one(
            "SELECT MAX(cpm) AS best_cpm, AVG(accuracy) AS accuracy, COUNT(*) AS runs "
            "FROM typing_results WHERE user_id = ?", (user_id,))
        if not row or not row["runs"]:
            return None
        return {"best_cpm": round(row["best_cpm"], 1), "accuracy": round(row["accuracy"], 3), "runs": row["runs"]}
