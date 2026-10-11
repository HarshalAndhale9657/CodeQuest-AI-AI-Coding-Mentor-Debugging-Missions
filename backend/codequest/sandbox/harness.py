"""CodeQuest sandbox harness.

Runs learner code for ONE request inside the sandbox and prints a single
result record. This file is trusted code but executes next to untrusted code,
so it uses the standard library only and never trusts anything the learner
code returns: values are serialised to primitive JSON and compared on the host.

Request (JSON on stdin):
    {"code": str, "function": str, "args": <typed json list>}            single call
    {"code": str, "function": str, "batch": [<typed json list>, ...]}    probe mode
    plus "time_limit": float seconds per call, "capture_context": bool

Result: one line on fd 1, prefixed with MARKER, then the process exits.
"""

import copy
import io
import json
import os
import sys
import threading
import time
import traceback

MARKER = "\x1eCQRESULT\x1e"
STUDENT_FILE = "<student>"
STDOUT_CAP = 64 * 1024
STDERR_CAP = 8 * 1024
MAX_DEPTH = 60
BLOCK_PREFIX = "CodeQuest sandbox: "

_emit_lock = threading.Lock()
_emitted = False


# --------------------------------------------------------------------------- typed JSON

def encode(value, depth=0):
    """Encode a learner value into primitive JSON. Raises TypeError for unsupported types."""
    if depth > MAX_DEPTH:
        raise ValueError("value is nested too deeply")
    t = type(value)
    if value is None or t is bool or t is int or t is str:
        return value
    if t is float:
        if value != value or value in (float("inf"), float("-inf")):
            return {"__float__": repr(value)}
        return value
    if t is list:
        return [encode(v, depth + 1) for v in value]
    if t is tuple:
        return {"__tuple__": [encode(v, depth + 1) for v in value]}
    if t is set or t is frozenset:
        return {"__set__": [encode(v, depth + 1) for v in value]}
    if t is dict:
        return {"__dict__": [[encode(k, depth + 1), encode(v, depth + 1)] for k, v in value.items()]}
    raise TypeError("cannot compare a value of type " + t.__name__)


def decode(value):
    if isinstance(value, list):
        return [decode(v) for v in value]
    if isinstance(value, dict):
        if "__tuple__" in value:
            return tuple(decode(v) for v in value["__tuple__"])
        if "__set__" in value:
            return set(decode(v) for v in value["__set__"])
        if "__dict__" in value:
            return {decode(k): decode(v) for k, v in value["__dict__"]}
        if "__float__" in value:
            return float(value["__float__"])
        raise ValueError("unknown typed-json object")
    return value


# --------------------------------------------------------------------------- safe repr

def safe_repr(value, depth=0, budget=None):
    """repr() that never calls learner-defined __repr__ and stays small."""
    if budget is None:
        budget = [200]
    budget[0] -= 1
    if budget[0] < 0 or depth > 3:
        return "..."
    t = type(value)
    if value is None or t in (bool, int, float):
        text = repr(value)
        return text if len(text) <= 40 else text[:37] + "..."
    if t is str:
        text = repr(value)
        return text if len(text) <= 60 else text[:57] + "...'"
    if t in (list, tuple, set, frozenset):
        items = list(value)[:8]
        inner = ", ".join(safe_repr(v, depth + 1, budget) for v in items)
        if len(value) > 8:
            inner += ", ..."
        if t is list:
            return "[" + inner + "]"
        if t is tuple:
            return "(" + inner + ("," if len(value) == 1 else "") + ")"
        return "{" + inner + "}" if value else "set()"
    if t is dict:
        pairs = list(value.items())[:6]
        inner = ", ".join(safe_repr(k, depth + 1, budget) + ": " + safe_repr(v, depth + 1, budget) for k, v in pairs)
        if len(value) > 6:
            inner += ", ..."
        return "{" + inner + "}"
    return "<" + t.__name__ + ">"


