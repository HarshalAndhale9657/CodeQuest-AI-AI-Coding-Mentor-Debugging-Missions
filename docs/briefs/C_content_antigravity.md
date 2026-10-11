# Brief for Person C: content, data and pitch (paste this into Antigravity)

You are working on **CodeQuest AI**, a hackathon project (12 hours total; feature freeze at **18:30**, code freeze at **21:00**).
Read `docs/pm/12H_PLAN.md` first. **You own `content/`, `docs/pitch/`, `README.md` and `frontend/public/data/`.** Do not edit `backend/codequest/` or `frontend/src/`. Work on branch `c/<task>`.

## Setup + validation
```
pip install -e backend pytest httpx
cd backend && python -m pytest -q tests/test_content.py     # must pass after every new mission
```
`test_content.py` checks that every challenge has ≥3 visible and ≥4 hidden tests and that the reference solution passes them all.

## P0: 8 new missions (14:00–16:00), for 15 total
Copy the format of the existing files in `content/challenges/` exactly (look at `class_average.yaml` and `debug_average.yaml`). Every mission needs: id, title, tier, concepts, description, starter code, a reference solution, visible tests, **hidden tests tagged with a category** (empty, single, boundary, large input, negative, duplicates…), and hints/traps in the same fields as the existing ones.

The current missions cover tiers 1–2 (total, count_evens, largest, factorial, class_average, binary_search). Add, for example:
- Tier 2: `reverse_words` (strings), `fizzbuzz_list` (conditionals)
- Tier 3: `char_frequency` (dicts), `remove_duplicates_ordered` (lists/sets), `second_largest` (edge cases: duplicates, too few items)
- Tier 4: `merge_sorted` (two pointers), `balanced_brackets` (stack)
- Tier 5: `running_median` or `longest_unique_substring` (sliding window)

Design each so a **common beginner bug** (off-by-one, an empty input, mutating while iterating, integer division, a missing return) fails a specific hidden-test category. That's what powers the "recurring mistake" detection.

## P1: 3 debug missions (16:00–18:30)
Follow `debug_average.yaml`: the starter code contains a realistic bug, and the learner fixes it. Ideas: an off-by-one in a loop, a crash on an empty list, a list mutated while iterating over it.

## P1: Data files
1. `frontend/public/data/typing-snippets.json`: 30–40 objects `{id, concept, title, code}`, real Python idioms of 3–12 lines with 4-space indentation (list comprehension, dict.get counting, enumerate, zip, with open, try/except, class with `__init__`, f-strings, `sorted` with key=lambda, `if __name__ == "__main__"`, two pointers, a binary search skeleton…). The concept ids must match the ones used in the challenges.
2. `content/concept_map.json`: maps Codeforces and LeetCode tags to our concept ids, e.g. `{"codeforces": {"implementation": ["loops"], "greedy": [...]}, "leetcode": {"Array": ["lists"], "Hash Table": ["dicts"]}}`.

## P0: Pitch materials (18:30–21:00)
- `README.md`: replace it with the submission README (template: `docs/templates/SUBMISSION_README_TEMPLATE.md`). Cover the problem, what we built mapped to each brief requirement, an architecture diagram (mermaid), how to run it, the security design and the team.
- `docs/pitch/`: a 6-slide deck outline (problem → gap no platform fills → demo → system design → "deterministic first, AI optional" → what's next).
- Record a 3-minute backup demo video of the deployed app, following the demo section of `12H_PLAN.md`, at 20:00.
