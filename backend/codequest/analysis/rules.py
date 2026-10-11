"""Mission rules: calls a mission forbids ("without using max()"). Static, host-side, never executes code.

A rule is a builtin or function name (`max`) or a method name with a leading dot (`.sort`). Only calls
count: naming a variable `max_seen` or passing `max` around is fine.
"""

from __future__ import annotations

import ast
import re

RULE_RE = re.compile(r"^\.?[A-Za-z_][A-Za-z0-9_]*$")


def forbidden_calls(tree: ast.AST, rules: list[str]) -> list[dict[str, object]]:
    """Each forbidden call as {"call": rule, "line": n}, in source order, one entry per rule and line."""
    if not rules:
        return []
    names = {r for r in rules if not r.startswith(".")}
    methods = {r[1:] for r in rules if r.startswith(".")}
    found: dict[tuple[str, int], dict[str, object]] = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        rule = None
        if isinstance(node.func, ast.Name) and node.func.id in names:
            rule = node.func.id
        elif isinstance(node.func, ast.Attribute) and node.func.attr in methods:
            rule = "." + node.func.attr
        if rule is not None:
            found.setdefault((rule, node.lineno), {"call": rule, "line": node.lineno})
    return sorted(found.values(), key=lambda v: (v["line"], v["call"]))
