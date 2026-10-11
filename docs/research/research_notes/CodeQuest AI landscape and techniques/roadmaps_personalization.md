# Personalized DSA roadmaps, problem-difficulty data, and learner placement (for CodeQuest AI, as of 11 Oct 2026)

Scope: inputs for a CodeQuest AI feature that takes a learner's goals and background, places them, and builds a personalized roadmap of concepts and practice problems (our own Python challenges plus links to LeetCode problems). The roadmap updates as skill and recurring-mistake profiles change. The approach is deterministic first, with minimal LLM use.

Method note: several findings come from my own analysis of public data files and production JavaScript bundles fetched on 2026-10-11. Those are cited to the exact file URL. Hashed bundle URLs change whenever the site redeploys. Web search quota ran out late in the session, so a few items are marked as gaps rather than verified.

---

## 1. How existing roadmaps and study plans are structured and sequenced, and which ones Indian students use for placements

### Takeaway
The lists use three kinds of structure:
- **A prerequisite DAG of about 18 pattern topics.** NeetCode has the only explicit machine-readable one.
- **A single priority-ranked list packed into weeks by a time budget.** Grind 75/169 does this with a simple, fully recoverable greedy algorithm: 1.96 × per-question minutes against 60 × hours × weeks.
- **Long linear "sheets" ordered by topic.** Striver A2Z/SDE and Love Babbar 450.

Competitive-programming ladders (A2OJ, CSES, CodeChef) sequence by rating band rather than by topic. For Indian placements, the evidence (mostly anecdotal) points to Striver's sheets and NeetCode 150 as the dominant choices, with Love Babbar 450 as the "breadth" option.

### Cited Findings

