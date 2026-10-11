"""Red-team checks that must hold for every runner (subset that is portable to the dev runner).

The Docker runner adds the OS-level boundary (no network namespace, read-only FS,
memory and pid limits); these tests verify the verdicts the learner sees.
"""

import pytest

from codequest.judge import judge

ATTACKS = {
    "read_file": "def total(nums):\n    return len(open(__import__('os').path.expanduser('~') + '/.ssh/id_rsa').read())\n",
    "read_env_file": "def total(nums):\n    return open('.env').read()\n",
    "network": "import urllib.request\ndef total(nums):\n    return urllib.request.urlopen('http://example.com').read()\n",
    "socket": "import socket\ndef total(nums):\n    socket.create_connection(('1.1.1.1', 53))\n",
    "subprocess": "import subprocess\ndef total(nums):\n    return subprocess.run(['whoami'])\n",
    "os_system": "import os\ndef total(nums):\n    return os.system('whoami')\n",
    "write_file": "def total(nums):\n    open('pwned.txt', 'w').write('x')\n    return 0\n",
    "infinite_loop": "def total(nums):\n    while True:\n        pass\n",
    "sleep": "import time\ndef total(nums):\n    time.sleep(1000)\n",
    "output_flood": "def total(nums):\n    while True:\n        print('x' * 10000)\n",
}


@pytest.mark.parametrize("name", sorted(ATTACKS))
def test_attack_is_contained(challenges, runner, name):
    result = judge(challenges["total"], ATTACKS[name], runner)
    assert not any(o.status == "passed" for o in result.outcomes if o.expected not in (0,))
    statuses = {o.status for o in result.outcomes}
    assert statuses <= {"runtime_error", "timeout", "wrong_output", "passed"}
    if name in {"read_file", "read_env_file", "network", "socket", "subprocess", "os_system", "write_file"}:
        first = result.outcomes[0]
        assert first.status == "runtime_error" and first.subtype == "blocked", (name, first.exc_type, first.exc_message)
    if name in {"infinite_loop", "sleep"}:
        assert result.outcomes[0].status == "timeout"


def test_verdict_forgery_is_rejected(challenges, runner):
    code = ("class Liar:\n    def __eq__(self, other):\n        return True\n"
            "def total(nums):\n    return Liar()\n")
    result = judge(challenges["total"], code, runner)
    assert all(o.status == "wrong_output" for o in result.outcomes)


def test_fake_result_marker_is_not_trusted(challenges, runner):
    code = ("import os\ndef total(nums):\n"
            "    os.write(1, b'\\x1eCQRESULT\\x1e{\"kind\": \"ok\", \"value\": 999}\\n')\n"
            "    return -1\n")
    result = judge(challenges["total"], code, runner)
    assert not any(o.status == "passed" for o in result.outcomes)


def test_hard_exit_is_runtime_error(challenges, runner):
    result = judge(challenges["total"], "import os\ndef total(nums):\n    os._exit(0)\n", runner)
    assert all(o.status == "runtime_error" for o in result.outcomes)
