"""Host-side runners that execute the harness for one request.

Two backends share one interface:

* DockerRunner -- production. One fresh, hardened container per request:
  no network, read-only filesystem, non-root, memory/pid/file limits, no host
  mounts (code travels on stdin). This is the security boundary.
* LocalRunner -- development only. A fresh `python -I -S` process per request
  with a wall-clock deadline, bounded output and the harness tripwire. It is
  NOT a sandbox and says so in its name; the deployed app must use Docker.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

HARNESS_PATH = Path(__file__).with_name("harness.py")
MARKER = b"\x1eCQRESULT\x1e"
# Container start-up is not charged to the learner. This is only the host-side backstop: the harness's
# in-container watchdog still enforces time_limit on learner code. Docker Desktop (Windows/macOS) can take
# several seconds to start containers when a submission runs 4 tests in parallel, so keep this generous.
STARTUP_ALLOWANCE_S = float(os.environ.get("CQ_DOCKER_STARTUP_S", "6.0"))
LOCAL_STARTUP_ALLOWANCE_S = 1.0
MAX_RESULT_BYTES = 1024 * 1024
MAX_STDERR_BYTES = 8 * 1024


@dataclass(frozen=True)
class Limits:
    time_limit_s: float = 2.0
    memory_mb: int = 256
    max_pids: int = 32


@dataclass
class RawRun:
    """What the host observed. `payload` is the harness record, if one was produced."""

    outcome: str                      # "completed" | "timeout" | "output_limit" | "crashed"
    payload: dict[str, Any] | None = None
    exit_code: int | None = None
    oom_killed: bool = False
    stderr_tail: str = ""
    extra: dict[str, Any] = field(default_factory=dict)


class Runner(Protocol):
    name: str
    is_sandboxed: bool

    def run(self, request: dict[str, Any], limits: Limits) -> RawRun: ...


def _bounded_reader(stream, cap: int, sink: bytearray, overflow: threading.Event, on_overflow) -> None:
    try:
        while True:
            chunk = stream.read(65536)
            if not chunk:
                return
            room = cap - len(sink)
            if room > 0:
                sink.extend(chunk[:room])
            if len(chunk) > room:
                overflow.set()
                on_overflow()
                return
    except (OSError, ValueError):
        return


def parse_payload(stdout: bytes) -> dict[str, Any] | None:
    """Return the LAST harness record in stdout, or None if there is no valid one."""
    index = stdout.rfind(MARKER)
    if index < 0:
        return None
    line = stdout[index + len(MARKER):].split(b"\n", 1)[0]
    try:
        payload = json.loads(line.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) and isinstance(payload.get("kind"), str) else None


def _rss_kb(pid: int) -> int:
    """Resident memory of a process in KB (0 if unknown)."""
    try:
        with open(f"/proc/{pid}/status") as status:
            for line in status:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1])
    except OSError:
        pass
    if sys.platform == "darwin":
        try:
            out = subprocess.run(["ps", "-o", "rss=", "-p", str(pid)], capture_output=True, timeout=1)
            return int(out.stdout.strip() or 0)
        except (OSError, ValueError, subprocess.TimeoutExpired):
            return 0
    return 0


def _execute(cmd: list[str], request: dict[str, Any], deadline_s: float, *, env: dict[str, str] | None,
             cwd: str | None, kill_extra=None, preexec_fn=None, creationflags: int = 0,
             memory_kb: int = 0) -> tuple[RawRun, int | None]:
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        cwd=cwd,
        preexec_fn=preexec_fn,
        creationflags=creationflags,
    )

    def kill() -> None:
        if kill_extra is not None:
            kill_extra()
        try:
            proc.kill()
        except OSError:
            pass

    out, err = bytearray(), bytearray()
    overflow = threading.Event()
    readers = [
        threading.Thread(target=_bounded_reader, args=(proc.stdout, MAX_RESULT_BYTES, out, overflow, kill), daemon=True),
        threading.Thread(target=_bounded_reader, args=(proc.stderr, MAX_STDERR_BYTES, err, threading.Event(), lambda: None), daemon=True),
    ]
    for reader in readers:
        reader.start()
    try:
        assert proc.stdin is not None
        proc.stdin.write(json.dumps(request).encode("utf-8"))
        proc.stdin.close()
    except (BrokenPipeError, OSError):
        pass

    timed_out = over_memory = False
    deadline = time.monotonic() + deadline_s
    # RLIMIT_AS is not enforced on macOS, so watch resident memory as a backstop
    while proc.poll() is None:
        if time.monotonic() > deadline:
            timed_out = True
            break
        if memory_kb and _rss_kb(proc.pid) > memory_kb:
            over_memory = True
            break
        time.sleep(0.02)
    if timed_out or over_memory:
        kill()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass
    for reader in readers:
        reader.join(timeout=2)

    payload = parse_payload(bytes(out))
    stderr_tail = bytes(err[-2000:]).decode("utf-8", "replace")
    if payload is not None:
        return RawRun("completed", payload, proc.returncode, stderr_tail=stderr_tail), proc.returncode
    if over_memory:
        return RawRun("crashed", None, proc.returncode, oom_killed=True, stderr_tail=stderr_tail), proc.returncode
    if overflow.is_set():
        return RawRun("output_limit", None, proc.returncode, stderr_tail=stderr_tail), proc.returncode
    if timed_out:
        return RawRun("timeout", None, proc.returncode, stderr_tail=stderr_tail), proc.returncode
    return RawRun("crashed", None, proc.returncode, stderr_tail=stderr_tail), proc.returncode


class LocalRunner:
    """Development runner. Fresh interpreter per request; NOT an OS sandbox."""

    name = "local-dev (not sandboxed)"
    is_sandboxed = False

    def run(self, request: dict[str, Any], limits: Limits) -> RawRun:
        request = {**request, "time_limit": limits.time_limit_s}
        env = {"PYTHONIOENCODING": "utf-8", "PYTHONDONTWRITEBYTECODE": "1"}
        if os.name == "nt":
            # Python on Windows needs SYSTEMROOT to initialise crypto/random.
            env["SYSTEMROOT"] = os.environ.get("SYSTEMROOT", r"C:\Windows")
        preexec_fn = None
        creationflags = 0
        if os.name == "posix":
            preexec_fn = _posix_limits(limits)
        else:
            creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        with tempfile.TemporaryDirectory(prefix="cq-run-") as workdir:
            raw, _ = _execute(
                [sys.executable, "-I", "-S", str(HARNESS_PATH)],
                request,
                limits.time_limit_s + LOCAL_STARTUP_ALLOWANCE_S,
                env=env,
                cwd=workdir,
                preexec_fn=preexec_fn,
                creationflags=creationflags,
                memory_kb=limits.memory_mb * 1024,
            )
        return raw


def _posix_limits(limits: Limits):
    def apply() -> None:
        import resource

        cpu = int(limits.time_limit_s) + 1
        memory = limits.memory_mb * 2 * 1024 * 1024  # address space is larger than RSS
        for name, soft, hard in (
            ("RLIMIT_CPU", cpu, cpu + 1),
            ("RLIMIT_AS", memory, memory),
            ("RLIMIT_FSIZE", 1024 * 1024, 1024 * 1024),
            ("RLIMIT_NOFILE", 64, 64),
            ("RLIMIT_CORE", 0, 0),
        ):
            try:
                resource.setrlimit(getattr(resource, name), (soft, hard))
            except (ValueError, OSError, AttributeError):
                pass  # macOS rejects RLIMIT_AS; the RSS watchdog in _execute backs it up
        os.setsid()

    return apply


class DockerRunner:
    """Production runner: one fresh hardened container per request."""

    name = "docker"
    is_sandboxed = True

    def __init__(self, image: str = "codequest-judge:latest", docker: str = "docker", runtime: str | None = None):
        self.image = image
        self.docker = docker
        self.runtime = runtime  # e.g. "runsc" when gVisor is installed

    def command(self, container_name: str, limits: Limits) -> list[str]:
        cmd = [
            self.docker, "run", "--rm", "-i", "--init",
            "--name", container_name,
            "--network", "none",
            "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=16m",
            "--memory", f"{limits.memory_mb}m", "--memory-swap", f"{limits.memory_mb}m",
            "--cpus", "1", "--pids-limit", str(limits.max_pids),
            "--ulimit", "nofile=64:64", "--ulimit", "fsize=1048576:1048576",
            "--ulimit", "core=0:0", "--ulimit", "nproc=64:64",
            "--cap-drop", "ALL", "--security-opt", "no-new-privileges=true",
            "--user", "65534:65534", "--workdir", "/tmp",
            "-e", "PYTHONDONTWRITEBYTECODE=1", "-e", "PYTHONIOENCODING=utf-8",
        ]
        if self.runtime:
            cmd += ["--runtime", self.runtime]
        cmd += [self.image, "python", "-I", "-S", "/opt/codequest/harness.py"]
        return cmd

    def run(self, request: dict[str, Any], limits: Limits) -> RawRun:
        request = {**request, "time_limit": limits.time_limit_s}
        container_name = "cq-" + uuid.uuid4().hex[:16]

        def kill_container() -> None:
            subprocess.run([self.docker, "kill", container_name], capture_output=True, timeout=10, check=False)

        raw, code = _execute(
            self.command(container_name, limits),
            request,
            limits.time_limit_s + STARTUP_ALLOWANCE_S + 1.0,
            env=None,
            cwd=None,
            kill_extra=kill_container,
        )
        # `docker run` exits 137 when the kernel OOM-killed the container.
        if raw.payload is None and code == 137:
            raw.oom_killed = True
        return raw


def docker_available(image: str, docker: str = "docker") -> bool:
    """True when the daemon answers and the judge image is present."""
    try:
        probe = subprocess.run([docker, "image", "inspect", image], capture_output=True, timeout=5, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return False
    return probe.returncode == 0


def make_runner(kind: str | None = None) -> Runner:
    kind = (kind or os.environ.get("CQ_RUNNER", "auto")).lower()
    if kind == "auto":
        # prefer the OS sandbox; degrade to the restricted local runner instead of failing
        kind = "docker" if docker_available(os.environ.get("CQ_DOCKER_IMAGE", "codequest-judge:latest")) else "local"
    if kind == "docker":
        return DockerRunner(
            image=os.environ.get("CQ_DOCKER_IMAGE", "codequest-judge:latest"),
            runtime=os.environ.get("CQ_DOCKER_RUNTIME") or None,
        )
    if kind == "local":
        return LocalRunner()
    raise ValueError(f"unknown runner kind: {kind!r}")
