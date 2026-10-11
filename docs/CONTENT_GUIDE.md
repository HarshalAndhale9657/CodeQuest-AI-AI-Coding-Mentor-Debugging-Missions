# Mission Catalogue and Authoring Guide

CodeQuest ships **20 Python missions** across **5 tiers**: 15 *build* missions (write the function) and 5 *debug* missions (fix broken code within a line budget). Every mission is one YAML file in [`content/challenges/`](../content/challenges/), validated when the server loads it and again by the test suite.

---

## 1. Catalogue

| Tier | Type | Mission | `id` | Primary concept | Traps it targets | Visible / hidden tests |
|---|---|---|---|---|---|---|
| 1 | build | Add Them Up | `total` | loops | empty input, off-by-one | 3 / 5 |
| 1 | build | Count the Evens | `count_evens` | conditionals | empty input | 3 / 5 |
| 1 | build | Find the Largest | `largest` | conditionals | bad initial value, empty input | 3 / 5 |
| 1 | debug | The Broken Average | `debug_average` | loops | off-by-one, empty input | 3 / 4 · ≤ 3 lines |
| 2 | build | Class Average | `class_average` | loops | empty input, off-by-one, infinite loop | 4 / 6 |
| 2 | build | Valid Palindrome | `is_palindrome` | strings | case sensitivity, off-by-one, empty input | 3 / 5 |
| 2 | build | Reverse Words in a String | `reverse_words` | strings | whitespace, empty input | 3 / 5 |
| 2 | debug | The Infinite Recurrence | `debug_fib` | recursion | base case | 3 / 5 · ≤ 3 lines |
| 2 | debug | The Negative Trap | `debug_largest` | loops | bad initial value, empty input | 3 / 5 · ≤ 3 lines |
| 3 | build | Character Frequency | `char_frequency` | dicts | empty input, case sensitivity | 3 / 5 |
| 3 | build | Deduplicate Preserving Order | `dedupe` | lists | mutate while iterating, empty input | 3 / 5 |
| 3 | build | Second Largest Element | `second_largest` | conditionals | bad initial value, duplicates, empty input | 3 / 5 |
| 3 | debug | Mutating While Iterating | `debug_dedupe` | lists | mutate while iterating | 3 / 5 · ≤ 3 lines |
| 4 | build | Binary Search | `binary_search` | binary search | off-by-one, empty input, infinite loop | 3 / 5 |
| 4 | build | Maximum Window Sum | `max_window_sum` | sliding window | window off-by-one, negatives, empty input | 3 / 5 |
| 4 | build | Merge Two Sorted Lists | `merge_sorted` | two pointers | leftover tail, empty input, off-by-one | 3 / 5 |
| 4 | debug | The Elusive Boundary | `debug_binary_search` | binary search | off-by-one, boundary | 3 / 5 · ≤ 2 lines |
| 5 | build | Factorial, Recursively | `factorial` | recursion | base case | 3 / 4 |
| 5 | build | Flatten Nested List | `flatten` | recursion | base case, empty input, deep nesting | 3 / 5 |
| 5 | build | Valid Parentheses and Brackets | `valid_brackets` | stack | closer first, empty input, leftover openers | 3 / 5 |

**Concepts covered:** loops, conditionals, lists, strings, dicts, sets, functions, recursion, base cases, two pointers, sliding window, binary search, stack.

