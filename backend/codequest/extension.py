"""LeetCode Companion logic. Deterministic, and never produces solution code.

* analyze  -> run the mistake detectors on every function/method of the learner's Python code
* approach -> compare the techniques the learner describes with the problem's topic tags
* hint     -> concept-level ladder keyed by the problem's canonical concepts (never LeetCode's hints)

We never store LeetCode problem statements or hints: only the slug and topic-tag slugs.
"""

from __future__ import annotations

import ast
import re
from typing import Any

from codequest.analysis import detectors as d

# LeetCode topic-tag slug -> canonical concept (subset covering interview-level problems).
TAG_CONCEPT: dict[str, str] = {
    "array": "arrays", "matrix": "arrays", "simulation": "arrays", "enumeration": "arrays",
    "string": "strings", "string-matching": "strings",
    "hash-table": "hashing", "counting": "hashing",
    "two-pointers": "two_pointers", "sliding-window": "sliding_window",
    "prefix-sum": "prefix_sums",
    "sorting": "sorting", "merge-sort": "sorting", "counting-sort": "sorting", "bucket-sort": "sorting",
    "binary-search": "binary_search",
    "stack": "stack", "monotonic-stack": "stack", "queue": "stack", "monotonic-queue": "stack",
    "heap-priority-queue": "heap",
    "linked-list": "linked_list", "doubly-linked-list": "linked_list",
    "recursion": "recursion", "backtracking": "backtracking",
    "dynamic-programming": "dynamic_programming", "memoization": "dynamic_programming",
    "greedy": "greedy",
    "bit-manipulation": "bits", "bitmask": "bits",
    "math": "math", "number-theory": "math", "combinatorics": "math",
    "tree": "trees", "binary-tree": "trees", "binary-search-tree": "trees",
    "depth-first-search": "graphs", "breadth-first-search": "graphs", "graph": "graphs",
    "topological-sort": "graphs", "union-find": "graphs", "shortest-path": "graphs",
    "trie": "trie",
}

# Technique phrases a learner might write -> concept. Order matters only for display.
TECHNIQUES: list[tuple[str, str]] = [
    (r"\bhash ?(map|table|set)\b|\bdict(ionary)?\b|\bset\b|\bcounter\b", "hashing"),
    (r"\btwo pointers?\b|\bleft and right\b|\bl and r\b", "two_pointers"),
    (r"\bsliding window\b|\bwindow\b", "sliding_window"),
    (r"\bprefix sums?\b|\brunning sum\b|\bcumulative\b", "prefix_sums"),
    (r"\bsort(ed|ing)?\b", "sorting"),
    (r"\bbinary search\b|\bbisect\b", "binary_search"),
    (r"\bstack\b|\bmonotonic\b|\bqueue\b|\bdeque\b", "stack"),
    (r"\bheap\b|\bpriority queue\b|\bheapq\b", "heap"),
    (r"\blinked list\b|\bnext pointer\b|\bdummy node\b", "linked_list"),
    (r"\brecurs(ion|ive|ively)\b", "recursion"),
    (r"\bbacktrack(ing)?\b", "backtracking"),
    (r"\bdp\b|\bdynamic programming\b|\bmemo(ize|ization)?\b|\btabulation\b", "dynamic_programming"),
    (r"\bgreedy\b", "greedy"),
    (r"\bbit(wise| manipulation)?\b|\bxor\b", "bits"),
    (r"\bdfs\b|\bbfs\b|\bgraph\b|\bunion[- ]find\b|\btopological\b", "graphs"),
    (r"\btree\b|\binorder\b|\bpreorder\b|\bpostorder\b", "trees"),
    (r"\btrie\b|\bprefix tree\b", "trie"),
]
BRUTE_FORCE = re.compile(r"\bnested loops?\b|\bbrute[- ]?force\b|\bevery pair\b|\ball pairs\b|\bo\(n\s*\^?\s*2\)|\bo\(n²\)")