#### NeetCode roadmap: an explicit prerequisite DAG (recovered from the site's code)
- The roadmap page at neetcode.io/roadmap is a client-rendered app. Its lazy-loaded chunk defines 18 topic nodes with `parentId` arrays, which form a DAG with 21 prerequisite edges — [neetcode.io/roadmap](https://neetcode.io/roadmap), data in [roadmap chunk 6252.838a46ce34355e13.js](https://neetcode.io/6252.838a46ce34355e13.js) (my extraction, 2026-10-11). The edges, written as parent → child:
  - Arrays & Hashing → Two Pointers; Arrays & Hashing → Stack
  - Two Pointers → Binary Search; Two Pointers → Sliding Window; Two Pointers → Linked List
  - Linked List → Trees; Binary Search → Trees
  - Trees → Tries; Trees → Heap / Priority Queue; Trees → Backtracking
  - Backtracking → Graphs; Backtracking → 1-D Dynamic Programming
  - Heap / Priority Queue → Intervals; Heap / Priority Queue → Greedy; Heap / Priority Queue → Advanced Graphs; Graphs → Advanced Graphs
  - Graphs → 2-D Dynamic Programming; 1-D Dynamic Programming → 2-D Dynamic Programming
  - 1-D Dynamic Programming → Bit Manipulation
  - 2-D Dynamic Programming → Math & Geometry; Bit Manipulation → Math & Geometry
- The same chunk maps each roadmap node to NeetCode course lessons. For example, Arrays & Hashing links to "Dynamic Arrays", "Hash Usage", "Hash Implementation" and "Prefix Sums", and Linked List links to "Fast and Slow Pointers" — [roadmap chunk](https://neetcode.io/6252.838a46ce34355e13.js).
- Third-party summaries and GitHub mirrors list only the topic order, not the edges. One repo lists the 17–18 topics as a numbered sequence with no dependency links — [bhanuprasadChesetti/neetcode-dsa-roadmap](https://github.com/bhanuprasadChesetti/neetcode-dsa-roadmap). NeetCode's practice page itself says its topic list is not structured — [neetcode.io practice](https://neetcode.io/practice/practice/allNC).
- The main site bundle holds 973 problem objects, each with `pattern`, `difficulty` and list flags:
  - Blind 75: 75 problems (19 Easy / 49 Medium / 7 Hard).
  - NeetCode 150: 150 problems (28 / 101 / 21).
  - NeetCode 250: 250 problems (60 / 155 / 35).
  - 149 problems are flagged `pro`.
  - The bundle defines these list types: `neetcode150`, `neetcode250`, `blind75`, `allNC`, `coreSkills`, `companyTagged`, `systemDesign`.
  - Source: [NeetCode main bundle](https://neetcode.io/main.f39af0c52a4e9fb5.js) (my count, 2026-10-11).
- NeetCode 150 problems per pattern: Trees 15, Graphs 13, 1-D DP 12, Linked List 11, 2-D DP 11, Arrays & Hashing 9, Backtracking 9, Greedy 8, Math & Geometry 8, Stack 7, Binary Search 7, Heap/PQ 7, Bit Manipulation 7, Sliding Window 6, Advanced Graphs 6, Intervals 6, Two Pointers 5, Tries 3 — [neetcode-gh/leetcode .problemSiteData.json](https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json) (my count).

#### Blind 75 and Grind 75/169 (Tech Interview Handbook)
- The Grind 75 author also created Blind 75 and calls Blind 75 "static, non-personalized" with no priority ordering. Grind's pool is 169 questions, ranked by priority, with the top 75 forming the core list. The initial 75 contain no premium questions. Prioritization used popularity, frequency, topics and like rating, with credit to AlgoMonster's patterns and Sean Prashad's LeetCode Patterns — [Grind 75 About](https://www.techinterviewhandbook.org/grind75/about).
- FAQ design rules:
  - Easy questions come first because "they can impart core algorithmic patterns". Hard questions are deprioritized because "they usually take longer than half an hour".
  - Premium questions are placed "as far back as possible".
  - All questions are merged into one list, not grouped by topic, and split into weeks. Topics recur across weeks for spaced repetition.
  - Each question carries a recommended duration.
  - Source: [Grind 75 FAQ](https://www.techinterviewhandbook.org/grind75/faq).
- **The generator algorithm, recovered from the production bundle.** Source: [logic chunk 8a45c2bbae4d39ea.js](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/8a45c2bbae4d39ea.js) and [data chunk c5797dfbd9aea01f.js](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/c5797dfbd9aea01f.js), my reading, 2026-10-11.
  1. **Inputs:** `weeks` (slider max 26, default 8), `hours` per week (slider max 40, default 8), selected difficulties, and selected topics. Options are mode "Based on Preferences" or "View All Questions"; order "All Rounded" (priority), "Order by Difficulty" or "Order by Topics"; and grouping None, Weeks, Topics or Difficulty. The code defaults are order = `difficulty` and grouping = `weeks`.
  2. **Selection:** sort all 169 by `priority` (tiers 0–10). Walk the list, skipping questions whose difficulty or topic is deselected. Subtract `1.96 × duration` from a budget of `60 × hours × weeks` minutes, and stop at the first question that would make the budget negative.
  3. **Ordering:** re-sort the selection by the chosen order. "Topics" uses a fixed topic rank: array, string, matrix, binary-search, graph, binary-search-tree, binary-tree, hash-table, recursion, linked-list, stack, queue, heap, trie, dynamic-programming, binary, math.
  4. **Week packing:** greedy fill against a weekly cap of `60 × hours` minutes. A new week starts when the next question's `1.96 × duration` would overflow, except that the last week absorbs any overflow. The total shown is `ceil(Σ 1.96 × duration / 60)` hours.
- **Grind dataset fields:** `slug`, `title`, `url`, `duration`, `epi`, `difficulty`, `premium`, `frequency`, `likes`, `companies`, `leetCodeScore`, `priority`, `id`, `topic`, `routines`. `routines` are pattern tags such as two-pointers, sliding-window, topo-sort, union-find and monotonic-stack.
- **Grind dataset counts:** 169 questions = 41 Easy / 102 Medium / 26 Hard, of which 12 are premium. Recommended durations by difficulty:
  - Easy: 15 or 20 minutes (one outlier at 30), mean 18.2.
  - Medium: 20–35 minutes (one at 45), mean 27.8.
  - Hard: 30–45 minutes, mean 38.1.
  - Source: [data chunk](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/c5797dfbd9aea01f.js) (my analysis).
- **Simulating the extracted logic** ([data chunk](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/c5797dfbd9aea01f.js), my simulation):

  | Settings | Questions selected | Split (Easy / Medium / Hard) |
  |---|---|---|
  | 8 weeks × 8 h (default) | 75, identical to the top 75 by priority | 24 / 42 / 9 |
  | 4 weeks × 8 h | 41 | 18 / 23 / 0 |
  | 12 weeks × 10 h | 137 | 34 / 87 / 16 |
  | 2 weeks × 10 h | 27 | 15 / 12 / 0 |

  - The first 75 total 1,935 recommended minutes. With the 1.96 multiplier that is about 3,793 minutes, just under the 3,840-minute 8×8 budget.
  - At the 8×8 default, week 1 is 13 Easy questions: Two Sum, Valid Parentheses, Merge Two Sorted Lists, and so on.
  - A Blind user reported the 8×8 default as 26 Easy / 40 Medium / 9 Hard ([Blind post](https://www.teamblind.com/post/grind-75-customize-gcpbvi6a)). That differs slightly from my 24/42/9 on the live bundle, possibly an older list version.
- I found no public repository containing the generator source. The Tech Interview Handbook repo is MIT-licensed with about 143k stars ([GitHub API: yangshun/tech-interview-handbook](https://api.github.com/repos/yangshun/tech-interview-handbook)), but my searches did not locate the Grind app source in it ([search summary](https://www.techinterview.org/post/3233476075/coding-interview-study-plan-around-your-schedule/)).

#### Striver (takeUforward) A2Z and SDE sheets
- **A2Z sheet syllabus order:** Beginner Problems, Sorting, Arrays, Hashing, Binary Search, Strings (Basic and Medium), Recursion, Linked-List, Bit Manipulation, Greedy Algorithms, Sliding Window / 2 Pointer, Stack / Queues, Binary Trees, Binary Search Trees, Heaps, Graphs, Dynamic Programming, Tries, Strings (Advanced Algo), Maths.
  - The page says the sheet offers "a clear sequence in which every concept prepares you for the next". It targets beginners, "college students preparing for placements" and developers, and estimates about 6 months.
  - The page's counts are internally inconsistent: it shows "20 modules, 495 topics, 16 contests, 131.4 hours" and also "~450 learning items", "400+ practice problems" and "19 modules".
  - Source: [takeUforward A2Z](https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z).
- An aggregator says the official tracker lists 474 problems (152 Easy / 186 Medium / 136 Hard) as of August 2026, and that the 450/453/455 figures are outdated — [PracHub](https://prachub.com/resources/is-striver-s-a2z-dsa-sheet-enough-for-coding-interviews-in-2026). This is a secondary source.
- The Striver SDE Sheet page now shows "179 problems across 17 modules" and 64.1 hours, grouped by pattern within topics. It is aimed at learners who know the basics, "college students preparing for placements", and developers revising — [takeUforward SDE sheet](https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems).

#### Love Babbar 450
- 450 questions in 15 sections: Arrays, Matrix, Strings, Searching and Sorting, LinkedList, Bit Manipulation, Greedy, Backtracking, Dynamic Programming, Stacks and Queues, Binary Trees, BST, Graphs, Heap, Trie.
- Aimed at placements and technical interviews, as "the questions generally asked in the companies like Amazon, Microsoft, Google". The page says it "can be completed within 2-3 months without any cheat day" and marks some items "[V.IMP]".
- Source: [GeeksforGeeks: DSA Sheet by Love Babbar](https://www.geeksforgeeks.org/dsa/dsa-sheet-by-love-babbar/).

#### LeetCode study plans
- LeetCode's launch post for its 75-question plan describes "two levels of the 75 best questions", aimed at people preparing for interviews "in 2 months or less" — [LeetCode Discuss](https://leetcode.com/discuss/study-guide/2163754/study-plan-75-questions-till-interview-ready/). This post may describe an older plan version.
- Top Interview 150 is described only as "a collection of 150 top interview questions" in third-party sources — [GitHub example](https://github.com/Kalutu/leetcode-solutions).

#### Pattern-first curricula (AlgoMonster, Grokking, Sean Prashad)
- AlgoMonster's flagship is "Core Patterns", described as "Our flagship pattern-based learning experience". It also offers an "Algorithm selection flowchart" ("Decision Tree to Solve LeetCode Problems") and lookups by complexity requirement or by keywords in the problem statement — [algo.monster/flowchart](https://algo.monster/flowchart).
- Sean Prashad's LeetCode Patterns is "heavily inspired" by Grokking the Coding Interview, adding problems from Blind 75 and a HackerNoon article on 14 patterns — [seanprashad/leetcode-patterns](https://github.com/seanprashad/leetcode-patterns).

#### roadmap.sh
- The AI generator page only exposes "enter a topic to generate a roadmap" plus community AI roadmaps. Its personalization mechanics are not documented on the page — [roadmap.sh/ai](https://roadmap.sh/ai) (search summary; a direct fetch showed only a loading state).
- The underlying repo has about 369k stars and a custom (NOASSERTION) license — [GitHub API: kamranahmedse/developer-roadmap](https://api.github.com/repos/kamranahmedse/developer-roadmap).

#### Competitive-programming ladders
- **A2OJ ladders** were built from data:
  - Start from more than 80,000 rated Codeforces users, and keep 700 who showed steady rating growth over 1–2 years with at least 20 rated contests and at least 150 practice solves.
  - For each rating range, take the 100 problems most commonly solved by those users while in that range, sorted by a computed difficulty.
  - Later "extra" ladders added 200 harder, non-overlapping problems per range.
  - A2OJ has shut down; a static copy remains. A community rebuild ("C2 ladders") uses Codeforces problem ratings.
  - Sources: [ahmed_aly, Codeforces blog](https://codeforces.com/blog/entry/47442); ["More new and hopefully helpful ladders on A2OJ"](https://codeforces.com/topic/47663/?locale=en); ["Extra A2OJ Ladders"](https://codeforces.net/topic/57101/en1); [C2 ladders topic](https://mirror.codeforces.com/topic/100513/en3). These come via a search summary, and I could not tell which of the first three posts holds which detail.
- **CSES Problem Set:** 400 problems across 18 topic sections, from Introductory (24) and Sorting and Searching (35) to Additional Problems I/II (30 each). The page gives no explicit difficulty ordering — [cses.fi/problemset](https://cses.fi/problemset/).
- **CodeChef:** profile pages show "Practice Paths" grouped by numeric difficulty bands (for example "1600 to 1800 difficulty problems" and "500 difficulty rating") and topic "Learning Paths" (Linked Lists, Time complexity, Arrays/Strings/Sorting) — [example CodeChef profile](https://www.codechef.com/users/iaadi7). This is weak, indirect evidence.

#### What Indian students use for placements (evidence is anecdotal)
- takeUforward explicitly targets "college students preparing for placements" with both A2Z and SDE ([A2Z](https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z), [SDE](https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems)). The GfG Love Babbar page targets placements and interviews ([GfG](https://www.geeksforgeeks.org/dsa/dsa-sheet-by-love-babbar/)).
- Reddit threads, read via a mirror, are anecdotal and dated 2024–2025 — [r/leetcode thread](https://redlib.hbubli.cc/r/leetcode/comments/1fe8gqb/best_way_to_learn_dsa); [r/leetcode thread](https://redlib.hbubli.cc/r/leetcode/comments/1kryc3x/dsa_in_java_best_resourse). They say:
  - "Neetcode 150 [and] Striver's sheet are more than enough" for placements.
  - Striver's sheet feels "too big" for someone with a full-time job.
  - NeetCode 150 is preferred for short timelines.
  - Babbar 450 is cited for breadth.

### Inferences
- NeetCode's 18-node, 21-edge DAG is the best ready-made concept graph for the interview track. It is explicit and widely known, and its node names match the `pattern` labels on 973 NeetCode problems. Our Python-fundamentals nodes (I/O, loops, strings, lists, functions, recursion basics, complexity) should sit upstream of "Arrays & Hashing", since NeetCode assumes them.
- Grind's generator can be reproduced in about 30 lines: priority-sorted greedy knapsack against `60·H·W`, then greedy week packing. The 1.96 multiplier implies roughly 2× the "solve time" per question in real study time.
- For Indian placement users, the roadmap UI should speak in familiar names: "Striver-style topic order", "NeetCode 150", "Blind 75". The Striver and NeetCode orders broadly agree (arrays → hashing → binary search → strings → linked list → stack/queue → trees → heaps → graphs → DP), so our DAG will look familiar.
- CP-style rating ladders (A2OJ, CodeChef bands) suit a "competitive programming" goal. Topic DAGs suit "placements/interviews".

### Gaps
- I could not see LeetCode 75 or Top Interview 150 section structures on leetcode.com (pages are client-rendered or blocked).
- I could not verify how roadmap.sh's AI generator personalizes. The page is client-rendered and undocumented.
- There is no survey data on which sheet Indian students actually use. All popularity evidence is anecdotal or vendor-stated.
- Striver's official problem counts conflict across the page and secondary sources (474 vs "400+" vs older 455).
- The Grind data and code are read from production bundles. Their license (separate from the MIT handbook repo) is unclear.

---

## 2. Problem-difficulty datasets and concept/pattern mappings: coverage, update cadence, licenses

### Takeaway
Numeric difficulty data is plentiful for contest problems:
- zerotrac's LeetCode ratings: 2,608 problems, MIT, updated weekly.
- Codeforces ratings: 11,152 rated problems via the public API.
- AtCoder Problems IRT models: 4,882 problems.

But zerotrac covers almost none of the classic interview lists: 0% of Blind 75, 11% of NeetCode 150, 8% of Grind 169. So CodeQuest needs label-based rating priors for external problems, which my analysis puts at roughly Easy ≈ 1250, Medium ≈ 1600–1650, Hard ≈ 2050–2100. It should then learn its own item difficulties.

For problem → pattern mappings:
- NeetCode's GitHub data (MIT) is the cleanest legally.
- Sean Prashad's list is richer (including company frequencies) but CC BY-NC 4.0.

### Cited Findings

#### zerotrac/leetcode_problem_rating (LeetCode contest problems)
- The README describes a "self-calculated rating of problems in leetcode weekly/biweekly contests". The backend uses an "Elo rating system as well as Maximum likelihood estimation", is "not a 100% accurate result, but sufficient for evaluating the relative difficulty". The backend is not open-sourced, to avoid potential terms violations. Data comes from web crawlers. Weekly contests 1–62 are excluded, and ratings are "updated every week after the contest(s)" — [zerotrac README](https://github.com/zerotrac/leetcode_problem_rating).
- License: MIT, "Copyright (c) 2021 Shuxin Chen" — [LICENSE](https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/LICENSE). The repo has 698 stars ([GitHub API](https://api.github.com/repos/zerotrac/leetcode_problem_rating)).
- It is actively maintained. The latest auto-commit is 2026-10-10, "(auto-commit) Add weekly-contest-522", and the previous one is 2026-10-03, "Add weekly-contest-521 and biweekly-contest-192" — [commits API](https://api.github.com/repos/zerotrac/leetcode_problem_rating/commits).
- **`data.json` contents** ([data.json](https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json), my analysis, 2026-10-11):
  - 2,608 problems with fields `Rating`, `ID`, `Title`, `TitleZH`, `TitleSlug`, `ContestSlug`, `ProblemIndex` (Q1–Q4), `ContestID_en`, `ContestID_zh`.
  - Problem IDs range from 746 to 4073.
  - Ratings run from 1084 to 3125, with a median of 1662.

  | Contest slot | Median rating | 10th–90th percentile |
  |---|---|---|
  | Q1 | 1255 | 1166–1406 |
  | Q2 | 1504 | 1326–1753 |
  | Q3 | 1841 | 1557–2186 |
  | Q4 | 2247 | 1915–2646 |

- `ratings.txt` holds the same data as TSV (Rating, ID, Title, Title ZH, Title Slug, Contest Slug, Problem Index), sorted descending — [ratings.txt](https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt).
- **Coverage of curated lists by zerotrac ratings** (my join on slug of [zerotrac data](https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json) with the [NeetCode bundle](https://neetcode.io/main.f39af0c52a4e9fb5.js), the [Grind data](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/c5797dfbd9aea01f.js) and [Sean Prashad's questions.json](https://raw.githubusercontent.com/seanprashad/leetcode-patterns/main/src/data/questions.json)):

  | List | Problems | zerotrac-rated |
  |---|---|---|
  | Blind 75 | 75 | 0 (0%) |
  | NeetCode 150 | 150 | 16 (11%) |
  | NeetCode 250 | 250 | 52 (21%) |
  | Grind 169 | 169 | 13 (8%) |
  | Sean Prashad | 179 | 15 (8%) |
  | All NeetCode-site problems | 973 | 495 (51%) |

- **LeetCode label vs zerotrac rating**, among the 495 rated NeetCode-site problems (same sources, my analysis):

  | Label | n | Median | Interquartile range |
  |---|---|---|---|
  | Easy | 106 | 1247 | 1208–1307 |
  | Medium | 306 | 1635 | 1468–1786 |
  | Hard | 83 | 2084 | 1957–2268 |

#### Codeforces
- The public `problemset.problems` API returns 11,442 problems, of which 11,152 carry a `rating`. Ratings span 800–3500 with a median of 1800. There are 38 distinct `tags`; the most common are greedy 3,585, math 3,518, implementation 3,066, dp 2,542, constructive algorithms 2,132 and data structures 2,060. `problemStatistics` gives `solvedCount` — [Codeforces API problemset.problems](https://codeforces.com/api/problemset.problems) (my analysis, 2026-10-11).
- The exact formula for the rating is unpublished. Community analyses treat it as the rating at which a contestant has about a 50% chance of solving the problem in-contest, estimated by maximum likelihood, by binary search over rating buckets, or by inverting an Elo curve, `D = 400·log10((1−p)/p) + R`. These blogs note skew from contestants who skip problems — [Codeforces blog 89276](https://codeforces.com/blog/entry/89276); [Codeforces blog 89567](https://codeforces.com/blog/entry/89567); [Codeforces blog 132783](https://codeforces.com/blog/entry/132783). These are community estimates from a search summary, and I could not tell which blog holds which method. A separate thread notes there is no official mapping between AtCoder and Codeforces scales — [Codeforces blog 88244](https://codeforces.com/blog/entry/88244).

#### AtCoder Problems (kenkoooo)
- Definition: difficulty "indicates that a person with the current internal rating (unadjusted rating) would have a 50% chance of solving the problem in a contest". Problems marked 🧪 have estimates made with "somewhat forceful methods for problems before the official rating system was introduced" — [AtCoder Problems guide](https://kenkoooo.com/atcoder/book/en/misc.html).
- **The model file** ([problem-models.json](https://kenkoooo.com/atcoder/resources/problem-models.json), my analysis):
  - 5,168 problem entries; 4,882 have IRT-style `difficulty` and `discrimination` plus `irt_loglikelihood` and `irt_users`.
  - 4,666 also have `slope`, `intercept` and `variance`.
  - 565 are flagged `is_experimental: true`.
  - Raw difficulties can be negative; for example abc138_a is −848.
- A userscript copying the frontend clips displayed values below 400 as `round(400 / e^(1 − d/400))` — [Greasy Fork AtCoder difficulty display](https://greasyfork.org/ja/scripts/397185-atcoder-difficulty-display/code). This is not confirmed from the repo.
- The AtCoderProblems repo is MIT-licensed — [GitHub API](https://api.github.com/repos/kenkoooo/AtCoderProblems).

#### LeetCode acceptance rate and topicTags
- LeetCode exposes topic tags and problem lists through its undocumented `leetcode.com/graphql` endpoint. The MIT wrapper `alfa-leetcode-api` exposes `/tags`, `/problems?limit&skip&tags&difficulty` and `/select?titleSlug=…`, adds its own rate limit, and recommends local use — [alfaarghya/alfa-leetcode-api](https://github.com/alfaarghya/alfa-leetcode-api).
- LeetCode's Terms forbid "crawling," "scraping," or "spidering" any part of the Service and state that content is LeetCode's exclusive property, "copyrighted under United States copyright laws" — [LeetCode Terms](https://leetcode.com/terms). This comes via a search-result excerpt; a direct fetch returned HTTP 403.

#### Problem → pattern mappings (open data)
- **NeetCode (MIT):**
  - `.problemSiteData.json` in the official repo has 450 entries with fields `problem`, `pattern`, `link`, `video`, `difficulty`, `premium`, `freeLink`, `blind75`, `neetcode150`, plus per-language code flags.
  - It has 19 pattern labels: the 18 roadmap topics plus "JavaScript".
  - It carries no `neetcode250` flags; those exist only in the site bundle.
  - The file was last modified 2025-08-03.
  - The license is "MIT License, Copyright (c) 2022 neetcode-gh".
  - Sources: [.problemSiteData.json](https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json); [LICENSE](https://raw.githubusercontent.com/neetcode-gh/leetcode/main/LICENSE); [commits API for the file](https://api.github.com/repos/neetcode-gh/leetcode/commits?path=.problemSiteData.json&per_page=1).
- **Sean Prashad, LeetCode Patterns:**
  - `questions.json` (updated 2026-10-04) holds 179 questions with `id`, `title`, `slug`, `pattern` (a list of LeetCode-style tags such as Array, Hash Table, Sliding Window, Union-Find, Topological Sort), `difficulty`, `premium` and `companies`.
  - `companies` is a list of `{name, slug, frequency}`. For example, Two Sum lists Google 218, Amazon 82 and Meta 39.
  - License: "Creative Commons Attribution-NonCommercial 4.0 International". The repo has 14,158 stars.
  - Sources: [questions.json](https://raw.githubusercontent.com/seanprashad/leetcode-patterns/main/src/data/questions.json); [LICENSE](https://raw.githubusercontent.com/seanprashad/leetcode-patterns/main/LICENSE); [GitHub API](https://api.github.com/repos/seanprashad/leetcode-patterns).
- **Grind 169:** carries `topic` plus `routines` (pattern) tags, `duration` and `priority`. It lives in the website bundle with no explicit data license — [Grind data chunk](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/c5797dfbd9aea01f.js).

### Inferences
- zerotrac ratings are excellent for "next harder problem" suggestions among post-2018 contest problems: 2,608 items, a weekly refresh, MIT. They cannot rate the canonical interview lists. Use label priors of Easy 1250, Medium 1625 and Hard 2075 for unrated LeetCode items, and override with zerotrac where a slug matches.
- Because zerotrac, Codeforces and AtCoder all define difficulty roughly as "50% solve chance at rating R", a single Elo-400 scale is a sensible common currency: `P = 1/(1+10^((d−θ)/400))`. Our own challenges can be placed on this scale and calibrated from attempts. zerotrac's README does not state its probability anchor, so treating it as 50% is an assumption.
- Licensing-safe stack for a hackathon demo:
  - NeetCode GitHub JSON (MIT) for pattern, list membership and labels.
  - zerotrac (MIT) for ratings.
  - Grind durations only as reference values: re-derive the per-label means (18 / 28 / 38 minutes) rather than copying the dataset.
  - Sean Prashad (CC BY-NC) only with attribution and only while non-commercial.
- Store only slug, title, URL and metadata for LeetCode problems, and link out. Never copy statements.

### Gaps
- I found no published analysis correlating LeetCode acceptance rate with zerotrac ratings, so I cannot say how good acceptance rate is as a difficulty proxy. I also did not pull acceptance data myself, to respect LeetCode's no-scraping terms.
- zerotrac's exact probability semantics and method details are unknown because the backend is closed.
- There is no open, licensed dataset mapping all ~3,000+ LeetCode problems to patterns. NeetCode's site covers 973 problems, but its GitHub file covers 450.

---

## 3. Personalization algorithms: prerequisite graphs and KST, ZPD/target success rates, Elo/IRT selection, adaptive-placement length, spaced repetition, interleaving

### Takeaway
A simple, proven stack is:
1. A prerequisite graph with ALEKS-style "ready-to-learn" fringes.
2. Elo ratings with an uncertainty-decaying K (Pelánek: `K = a/(1+b·n)`, a=1, b=0.05 in logit units), plus a multivariate update to related concepts.
3. Item selection toward a target success rate of roughly 65–85%. Easy early to "hook" learners, harder later for learning and long-term engagement.
4. An adaptive placement of about 8–12 short items with an SE or item-cap stopping rule.
5. FSRS-style review scheduling at 90% desired retention.
6. Interleaving after initial blocked introduction. Evidence for interleaving is solid in math and thin for programming.

### Cited Findings

#### Knowledge space theory and ALEKS
- ALEKS uses knowledge space theory to map which topics a student knows, then "determines the topics that the student is ready to learn". The ready-to-learn fringe is the set of concepts whose single addition yields a feasible knowledge state — [Wikipedia: ALEKS](https://en.wikipedia.org/wiki/ALEKS).
- ALEKS's practical representation is restricted to "quasi-ordinal spaces" (prerequisite partial orders), a subset of all learning spaces in Doignon and Falmagne's theory — [arXiv 0803.4030](https://arxiv.org/pdf/0803.4030).
- **ALEKS Initial Knowledge Check:**
  - It is an adaptive assessment of "30 or fewer questions", where ALEKS "chooses each question based on the student's answers to all the previous questions", aiming to determine what the student knows, doesn't know, and "is ready to learn" — [McGraw Hill: What is an ALEKS Knowledge Check?](https://www.mheducation.com/support/aleks-support-center/knowledge/what-is-a-knowledge-check.html).
  - A college handout says 20–30 questions in one sitting — [Montgomery College ALEKS instructions](https://advocate.montgomerycollege.edu/_documents/academics/departments/chemistry-rockville/instructions-for-getting-started-in-aleks.pdf).
  - ALEKS Adventure (K-3) caps at 9 (K) or 14 (grades 1–3) questions and ends early after five incorrect answers — [ALEKS Adventure Knowledge Checks](https://www.mheducation.com/prek-12/support/knowledge/aleks-adventure-knowledge-checks).

#### Elo for adaptive learning (Pelánek 2016, Computers & Education)
Source for every point in this subsection: [Pelánek 2016, accepted manuscript](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf).
- **Core model:** `P(correct) = 1/(1+e^−(θs−di))`. Updates are `θs := θs + K·(correct − P)` and `di := di + K·(P − correct)`. Initial values are 0.
- **Relation to IRT:** the model has the Rasch (1PL) functional form but uses heuristic online updates and is designed to track changing skill.
- **Multiple choice:** `P = 1/k + (1 − 1/k)/(1+e^−(θ−d))` corrects for guessing.
- **Uncertainty function instead of a constant K:** prior work used `K = 0.4`. The recommended starting point is `U(n) = a/(1+b·n)` with a = 1 and b = 0.05, found by grid search; the paper notes "many different choices of a, b provide very similar results". It "provides both fast coarse estimates after few answers and stability in the long run".
- **Multivariate extension for correlated knowledge components:** `θsj := θsj + cij·K·(correct − P)`, applied to all skills j after an answer on component i. Hierarchical skill models give statistically significant but small accuracy gains.
- **Problem-solving times** can replace correctness: `E(t|s,p) = dp − θs` on log-time, with `θs := θs + K(E − t)`. Times are log-normally distributed.
- **Math Garden's "high speed, high stakes" score:** `S = (2·correct − 1)(a·d − a·t)`.
- **Adding content:** a new item starts at difficulty 0, and the system "learns the item difficulty from students' answers". The paper says this requires expert input "neither for domain knowledge nor for implementation".
- **Caveat:** when items are chosen adaptively from current Elo ratings, the ratings fail to converge. A 2025 paper proposes running two parallel rating chains — [Tilburg University: Keeping Elo alive](https://research.tilburguniversity.edu/en/publications/keeping-elo-alive-evaluating-and-improving-measurement-properties/).

#### Target difficulty / zone of proximal development
- **Papoušek, Stanislav and Pelánek's randomized experiment** in an adaptive geography practice system — [Papoušek et al. 2016](https://www.fi.muni.cz/~xpelanek/publications/its-target-difficulty.pdf):
  - Conditions targeted error rates of 5%, 20%, 35% and 50%; that is, 95–50% success.
  - Data: about 3.3M answers from about 37,000 learners, collected November 2015 to January 2016.
  - Survival after 10 answers favoured easy questions: C5 89.2%, C20 87.0%, C35 84.0%, C50 81.2% (±0.77). By 100 answers it was about equal (26.0–26.5%).
  - Return rate rose with difficulty: C5 15.2%, C20 16.0%, C35 16.6%, C50 16.8% (±0.75).
  - Learning, measured by the power-law learning rate on reference questions, was better with harder questions, "the main difference being between very simple questions and others".
  - Recommendation: "start with easy questions 'to hook learners up' and then switch to more difficult questions". The authors warn against optimizing short-term engagement alone.
- The same group's production system uses "a target success rate (e.g., 75 %)" and constructs questions so achieved performance stays near target — [Pelánek 2016](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf).
- **Contrasting result:** a Math Garden study comparing three difficulty conditions found "the easiest condition led to the best learning (mediated by a number of solved tasks)". Papoušek et al. attribute the difference to procedural math vs declarative geography — [Papoušek et al. 2016](https://www.fi.muni.cz/~xpelanek/publications/its-target-difficulty.pdf). A search summary reported the Math Garden targets as 60/75/90% success; I did not verify that in the original paper.
- **"Eighty Five Percent Rule":** for gradient-descent learners on binary classification, the optimal training error is about 15.87%, or about 85% accuracy. It was demonstrated on artificial and "biologically plausible" neural networks, not on human coding practice — [Wilson et al. 2019, Nature Communications](https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579).

#### Computerized adaptive placement: how many items
- The NIH Toolbox CAT stopped once SE < 0.3, with a 12-item cap. Fixed-length CATs of 8 or fewer items "notably increased" the share of assessments with reliability below 0.85 — [JMIR/PMC 11951945](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11951945/).
- The R package catR documents combined stopping rules such as a 20-item maximum plus an SE threshold of 0.3 — [catR checkStopRule](https://rdrr.io/cran/catR/man/checkStopRule.html).
- Duolingo's placement test is adaptive: "after every question, your skill level is estimated, and the next question is chosen based on this new estimate". It starts by assuming the learner is a novice, and at the end unlocks skills it judges already known — [Duolingo blog](https://blog.duolingo.com/partial-credit-improvements-to-duolingos-placement-test/).

#### Spaced repetition for problems (FSRS and LeetCode tools)
- **FSRS via py-fsrs (MIT):**
  - It estimates "retrievability", the probability of recall.
  - Ratings are Again, Hard, Good and Easy.
  - `desired_retention` defaults to 0.9; a card is due when predicted recall falls to 90%.
  - The scheduler uses 21 weights, which an optimizer can fit from review logs.
  - Defaults include learning steps of 1 and 10 minutes and a maximum interval of 36,500 days.
  - Source: [open-spaced-repetition/py-fsrs](https://github.com/open-spaced-repetition/py-fsrs).
- **LeetSRS** is an MIT browser extension using TS-FSRS with a daily review queue: "solve a problem, rate your recall, review when due". It has 28 stars and was last pushed 2026-10-09 — [mattcdrake/LeetSRS](https://github.com/mattcdrake/LeetSRS); [Firefox add-on](https://addons.mozilla.org/en-US/firefox/addon/leetsrs/).
- **Other tools** ([Show HN dsaprep](https://hn.svelte.dev/item/45436942)):
  - SpacedLeet surfaces previously failed problems more often.
  - Leet Cache stores notes to compare at review.
  - SteffanA/leetcode-srs is self-hosted.
  - dsaprep.dev uses fixed intervals that vary by difficulty, not FSRS.

#### Interleaving vs blocked practice
- Grade 7 math (n = 140, nine weeks, unannounced test two weeks later): interleaved practice scored 72% vs 38% for blocked — [Rohrer et al., Psychonomic Bulletin & Review](https://link.springer.com/article/10.3758/s13423-014-0588-3).
- A year-long randomized study in 62 Nigerian classrooms found +0.29 SD on short-term retention tests but no evidence of improvement on a cumulative year-end assessment — [EdWorkingPapers ai23-876](https://edworkingpapers.com/ai23-876).
- A 2025 preliminary RCT (n = 239) found interleaved > blocked, g = .11, not significant (underpowered) — [CogSci 2025](https://journalpub.escholarship.org/cognitivesciencesociety/article/50407/galley/38369/download).
- The only programming-specific result I found is a 2020 Berkeley master's project reporting that interleaving worked best for a programming task. It is not peer-reviewed — [UC Berkeley MIMS 2020](https://www.ischool.berkeley.edu/projects/2020/statistical-analysis-procedural-learning-blocked-vs-interleaved-humans).
- Grind 75 deliberately recurs topics across weeks "by doing questions across a variety of topics each week, and revisiting the topic again in subsequent weeks" — [Grind 75 FAQ](https://www.techinterviewhandbook.org/grind75/faq).

### Inferences
- **Use Elo, not full IRT.** It needs one number per learner-concept and per item, updates online, adds new items at a default difficulty, and is trivially deterministic. In the Elo-400 scale, Pelánek's `a = 1` logit becomes `K0 ≈ 400/ln10 ≈ 174` rating points, so `K(n) = 174/(1+0.05·n)`.
- **To avoid the non-convergence trap,** only calibrate item difficulty on our own challenges, where hidden tests give verified outcomes. Hold external LeetCode item difficulty fixed at its zerotrac rating or label prior.
- **Target success:** 0.85 for a new learner's first session and after two consecutive failures; 0.75 in steady state; 0.65 for an explicit "stretch" slot. Programming problems are procedural and costly per item, closer to Math Garden than to geography, which argues against the 50% end.
- **Placement:** short "micro-items" (predict-the-output, spot-the-bug, fill-the-blank, 1–3 minutes each) let an 8–12-item CAT finish in about 10–15 minutes. Full coding tasks of 15–45 minutes are too slow for placement. KST inference along the DAG cuts items further: a success implies likely mastery of ancestors, and a failure implies likely non-mastery of descendants.
- **Practice order:** introduce a new concept with 2–3 blocked items, then interleave it with earlier concepts and due reviews. This matches Grind's topic recurrence and the interleaving evidence, which favours delayed retention.

### Gaps
- I found no rigorous study of interleaving or spaced repetition specifically for solving algorithmic coding problems. The evidence is from math, motor learning and flashcards.
- I found no published validation of what target success rate optimizes learning for programming exercises.
- I could not verify Duolingo's placement item count, or its psychometric model by name.
- I found no evidence on how accurately self-reported LeetCode outcomes ("I solved it") reflect skill.

---

## 4. Onboarding and placement in comparable products; necessary vs excessive personal data; DPDP Act 2023 and Rules 2025

### Takeaway
Comparable products ask very little up front: goal, time available, and a level estimate or check. They then rely on adaptive placement or "jump ahead" tests rather than personal data. Grind needs only weeks and hours per week.

DPDP points toward collecting only what the stated purpose needs, with an itemised plain-language notice. Under-18 users trigger verifiable parental consent and a ban on tracking or behavioural monitoring, which adaptive skill tracking may arguably count as. So CodeQuest should age-gate at 18+ and collect no identity data beyond a login.

### Cited Findings

#### What products ask and how they place learners
- **Grind 75:** inputs are weeks (≤26, default 8), hours per week (≤40, default 8), difficulties and topics — [Grind logic chunk](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/8a45c2bbae4d39ea.js); [About](https://www.techinterviewhandbook.org/grind75/about).
- **Duolingo:**
  - The placement test is adaptive and starts at novice. The partial-credit update grades by mistake categories and challenge type, and the author admits the correctness scores were "pretty much pulled out of thin air" pending fitting on real data — [Duolingo blog](https://blog.duolingo.com/partial-credit-improvements-to-duolingos-placement-test/).
  - "Jump Here" lets a learner test out of a unit and move ahead if they pass — [Lumetest](https://lumetest.com/blog/det/the-duolingo-placement-test-what-to-know-about-it). This is a secondary source.
- **Khan Academy:**
  - Each skill is worth 100 Mastery Points. Under the 2018 beta, Familiar earns 50 and Proficient earns 80 — [Khan help](https://support.khanacademy.org/hc/en-us/articles/115002552631); [Khan community post](https://support.khanacademy.org/hc/fr/community/posts/115001845151/comments/115001154812).
  - Quizzes and unit tests can move a skill up multiple levels or down. Practice mistakes do not cost points.
  - A "Course Challenge" samples skills across the whole course. There is no standalone placement test; users take course challenges or unit tests to gauge level — [Khan community thread](https://support.khanacademy.org/hc/nl/community/posts/115006547167-Placement-Test?page=2).
- **ALEKS:** placement is an adaptive Initial Knowledge Check of 30 or fewer questions — [McGraw Hill](https://www.mheducation.com/support/aleks-support-center/knowledge/what-is-a-knowledge-check.html).
- **Brilliant:**
  - A third-party teardown describes a roughly 12-step onboarding that captures profile and goals before the paywall — [ScreensDesign](https://screensdesign.com/showcase/brilliant-learn-by-doing).
  - Brilliant's family course-placement guide relies on a level check plus a jump-ahead option — [Brilliant course placement guide](https://brilliant.org/help/parents-and-families/course-placement-guide/).
  - Its adaptive approach "meets you at your current level" — [brilliant.org/llms.txt](https://brilliant.org/llms.txt) (via search summary).

#### DPDP Act 2023 and DPDP Rules 2025 (primary texts)
- **Timeline:**
  - Parliament enacted the Act on 11 August 2023.
  - The Rules were notified on 14 November 2025 after 6,915 consultation inputs and introduce "an eighteen-month period for phased compliance" — [PIB explainer, 17 Nov 2025](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf).
  - The Gazette is dated 13 November 2025 (G.S.R. 846(E)). Rules 1, 2 and 17–21 took effect on publication. Rule 4 (Consent Managers) takes effect one year after publication. Rules 3, 5–16, 22 and 23 take effect eighteen months after publication, covering notice, security, breach, children and erasure — [DPDP Rules 2025, Gazette](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
  - By my arithmetic, those core duties apply from about May 2027, so they are not yet in force on 11 Oct 2026.
- **Seven principles:** "consent and transparency, purpose limitation, data minimisation, accuracy, storage limitation, security safeguards and accountability" — [PIB explainer](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf).
- **Minimisation in the Act, s.6(1):** consent must be "free, specific, informed, unconditional and unambiguous with a clear affirmative action" and "limited to such personal data as is necessary for such specified purpose" — [DPDP Act 2023](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf).
- **Notice, Rule 3:** the notice must be understandable on its own and must at minimum give "an itemised description of such personal data" and the "specified purpose or purposes", plus the means to withdraw consent and exercise rights — [DPDP Rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
- **Children:**
  - A "child" is anyone who has not completed 18 years (s.2(f)).
  - Fiduciaries must obtain "verifiable consent of the parent" before processing a child's data (s.9(1)).
  - They must not process in ways likely to harm a child's well-being (s.9(2)).
  - They "shall not undertake tracking or behavioural monitoring of children or targeted advertising directed at children" (s.9(3)).
  - Source: [DPDP Act](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf).
- **Rule 10, parental consent mechanics:** due diligence that the parent is an identifiable adult, using reliable identity and age details already held, details voluntarily provided, or a "virtual token" from an authorised entity, including a Digital Locker provider — [DPDP Rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
- **Exemptions (Rule 12, Fourth Schedule):**
  - Part A item 3 exempts an "educational institution", defined as "an institution of learning that imparts education, including vocational education". The processing must be "restricted to tracking and behavioural monitoring (a) for the educational activities of such institution; or (b) in the interests of safety of children enrolled with such institution".
  - Part B item 6 permits processing "for confirmation by the Data Fiduciary that the Data Principal is not a child", restricted to what is necessary. That allows an age gate.
  - Source: [DPDP Rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
  - Commentators read the exemptions as "narrow, purpose-bound" and not usable for "analytics, profiling, or monetisation" — [Tsaaro](https://tsaaro.com/blogs/regulatory-carve-outs-examining-exemptions-under-the-dpdp-act-2023-and-dpdp-rules-2025).
  - The PIB summary says parental consent is needed "unless the processing relates to essential services such as healthcare, education or real-time safety" — [PIB explainer](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf).
- **Retention:** the Third Schedule's three-year inactivity erasure applies to named large classes, for example "an e-commerce entity having not less than two crore registered users in India" — [DPDP Rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
- **Rights and penalties:**
  - Rights requests (access, correction, erasure) must be answered within 90 days.
  - Penalties reach up to ₹250 crore for security-safeguard failures, and up to ₹200 crore each for breach-notification failures and for violating children's obligations. Other violations carry up to ₹50 crore.
  - Source: [PIB explainer](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf).

### Inferences
- **Necessary for the roadmap purpose:**
  - goal
  - timeline (weeks)
  - hours per week
  - self-assessed level
  - topic comfort (optional)
  - LeetCode Premium yes/no, to filter premium problems
  - an 18+ confirmation
  - performance logs (attempts, outcomes, mistake tags, timings)
- **Excessive for that purpose:** full name, phone, date of birth (a yes/no 18+ gate is enough), gender, college, CGPA/marks, resume or LinkedIn, precise location, specific target-company lists, and a LeetCode username used for scraping.
- Adaptive skill tracking plus a mistake profile plausibly counts as "behavioural monitoring" of a child. A student hackathon app is unlikely to qualify as an "educational institution" under the Fourth Schedule unless deployed by a college. The safest design is therefore an 18+ gate, plus a "guest/demo mode" that stores data only in the browser for under-18 or unwilling users. Many first-year Indian undergraduates are 17, so this matters for a college product. This is a legal inference, not legal advice.
- Even though Rules 3, 5–16, 22 and 23 only bite around May 2027, implementing an itemised notice, a purpose statement, delete-my-data and data export now is cheap and a good judging point.

### Gaps
- My web-search quota ran out, so I could not check for any 2026 amendments, FAQs or MeitY clarifications on the timeline.
- I did not verify which Act sections were commenced on what dates. I only verified the Rules' commencement clause.
- I have no first-party documentation of Brilliant's exact onboarding questions or of Duolingo's placement length.
- Whether an online learning platform (as opposed to a college) can claim the "educational institution" exemption is untested; there is no guidance or case law I could find.

---

## 5. Company-wise problem lists: how tools build them, and what is legally safe

### Takeaway
LeetCode's company tags and frequencies are a Premium feature. Every large open "company-wise" list on GitHub is a scraped snapshot of that Premium data and carries no license, which conflicts with LeetCode's anti-scraping and copyright terms.

The safe options for a demo are:
- coarse "company type" goals rather than named-company lists, or
- Sean Prashad's CC BY-NC dataset with attribution, used non-commercially and only for its 179 problems, or
- curating our own lists from public interview-experience posts (title and link only).

### Cited Findings
- **liquidslr/leetcode-company-wise-problems:**
  - One CSV per company, built from LeetCode's company tags, with recency buckets (30, 60 and 90 days, and all time) — [OSS Insight](https://ossinsight.io/analyze/liquidslr/leetcode-company-wise-problems); [Algolia DocSearch listing](https://docsearch.algolia.com/mcp/docs/repo/liquidslr/leetcode-company-wise-problems).
  - Snapshot dates conflict across secondary sources: 1 June vs 20 June 2025.
  - The repo has about 31,349 stars, no license, and was last pushed 2026-08-16 — [GitHub API](https://api.github.com/repos/liquidslr/leetcode-company-wise-problems).
- **snehasishroy/leetcode-companywise-interview-questions:** "latest company wise questions of LeetCode as of July 2026", adding Difficulty, Acceptance % and Frequency %. About 8,324 stars, no license — [GitHub API](https://api.github.com/repos/snehasishroy/leetcode-companywise-interview-questions); [repo](https://github.com/snehasishroy/leetcode-companywise-interview-questions).
- **krishnadey30/LeetCode-Questions-CompanyWise:** about 20,261 stars, no license, last pushed 2024-06-23 — [GitHub API](https://api.github.com/repos/krishnadey30/LeetCode-Questions-CompanyWise).
- **devidnyk/leetcode-wrapper:** similar buckets with a July 2025 snapshot — [repo](https://github.com/devidnyk/leetcode-wrapper).
- These lists are scraped from LeetCode Premium company tags and may be stale — [search synthesis of the repos above](https://github.com/snehasishroy/leetcode-companywise-interview-questions).
- **Sean Prashad's dataset** carries per-problem `companies` with `frequency` for 179 problems, under "Creative Commons Attribution-NonCommercial 4.0 International" — [questions.json](https://raw.githubusercontent.com/seanprashad/leetcode-patterns/main/src/data/questions.json); [LICENSE](https://raw.githubusercontent.com/seanprashad/leetcode-patterns/main/LICENSE).
- **Vendors:**
  - NeetCode's site defines a `companyTagged` list type — [NeetCode bundle](https://neetcode.io/main.f39af0c52a4e9fb5.js).
  - takeUforward's SDE-sheet FAQ asks whether company tags come with its paid "DSA Pass", without answering on the page — [takeUforward SDE](https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems).
  - So company tagging is treated as a paid, proprietary feature.
- **LeetCode Terms:** forbid "crawling," "scraping," or "spidering" and state that content is LeetCode's exclusive, US-copyrighted property — [LeetCode Terms](https://leetcode.com/terms) (search excerpt; direct fetch was 403).
- **Grind 169** has per-question numeric `companies` and `frequency` scores (0–1), but no company names — [Grind data chunk](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/c5797dfbd9aea01f.js).

### Inferences
- Do not ship named-company lists derived from Premium scrapes. A repo without a license defaults to all-rights-reserved, and the underlying data originates from a ToS-restricted Premium feature.
- For the India context, an onboarding choice like "Service-company placements / Product-company placements / FAANG-level" can be mapped to concept emphasis and difficulty targets without any company-tag data.
- If the team wants a "company flavour" for the demo, use Sean Prashad's companies field with visible attribution and a "non-commercial" note, or hand-curate 10–20 problems per company type from public interview experiences, storing only slug and title links.
- Use problem titles, slugs and URLs as facts and link out. Do not copy problem statements or editorial content into CodeQuest. Our own challenges carry the full statements and hidden tests.

### Gaps
- I found no court case or enforcement action specific to company-tag scraping. The legal risk assessment rests on the ToS text and on copyright and license defaults, not on precedent.
- I could not open LeetCode's Terms page directly to quote it in full.

---

## 6. Recommended algorithm (inputs, scoring formula, update rule) and minimal onboarding questionnaire for CodeQuest AI

### Takeaway
Build a deterministic three-layer engine:
1. **Concept graph:** NeetCode's 18-node DAG plus about 6 Python-fundamentals nodes, with ALEKS-style ready-to-learn fringes.
2. **Elo learner model:** per-concept skill on an Elo-400 scale, uncertainty-decaying K, multivariate propagation, partial credit from hidden tests and hints, and a decayed mistake profile.
3. **Planner:** Grind-style budget packing over weeks and hours, with items scored by ZPD closeness (target 0.75), fringe status, mistake-trap match, review due-ness and goal weight, plus interleaving.

Placement is a 6–8-question form followed by a roughly 10-item adaptive micro-diagnostic. Everything reruns after each attempt, and the week plan rebuilds nightly or on demand.

### Cited Findings
These are the anchors behind the design; each is detailed in the sections above.
- Prerequisite DAG with 18 nodes and 21 edges — [NeetCode roadmap chunk](https://neetcode.io/6252.838a46ce34355e13.js). The ready-to-learn fringe concept — [Wikipedia: ALEKS](https://en.wikipedia.org/wiki/ALEKS).
- Elo update, uncertainty function `a/(1+bn)` with a = 1 and b = 0.05, multivariate `cij` update, and new items starting at difficulty 0 — [Pelánek 2016](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf). Non-convergence under adaptive selection — [Tilburg 2025](https://research.tilburguniversity.edu/en/publications/keeping-elo-alive-evaluating-and-improving-measurement-properties/).
- Target difficulty evidence: easy hooks short-term, harder improves learning and return — [Papoušek et al. 2016](https://www.fi.muni.cz/~xpelanek/publications/its-target-difficulty.pdf). A 75% production target — [Pelánek 2016](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf). The 85% rule — [Wilson et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579).
- Budget packing with `1.96 × duration`, weekly cap `60 × hours`, and defaults of 8 weeks × 8 hours — [Grind logic chunk](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/8a45c2bbae4d39ea.js). Per-label mean durations of 18 / 28 / 38 minutes — [Grind data chunk](https://www.techinterviewhandbook.org/grind75/_next/static/chunks/c5797dfbd9aea01f.js).
- Rating priors by label: Easy 1247, Medium 1635, Hard 2084 (medians) — [zerotrac data.json](https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json) joined with the [NeetCode bundle](https://neetcode.io/main.f39af0c52a4e9fb5.js). Contest-slot medians: Q1 1255, Q2 1504, Q3 1841, Q4 2247.
- Placement length: ALEKS uses 30 or fewer items ([McGraw Hill](https://www.mheducation.com/support/aleks-support-center/knowledge/what-is-a-knowledge-check.html)). NIH CAT uses SE < 0.3 with a 12-item cap, and 8 or fewer fixed items harms reliability ([PMC 11951945](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11951945/)). Duolingo starts at novice, adapts per item and uses partial credit ([Duolingo blog](https://blog.duolingo.com/partial-credit-improvements-to-duolingos-placement-test/)).
- Review scheduling: FSRS at `desired_retention` 0.9 with Again/Hard/Good/Easy ratings, MIT — [py-fsrs](https://github.com/open-spaced-repetition/py-fsrs). Fixed difficulty-based intervals as a simpler alternative — [dsaprep Show HN](https://hn.svelte.dev/item/45436942).
- Interleaving helps delayed retention in math; programming evidence is thin — [Rohrer et al.](https://link.springer.com/article/10.3758/s13423-014-0588-3); [EdWorkingPapers ai23-876](https://edworkingpapers.com/ai23-876). Grind recurs topics across weeks — [Grind FAQ](https://www.techinterviewhandbook.org/grind75/faq).
- Minimisation, itemised notice, under-18 rules and the age-gate allowance — [DPDP Act](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf); [DPDP Rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).

### Inferences

#### A. Data model
- **Concepts C:** fundamentals F1–F6 (I/O & variables, conditionals & loops, strings, lists & dicts, functions, recursion basics + Big-O). Arrays & Hashing then depends on F4 and F5, and Backtracking also depends on F6. These link into NeetCode's 18 nodes and 21 edges. Each concept has a `goal_weight[goal]` and a `mastery_target[goal]`.
- **Items I:**

  | Field | Own challenge | External LeetCode problem |
  |---|---|---|
  | id | yes | yes |
  | source | `own` | `leetcode` |
  | concepts (primary, then secondary) | yes | from the NeetCode `pattern` field |
  | difficulty `d_i` (Elo-400) | yes | yes |
  | `n_i` (attempt count) | yes | — |
  | trap tags (e.g. `empty_input`, `off_by_one`, `single_element`, `negative_numbers`, `duplicates`, `large_input_tle`, `mutating_input`, `integer_division`) | hidden tests are authored to exercise them | — |
  | `t_est` minutes (Easy 18 / Medium 28 / Hard 38) | yes | yes |
  | premium flag | — | yes |
  | list flags (blind75, neetcode150) | — | yes |
  | URL | — | link-out only |

- **Initial item difficulty:**
  - Own items: a label prior (Easy 1250, Medium 1625, Hard 2075), then Elo-calibrated.
  - External items: the zerotrac rating if the slug matches, else the label prior. Held fixed.
- **Learner L:**
  - `θ_c` and `n_c` per concept, plus a global `θ_g`.
  - mastery flags
  - mistake profile `m_k` per trap or mistake tag
  - review state per solved item (FSRS card, or `next_due` + interval)
  - pace factor `φ`, default 1.0
  - goal, weeks W, hours per week H, and `premium_ok`

#### B. Prediction and update rule (after every attempt)
- **Predicted success:** `p = 1 / (1 + 10^((d_i − θ_ci)/400))`, where `θ_ci` is the weighted mean of the item's concept skills (primary weight 0.7, secondaries share 0.3).
- **Observed score `s` in [0,1]:**
  - Own challenge: `s = (hidden tests passed / total)`; if a submission passes all tests, `s = 1`.
  - Multiply by `(1 − 0.15·hints_used)` with at most 3 hints, giving a floor of 0.55·s.
  - Multiply by 0.85 if solved only after 3 or more failed submissions. This partial credit follows Duolingo's approach.
  - External LeetCode (self-report): solved alone = 1.0, solved after hint or editorial = 0.5, not solved = 0. Use a weight `ω = 0.5` because the outcome is unverified; own items use `ω = 1`.
- **Learner update:** `θ_c += ω · K(n_c) · (s − p)` for each tagged concept, with the 0.7/0.3 weights.
  - `K(n) = 174 / (1 + 0.05·n)`, which is Pelánek's a = 1 and b = 0.05 converted to the Elo-400 scale.
  - Then increment `n_c`.
- **Propagation:** for each DAG parent and child `j` of the primary concept, `θ_j += 0.25 · ω · K(n_j) · (s − p)`. This replaces Pelánek's correlation `c_ij` with a fixed 0.25 until real data exists.
- **Item update (own items only):** `d_i −= K_item(n_i) · (s − p)` with `K_item(n) = 120/(1 + 0.05·n)`. Increment `n_i`. Freeze after 200 attempts.
- **Mastery:** concept c is mastered when both hold:
  - (a) predicted success on the concept's median Medium item `≥ 0.70`, that is `θ_c ≥ d_med(c) + 147`; and
  - (b) at least 2 verified own-item successes (`s ≥ 0.85`) in c.
  - Goal-specific `d_med`: service-company placement uses the concept's Easy median; product/FAANG uses Medium; CP uses Hard.
- **Mistake profile:** after each attempt, `m_k ← 0.8·m_k + 1[k detected]` for every tag k. The analyzer maps failed hidden tests to trap tags, plus static checks such as `range(len(a)-1)` patterns or missing empty guards. Mistake k is "recurring" if `m_k ≥ 1.5` and it was seen in at least 2 of the last 5 attempts.
- **Review:** after a solve, create or update an FSRS card with rating mapping:
  - not solved → Again
  - solved with 2+ hints → Hard
  - solved → Good
  - solved first try in under `t_est` → Easy
  - `desired_retention = 0.9`.
  - Hackathon fallback: intervals of 1, 3, 7, 21 and 60 days on success, resetting to 1 day on failure.

#### C. Next-item scoring (the "what should I do now" queue)
- **Candidates:**
  - unsolved items whose primary concept is on the fringe (all parents mastered) or in progress;
  - solved items that are due for review;
  - items in mastered concepts, only as interleave or review picks.
  - Exclude premium items if `premium_ok = false`. Exclude items whose concepts have unmastered parents, except that a "soft-ready" rule allows parents within 100 points of mastery.
- **Score:**
  `score(i) = 0.35·ZPD + 0.20·Frontier + 0.20·Trap + 0.15·Review + 0.10·Goal − 0.10·SameConceptStreak − 0.05·ExternalPenalty`
- **Score terms:**

  | Term | Definition |
  |---|---|
  | `ZPD` | `max(0, 1 − |p − p*| / 0.35)`, with `p*` = 0.85 for the first session or after 2 consecutive failures, 0.65 for a declared "stretch" slot, and 0.75 otherwise |
  | `Frontier` | 1 if the concept is on the fringe and not started, 0.6 if in progress, 0 if mastered |
  | `Trap` | `min(1, Σ_k [k recurring]·m_k·trap_k(i) / 3)`, which pulls in challenges that exercise the learner's recurring mistakes |
  | `Review` | 1 if the item is due (retrievability < 0.9), else 0 |
  | `Goal` | `goal_weight[goal][concept]` scaled to [0,1], plus 0.2 if the item is in Blind 75 or NeetCode 150 and the goal is interviews |
  | `SameConceptStreak` | 1 if the last 2 items share this concept and the concept already has 3 or more attempts, which forces interleaving after a short blocked introduction |
  | `ExternalPenalty` | 1 for LeetCode items when an own item scores within 0.05, preferring verified items |

- Take the top 3 as "Next up", ensuring at most 1 review item and at least 1 own challenge.

#### D. Roadmap generation (the multi-week plan), rebuilt nightly or on demand
1. **Budget:** `B = 60·H·W` minutes. Item cost is `1.96·t_est·φ`, where `φ` is the median of actual time ÷ `t_est` over the last 10 attempts, clamped to [0.6, 1.8].
2. **Concept order:** a topological sort of the DAG (Kahn's algorithm), breaking ties by goal weight, then by NeetCode problem count. Skip concepts already mastered after placement.
3. **Per-concept quota:** `k_c = clamp(ceil((target_c − θ_c)/100) + 1, 2, 6)`. Fill with 1–2 own challenges, chosen at increasing `d` with predicted `p` from 0.85 down to 0.65, plus 1–4 LeetCode items. Prefer NeetCode 150 or Blind 75 for interview goals and higher zerotrac ratings for CP. Add 1 trap item if any recurring mistake matches the concept.
4. **Reserve review time:** set aside 15% of each week for review and interleaved items from earlier concepts.
5. **Pack weeks** Grind-style: walk items in order, start a new week when the cap `60·H·0.85` would overflow, and stop when `B` is exhausted. Drop the lowest-priority remaining items first: Hard items in low-goal-weight concepts, then non-list LeetCode items.
6. **Replan triggers:** a concept is mastered early or late; plan time slips more than 20% versus actual; or a new recurring mistake appears. Recompute from step 2 while keeping completed items.

#### E. Placement diagnostic (about 10–15 minutes, deterministic)
- **Prior:** `θ_g` from Q5 of the form: never coded 900; Python basics 1100; fewer than 50 LeetCode solved 1250; 50–200 solved 1450; more than 200 solved 1650. Set each `θ_c = θ_g`, then adjust +100 if the learner ticked "comfortable" in Q6, or −150 if they ticked "never studied".
- **Items:** a pool of about 3 micro-items per concept (predict output, find the bug, fill the blank, or a 5-minute function with 4 hidden tests). Each is tagged with a concept and a prior `d`.
- **Loop:**
  1. Pick the concept, among those not yet resolved, whose estimated mastery probability is closest to 0.5 (maximum information).
  2. Prefer concepts in the middle of the DAG's topological order, as a binary search over the DAG.
  3. Within it, choose the item with `p` closest to 0.5.
  4. Update with the rule in B, using `K(n)` with n = 0 so updates are large.
  5. **KST propagation:** on `s ≥ 0.85`, raise all ancestors to at least the mastery threshold − 50. On `s ≤ 0.3`, cap all descendants at the threshold − 150.
- **Stop:** after 12 items, after 15 minutes, or once every concept on the current frontier band is resolved. Resolved means `|θ_c − threshold| > 150` with at least 1 direct observation, a proxy for SE < 0.3. Then show the "you are here" map: mastered, ready-to-learn and locked concepts.

#### F. Minimal onboarding questionnaire (6–8 questions, under 2 minutes)
1. "Are you 18 or older?" (Yes / No). If No, offer demo or guest mode only, storing data in the browser with no server-side profile. This avoids DPDP s.9 duties for the hackathon; Part B item 6 permits this check.
2. "What's your main goal?"
   - Campus placement (service companies)
   - Campus placement (product companies)
   - FAANG-level interviews
   - Competitive programming
   - Learn Python and programming fundamentals
3. "When is your target?" Choose from 2, 4, 8, 12 or 26 weeks, or "no deadline". This maps to W; the cap of 26 is from Grind.
4. "How many hours per week can you practise?" A slider from 1 to 40, default 8, as in Grind. This maps to H.
5. "Which best describes you?"
   - Never coded
   - Know Python basics
   - Solved fewer than 50 LeetCode problems
   - Solved 50–200
   - Solved 200+
6. (Optional) "Tick topics you're comfortable with / never studied." Use 8 grouped chips: Arrays/Hashing, Two pointers/Sliding window, Stack/Queue, Binary search, Linked list, Trees/Heaps, Graphs, DP.
7. "Do you have LeetCode Premium?" (Yes / No). If No, premium problems are filtered out.
8. (Optional) "Preferred language for LeetCode practice" (Python default). Our sandbox is Python; this only changes which external solution links we show.

**Then:** "Take a 10-minute placement check, or start from the beginning." This offers Duolingo-style skip and jump-ahead.

**Deliberately not asked:**
- real name (use a display name)
- phone number
- date of birth
- gender
- college or branch
- CGPA
- resume or LinkedIn
- city
- specific target companies (use goal type instead)
- a LeetCode username for scraping

**The privacy notice itemises:**
- the data collected: goal, schedule, level, topic self-ratings, attempts, code submissions, mistake tags, and timings;
- the purpose: generating and adapting your practice plan;
- the retention period;
- a "Delete my data" button and a JSON export.

#### G. Demo-mode seeding (fits the workspace convention of seeded or cached data)
- Ship 3 seeded personas so judges can see adaptation without waiting:
  - a beginner with recurring `empty_input` errors;
  - a placement aspirant strong in arrays but weak in trees;
  - a CP learner.
- For each, replay 15–20 logged attempts to show θ curves, fringe changes, the trap-driven challenge swap, and plan re-packing.

### Gaps
- The constants are reasoned defaults, not fitted values: weights 0.35/0.20/0.20/0.15/0.10, propagation 0.25, hint penalty 0.15, decay 0.8, mastery +147 (p = 0.7), and per-concept quota formula. Grid-search them on logged data once available, as Pelánek did for a and b.
- The label-to-rating priors come from contest-era problems (IDs ≥ 746). Classic interview problems may be systematically easier or harder than contest problems with the same label.
- No study I found validates micro-item diagnostics (predict-the-output, find-the-bug) as placement proxies for algorithmic problem-solving skill.
- The DPDP analysis is not legal advice, and I could not check 2026 developments.
