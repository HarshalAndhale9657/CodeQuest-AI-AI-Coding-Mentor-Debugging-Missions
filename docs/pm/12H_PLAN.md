# CodeQuest AI: 12-hour execution plan

> This overrides the 24h timeline in `03_timeline.md` and the tier hours in `CODEQUEST_MASTER_PLAN.md` §4.2/§8.
> Status at 13:30: **Tier 0 is working end-to-end.** The backend passes 68 tests on macOS; the frontend loads, judges, explains, gives hints and runs the arena.
> **Assumed end of hacking: 22:00 (please correct).** Times below are wall-clock.

## The rule for three agents in parallel

**Each person owns a set of folders and touches nothing else.** Contract changes go through Person A.

| Person | Agent | Owns (write access) | Must not touch |
|---|---|---|---|
| **A**: you | Claude Code (Opus) | `backend/`, `runner/`, root config, `docs/api-contract.md` | `frontend/src/app/**` pages |
| **B**: teammate | Claude Code (Fable) | `frontend/` | `backend/`, `content/` |
| **C**: teammate | Antigravity | `content/`, `docs/pitch/`, `README.md`, `frontend/public/data/` | `backend/codequest/`, `frontend/src/` |

**Git:** each person works on their own branch (`a/*`, `b/*`, `c/*`) and merges to `main` through small PRs **at every checkpoint**. A merges. Before merging, run `pytest -q` (backend) and `npm run typecheck && npm run lint` (frontend).

## What's done vs. what's left

| Area | Status |
|---|---|
| R1–R10 (the brief): sandbox, per-test verdicts, hidden-test secrecy, explanations, hint ladder plus leak guard, mistake memory, adaptation, concept Elo | ✅ Built and verified |
| Counterexample finder (S1), Sandbox Arena (S3), auto debug mission on a recurring mistake (part of S2) | ✅ Built |
| Docker runner in the demo (the Arena currently says "not sandboxed") | ❌ **A, P0** |
| Skill map + Mistake Memory page (`/api/me` exists, no UI) | ❌ **B, P0** |
| Results column layout (cramped right column) | ❌ B, P1 |
| 7 → 15 missions + 3 more debug missions | ❌ **C, P0** |
| Guarded AI rewording with an on/off switch (S4) | ❌ A, P1 |
| Unified portfolio + Codeforces/LeetCode import (P1+P3) | ❌ A (API) + B (page), P1 |
| Code typing trainer, "Syntax Warm-up" (P6) | ❌ B (page) + C (snippets), P2 |
| Deploy + demo seed + backup video | ❌ A + C, P0 |
| Cut: LeetCode extension (P4), placement check (P5), roadmap (P2), Pyodide (S5), exam mode (S6) | 🗑 Pitch slide only |

## Timeline

| Time | A (backend/infra) | B (frontend) | C (content/pitch) | Checkpoint |
|---|---|---|---|---|
| 13:30–14:00 | Freeze new contracts in `docs/api-contract.md`, merge baseline to `main` | Pull, run locally, start the skill map page | Pull, read the challenge schema, start missions | |
| 14:00–16:00 | Docker runner working + red-team in a container; portfolio/imports API | Skill map + Mistake Memory page; results layout fix | 8 new missions (tiers 3–5) | |
| **16:00** | | | | **CP1:** merge all; full demo flow on `main` |
| 16:00–18:30 | Guarded AI layer + switch; typing results API | Portfolio page `/u/[handle]`; AI toggle in the UI | 3 debug missions; typing snippet corpus; concept tag map | |
| **18:30** | | | | **CP2: FEATURE FREEZE.** Anything unfinished is cut |
| 18:30–20:00 | Deploy (VM/Railway + Vercel), demo seed personas | Typing trainer page (if CP2 passed with time to spare) or polish | README, pitch deck, demo script | |
| 20:00–21:00 | Bug bash on the deployed URL | Polish and animations, mobile check | Record the backup demo video | |
| **21:00** | | | | **CP3:** code freeze; only demo-breaking fixes |
| 21:00–22:00 | Rehearse the demo 2× | Rehearse | Submit | |

