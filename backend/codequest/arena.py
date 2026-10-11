"""Sandbox Arena: a fixed list of attacks run through the real runner.

The endpoint accepts an attack INDEX only, never code, so it can't become an
arbitrary-code-execution or test-probing endpoint.
"""

from __future__ import annotations

from typing import Any

from codequest.compare import encode_args
from codequest.content import Challenge
from codequest.judge import _verdict
from codequest.sandbox.runner import Limits, Runner

ATTACKS: list[dict[str, str]] = [
    {"id": "read_secrets", "title": "Read secret files",
     "code": "def total(nums):\n    return open('/etc/passwd').read()\n"},
    {"id": "network", "title": "Call the internet",
     "code": "import urllib.request\ndef total(nums):\n    return urllib.request.urlopen('http://example.com').read()\n"},
    {"id": "cloud_metadata", "title": "Steal cloud credentials",
     "code": "import socket\ndef total(nums):\n    socket.create_connection(('169.254.169.254', 80), timeout=1)\n"},
    {"id": "shell", "title": "Run shell commands",
     "code": "import os\ndef total(nums):\n    return os.system('cat ~/.ssh/id_rsa')\n"},
    {"id": "fork_bomb", "title": "Fork bomb",
     "code": "import os\ndef total(nums):\n    while True:\n        os.fork()\n"},
    {"id": "memory_bomb", "title": "Memory bomb",
     "code": "def total(nums):\n    hog = []\n    while True:\n        hog.append(bytearray(50_000_000))\n"},
    {"id": "infinite_loop", "title": "Infinite loop",
     "code": "def total(nums):\n    while True:\n        pass\n"},
    {"id": "output_flood", "title": "Output flood",
     "code": "def total(nums):\n    while True:\n        print('A' * 100_000)\n"},
]


def list_attacks() -> list[dict[str, Any]]:
    return [{"index": i, "id": a["id"], "title": a["title"], "code": a["code"]} for i, a in enumerate(ATTACKS)]


def run_attack(index: int, challenge: Challenge, runner: Runner) -> dict[str, Any]:
    if not 0 <= index < len(ATTACKS):
        raise IndexError("unknown attack")
    attack = ATTACKS[index]
    test = challenge.visible_tests[0]
    raw = runner.run({"code": attack["code"], "function": challenge.function,
                      "args": encode_args(test.args), "capture_context": False},
                     Limits(time_limit_s=1.0, memory_mb=128))
    status, detail = _verdict(raw, test)
    contained = status != "passed"
    return {
        "index": index,
        "id": attack["id"],
        "title": attack["title"],
        "verdict": status,
        "subtype": detail.get("subtype"),
        "detail": (detail.get("exc_message") or "")[:200],
        "contained": contained,
        "runner": runner.name,
        "sandboxed": runner.is_sandboxed,
    }