# --------------------------------------------------------------------------- output capture

class CappedWriter(io.TextIOBase):
    def __init__(self, cap):
        self._parts = []
        self._size = 0
        self._cap = cap
        self.truncated = False

    def writable(self):
        return True

    def write(self, text):
        if not isinstance(text, str):
            raise TypeError("write() argument must be str")
        room = self._cap - self._size
        if room > 0:
            chunk = text[:room]
            self._parts.append(chunk)
            self._size += len(chunk)
        if len(text) > max(room, 0):
            self.truncated = True
        return len(text)

    def getvalue(self):
        return "".join(self._parts)


# --------------------------------------------------------------------------- tripwire

_BLOCKED_EVENTS = {
    "socket.": "network access is not allowed",
    "urllib.Request": "network access is not allowed",
    "subprocess.": "starting other programs is not allowed",
    "os.system": "starting other programs is not allowed",
    "os.exec": "starting other programs is not allowed",
    "os.spawn": "starting other programs is not allowed",
    "os.posix_spawn": "starting other programs is not allowed",
    "os.fork": "starting processes is not allowed",
    "os.forkpty": "starting processes is not allowed",
    "os.kill": "signalling processes is not allowed",
    "ctypes.": "native code is not allowed",
    "os.remove": "changing files is not allowed",
    "os.rename": "changing files is not allowed",
    "os.rmdir": "changing files is not allowed",
    "os.mkdir": "changing files is not allowed",
    "os.chmod": "changing files is not allowed",
    "os.chown": "changing files is not allowed",
    "os.link": "changing files is not allowed",
    "os.symlink": "changing files is not allowed",
    "os.truncate": "changing files is not allowed",
    "shutil.": "changing files is not allowed",
    "webbrowser.": "opening a browser is not allowed",
}


_WRITE_FLAGS = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_APPEND | os.O_TRUNC


def install_tripwire():
    """Audit hook that turns forbidden operations into clear runtime errors.

    This is a user-experience tripwire, NOT the security boundary: the OS sandbox
    (container flags) is the boundary. Python's docs are explicit that audit hooks
    cannot sandbox code on their own.
    """
    roots = []
    for root in {sys.prefix, sys.base_prefix, sys.exec_prefix, os.path.dirname(os.path.abspath(__file__))}:
        if root:
            roots.append(os.path.normcase(os.path.realpath(root)) + os.sep)
    busy = [False]

    def hook(event, args):
        if busy[0]:
            return
        if event == "open":
            path = args[0]
            mode = args[1] if len(args) > 1 else "r"
            flags = args[2] if len(args) > 2 and isinstance(args[2], int) else 0
            if path is None or isinstance(path, int):
                return
            busy[0] = True
            try:
                if isinstance(path, bytes):
                    path = os.fsdecode(path)
                real = os.path.normcase(os.path.realpath(str(path)))
                if mode is None:
                    writing = bool(flags & _WRITE_FLAGS)
                else:
                    writing = any(c in str(mode) for c in "wax+")
                if writing or not any(real.startswith(r) for r in roots):
                    raise PermissionError(BLOCK_PREFIX + "reading or writing files is not allowed")
            finally:
                busy[0] = False
            return
        for prefix, reason in _BLOCKED_EVENTS.items():
            if event.startswith(prefix):
                raise PermissionError(BLOCK_PREFIX + reason)

    sys.addaudithook(hook)


# --------------------------------------------------------------------------- results

def emit(result):
    """Write the result record once and terminate immediately (no atexit, no threads)."""
    global _emitted
    with _emit_lock:
        if _emitted:
            return
        _emitted = True
        data = (MARKER + json.dumps(result, allow_nan=False) + "\n").encode("utf-8")
        while data:
            written = os.write(1, data)
            data = data[written:]
        os._exit(0)


