"""Static mistake detectors over the learner's AST. Never executes learner code.

Each detector returns Findings with the line and, where possible, the column
span of the expression to blank out for the H4 "fill the blank" hint.
"""

from __future__ import annotations

import ast
import builtins
from dataclasses import dataclass, field

SHADOWABLE = {
    "list", "dict", "str", "sum", "max", "min", "len", "input", "range", "sorted",
    "id", "type", "set", "int", "float", "abs", "round", "map", "filter", "print", "any", "all",
}
RISKY_EMPTY_CALLS = {"max", "min"}
MUTATING_METHODS = {"remove", "append", "pop", "insert", "extend", "clear"}


@dataclass(frozen=True)
class Finding:
    key: str
    line: int
    message: str
    end_line: int | None = None
    blank: tuple[int, int, int] | None = None  # (line, col_start, col_end) of the expression to blank
    extra: dict = field(default_factory=dict, compare=False, hash=False)


def _target_function(tree: ast.Module, name: str) -> ast.FunctionDef | None:
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    return None


def _span(node: ast.AST) -> tuple[int, int, int] | None:
    if getattr(node, "end_lineno", None) == getattr(node, "lineno", None) and hasattr(node, "col_offset"):
        return (node.lineno, node.col_offset, node.end_col_offset)  # type: ignore[attr-defined]
    return None


def _is_len_call(node: ast.AST) -> str | None:
    if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "len"
            and len(node.args) == 1 and isinstance(node.args[0], ast.Name)):
        return node.args[0].id
    return None


def _is_len_minus_one(node: ast.AST) -> str | None:
    if (isinstance(node, ast.BinOp) and isinstance(node.op, ast.Sub)
            and isinstance(node.right, ast.Constant) and node.right.value == 1):
        return _is_len_call(node.left)
    return None


def _names_in(node: ast.AST) -> set[str]:
    return {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}


def _assigned_names(nodes: list[ast.stmt]) -> set[str]:
    names: set[str] = set()
    for stmt in nodes:
        for n in ast.walk(stmt):
            if isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                targets = n.targets if isinstance(n, ast.Assign) else [n.target]
                for t in targets:
                    names |= {x.id for x in ast.walk(t) if isinstance(x, ast.Name)}
            elif isinstance(n, (ast.For, ast.comprehension)):
                names |= {x.id for x in ast.walk(n.target) if isinstance(x, ast.Name)}
            elif isinstance(n, ast.NamedExpr):
                names.add(n.target.id)
    return names


def _contains_continue(stmt: ast.stmt) -> bool:
    """True if `stmt` contains a `continue` that targets the enclosing loop (not an inner one)."""
    stack: list[ast.AST] = [stmt]
    while stack:
        node = stack.pop()
        if isinstance(node, ast.Continue):
            return True
        if isinstance(node, (ast.For, ast.While, ast.AsyncFor, ast.FunctionDef, ast.Lambda, ast.ClassDef)) and node is not stmt:
            continue
        stack.extend(ast.iter_child_nodes(node))
    return False


def detect_print_vs_return(fn: ast.FunctionDef) -> list[Finding]:
    returns_value = any(isinstance(n, ast.Return) and n.value is not None for n in ast.walk(fn))
    prints = [n for n in ast.walk(fn) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "print"]
    if prints and not returns_value:
        last = max(prints, key=lambda n: n.lineno)
        return [Finding("print_vs_return", last.lineno, "This function prints its result but never returns it.")]
    return []


