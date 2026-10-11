"""Challenge schema, loading and validation.

Challenges live in `content/challenges/*.yaml`. Hidden tests and reference
solutions are server-only: `public_challenge()` is the only view a client sees.
"""

from __future__ import annotations

import ast
import keyword
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field, field_validator, model_validator

CONTENT_DIR = Path(__file__).resolve().parents[2] / "content" / "challenges"

TEST_TAGS = {
    "typical", "empty", "single", "boundary", "negative", "duplicates",
    "large", "base", "type-edge", "absent", "zero",
}

# Hidden tests only ever expose a coarse category (plan §16, finding 2).
COARSE_CATEGORY = {
    "typical": "typical case",
    "empty": "edge case",
    "single": "edge case",
    "base": "edge case",
    "zero": "edge case",
    "absent": "edge case",
    "boundary": "boundary",
    "negative": "tricky values",
    "duplicates": "tricky values",
    "type-edge": "tricky values",
    "large": "large input",
}
COARSE_PRIORITY = ["edge case", "boundary", "tricky values", "large input", "typical case"]


class InputSpec(BaseModel):
    """Domain for bounded exhaustive enumeration of small inputs (counterexample finder)."""

    kind: Literal["int", "list_int", "str"]
    values: list[int] = Field(default_factory=lambda: [-2, -1, 0, 1, 2])
    alphabet: str = "ab "
    max_len: int = 3

    @field_validator("max_len")
    @classmethod
    def _small(cls, v: int) -> int:
        if not 0 <= v <= 5:
            raise ValueError("max_len must be between 0 and 5")
        return v


class TestCase(BaseModel):
    id: str
    visibility: Literal["visible", "hidden"]
    args: list[Any]
    expected: Any
    tags: list[str] = Field(default_factory=lambda: ["typical"])
    compare: Literal["exact", "unordered"] = "exact"

    @field_validator("tags")
    @classmethod
    def _known_tags(cls, tags: list[str]) -> list[str]:
        unknown = set(tags) - TEST_TAGS
        if unknown:
            raise ValueError(f"unknown test tags: {sorted(unknown)}")
        if not tags:
            raise ValueError("every test needs at least one tag")
        return tags

    @property
    def coarse_category(self) -> str:
        cats = {COARSE_CATEGORY[t] for t in self.tags}
        return next(c for c in COARSE_PRIORITY if c in cats)


class Concepts(BaseModel):
    primary: str
    secondary: list[str] = Field(default_factory=list)

    @property
    def all(self) -> list[str]:
        return [self.primary, *self.secondary]


class Challenge(BaseModel):
    id: str
    type: Literal["build", "debug"] = "build"
    tier: int = Field(ge=1, le=5)
    title: str
    concepts: Concepts
    traps: list[str] = Field(default_factory=list)
    function: str
    description: str
    edge_cases: list[str] = Field(default_factory=list, description="Public 'things to consider' list")
    starter_code: str
    tests: list[TestCase]
    references: list[str] = Field(min_length=1)
    small_inputs: dict[str, InputSpec] | None = None
    time_limit_s: float = Field(default=2.0, gt=0, le=5)
    max_changed_lines: int | None = None

    @field_validator("function")
    @classmethod
    def _identifier(cls, v: str) -> str:
        if not v.isidentifier() or keyword.iskeyword(v):
            raise ValueError("function must be a valid Python identifier")
        return v

    @model_validator(mode="after")
    def _check(self) -> "Challenge":
        ids = [t.id for t in self.tests]
        if len(ids) != len(set(ids)):
            raise ValueError(f"{self.id}: duplicate test ids")
        if len(self.visible_tests) < 3:
            raise ValueError(f"{self.id}: needs at least 3 visible tests")
        if len(self.hidden_tests) < 4:
            raise ValueError(f"{self.id}: needs at least 4 hidden tests")
        for code in [self.starter_code, *self.references]:
            try:
                tree = ast.parse(code)
            except SyntaxError as exc:
                raise ValueError(f"{self.id}: code does not parse: {exc}") from exc
            names = {n.name for n in tree.body if isinstance(n, ast.FunctionDef)}
            if self.function not in names:
                raise ValueError(f"{self.id}: code must define {self.function}()")
        if self.type == "debug" and self.max_changed_lines is None:
            raise ValueError(f"{self.id}: debug missions need max_changed_lines")
        return self

    @property
    def visible_tests(self) -> list[TestCase]:
        return [t for t in self.tests if t.visibility == "visible"]

    @property
    def hidden_tests(self) -> list[TestCase]:
        return [t for t in self.tests if t.visibility == "hidden"]

    @property
    def reference_statement_count(self) -> int:
        tree = ast.parse(self.references[0])
        fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == self.function)
        return sum(1 for n in ast.walk(fn) if isinstance(n, ast.stmt)) - 1


def public_challenge(ch: Challenge) -> dict[str, Any]:
    """The only challenge view sent to clients: no hidden tests, no references."""
    return {
        "id": ch.id,
        "type": ch.type,
        "tier": ch.tier,
        "title": ch.title,
        "concepts": ch.concepts.all,
        "function": ch.function,
        "description": ch.description,
        "edge_cases": ch.edge_cases,
        "starter_code": ch.starter_code,
        "max_changed_lines": ch.max_changed_lines,
        "visible_tests": [
            {"id": t.id, "args": t.args, "expected": t.expected, "tags": t.tags} for t in ch.visible_tests
        ],
        "hidden_test_count": len(ch.hidden_tests),
    }


def load_challenge(path: Path) -> Challenge:
    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return Challenge.model_validate(data)


@lru_cache(maxsize=1)
def load_all(directory: str | None = None) -> dict[str, Challenge]:
    root = Path(directory) if directory else CONTENT_DIR
    challenges: dict[str, Challenge] = {}
    for path in sorted(root.glob("*.yaml")):
        ch = load_challenge(path)
        if ch.id in challenges:
            raise ValueError(f"duplicate challenge id {ch.id}")
        if path.stem != ch.id:
            raise ValueError(f"{path.name}: file name must match id {ch.id!r}")
        challenges[ch.id] = ch
    return dict(sorted(challenges.items(), key=lambda kv: (kv[1].tier, kv[1].type, kv[0])))