## New API contracts (A implements, B consumes; frozen at 14:00)

✅ **Live now:** portfolio, imports, typing results. settings/ai too. Hints now carry `source: "template" | "fallback" | "ai"`; show a small "AI-worded" tag when it is "ai".

```
GET  /api/me                      (exists) {user, skills[], mistakes{...}, ...}
GET  /api/portfolio/{handle}      PUBLIC (no auth). handle = user.handle from /api/session or /api/me, e.g. "priya-3f9a1c"
                                  → {handle, name,
                                     verified: {concepts:[{concept, band:"ready"|"learning"|"almost"|"mastered", attempts, verified, p_median}],
                                                all_concepts:[same shape],
                                                mistakes:[{key, label, times, first_seen, last_seen, recurring, beaten}],  // first/last_seen = attempt number
                                                stats:{solved, missions_total, hints_per_solve|null, debug_missions, attempts},
                                                solved:[{id, title, tier}]},
                                     imports: {codeforces?: {status:"ok"|"stale"|"error", handle, error|null, fetched,
                                                             rating, max_rating, rank, solved, top_tags:[[tag,count]], concepts:[id]},
                                               leetcode?:   {status, handle, error|null, fetched,
                                                             solved:{easy,medium,hard,total}, top_tags:[[tag,count]], concepts:[id]}},
                                     typing: {best_cpm, accuracy, runs} | null}
                                  404 if the handle is unknown
POST /api/imports                 {platform:"codeforces"|"leetcode", handle} → 202 {status:"queued"|"cached"}   (auth; poll the portfolio ~1-3 s)
GET  /api/settings/ai             → {enabled, available, provider|null, budget_left_usd, rephrased, leaks_blocked}  (public)
POST /api/settings/ai             {enabled:boolean} → same shape  (auth; enabled stays false when no key is configured)
POST /api/typing/results          {snippet_id, concept, cpm, accuracy (0-1), duration_ms, errors:{[char]:count}} → {best_cpm, accuracy, runs}
```
The snippet corpus is static: `frontend/public/data/typing-snippets.json` (C writes it):
`[{id, concept, title, code}]`, with 30–40 snippets of 3–12 lines each, real Python idioms, indented with 4 spaces.

### LeetCode Companion (A, live): the extension is back in scope (user decision)
The extension lives in `extension/` (load unpacked). B: please add a **"Connect LeetCode Companion"** button that calls the first endpoint and shows the code.
```
POST /api/ext/pairing-code        (web auth) → {code: "ABC123", expires_in_s: 600}     single-use, 10 min
POST /api/ext/pair                {code} → {token, user:{id,name}}                    extension token, 7 days, NOT a web token
POST /api/ext/analyze             (ext auth) {code, language:"python"} → {syntax_error|null, findings:[{key,line,message}]}
POST /api/ext/approach            (ext auth) {text, tags:[slug]} → {verdict:"on_track"|"partially"|"off_track"|"unclear", mentioned, brute_force, question}
POST /api/ext/hint                (ext auth) {tags:[slug], level:1-3} → {level, max_level, text, concept|null}
POST /api/ext/sync                (ext auth) {slug, tags, verdict:"accepted"|"wrong_answer"|"runtime_error"|"time_limit"|"other", code}
                                  → {recorded_mistakes, newly_recurring, concepts, slug}   (feeds the same Mistake Memory)
```

## Demo (4 minutes)
1. Priya opens Class Average and submits the empty-list bug. Per-test cards appear; a hidden test fails by **category only**; the plain-language explanation shows the variables at the crash.
2. Hint 1 → 2 → 3, each more specific. The cooldown blocks spamming. Show that the leak guard blocks a request for the answer.
3. Her 3rd off-by-one → **"Recurring mistake"** → a debug mission is forged → the next mission is swapped.
4. Skill map and Mistake Memory → the portfolio with imported Codeforces/LeetCode stats ("one profile, every platform").
5. Sandbox Arena: launch 4 attacks; all are blocked, with **Runner: docker**.
6. Flip **AI off**: the explanations stay just as good, showing the system is deterministic first.
