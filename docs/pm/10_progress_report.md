# CodeQuest AI: Progress Report

**Vortexa Hackathon 2026 · Domain 5 (AI-Powered Education) · Problem Statement E-02**
*As of 11 Oct 2026, evening (IST) · Team of 3 · 38 commits on `main` + one uncommitted feature set*

---

## 1. Summary

CodeQuest AI is a Python practice platform where **every failure teaches**. Learners solve tiered missions; each test is judged separately in a locked-down Docker sandbox; failures are explained in plain language using the learner's own variables; hints climb from *where to look* to *fill the blank* without revealing the solution; and a **Mistake Memory** spots repeated bugs and rebuilds the learner's next missions around them.

**Every E-02 requirement is built and tested.** Beyond the brief we shipped a LeetCode Companion browser extension, a personal roadmap, a code-typing trainer, a unified portfolio and a live sandbox red-team demo. The system is **deterministic first**: AI only rewords text that has already been verified, and it can be switched off with no loss of features.

| 20 | 4 | 4 | 8 / 8 | 33 | 316 | 0 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| missions, 5 tiers (15 build · 5 debug) | separate verdicts per test | hint levels | sandbox attacks contained | API endpoints | backend tests passing | AI calls needed for any feature |

---

## 2. Problem statement coverage

| E-02 requirement | What we built | Status |
|---|---|:---:|
| One language, increasing difficulty | Python; 20 missions over tiers 1–5, from loops up to binary search, sliding window, recursion and stacks | ✅ |
| Description, starter code, visible + hidden tests | Schema-validated YAML: ≥ 3 visible and ≥ 4 hidden tests each; reference solutions must pass every test, starters must fail | ✅ |
| Restricted execution | A fresh Docker container per test: no network, read-only FS, non-root, all capabilities dropped, 256 MB, 32 PIDs, CPU/file limits. A constrained local runner is the labelled fallback | ✅ |
| Per-test outcome | Passed / wrong output / runtime error / timeout, with subtypes (blocked, memory limit, syntax, output limit) | ✅ |
| Never reveal hidden tests | Hidden results carry only index, verdict and a coarse category; inputs and outputs are never stored | ✅ |
| Plain-language explanations | What happened → where → the learner's variables at the crash → a guiding question. Wrong answers are classified by shape ("missing the last element", "printed instead of returned") | ✅ |
| Progressive hints, never the solution (AI included) | 4-level ladder: Where → What (with a counterexample) → Teach (on a different example) → the learner's own line with one blank. Unlock needs a changed resubmission or a 45 s cooldown. A leak guard checks all hints together against every reference solution | ✅ |
| Detect recurring mistakes | 8 AST detectors plus syntax classes; a mistake counts only when static and runtime evidence agree; decaying memory marks it *recurring* | ✅ |
| Adapt future challenges | A matching debug mission is assigned, next missions are re-ranked toward the trap, and a pre-flight check appears before the next submit | ✅ |
| Track skills by concept | Elo per concept; *mastered* needs ≥ 70 % predicted success **and** 2 verified solves | ✅ |

---

## 3. Features beyond the brief

| Feature | What it does |
|---|---|
| **LeetCode Companion** (Chrome/Edge MV3, v0.3.0) | Side-panel tutor on LeetCode: problem-aware chat, 3-level hints, *check my approach*, code review with our detectors, explain / edge cases / complexity. Auto-detects LeetCode submissions and feeds the same Mistake Memory. Requests for the answer are refused by rules before any model call; replies pass a no-code guard. Off during contests; pairs with the web app by a single-use 6-character code |
| **Counterexample finder** | Hint 2 shows the *smallest* input where the learner's code fails, found by exhaustive search in the sandbox and never taken from a test |
| **Debug missions** | 5 hand-written broken programs with line budgets that train reading and fixing code |
| **Sandbox Arena** (`/arena`) | Live red-team demo: file theft, network, cloud metadata, shell, fork bomb, memory bomb, infinite loop, output flood. All 8 contained |
| **Guarded AI layer** | Optional rewording of hint 1 only (OpenAI `gpt-4.1-nano`; Gemini fallback): fact check, leak guard, persisted budget, circuit breaker, per-learner on/off switch. Settings shows budget left and leaks blocked |
| **Onboarding + personal roadmap** (`/onboarding`, `/roadmap`) | Goal, deadline, hours a week and level (no personal data) build a week-by-week plan over a 25-topic prerequisite graph, mixing our missions with 184 curated LeetCode problems at about 70 % predicted success. Recurring mistakes put drills first; the plan flags when it needs re-planning. AI coach notes are written from the plan's facts only, behind a guard |
| **Syntax Warm-up** (`/typing`) | Animated, accuracy-first code-typing trainer: snippets chosen for weak concepts and recurring syntax slips, drills from the learner's own passing code, a pace caret, speed scored on the server |
| **Unified portfolio** (`/u/<handle>`) | Shareable profile led by skills **verified** by hidden tests, plus imported Codeforces and LeetCode stats mapped onto the same concepts, and typing results |
| **Seeded demo learner "Priya"** | Built through the real learner model, so her next off-by-one turns *recurring* live on stage |
| **Data rights** | `GET /api/me/export` and `DELETE /api/me` |
| **Works offline** | Self-hosted Monaco, template text for every feature, local sandbox: the demo survives bad Wi-Fi |