def detect_off_by_one(fn: ast.FunctionDef) -> list[Finding]:
    found: list[Finding] = []
    for node in ast.walk(fn):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "range":
            for arg in node.args:
                if _is_len_minus_one(arg):
                    found.append(Finding("off_by_one", node.lineno,
                                         "`range(len(...) - 1)` stops before the last index.", blank=_span(arg)))
        elif isinstance(node, ast.Subscript) and _is_len_call(node.slice):
            found.append(Finding("off_by_one", node.lineno,
                                 "Indexing with `len(...)` reads one position past the end.", blank=_span(node.slice)))
        elif isinstance(node, ast.Compare) and len(node.ops) == 1 and isinstance(node.left, ast.Name):
            op, right = node.ops[0], node.comparators[0]
            if isinstance(op, ast.Lt) and _is_len_minus_one(right):
                found.append(Finding("off_by_one", node.lineno,
                                     "`< len(...) - 1` stops one element early.", blank=_span(right)))
            elif isinstance(op, ast.LtE) and _is_len_call(right):
                found.append(Finding("off_by_one", node.lineno,
                                     "`<= len(...)` goes one position past the end.", blank=_span(node)))
    return found


def _guarded_names(fn: ast.FunctionDef, before_line: int) -> set[str]:
    names: set[str] = set()
    for node in ast.walk(fn):
        if isinstance(node, (ast.If, ast.While, ast.IfExp, ast.Assert)) and node.lineno <= before_line:
            names |= _names_in(node.test)
        if isinstance(node, ast.Try) and node.lineno <= before_line and node.handlers:
            names |= _names_in(node)
    return names


def detect_empty_input(fn: ast.FunctionDef) -> list[Finding]:
    params = {a.arg for a in fn.args.args}
    zero_init = {
        t.id for n in fn.body if isinstance(n, ast.Assign)
        and isinstance(n.value, ast.Constant) and n.value.value == 0
        for t in n.targets if isinstance(t, ast.Name)
    }
    found: list[Finding] = []
    for node in ast.walk(fn):
        risky: str | None = None
        blank = None
        if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) and node.value.id in params:
            idx = node.slice
            if isinstance(idx, ast.Constant) and idx.value in (0, -1):
                risky = node.value.id
        elif (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in RISKY_EMPTY_CALLS
              and len(node.args) == 1 and isinstance(node.args[0], ast.Name) and node.args[0].id in params
              and not node.keywords):
            risky = node.args[0].id
        elif isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Div, ast.FloorDiv, ast.Mod)):
            divisor = node.right
            name = _is_len_call(divisor)
            if name in params:
                risky = name
            elif isinstance(divisor, ast.Name) and divisor.id in zero_init:
                risky = divisor.id
            blank = _span(divisor) if risky else None
        if risky is None:
            continue
        if risky in _guarded_names(fn, node.lineno):
            continue
        found.append(Finding("empty_input", node.lineno,
                             "This line can fail when the input is empty, and nothing checks for that first.",
                             blank=blank))
    return found


def detect_shadow_builtin(fn: ast.FunctionDef) -> list[Finding]:
    found = []
    for name in sorted(_assigned_names(fn.body) | {a.arg for a in fn.args.args}):
        if name in SHADOWABLE and hasattr(builtins, name):
            line = next((n.lineno for n in ast.walk(fn) if isinstance(n, ast.Name) and n.id == name), fn.lineno)
            found.append(Finding("shadow_builtin", line,
                                 f"The name `{name}` hides Python's built-in `{name}()`.", extra={"name": name}))
    return found


def detect_base_case(fn: ast.FunctionDef) -> list[Finding]:
    calls = [n for n in ast.walk(fn) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == fn.name]
    if not calls:
        return []
    first_call = min(c.lineno for c in calls)
    has_base = any(
        isinstance(n, ast.If) and n.lineno <= first_call and any(isinstance(x, ast.Return) for x in ast.walk(n))
        for n in ast.walk(fn)
    )
    if has_base:
        return []
    return [Finding("base_case", fn.lineno, "This recursive function has no base case that stops the recursion first.")]