CONCEPT_HINTS: dict[str, list[str]] = {
    "hashing": [
        "This problem rewards fast lookups.",
        "What do you need to know about the elements you've already seen, and how quickly can you check it?",
        "A dictionary maps a value to something you remember about it (an index, a count) in O(1) per lookup.",
    ],
    "two_pointers": [
        "Think about the order of the data and where two positions could start.",
        "If you move one position inward, what does the comparison tell you about the other?",
        "Two pointers usually start at both ends (or both at the start) and move based on a comparison, each step ruling out options.",
    ],
    "sliding_window": [
        "The answer is about a contiguous part of the input.",
        "When the window grows by one element, what changes, and when must it shrink?",
        "Keep a running summary of the window; add the new right element, remove left elements while the window is invalid.",
    ],
    "binary_search": [
        "The search space is ordered, or the answer is monotonic.",
        "What question can you ask in the middle that lets you throw away half of the range?",
        "Keep lo and hi as the range that can still hold the answer, and check that the loop always shrinks it.",
    ],
    "stack": [
        "The most recent unfinished item matters most.",
        "When a new element arrives, which earlier elements can never matter again?",
        "A stack keeps unresolved items; pop them when the new element resolves them.",
    ],
    "dynamic_programming": [
        "Big answers here are built from answers to smaller versions of the same question.",
        "What is the smallest version of this problem, and how does one step bigger depend on it?",
        "Define what dp[i] means in words first, then the base case, then how dp[i] uses earlier entries.",
    ],
    "graphs": [
        "Think of the items as nodes and their relationships as edges.",
        "Which nodes can you reach from a starting node, and how do you avoid visiting one twice?",
        "BFS explores level by level with a queue; DFS goes deep with recursion or a stack; both need a visited set.",
    ],
    "trees": [
        "Each node's answer depends on its children.",
        "What should your function return for an empty subtree, and how do you combine left and right?",
        "Write the recursion for one node assuming the calls on its children already work.",
    ],
    "sorting": [
        "Would the problem be easier if the data were in order?",
        "After sorting, which neighbouring elements need to be compared?",
        "Sorting costs O(n log n) once; check whether that unlocks a simple linear pass afterwards.",
    ],
    "greedy": [
        "A locally best choice might be enough here.",
        "Which choice can you make right now that never needs to be undone?",
        "Try to argue why taking the best-looking option first can't make the final answer worse.",
    ],
}
GENERIC_HINTS = [
    "Start from the smallest possible input and solve it by hand.",
    "Which part of your current approach repeats work it has already done?",
    "Write the steps in plain words before writing code, then check each step on one example.",
]


def concepts_for_tags(tags: list[str]) -> list[str]:
    seen: list[str] = []
    for tag in tags:
        concept = TAG_CONCEPT.get(tag)
        if concept and concept not in seen:
            seen.append(concept)
    return seen


def analyze(code: str) -> dict[str, Any]:
    """Static mistake detection on every function and method (LeetCode wraps code in `class Solution`)."""
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return {"syntax_error": {"message": exc.msg, "line": exc.lineno}, "findings": []}
    findings = []
    seen: set[tuple[str, int]] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for detector in d.DETECTORS:
                for f in detector(node):
                    if f.key == "shadow_builtin" and f.extra.get("name") == "self":
                        continue
                    if (f.key, f.line) not in seen:
                        seen.add((f.key, f.line))
                        findings.append({"key": f.key, "line": f.line, "message": f.message})
    findings.sort(key=lambda f: (f["line"], f["key"]))
    return {"syntax_error": None, "findings": findings}


def check_approach(text: str, tags: list[str]) -> dict[str, Any]:
    text_l = text.lower()
    mentioned = [concept for pattern, concept in TECHNIQUES if re.search(pattern, text_l)]
    mentioned = list(dict.fromkeys(mentioned))
    expected = concepts_for_tags(tags)
    brute = bool(BRUTE_FORCE.search(text_l))
    overlap = [c for c in mentioned if c in expected]
    if not text.strip() or (not mentioned and not brute):
        verdict = "unclear"
        question = "Describe your plan in a sentence or two: which data structure, and what happens in each step?"
    elif overlap and not brute:
        verdict = "on_track"
        question = "Good direction. What is the time complexity of your plan, and what is the trickiest edge case for it?"
    elif overlap and brute:
        verdict = "partially"
        question = "You have a useful idea, but nested loops may be too slow. Which repeated work could a data structure remember for you?"
    elif brute:
        verdict = "partially"
        question = "A brute-force plan is a fine start. Which work is repeated, and how could you avoid redoing it?"
    else:
        verdict = "off_track" if expected else "unclear"
        question = ("Your idea may work, but this problem's structure points elsewhere. "
                    "What property of the input haven't you used yet?") if expected else \
            "Which property of the input could make each step cheaper?"
    return {"verdict": verdict, "mentioned": mentioned, "brute_force": brute, "question": question}


def hint(tags: list[str], level: int) -> dict[str, Any]:
    concepts = concepts_for_tags(tags)
    ladder = next((CONCEPT_HINTS[c] for c in concepts if c in CONCEPT_HINTS), GENERIC_HINTS)
    level = max(1, min(level, len(ladder)))
    return {"level": level, "max_level": len(ladder), "text": ladder[level - 1],
            "concept": next((c for c in concepts if c in CONCEPT_HINTS), None)}
