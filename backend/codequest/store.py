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

CREATE TABLE IF NOT EXISTS pairing_codes (
    code TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS ext_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS roadmaps (
    user_id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    plan TEXT NOT NULL,
    created REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I


class Store:
    def __init__(self, path: str | Path = ":memory:"):
        self._lock = threading.RLock()
        self._db = sqlite3.connect(str(path), check_same_thread=False, isolation_level=None)
        self._db.row_factory = sqlite3.Row
        if str(path) != ":memory:":
            self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("PRAGMA foreign_keys=ON")
        self._db.executescript(SCHEMA)
        self._migrate()

    def _migrate(self) -> None:
        """Additive, idempotent column migrations for databases created by older versions."""
        with self._lock:
            for table, added in (("typing_results", (("syntax_accuracy", "REAL"), ("chars", "INTEGER"))),
                                 ("attempts", (("prediction", "TEXT"), ("reflection", "TEXT")))):
                columns = {r["name"] for r in self._db.execute(f"PRAGMA table_info({table})").fetchall()}
                for name, kind in added:
                    if name not in columns:
                        self._db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {kind}")

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

    def update_name(self, user_id: str, name: str) -> None:
        self._exec("UPDATE users SET name = ? WHERE id = ?", (name, user_id))

    def delete_user(self, user_id: str) -> None:
        """Erase every row that belongs to a learner, in one transaction."""
        with self._lock:
            self._db.execute("BEGIN")
            try:
                for table in ("submissions", "attempts", "imports", "typing_results", "pairing_codes",
                              "ext_tokens", "roadmaps"):
                    self._db.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
                self._db.execute("DELETE FROM users WHERE id = ?", (user_id,))
                self._db.execute("COMMIT")
            except Exception:
                self._db.execute("ROLLBACK")
                raise

    def user_submissions(self, user_id: str) -> list[dict[str, Any]]:
        return self._all("SELECT id, attempt_id, challenge_id, code, status, result, created FROM submissions "
                         "WHERE user_id = ? ORDER BY created", (user_id,))

    def passing_submissions(self, user_id: str) -> list[dict[str, Any]]:
        """Newest passing submission per mission (judged results only)."""
        rows = self._all("SELECT challenge_id, code, result, created FROM submissions "
                         "WHERE user_id = ? AND status = 'done' ORDER BY created DESC", (user_id,))
        latest: dict[str, dict[str, Any]] = {}
        for row in rows:
            if row["challenge_id"] in latest:
                continue
            try:
                passed = bool(json.loads(row["result"] or "{}").get("all_passed"))
            except ValueError:
                passed = False
            if passed:
                latest[row["challenge_id"]] = row
        return list(latest.values())

    # ------------------------------------------------------------------ roadmaps
    def get_roadmap(self, user_id: str) -> dict[str, Any] | None:
        row = self._one("SELECT * FROM roadmaps WHERE user_id = ?", (user_id,))
        if row is None:
            return None
        try:
            return json.loads(row["plan"])
        except ValueError:
            return None  # an unreadable plan is rebuilt rather than breaking the page

    def save_roadmap(self, user_id: str, version: int, plan: dict[str, Any]) -> None:
        self._exec("INSERT INTO roadmaps (user_id, version, plan, created) VALUES (?, ?, ?, ?) "
                   "ON CONFLICT(user_id) DO UPDATE SET version = excluded.version, plan = excluded.plan, "
                   "created = excluded.created", (user_id, version, json.dumps(plan), time.time()))

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

    def latest_attempt(self, user_id: str, challenge_id: str) -> dict[str, Any] | None:
        return self._one("SELECT * FROM attempts WHERE user_id = ? AND challenge_id = ? "
                         "ORDER BY created DESC LIMIT 1", (user_id, challenge_id))

    def challenge_attempts(self, user_id: str, challenge_id: str) -> list[dict[str, Any]]:
        """Every attempt at one mission, newest first, with its number of judged submissions."""
        return self._all("SELECT a.*, (SELECT COUNT(*) FROM submissions s WHERE s.attempt_id = a.id "
                         "AND s.status = 'done') AS judged FROM attempts a WHERE a.user_id = ? AND a.challenge_id = ? "
                         "ORDER BY a.created DESC", (user_id, challenge_id))

    def update_attempt(self, attempt_id: str, **fields: Any) -> None:
        allowed = {"open", "ladder", "failed", "best_hidden", "prediction", "reflection"}
        encoded = {"ladder", "prediction", "reflection"}
        if not fields or set(fields) - allowed:
            raise ValueError("invalid attempt fields")
        sets = ", ".join(f"{k} = ?" for k in fields)
        values = tuple(json.dumps(v) if k in encoded and v is not None else v for k, v in fields.items())
        self._exec(f"UPDATE attempts SET {sets} WHERE id = ?", (*values, attempt_id))

    def import_attempt(self, user_id: str, challenge_id: str, *, open_: bool, ladder: dict[str, Any], failed: int,
                       best_hidden: float, created: float, prediction: dict[str, Any] | None = None,
                       reflection: dict[str, Any] | None = None) -> str:
        """Insert a finished attempt with its own timestamp (demo seeds and data imports)."""
        attempt_id = uuid.uuid4().hex
        self._exec("INSERT INTO attempts (id, user_id, challenge_id, open, ladder, failed, best_hidden, created, "
                   "prediction, reflection) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (attempt_id, user_id, challenge_id, int(open_), json.dumps(ladder), failed, best_hidden, created,
                    json.dumps(prediction) if prediction else None, json.dumps(reflection) if reflection else None))
        return attempt_id

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

    def import_submission(self, user_id: str, attempt_id: str, challenge_id: str, code: str,
                          result: dict[str, Any], internal: dict[str, Any] | None, created: float) -> str:
        sid = uuid.uuid4().hex
        self._exec("INSERT INTO submissions (id, user_id, attempt_id, challenge_id, code, status, result, internal, "
                   "created) VALUES (?, ?, ?, ?, ?, 'done', ?, ?, ?)",
                   (sid, user_id, attempt_id, challenge_id, code, json.dumps(result),
                    json.dumps(internal) if internal is not None else None, created))
        return sid

    def update_result(self, sid: str, result: dict[str, Any]) -> None:
        """Replace a finished submission's public result (e.g. when the robustness search completes)."""
        self._exec("UPDATE submissions SET result = ? WHERE id = ?", (json.dumps(result), sid))

    def attempt_submissions(self, attempt_id: str) -> list[dict[str, Any]]:
        return self._all("SELECT id, code, status, result, created FROM submissions WHERE attempt_id = ? "
                         "ORDER BY created", (attempt_id,))

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

    def add_typing_result(self, user_id: str, snippet_id: str, concept: str | None, run: dict[str, Any],
                          errors: dict[str, int]) -> None:
        self._exec(
            "INSERT INTO typing_results (id, user_id, snippet_id, concept, cpm, accuracy, duration_ms, errors, "
            "created, syntax_accuracy, chars) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (uuid.uuid4().hex, user_id, snippet_id, concept, run["cpm"], run["accuracy"], run["duration_ms"],
             json.dumps(errors), time.time(), run["syntax_accuracy"], run["chars"]))

    def typing_runs(self, user_id: str, limit: int = 50) -> list[dict[str, Any]]:
        """Most recent runs first."""
        return self._all("SELECT snippet_id, concept, cpm, accuracy, syntax_accuracy, chars, duration_ms, errors, "
                         "created FROM typing_results WHERE user_id = ? ORDER BY created DESC LIMIT ?",
                         (user_id, limit))

    def typing_run_count(self, user_id: str, since: float = 0.0) -> int:
        row = self._one("SELECT COUNT(*) AS n FROM typing_results WHERE user_id = ? AND created >= ?",
                        (user_id, since))
        return int(row["n"]) if row else 0

    # ------------------------------------------------------------------ extension pairing
    def create_pairing_code(self, user_id: str, ttl_s: float = 600) -> str:
        code = "".join(secrets.choice(PAIRING_ALPHABET) for _ in range(6))
        with self._lock:
            self._db.execute("DELETE FROM pairing_codes WHERE user_id = ? OR expires < ?", (user_id, time.time()))
            self._db.execute("INSERT INTO pairing_codes (code, user_id, expires) VALUES (?, ?, ?)",
                             (code, user_id, time.time() + ttl_s))
        return code

    def redeem_pairing_code(self, code: str, ttl_s: float = 7 * 24 * 3600) -> dict[str, Any] | None:
        """Single-use: a valid code is deleted and exchanged for an extension token."""
        with self._lock:
            row = self._db.execute("SELECT * FROM pairing_codes WHERE code = ? AND expires >= ?",
                                   (code.strip().upper(), time.time())).fetchone()
            if row is None:
                return None
            self._db.execute("DELETE FROM pairing_codes WHERE code = ?", (row["code"],))
            token = secrets.token_urlsafe(32)
            self._db.execute("INSERT INTO ext_tokens (token, user_id, expires) VALUES (?, ?, ?)",
                             (token, row["user_id"], time.time() + ttl_s))
        user = self._one("SELECT * FROM users WHERE id = ?", (row["user_id"],))
        return {"token": token, "user": user}

    # ------------------------------------------------------------------ small settings store
    def get_kv(self, key: str) -> str | None:
        row = self._one("SELECT value FROM kv WHERE key = ?", (key,))
        return row["value"] if row else None

    def set_kv(self, key: str, value: str) -> None:
        self._exec("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                   (key, value))

    def user_by_ext_token(self, token: str) -> dict[str, Any] | None:
        return self._one("SELECT u.* FROM ext_tokens e JOIN users u ON u.id = e.user_id "
                         "WHERE e.token = ? AND e.expires >= ?", (token, time.time()))