Difficulty for the learner model is set by tier: 900 → 1050 → 1200 → 1350 → 1500 Elo, with debug missions 50 points easier than build missions of the same tier. When a mistake becomes recurring, the debug mission whose `traps` include it is assigned automatically (see [MENTOR_ENGINE.md §6](MENTOR_ENGINE.md#6-mistake-memory)).

---

## 2. Anatomy of a mission

```yaml
id: total                       # must equal the file name (total.yaml)
type: build                     # build | debug
tier: 1                         # 1–5
title: "Add Them Up"
concepts: {primary: loops, secondary: [lists]}   # drives Elo updates (0.7 primary / 0.3 secondary)
traps: [empty_input, off_by_one]                 # mistakes this mission exercises: drives adaptation
function: total                 # the function the learner must define
description: |
  Return the sum of all numbers in the list. The sum of an empty list is 0.
edge_cases:                     # public "things to consider", used by hint 2 when no counterexample exists
  - an empty list
  - negative numbers
  - the first and the last element
starter_code: |
  def total(nums):
      pass
small_inputs:                   # domain for the counterexample finder (exhaustive, smallest first)
  nums: {kind: list_int, values: [-2, 0, 1, 3], max_len: 3}
tests:
  - {id: v1, visibility: visible, args: [[1, 2, 3]], expected: 6, tags: [typical]}
  - {id: v2, visibility: visible, args: [[5]], expected: 5, tags: [single]}
  - {id: v3, visibility: visible, args: [[]], expected: 0, tags: [empty]}
  - {id: h1, visibility: hidden, args: [[-2, -3]], expected: -5, tags: [negative]}
  - {id: h2, visibility: hidden, args: [[10, -10, 7]], expected: 7, tags: [boundary]}
  # …
references:                     # one or more correct solutions (never sent to clients)
  - |
    def total(nums):
        return sum(nums)
```

### Field reference

| Field | Required | Rules |
|---|---|---|
| `id` | ✅ | Unique; must match the file name |
| `type` | | `build` (default) or `debug` |
| `tier` | ✅ | Integer 1–5 |
| `concepts.primary` / `.secondary` | ✅ / | Concept ids shown on the skill map |
| `traps` | | Mistake keys (see the detector table in [MENTOR_ENGINE.md §2](MENTOR_ENGINE.md#2-static-mistake-detectors)); other descriptive keys are allowed |
| `function` | ✅ | Valid Python identifier, not a keyword |
| `description`, `starter_code` | ✅ | Starter code must parse and define `function` |
| `edge_cases` | | Public list of things to try |
| `tests` | ✅ | **≥ 3 visible and ≥ 4 hidden**, unique `id`s, at least one known tag each |
| `tests[].compare` | | `exact` (default) or `unordered` |
| `references` | ✅ | ≥ 1; each must parse and define `function`. The first is used for counterexamples and the H4 decision |
| `small_inputs` | | Per-parameter spec: `kind` `int` / `list_int` / `str`, `values` or `alphabet`, `max_len` 0–5 |
| `time_limit_s` | | Per test, default 2.0, at most 5 |
| `max_changed_lines` | debug only | Line budget for the fix |

### Test tags and the categories learners see for hidden tests

| Tags | Hidden-test category shown |
|---|---|
| `empty`, `single`, `base`, `zero`, `absent` | edge case |
| `boundary` | boundary |
| `negative`, `duplicates`, `type-edge` | tricky values |
| `large` | large input |
| `typical` | typical case |

Tags also feed mistake fusion: for example, an `IndexError` on an `empty` test is evidence for `empty_input`, and a failing `boundary` test confirms a static off-by-one finding.

---

## 3. Writing a good mission

- **Make hidden tests matter.** Visible tests teach the format; hidden tests should check what a learner is likely to miss (negatives, duplicates, the last element, large input).
- **Tag honestly.** Tags drive both the hidden-test category and mistake detection.
- **Keep `small_inputs` small.** The finder enumerates every combination (capped at 300 candidates), smallest first, so a near-minimal counterexample comes out. Choose values that expose the traps, such as an all-negative list for `bad_initial_value`.
- **Debug missions**: the starter code must contain the trap (e.g. `range(len(nums) - 1)`), must *fail*, and the counterexample finder must expose it. All three are enforced by tests.
- **Give several references** when there are common alternative solutions; the leak guard checks hints against all of them.

---

## 4. Validation

Run before committing content:

```bash
cd backend
python -m pytest tests/test_content.py tests/test_mentor.py -q
```

| Check | Test |
|---|---|
| Every file loads and validates against the schema | `test_missions_load` |
| The public view contains no hidden tests or references | `test_public_view_has_no_secrets` |
| **Every reference passes every test** in the sandbox | `test_references_pass_all_tests` |
| **The starter code does not already pass** | `test_starter_code_does_not_already_pass` |
| The counterexample finder never flags a reference | `test_counterexample_finder_never_flags_a_reference` |
| The finder exposes every debug starter's bug | `test_counterexample_finder_exposes_debug_starters` |
| Tiers 1–5 and debug missions cover the ladder | `test_tiers_and_debug_missions_cover_the_ladder` |
| Authored lessons never contain a reference statement, for any mission | `test_authored_lessons_never_contain_reference_statements` |

---

## 5. Syntax Warm-up corpus

[`content/typing/snippets.json`](../content/typing/snippets.json) holds **32 real Python idioms** (3–12 lines, 4-space indent) as `[{id, concept, title, code}]`, tagged by the same concepts as the missions. The backend validates every snippet on load (printable ASCII, no tabs or trailing spaces, valid Python), ranks them per learner (weak concepts, recurring `syntax:*` mistakes, not recently typed) and adds drills built from the learner's own passing code. Results go through `POST /api/typing/results`, are scored on the server, and appear on the portfolio (best WPM, accuracy, syntax fluency, runs).

### Roadmap catalog

[`content/roadmap/leetcode_catalog.json`](../content/roadmap/leetcode_catalog.json) lists **184 LeetCode problems** as `{slug, title, difficulty, topic, lists, premium?}`, covering all 25 roadmap topics (7 Python foundations, 18 NeetCode-style DSA topics). We store only slugs and titles and link out: never statements or hints. `lists` marks `blind75`, `neetcode150` and beginner `starter` problems; `premium: true` problems appear only for learners who have LeetCode Premium. [`content/concept_map.json`](../content/concept_map.json) maps imported LeetCode and Codeforces tags onto the same topic ids.
