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
