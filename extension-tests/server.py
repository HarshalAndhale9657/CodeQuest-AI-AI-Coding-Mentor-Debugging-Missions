"""Dev-only test server that imitates the parts of leetcode.com the extension touches.

    python extension-tests/server.py            # http://localhost:5600

Routes:
  /problems/two-sum/                 -> pipeline test page (the hook needs a /problems/<slug> path)
  /submissions/detail/<id>/check/    -> PENDING on the first poll, then a SUCCESS verdict (like the real judge)
  /submissions/detail/runcode_*/check/ -> a "Run" result, which the hook must ignore
  /ext/<file>                        -> files from extension/
  /tests/<file>                      -> files from extension-tests/
"""

from __future__ import annotations

import json
import mimetypes
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLLS: dict[str, int] = {}
VERDICTS = {"777": "Wrong Answer", "778": "Accepted"}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_: object) -> None:  # keep the console quiet
        return

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _file(self, base: Path, rel: str) -> None:
        target = (base / rel).resolve()
        if base not in target.parents or not target.is_file():
            self._send(404, b"not found", "text/plain")
            return
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if target.suffix in (".js", ".mjs"):
            ctype = "text/javascript"
        self._send(200, target.read_bytes(), ctype)

    def do_GET(self) -> None:  # noqa: N802 - http.server API
        path = self.path.split("?", 1)[0]
        if path.rstrip("/") == "/problems/two-sum":
            self._file(ROOT / "extension-tests", "pipeline.html")
            return
        match = re.fullmatch(r"/submissions/detail/([\w-]+)/check/?", path)
        if match:
            sid = match.group(1)
            POLLS[sid] = POLLS.get(sid, 0) + 1
            if sid.startswith("runcode_"):
                body = {"state": "SUCCESS", "status_msg": "Accepted", "lang": "python3", "task_name": "judger.interprettask.Interpret"}
            elif POLLS[sid] == 1:
                body = {"state": "PENDING"}
            else:
                body = {"state": "SUCCESS", "status_msg": VERDICTS.get(sid, "Runtime Error"), "lang": "python3",
                        "status_code": 11, "submission_id": sid}
            self._send(200, json.dumps(body).encode(), "application/json")
            return
        if path.startswith("/ext/"):
            self._file(ROOT / "extension", path[len("/ext/"):])
            return
        if path.startswith("/extension/"):  # harness.html loads ../extension/* relative to /tests/
            self._file(ROOT / "extension", path[len("/extension/"):])
            return
        if path.startswith("/tests/"):
            self._file(ROOT / "extension-tests", path[len("/tests/"):])
            return
        self._send(404, b"not found", "text/plain")

    def do_POST(self) -> None:  # noqa: N802 - LeetCode GraphQL stand-in for topic tags
        length = int(self.headers.get("Content-Length") or 0)
        self.rfile.read(min(length, 65536))
        if self.path == "/graphql":
            body = {"data": {"question": {"topicTags": [{"slug": "array"}, {"slug": "hash-table"}]}}}
            self._send(200, json.dumps(body).encode(), "application/json")
            return
        self._send(404, b"not found", "text/plain")


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 5600), Handler).serve_forever()