def detect_mutate_while_iterating(fn: ast.FunctionDef) -> list[Finding]:
    found = []
    for loop in ast.walk(fn):
        if not (isinstance(loop, ast.For) and isinstance(loop.iter, ast.Name)):
            continue
        target = loop.iter.id
        for node in ast.walk(loop):
            if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                    and isinstance(node.func.value, ast.Name) and node.func.value.id == target
                    and node.func.attr in MUTATING_METHODS):
                found.append(Finding("mutate_while_iterating", node.lineno,
                                     f"`{target}` is changed while the loop is still walking over it."))
                break
    return found


def detect_infinite_loop(fn: ast.FunctionDef) -> list[Finding]:
    found = []
    for loop in ast.walk(fn):
        if not isinstance(loop, ast.While):
            continue
        if any(isinstance(n, (ast.Break, ast.Return)) for n in ast.walk(loop)):
            continue
        cond_vars = _names_in(loop.test) - set(dir(builtins))
        if not cond_vars:
            continue
        if not (_assigned_names(loop.body) & cond_vars) and not _mutated(loop.body, cond_vars):
            found.append(Finding("infinite_loop", loop.lineno,
                                 "Nothing inside this loop changes the values its condition depends on."))
            continue
        # A `continue` that runs before the loop variable is updated skips the update.
        for index, stmt in enumerate(loop.body):
            if _contains_continue(stmt):
                updated_before = _assigned_names(loop.body[:index]) & cond_vars
                updated_in_branch = _assigned_names([stmt]) & cond_vars
                if not updated_before and not updated_in_branch:
                    found.append(Finding("infinite_loop", stmt.lineno,
                                         "`continue` jumps back before the loop variable is updated, so the loop can repeat forever."))
                    break
    return found


def _mutated(body: list[ast.stmt], names: set[str]) -> bool:
    for stmt in body:
        for n in ast.walk(stmt):
            if (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and isinstance(n.func.value, ast.Name)
                    and n.func.value.id in names and n.func.attr in MUTATING_METHODS):
                return True
    return False


def detect_bad_initial_value(fn: ast.FunctionDef) -> list[Finding]:
    """`best = 0` followed by `if x > best: best = x` (a best-so-far that can't handle all-negative input)."""
    zero_init = {
        t.id: n.lineno for n in fn.body if isinstance(n, ast.Assign)
        and isinstance(n.value, ast.Constant) and type(n.value.value) is int and n.value.value == 0
        for t in n.targets if isinstance(t, ast.Name)
    }
    for node in ast.walk(fn):
        if not (isinstance(node, ast.If) and isinstance(node.test, ast.Compare) and len(node.test.ops) == 1
                and isinstance(node.test.ops[0], (ast.Gt, ast.Lt, ast.GtE, ast.LtE))):
            continue
        sides = (node.test.left, node.test.comparators[0])
        assigned_in_body = _assigned_names(node.body)
        for this, other in (sides, sides[::-1]):
            if (isinstance(this, ast.Name) and this.id in zero_init and this.id in assigned_in_body
                    and not isinstance(other, ast.Constant) and not _is_len_call(other)):
                return [Finding("bad_initial_value", zero_init[this.id],
                                f"`{this.id}` starts at 0, which is wrong if every value is negative (or positive).")]
    return []


DETECTORS = (
    detect_print_vs_return,
    detect_off_by_one,
    detect_empty_input,
    detect_shadow_builtin,
    detect_base_case,
    detect_mutate_while_iterating,
    detect_infinite_loop,
    detect_bad_initial_value,
)


def run_detectors(code: str, function: str) -> list[Finding]:
    """All static findings for the target function (empty list if the code does not parse)."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    fn = _target_function(tree, function)
    if fn is None:
        return []
    findings: list[Finding] = []
    seen: set[tuple[str, int]] = set()
    for detector in DETECTORS:
        for f in detector(fn):
            if (f.key, f.line) not in seen:
                seen.add((f.key, f.line))
                findings.append(f)
    return sorted(findings, key=lambda f: (f.line, f.key))