def exception_result(exc, capture_context):
    frame_info = None
    for frame, lineno in traceback.walk_tb(exc.__traceback__):
        if frame.f_code.co_filename == STUDENT_FILE:
            frame_info = (frame, lineno)
    try:
        message = str(exc)
    except BaseException:
        message = ""
    result = {
        "kind": "exception",
        "exc_type": type(exc).__name__,
        "message": message[:500],
        "line": frame_info[1] if frame_info else None,
        "function": frame_info[0].f_code.co_name if frame_info else None,
        "locals": {},
    }
    if capture_context and frame_info is not None:
        budget = [200]
        local_vars = {}
        for name, value in list(frame_info[0].f_locals.items())[:20]:
            local_vars[name] = safe_repr(value, budget=budget)
        result["locals"] = local_vars
    return result


def call_once(fn, args, capture_context):
    try:
        value = fn(*copy.deepcopy(args))
    except RecursionError as exc:
        return exception_result(exc, capture_context)
    except BaseException as exc:  # SystemExit and KeyboardInterrupt are learner errors too
        return exception_result(exc, capture_context)
    try:
        return {"kind": "ok", "value": encode(value)}
    except (TypeError, ValueError, RecursionError) as exc:
        return {"kind": "unencodable", "detail": str(exc)[:200]}


def start_watchdog(limit, on_timeout):
    def run():
        time.sleep(limit)
        on_timeout()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


def main():
    raw = sys.stdin.buffer.read()
    request = json.loads(raw.decode("utf-8"))
    code = request["code"]
    fn_name = request["function"]
    time_limit = float(request.get("time_limit", 2.0))
    capture_context = bool(request.get("capture_context", True))
    batch = request.get("batch")

    try:
        compiled = compile(code, STUDENT_FILE, "exec")
    except SyntaxError as exc:
        emit({"kind": "syntax_error", "message": exc.msg, "line": exc.lineno, "offset": exc.offset})
        return

    out = CappedWriter(STDOUT_CAP)
    err = CappedWriter(STDERR_CAP)
    batch_results = []

    def on_timeout():
        if batch is not None:
            emit({"kind": "batch", "results": batch_results, "timed_out": True})
        else:
            emit({"kind": "timeout", "stdout": out.getvalue(), "stdout_truncated": out.truncated})

    namespace = {"__name__": "__student__", "__builtins__": __builtins__}
    install_tripwire()
    sys.stdout, sys.stderr = out, err

    if batch is None:
        start_watchdog(time_limit, on_timeout)
        try:
            exec(compiled, namespace)
            fn = namespace.get(fn_name)
            if not callable(fn):
                result = {"kind": "missing_function", "function": fn_name}
            else:
                result = call_once(fn, decode(request["args"]), capture_context)
        except BaseException as exc:
            result = exception_result(exc, capture_context)
        sys.stdout, sys.stderr = sys.__stdout__, sys.__stderr__
        result["stdout"] = out.getvalue()
        result["stdout_truncated"] = out.truncated
        emit(result)
        return

    # Probe mode: many small calls in one process, total budget = time_limit.
    start_watchdog(time_limit, on_timeout)
    try:
        exec(compiled, namespace)
        fn = namespace.get(fn_name)
    except BaseException as exc:
        sys.stdout, sys.stderr = sys.__stdout__, sys.__stderr__
        emit({"kind": "batch", "results": [], "setup_error": type(exc).__name__, "timed_out": False})
        return
    if not callable(fn):
        sys.stdout, sys.stderr = sys.__stdout__, sys.__stderr__
        emit({"kind": "batch", "results": [], "setup_error": "missing_function", "timed_out": False})
        return
    for args in batch:
        batch_results.append(call_once(fn, decode(args), False))
    sys.stdout, sys.stderr = sys.__stdout__, sys.__stderr__
    emit({"kind": "batch", "results": batch_results, "timed_out": False})


if __name__ == "__main__":
    main()