---

## 4. In progress: learning signals (built, not yet committed)

Built since the last commit; backend tests pass and the frontend type-checks and lints clean.

| Feature | What it does |
|---|---|
| **Predict Before You Run** | Before the first submit, the learner predicts what *their* code returns for one small input. Comparing prediction, actual output and correct answer labels the attempt *aligned / slip / misconception / lucky / lost*. A diagnostic signal, kept out of the skill score |
| **Debug Journey** | Replays an attempt's submissions as a diff timeline, labels the debugging style (methodical, exploratory, trial-and-error…), computes an Error Quotient (after Jadud 2006) and asks for a short reflection |
| **"Why did you pass?"** | After a pass, a bounded small-input search flags *fragile* passes that beat the tests but not the problem; half of that solve's skill gain is held back |
| **Mission rules** | Static check for forbidden calls (e.g. no `max()` in *Find the Largest*); passing while breaking the rule doesn't count as solved |
| **Growth analytics** (portfolio) | Hint-free and first-try trends, a struggle map per mission, mistake lanes over time, prediction accuracy by concept, debugging styles, robustness |
| **Demo fixture** | Priya's history is judged once by the real judge into `content/demo/priya.json`; tests re-judge it so it can't drift |

---

## 5. Architecture and stack

**Web app** (Next.js 16) and **Companion** (Chrome MV3) → **CodeQuest API** (FastAPI) → **sandbox** (one Docker container per test, four in parallel). Submissions return `202` at once and are judged in a background pool; results are compared on the host so learner code can't fake a pass.

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLite (WAL) |
| Analysis | Python `ast`, `tokenize`, audit hooks; no third-party analysis libraries |
| Sandbox | Docker hardened per-test containers; constrained local runner as fallback |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query, Monaco, Motion |
| Extension | Chrome Manifest V3: side panel, service worker, content scripts |
| AI (optional) | OpenAI `gpt-4.1-nano` / `gpt-4.1-mini`, Gemini Flash-Lite fallback; backend only, budget-capped |

---

## 6. Content

| Asset | Count |
|---|---|
| Missions | 20 (15 build, 5 debug), tiers 1–5 |
| Typing snippets | 32 real Python idioms |
| LeetCode roadmap catalogue | 184 problems (link-out only) |
| Roadmap topic graph | 25 topics with prerequisites |
| Concept map | Codeforces / LeetCode tags → our concepts |

---

## 7. Quality and verification

| Check | Result |
|---|---|
| Backend test suite (`pytest`) | **316 passing** (17 files), incl. a full Priya demo flow over HTTP |
| Frontend type check + lint (`tsc`, ESLint, design-token check) | Clean |
| Companion side-panel suite | 44 automated checks, plus a fake LeetCode judge server and a 17-check pipeline test |
| Sandbox Arena | 8 / 8 attacks contained with `runner: docker` |
| Content validation | Every mission loads; references pass all tests; starters fail; counterexamples never flag a reference |

---

## 8. Documentation and pitch

- **README**: submission-grade, with an E-02 requirement → code → test traceability table.
- **Docs**: Architecture, Mentor Engine, Security (threat model), API reference, Extension guide, Content guide, Deployment.
- **Pitch**: 4-minute demo script with fallbacks (`docs/pitch/demo_script.md`) and pitch deck outline.
- **Planning**: master plan, research notes, 12-hour execution plan, per-teammate agent briefs.

---

## 9. Deployment

| Component | Status |
|---|---|
| Web app | **Live** on Vercel: `https://codequest-ai-blond.vercel.app` (HTTP 200) |
| API | **Live** on Render: `https://codequest-api-31eg.onrender.com` (`/api/health` → ok, 20 missions). Redeploys on every push to `main` |
| Sandbox in production | Render can't run Docker, so the live API uses the restricted local runner and reports `sandboxed: false`. The full Docker sandbox (and the Arena's `runner: docker`) runs locally or on a Docker VM |
| What's live | Committed code only; the learning signals in §4 ship after they are committed |

---

## 10. Build timeline (all on 11 Oct)

| Phase | Delivered |
|---|---|
| Plan | PS analysis, research, master plan, 12-hour execution plan |
| Core engine | Sandbox harness and runners, judge, explainer, detectors, hint ladder, leak guard, counterexamples, learner model |
| Product | FastAPI service, Next.js app (workspace, results board, hints, Arena), Docker runner by default |
| Extensions of scope | Portfolio and imports, guarded AI layer, LeetCode Companion (pairing → auto-detected submissions → tutor chat) |
| Content and polish | 20 missions, typing corpus, LeetCode-grade redesign, demo seed, sandbox and judge hardening |
| Latest | Docs set, Render blueprint, roadmap + onboarding + Syntax Warm-up; learning signals (uncommitted) |

---

## 11. Remaining before submission

1. **Commit and deploy the learning-signals work** (13 modified, 17 new files).
2. **Update the README**: live URLs (still a TODO), test count (says 188; now 316), the new signals features, and the demo video link.
3. **Choose the demo backend**: run the Arena moment against a Docker backend (local or VM), since the live Render API isn't sandboxed.
4. **Record the backup demo video** and rehearse the 4-minute script twice.
5. **Catch up the PM docs**: the 12-hour plan, decision log and task board lag behind the code (e.g. the roadmap is marked *cut* but was built).
