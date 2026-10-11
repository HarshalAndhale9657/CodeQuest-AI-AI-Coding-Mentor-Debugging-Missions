# Coding-practice & online-judge platforms: how learner submissions get feedback (teardown for CodeQuest AI / PS E-02, current to Oct 2026)

Method and caveats: about 70 tool calls covering official docs and help centres (Exercism, Kattis, CSES, Codewars, HackerRank KB, CodingBat, CodeChef, GfG, NeetCode, CodeSignal), forum threads (CodeChef Discuss, Codeforces blogs), GitHub source (exercism/python-test-runner), arXiv and the HN Algolia API. Limits:
- **Reddit:** reddit.com is blocked for this toolchain, so there are no Reddit quotes.
- **LeetCode and Codeforces:** leetcode.com and codeforces.com returned HTTP 403 (or connection refused) to direct fetches. Claims about their pages come from search-engine snippets and are marked "(snippet)".
- **Search budget:** the session's shared web-search budget ran out near the end. Unverified items are listed under each "Gaps" heading instead of being guessed.

Table legend: ✅ = documented / does it · ⚠️ = partial, paywalled, metered, or unreliable · ❌ = not offered, or not found in any source reviewed · ? = not verified this session (unknown, not "absent") · — = not applicable.

---

## 1. What exactly does a learner see when a submission fails? (verdict taxonomy, per-test reporting, hidden-test policy)

### Takeaway
Platforms fall into three regimes when a submission fails:
1. **Verdict only, stopping at the first failing test:** Codeforces, Kattis, CSES courses and free CodeChef.
2. **A status for every test, with hidden tests locked:** HackerRank, CodingBat's aggregated "other tests" row, and Codewars until the kata is solved.
3. **The failing data is shown:** LeetCode often shows the failing input, CodeChef sells "WA test cases" in Pro, and the CSES Problem Set reportedly exposes test data.

Exercism is the outlier: it has no hidden tests at all, and every test comes back with its code, status and message. **No reviewed platform explains why a *hidden* test failed in plain language without revealing the test.**

### Cited Findings

**Failure display matrix**

| Platform | Verdict vocabulary (as documented) | Which tests are reported | What is shown about a failing hidden test | Sources |
|---|---|---|---|---|
| LeetCode | Wrong Answer, Time Limit Exceeded or Runtime Error at submission level, plus a pass count such as "47/53 passed" | A pass count plus at most one failing case | The failing input is shown "Sometimes … for Wrong Answer", so hidden data can be revealed | [dev.to, Dec 2025](https://dev.to/alex_hunter_44f4c9ed6671e/why-my-leetcode-solution-passes-some-test-cases-but-fails-others-1k7p) |
| Codeforces | "Wrong answer on test N / pretest N" style verdicts | First failing test number only | Hidden during contests. Afterwards the tests are only partly visible: long input is cut off behind an unclickable "…" and the checker message just says the numbers differ | [CF blog (snippet)](https://codeforces.com/blog/entry/104970); [CF blog (snippet)](https://mirror.codeforces.com/blog/captainkhan); [CF blog (snippet)](https://codeforces.com/blog/entry/124980) |
| CodeChef | ? (per-test table not verified) | Hidden for free users. A moderator said users "must deduce them yourself" | **Paid:** "WA Test Cases" has been a Pro feature since Aug 2022, and is not available in contests | [CodeChef Discuss](https://discuss.codechef.com/t/will-codechef-provide-test-cases/125/40); [Pro announcement](https://discuss.codechef.com/t/introducing-codechef-pro/102300) |
| HackerRank | Each test case is marked passed or failed, and the score is the number passed | **Every test case is listed.** Samples show input and expected output | A hidden test "appears with a lock icon" and shows "only execution results". An admin setting, "Show output for hidden test cases", controls whether the candidate's own output is shown | [HackerRank KB](https://hackerrank-knowledge-base.help.usepylon.com/articles/3245197419) |
| AtCoder | Status codes AC, WA, TLE, MLE, RE, CLE, OLE, IE, WJ, WR | ? (per-case table not verified). Anonymous fetches of submission lists were redirected to sign-in on 2026-10-11 | ? | [online-judge-tools docs](https://online-judge-tools.readthedocs.io/en/develop/onlinejudge.service.atcoder.html); [atcoder.jp fetch](https://atcoder.jp/contests/abc380/submissions?f.Status=WA&f.LanguageName=Python) |
| GeeksforGeeks | ? | ? | ? | none (see Gaps) |
| Exercism | Each test is pass, fail or error, and the run overall is pass, fail or error | **All tests, in test-file order**, each with its test code and a message, plus up to 500 characters of the learner's own output | — (no hidden tests: the site shows the test code with every result) | [Exercism test-runner spec](https://exercism.org/docs/building/tooling/test-runners/interface) |
| Codewars | TEST runs the sample tests. Passing the full suite is required to mark the kata solved | Sample tests while working. The full suite is "hidden until you solve the kata" | The full test code (and others' solutions) can be seen by giving up the reward | [Codewars docs](https://docs.codewars.com/getting-started/solving-kata) |
| Kattis | Accepted or rejected. Compile errors show the compiler output | A "line of boxes" of passed input files. Judging stops at the first failure and later files are not tried | Samples run first. "we do not share any additional information regarding the content of the secret testcases" | [Kattis support](https://support.kattis.com/support/solutions/articles/79000030851-my-submissions-are-getting-rejected-what-can-i-do-) |
| CSES | COMPILE ERROR, OUTPUT LIMIT EXCEEDED, TIME LIMIT EXCEEDED, RUNTIME ERROR, WRONG ANSWER | Official course text: "only the first error will be shown" | **Conflicting.** Community posts say CSES shows the user's output on a failed test, and that Codeforces users want full test downloads "like CSES" | [CSES "Solving tasks"](https://cses.fi/89/text/674); [CF topic (snippet)](https://codeforces.com/topic/88623/en1); [CF blog (snippet)](https://codeforces.com/blog/entry/124980) |
| CodingBat | Expected vs. Run with OK or X per row, and "Timed out" | One row per visible test. "other tests" appears as one aggregated row at the bottom | The details of the "other tests" are not shown | [CodingBat help](https://codingbat.com/help.html) |
| CodeSignal Learn | ? | ? | ? | none |
| NeetCode (Pro editor) | "instant feedback" and "running test cases" (marketing copy) | ? | ? | [neetcode.io/pro](https://neetcode.io/pro) |
| CheckiO | Missions use asserts. "Run code" shows your run; "Check solution" runs extra tests | ? | ? | [CheckiO intro post (snippet)](https://py.checkio.org/blog/checkio-intro-full-version-from-basic-to-advance-u/) |
| Edabit | ? | ? | ? | none |

**Additional details by platform**
- **Kattis**
  - Sample inputs are judged first: "The first input file(s) are the sample input/output shown on the problem page". The submission then runs on "a set of secret input files" ([Kattis support](https://support.kattis.com/support/solutions/articles/79000030851-my-submissions-are-getting-rejected-what-can-i-do-)).
  - Failing a sample "usually … indicat[es] a fundamental problem" such as printing extra prompt text or a non-zero exit code. Failing a secret test indicates "a non-trivial bug", and the only advice is to "generate your own testcases" around extreme values and corner cases (same source).
  - An older (2015) UChicago course guide notes that a Wrong Answer's details "show you how many of the instructors' test cases you are passing" ([UChicago CS121 Kattis guide, 2015](https://klasses.cs.uchicago.edu/archive/2015/fall/12100-1/kattis.html)).
- **CSES**
  - The official wording: "For each submission CSES will tell you if your submission has passed all tests. If that's not the case it will tell you the reason… The error message is from the first failed test case" ([CSES](https://cses.fi/89/text/674)).
  - A separate "hacking" feature lets you view other users' solutions after solving a problem and submit a breaking test. The test is added to the test data and all submissions are re-judged ([CSES hacking page](https://cses.fi/problemset/text/2433); [Laaksonen & Talvitie, Olympiads in Informatics 2020](https://ioinformatics.org/journal/v14_2020_105_111.pdf)).
- **HackerRank**
  - Sample tests can be zero-weighted: "You can assign a zero score to these test cases if needed". "When a candidate runs the code, the platform executes all test cases" ([HackerRank KB](https://hackerrank-knowledge-base.help.usepylon.com/articles/3245197419)).
  - For project-type (front-end, back-end, full-stack) questions, running the tests "will not display if the hidden test cases passed or not to the candidate" ([HackerRank KB](https://hackerrank-knowledge-base.help.usepylon.com/articles/1626384486-hidden-test-cases-for-front-end%2C-back-end-and-full-stack-questions)).
  - **Hackos** (HackerRank's points currency) can reportedly be spent to "unlock those stingy TCs" (failing test cases) and to get help when stuck. This comes from a secondary beginner blog ([dev.to](https://dev.to/kitarp29/hackerrank-is-must-for-beginners-p0p)), and a G2 reviewer says the site has long promised "more ways to earn and spend Hackos" ([G2 reviews](https://www.g2.com/products/hackerrank-for-developers/reviews?page=6)).
- **LeetCode**
  - Users ask how to see all test cases after "'Accepted!' then 'Wrong Answer.'" ([LeetCode Discuss thread title](https://leetcode.com/discuss/general-discussion/548314/accepted-then-wrong-answer-how-to-view-all-test-cases)).
  - Run and Submit can disagree ([LeetCode Discuss](https://leetcode.com/discuss/feedback/207419/run-code-and-submit-have-different-results)), and a problem's example can contradict its hidden expectation ([LeetCode-Feedback issue #26042](https://github.com/LeetCode-Feedback/LeetCode-Feedback/issues/26042)).
- **Codewars:** the full suite "covers various inputs, data configurations, edge cases, performance", and "You cannot see full tests until you solve the kata" ([Codewars docs](https://docs.codewars.com/getting-started/solving-kata)).
- **CodingBat:** the "other tests" are "similar to the shown tests but use different numbers or strings" and their details are not shown. A "Timed out" result likely means an infinite loop. Python and Java are supported ([CodingBat help](https://codingbat.com/help.html)).
- **Python-relevant detail (Exercism):** the Python runner is a pytest plugin. Each test is reported by name, and failure messages are cleaned up: pytest's `E ` prefixes are stripped, the text is dedented, and the working-directory path is replaced with "." ([exercism/python-test-runner source](https://raw.githubusercontent.com/exercism/python-test-runner/main/runner/__init__.py)).

### Inferences
- PS E-02's "report each test's outcome separately without revealing hidden tests" is matched today only by HackerRank's lock-icon model. Even there, only pass/fail is documented per test. Separate per-test outcome classes (wrong output / runtime error / timeout) that are safe for hidden tests were not documented anywhere.
- How much of a hidden test to reveal is a teaching choice that platforms set at very different points:
  - LeetCode, CodeChef Pro and (reportedly) CSES reveal the data, which removes "blind debugging" practice.
  - Kattis, Codeforces and free CodeChef reveal nothing, which frustrates beginners.
  - CodeQuest could sit in between: tell the learner which category of edge case a hidden test covers and what kind of failure happened, but never the data.
- Exercism avoids the hidden-test explanation problem entirely by making every test visible (a test-driven style). So "explain a hidden failure without leaking it" is a genuinely unoccupied position.
- Running all tests instead of stopping at the first failure is cheap for small Python challenges, and is a visible differentiator against Kattis, CSES and Codeforces.

### Gaps
- Not verified this session:
  - **LeetCode:** the exact contents of the result panel (Input / Output / Expected, and "Last Executed Input" on TLE). leetcode.com was blocked.
  - **AtCoder:** the per-test-case table.
  - **CodeChef:** the per-test-file table.
  - **GfG:** the wording of its Wrong Answer message. The JS-rendered app wasn't fetchable and the search budget ran out.
  - **Codewars:** whether per-assertion expected/actual messages appear.
  - **CodeSignal Learn, NeetCode, CheckiO and Edabit:** what each test result looks like.
- **CSES conflict unresolved:** the official course text says only the first error is shown, while community reports suggest the Problem Set exposes the user's output and test data. Someone should check a real CSES Problem Set submission page while logged in.
- **Codeforces:** the official verdict list and its post-contest test visibility were seen only through forum snippets.

---

## 2. Which platforms provide progressive or AI hints today, and what guardrails stop them revealing solutions? (incl. editorial access and anti-copy)

### Takeaway
AI help is now standard on the commercial platforms:
- LeetCode "Ask Leet"
- CodeChef "AI Help"
- NeetCode "NeetBot"
- CodeSignal "Cosmo"
- Exercism's ChatGPT integration for Insiders
- HackerRank's AI mock interviewer

It is almost always metered or paywalled. **No platform publishes a concrete mechanism that stops its AI from revealing solutions.** The evidence points the other way:
- CodeChef's AI handed over full code (Apr 2025).
- A critic calls Ask Leet "capable of generating solutions".
- NeetCode's AI debugger shows a diff of the "suggested fix".
- CheckiO's last hint is "the actual solution".

Anti-copy measures rely on incentives (forfeiting points or streaks, as on Codewars and GfG) and on AI bans during contests (Codeforces, AtCoder). Hint design is not used.

### Cited Findings

**AI features, 2022–2026**

| Platform | Feature (date) | What it does | Gating / limits | Guardrail evidence | Source |
|---|---|---|---|---|---|
| LeetCode | **Ask Leet & Coding Agent.** 2026.3 added "Problem-Level Context" and new models (GPT-5.2, Gemini 3.1 Pro, Claude Sonnet 4.6). 2026.5 added **Quick Fix** ("With Auto-Completion enabled, ask Leet to analyze and fix code errors directly from the editor") and Kimi K2.5 "in Ask Leet and LLM Ranking" | Chat, debugging, fixing code | Premium gets "500 extra monthly credits to unlock the most advanced models" | None documented. A critic says it can "brainstorm solutions, optimize code, generate test cases, and debug errors" and is "capable of generating solutions… on demand", calling it "essentially GitHub Copilot for LeetCode". The author founded a competitor (CodeDuel) | [LeetCode release notes (snippet)](https://leetcode.com/discuss/post/5736503/feature-release-notes-by-leetcode-9awg/); [dev.to critique](https://dev.to/nahom_ashagrea_c4105b4a9c/leetcode-added-an-ai-assistant-we-built-an-ai-opponent-heres-why-that-matters-4bo1) |
| CodeChef | **"Explain code using AI"** (an older beta built on OpenAI Codex; exact date not captured): an "Analyze This Code" button, code of 1,000 characters or less, at most 10 uses per 24 h, and the announcement warns explanations are often not fully accurate. Then **AI Help** (in use by July 2024) | Explains code; helps when stuck | AI Help has a usage cap for free users, with the message "get a pro membership for unlimited access". The about page lists "Hints, Video solutions, AI Help, and Debugging features" as Pro features | **Leak reported 18 Apr 2025:** "instead of providing a head start, it gives me the full code". No staff reply is visible | [Explain-code post](https://discuss.codechef.com/t/new-feature-explain-code-using-ai/102523); [AI help issue (Jul 2024)](https://discuss.codechef.com/t/ai-help-issue/118838); [About](https://www.codechef.com/aboutus); [Leak report](https://discuss.codechef.com/t/ai-code-help-giving-entire-solution/123350) |
| NeetCode | **NeetBot** chat, **AI hints** and **AI debugging** (live on the Pro page, Oct 2026) | Hints, "analysis that explains what went wrong", "visual walkthroughs" | Pro: $119 per year or $297 lifetime | The page claims hints "guide you toward the solution without giving it away", **but** the debugger shows "a side-by-side diff of your code and the suggested fix directly in the editor" | [neetcode.io/pro](https://neetcode.io/pro) |
| CodeSignal Learn | **Cosmo** (launched 8 Feb 2024, waitlist at first) | Builds a learning path from your goals and level. "prompts you with personalized challenges and unblocks you when you get stuck". Can evaluate code | Free tier: each question or code evaluation costs 1 of 5 "energy bars", and one bar recharges every 4 h. Unlimited energy costs up to $24.99/month | No official statement that it withholds answers. A G2 user says it nudges "instead of simply giving away the answers" | [TechCrunch](https://techcrunch.com/2024/02/08/codesignal-launches-a-learning-platform-with-an-ai-powered-guide/); [CodeSignal blog](https://codesignal.com/blog/introducing-codesignal-learn/); [G2](https://g2.com/products/codesignal/reviews) |
| Exercism | **ChatGPT integration** for Insiders (5 Apr 2023) | Help when stuck, plus automated feedback when you finish | Insiders only, a donor/contributor tier | Exercism itself calls it "a purely fun feature at this stage", "awesome about half the time, and useless the other half". No guardrails are described | [Exercism blog](https://exercism.org/blog/insiders-preview); [Insiders page](https://exercism.org/insiders) |
| HackerRank | **AI-powered mock interviews**, voice or chat, with immediate feedback. Found under the Prepare tab (help doc updated 19 Feb 2026) | Interview practice | ? | ? | [HackerRank community KB (snippet)](https://hackerrank-community-knowledge-base.help.usepylon.com/articles/8988753946) |
| Codeforces | No platform AI. **AI restriction rule** (14 Sep 2024) | Rated rounds: translating the statement is allowed, and code completion only "for syntax and minor coding suggestions". Pasting the statement into an AI to get code or an approach is prohibited. Identical code that was not public before the round counts as evidence of cheating. AI is free to use for practice | — | Contest-only ban | [MikeMirzayanov blog (snippet)](https://codeforces.com/blog/entry/133941) |
| AtCoder | No platform AI. **Generative-AI rules** for ABC, ARC and AGC (2024, updated 3 Oct 2025) | Only translation is allowed during live contests: "Any other outputs such as summaries of the problem statement, algorithms, or strategies are strictly prohibited". Practice on past problems is not covered | — | Contest-only ban. Rationale (2024): AI-solving is "neither valuable as a competition nor as proof of IT engineering skills" | [AtCoder LLM rules (current)](https://info.atcoder.jp/entry/llm-rules-en); [2024 ABC rules](https://info.atcoder.jp/entry/llm-abc-rules-en); [AtCoder post 1247](https://atcoder.jp/posts/1247) (rationale attribution from search snippet) |

**Static or progressive hints written by people**
- **GeeksforGeeks (POTD):** "Marks are deducted on hints usage but your submission will still be considered for a Geek Bit" ([GfG POTD rule book](https://www.geeksforgeeks.org/problem-of-the-day/rule-book)). Hints cost points. That is the only documented hint-cost mechanism found.
- **CheckiO:**
  - Mission authors write the hints as a dialog. "Every next step explains part of the final solution." "**The final step shows the actual solution.** You can copy-paste it into your editor to see what kind of mistakes you have made" (Oct 2022) ([CheckiO blog](https://py.checkio.org/blog/hints-for-mission/)).
  - Hints are "a form of conversation between one or more mission authors", stored in a shared repository anyone can add to (2014) ([CheckiO blog](https://py.checkio.org/blog/everything-you-need-know-about-hints)).
- **CodingBat:** problems marked "H" may have hint text, solution code, or both, and all Warmup problems have solution code ([CodingBat help](https://codingbat.com/help.html)).
- **CodeChef:** "Hints" moved into Pro at the Aug 2022 launch ([Pro announcement](https://discuss.codechef.com/t/introducing-codechef-pro/102300)). Learning paths include "Hints, Text and Video explanation of the solutions" ([About](https://www.codechef.com/aboutus)).
- **Codewars:** no hint system is documented. For persistent failures the docs point to a troubleshooting FAQ ([Codewars docs](https://docs.codewars.com/getting-started/solving-kata)).

**Editorial / solution access and anti-copy**
- **GfG:** "You will not earn any GeekBit if you view the full solution or editorial before submitting the answer. This will also break your POTD streak" ([GfG rule book](https://www.geeksforgeeks.org/problem-of-the-day/rule-book)).
- **Codewars:** "Unlock Solutions… will forfeit any honor and rank progression that you could earn on the kata" ([Codewars docs](https://docs.codewars.com/concepts/kata/solutions/)). Giving up also reveals the full test code, and solving the kata later, even in another language, earns nothing ([Codewars docs](https://docs.codewars.com/getting-started/solving-kata)).
- **CodeChef:** video editorials are free for 24 h after a contest and then Pro-only. Admins promised "Contests will always be a level-playing field", meaning no WA-debugging help in contests ([Pro announcement](https://discuss.codechef.com/t/introducing-codechef-pro/102300)).
- **CSES:** other users' solutions become viewable after you solve a problem, as part of hacking ([CSES paper](https://ioinformatics.org/journal/v14_2020_105_111.pdf)).

**Third-party AI hint extensions (unofficial, they fill the gap on LeetCode and GfG)**
- **AlgoBhai:** "5 hints that build on each other", works on LeetCode and GfG, needs your own Gemini key ([Chrome Web Store](https://chromewebstore.google.com/detail/hkknjjlljlbkjpcjbpafempobmekcjli)).
- **LeetCode Hint Engine:** up to 3 progressive hints, with a choice of Groq, Gemini, OpenAI, Claude or Cohere using your own key ([ChromeBoard listing](https://chromeboard.com/extension/leetcode-hint-engine-mkllhndmlanbibhbomnpgembgjicpafe)).
- **CodeHelper (Firefox):** hints "that don't reveal the full solution", brute-force first, automatic help after you've been stuck a while, needs your own Anthropic key ([Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/codehelper/)).
- **LeetCopilot:** hints, study notes and mock interviews ([leetcopilot.dev](https://leetcopilot.dev/)).
- **LeetCode Sprint:** an AI complexity analyser and an AI debug button ([hunted.space](https://hunted.space/product/leetcode-sprint)).
- Some open-source "agents" go further and auto-generate and submit LeetCode solutions ([GitHub kvianAR/leetcode-ai-agent](https://github.com/kvianAR/leetcode-ai-agent)).

### Inferences
- Every guardrail found is a **marketing claim** (NeetCode), **user testimony** (CodeSignal) or **incentive-based** (GfG, Codewars). None is an enforced check on the hint text itself. A deterministic "does this hint contain the solution?" check would be a credible differentiator. Examples: token or AST similarity against the reference solution, or a ban on hints that include complete function bodies.
- CheckiO, CodingBat and NeetCode's suggested-fix diff all end in the solution. PS E-02 explicitly forbids this, so "a hint ladder that tops out at a pseudo-code skeleton, never code" is a clear contrast to show judges.
- Paywalls and metering (CodeChef Pro, NeetCode Pro, LeetCode credits, Cosmo energy bars) show that AI help is expensive to run. A deterministic-first design that uses an LLM only for the final hint tier fits the team's "minimal LLM" goal and also explains why the product could be free.
- Contest platforms switch feedback and AI off depending on the context. CodeQuest could copy this with an "exam mode" that withholds hints and AI, giving an honest measure of skill.

### Gaps
- Not verified this session:
  - Whether LeetCode's per-problem static hints and Premium-only editorials still exist (well known, but leetcode.com was blocked).
  - Whether Ask Leet is disabled during contests.
  - When Ask Leet first launched (the release-notes snippets cover only 2026.3 and 2026.5).
- **HackerRank "AI Tutor" (in SkillUp):** the only description found was an unofficial mirror of a demo video ("hints without giving away the answer"), so it is unverified.
- **GfG:** no official GfG AI hint or tutor feature was found. Searches returned only third-party extensions.
- **CodeChef:** no public documentation of how AI Help is prompted or limited.

---

## 3. Who tracks skills by concept or detects recurring mistakes, and does anyone adapt future problems to a learner's specific mistakes?

### Takeaway
**No reviewed platform detects a learner's recurring mistake patterns across submissions, and none adapts the next challenge to them.** Personalisation exists only at coarser levels:
- by rank or training routine (Codewars)
- by stated goals and skill level (CodeSignal Cosmo)
- by unlocking concepts as they are completed (Exercism learning mode)

Exercism comes closest with deterministic tools. Its analyzers flag common mistakes in each solution, and its representers reuse mentor feedback for structurally identical solutions. Both work one submission at a time; neither builds a picture of the learner over time.

### Cited Findings
- **Exercism analyzers (per-solution, per-exercise)**
  - Each analyzer writes `analysis.json` with a `summary` and `comments`. Comments are typed `essential` (the student is "soft-blocked until they address the comment"), `actionable`, `informative` or `celebratory` ([Exercism analyzer interface](https://exercism.org/docs/building/tooling/analyzers/interface)).
  - Analyzers should also write `tags.json` in `"<category>:<thing>"` form, for example `technique:recursion` or `construct:bitwise-and` (same source). In effect this is a concept-tagging feed.
  - The Python analyzer "is based on and uses PyLint" and runs in Docker. Its repo is tagged "community-contributions-paused" ([exercism/python-analyzer](https://github.com/exercism/python-analyzer)).
- **Exercism representers (deterministic reuse of feedback)**
  - A representer normalises a solution, removing differences in formatting, comments and variable names, and "Two different ways of solving the same exercise must not have the same representation" ([Exercism representers](https://exercism.org/docs/building/tooling/representers)).
  - Mentors comment on a representation once, and "These comments will then automatically be submitted to each new solution with the same representation". Old matching solutions get a notification (same source).
  - Exercism said its automated feedback had given instant feedback on 800,000+ solutions by April 2023 ([Exercism blog](https://exercism.org/blog/insiders-preview)).
- **Exercism concept tree (progression by completion)**
  - Each track's syllabus is a tree with an introductory exercise at the root. Later concepts depend on earlier ones ([Exercism syllabus docs](https://exercism.org/docs/building/tracks/syllabus)).
  - Locked concepts show what you must learn to unlock them. Turning Learning Mode off unlocks all Practice Exercises but disables Concepts and Learning Exercises ([Exercism forum](https://forum.exercism.org/t/learn-vs-practice-mode/38380/11); [Exercism forum](https://forum.exercism.org/t/locked-problems/3828)).
- **Codewars training routines (rank-based, not mistake-based)**
  - "Fundamentals" is the default for new programmers. "Rank Up" moves quickly from easy to harder kata. "Practice and Repeat" serves only kata you have already trained on. "Beta" cycles through kata still being vetted ([Codewars docs](https://docs.codewars.com/concepts/kata/training-routines)).
  - Kata categories are crowdsourced, so some "fundamental" kata are miscategorised (same source).
- **CodeSignal Learn**
  - Cosmo asks what you want to learn and your skill level, then builds a path ([TechCrunch](https://techcrunch.com/2024/02/08/codesignal-launches-a-learning-platform-with-an-ai-powered-guide/)).
  - "Each course you complete is then added to a skills profile that employers trust" ([CodeSignal blog](https://codesignal.com/blog/introducing-codesignal-learn/)).
  - The skill profile works at the course level and is based on completion.
- **CodeChef:** learning paths and practice paths are the main features, and contest ratings appear on the public profile ([CodeChef About](https://www.codechef.com/aboutus)).
- **Gamification signals that were verified**
  - **GfG:** Geek Bits for the Problem of the Day (POTD), with "8 additional Geek Bits" for an 8-day streak and over 50 needed to redeem prizes ([rule book](https://www.geeksforgeeks.org/problem-of-the-day/rule-book)).
  - **Codewars:** honor and rank progression ([docs](https://docs.codewars.com/concepts/kata/solutions/)).
  - **CodingBat:** a green check per problem, and a gold star after 3 checks in a section ([help](https://codingbat.com/help.html)).
  - **Edabit:** XP, achievements and levels ([dev.to/edabit](https://dev.to/edabit)).
  - **HackerRank:** Hackos points ([dev.to](https://dev.to/kitarp29/hackerrank-is-must-for-beginners-p0p)).
  - **CSES:** hacking other users' solutions ([CSES paper](https://ioinformatics.org/journal/v14_2020_105_111.pdf)).
- **Third-party guides name the mistakes CodeQuest wants to detect** as the common reasons for partial failures:
  - "Off-by-one errors are the most common cause of partial failures"
  - "Empty Input Not Handled"
  - integer overflow, single-element input, wrong comparison operators, and not resetting state

  ([dev.to, Dec 2025](https://dev.to/alex_hunter_44f4c9ed6671e/why-my-leetcode-solution-passes-some-test-cases-but-fails-others-1k7p)). No platform turns these categories into feedback for the individual learner.

### Inferences
- The space is empty and easy to explain to judges. Exercism's representer/analyzer pair shows that **deterministic** mistake detection works at scale (800k+ solutions). What nobody adds is (a) **per-learner memory** of which mistake classes recur, and (b) a **policy that picks the next challenge** to target them.
- Exercism's `tags.json` (`construct:*`, `technique:*`) is a ready-made vocabulary for concept-level skill tracking. If CodeQuest tags tests, hints and mistakes with the same vocabulary, a mastery model can update per concept.
- Codewars' "Practice and Repeat" and Exercism's unlock tree are both deterministic progression policies. CodeQuest can show the difference in one line: "they adapt to what you've *completed*; we adapt to what you keep *getting wrong*".

### Gaps
- Not verified this session (search budget exhausted):
  - LeetCode's profile skills breakdown by tag (Advanced / Intermediate / Fundamental)
  - HackerRank skill certifications (Python Basic / Intermediate) and its stars and badges
  - Whether CodeChef has topic-wise ratings (the brief mentions "CodeChef topic ratings", but I found no source)
  - Codewars per-language rank display
- No evidence was found for or against LeetCode or HackerRank recommendation engines that adapt to mistakes. This is "not found", not confirmed absent.

---

## 4. Which platforms offer debugging-practice formats ("here is buggy code, fix it")?

### Takeaway
Debugging practice is rare and static on the mainstream platforms:
- HackerRank's "Zig Zag Sequence" lets you change at most three lines.
- CodeChef ran a one-off "find the failing test for this buggy submission" contest (DeCode 2022) and lists unspecified "Debugging features" under Pro.
- NeetCode and LeetCode now use AI to debug *your own* code, which is not deliberate practice.

The most relevant new work is academic. **BugSpotter (SIGCSE'25)** uses an LLM to generate buggy code from a problem description, verifies the bugs with tests, and has students write a failing test case. No platform generates debugging exercises from a learner's own past bugs.

### Cited Findings
- **HackerRank "Zig Zag Sequence"** (One Week Preparation Kit): "debug the existing code to successfully execute all provided test files". You "can modify at most three lines" and "cannot add or remove lines of code", and an icon restores the original code ([HackerRank problem page](https://www.hackerrank.com/challenges/one-week-preparation-kit-zig-zag-sequence/problem)).
- **HackerRank assessments:** HackerRank says it is moving toward "real-world debugging scenarios and RAG-based evaluations" on "realistic codebases, complete with dependencies, configuration files, and existing business logic" ([HackerRank playbook](https://www.hackerrank.com/writing/designing-real-world-debugging-rag-tasks-technical-assessments-playbook)). A candidate on Blind complained that debugging on HackerRank meant console logs instead of breakpoints ([Blind](https://www.teamblind.com/post/hackerrank-debugging-interview-ytjmkts3)).
- **CodeChef**
  - Pro lists "Debugging features" and learning paths include "AI powered Help and other debugging features" ([CodeChef About](https://www.codechef.com/aboutus)).
  - The 2022 Pro launch made "WA Test Cases" a paid debugging aid, and one user warned that WA debugging "will foster bad habits" ([Pro announcement](https://discuss.codechef.com/t/introducing-codechef-pro/102300)).
  - DeCode 2022 inverted the usual task: contestants got problems with buggy submissions and had to find a test where the buggy solution fails ([Codeforces announcement (snippet; attribution from search)](https://codeforces.com/blog/entry/100758)).
  - An old community tool, BUGCHEF, shared test cases and reported the line where your output first differs from an accepted output ([CodeChef Discuss](https://discuss.codechef.com/t/codechef-debugging-tool/15197)).
- **AI debugging of your own code, not practice**
  - LeetCode "Quick Fix" analyzes and fixes code errors from the editor (2026.5) ([LeetCode release notes (snippet)](https://leetcode.com/discuss/post/5736503/feature-release-notes-by-leetcode-9awg/)).
  - NeetCode's AI debugging shows "a side-by-side diff of your code and the suggested fix" ([neetcode.io/pro](https://neetcode.io/pro)).
  - CodeChef's older "Analyze This Code" explained code with Codex ([CodeChef Discuss](https://discuss.codechef.com/t/new-feature-explain-code-using-ai/102523)).
- **BugSpotter** (Pădurean, Denny, Singla; arXiv Nov 2024, SIGCSE'25)
  - Motivation: students rely on "trial-and-error methods to resolve bugs".
  - Method: an LLM generates buggy code from a problem description and a test suite verifies the bugs. Students then write failing test cases where the buggy output differs from the specification.
  - Results: in a large classroom deployment, the generated exercises varied in difficulty, matched the specifications well, and produced student performance comparable to instructor-written exercises ([arXiv 2411.14303](https://arxiv.org/abs/2411.14303)).
- **Other niche tools**
  - CodeMender, a 2024 Show HN for front-end debugging with "a variety of intentional bugs" ([HN mirror](https://hn.svelte.dev/item/40172302)).
  - TU Delft's 2025 "BugBuster" Python assignment, which teaches VS Code breakpoints and is CC BY 4.0 ([TU Delft MUDE](https://mude.citg.tudelft.nl/workbook-2025/assignments/PA1.7/README.html)).

### Inferences
- Combining BugSpotter's verified-bug generation with CodeQuest's per-learner mistake memory would give debugging drills built from **the learner's own recurring bug class**, for example an off-by-one injected into a fresh problem. This is not found anywhere, and it can be done deterministically: mutation operators like `range(n)` → `range(n-1)`, or deleting an empty-input guard, then checking with tests that the mutant fails. No LLM is needed.
- HackerRank's "modify at most three lines" constraint is a cheap, judge-friendly mechanic worth borrowing. It stops learners from rewriting the whole function and forces them to localise the bug.

### Gaps
- Searches for a dedicated, active "debugging practice" startup with real traction were inconclusive. Recticode's listing had an unreliable date and wasn't verified.
- Not verified: whether Codewars has a "Debugging" tag or collection of kata. It is widely believed to exist, but no source was retrieved this session.
- CodeChef's current Pro "Debugging features" are not defined in any public doc found.

---

## 5. What do users complain about regarding feedback quality?

### Takeaway
Complaints cluster around five themes:
1. **No direction after a hidden-test failure:** "Wrong answer on pretest 2" with no clue about which test or why.
2. **Run and Submit disagree, or the problem statement and the tests disagree.**
3. **Paywalled debugging help:** CodeChef Pro's WA test cases and doubt support, and practice problems moving behind Pro in Oct 2025.
4. **AI help that over-helps:** it hands over full code.
5. **Poor editorials.**

The competitive-programming community also argues the other side: blind debugging builds skill. That supports a middle path of hints that point a direction without revealing the hidden test.

### Cited Findings
- **CodeChef learners want the failing test**
  - Learners ask to see failing test cases, saying "it becomes very difficult to understand what is wrong with code as i dont get to see the new test case". A moderator answered that you must deduce them yourself, or ask for help if it's a practice problem ([CodeChef Discuss](https://discuss.codechef.com/t/will-codechef-provide-test-cases/125/40); [CodeChef Discuss](https://discuss.codechef.com/t/include-a-process-to-view-the-failing-test-cases/20541); [CodeChef Discuss](https://discusstest.codechef.com/t/codechef-should-provide-the-failed-test-cases-it-would-really-help-the-newcomers/17273)).
  - A counter-view in the same community: once you see where it fails, "you will think it was just a minor fault… but you wont improve/learn much about test case generation and thinking about corner cases" ([CodeChef Discuss](https://discuss.codechef.com/t/practice-on-codechef/75340); [CodeChef Discuss](https://discuss.codechef.com/t/provide-the-test-cases-after-the-contets/3656)).
- **Codeforces**
  - A "Wrong answer on pretest 2" is described as "a pretty frustrating feeling". Another author wants the failing input shown because it is hidden behind an unclickable "…" ([CF blog (snippet)](https://codeforces.com/blog/entry/104970); [CF blog (snippet)](https://mirror.codeforces.com/blog/captainkhan)).
  - Users ask for full test downloads "like CSES" ([CF blog (snippet)](https://codeforces.com/blog/entry/124980)).
- **LeetCode**
  - "'Accepted!' then 'Wrong Answer.' How to view all test cases?" ([LeetCode Discuss](https://leetcode.com/discuss/general-discussion/548314/accepted-then-wrong-answer-how-to-view-all-test-cases)).
  - Run and Submit disagree ([LeetCode Discuss](https://leetcode.com/discuss/feedback/207419/run-code-and-submit-have-different-results)).
  - A statement example contradicts the hidden expectation ([GitHub issue #26042](https://github.com/LeetCode-Feedback/LeetCode-Feedback/issues/26042)).
- **GfG:** a submission got WA even though the same input in the custom-input window looked correct ([Codeforces topic](https://codeforces.com/topic/105200/en1)).
- **CodeChef Pro backlash**
  - 2022: "Your doubt support is useless", and WA debugging "will foster bad habits" ([Pro announcement thread](https://discuss.codechef.com/t/introducing-codechef-pro/102300)).
  - 3 Oct 2025: users report that previously free practice problems, including "simple low rated questions", now need a subscription. A reply called it "an intentional change" ([CodeChef Discuss](https://discuss.codechef.com/t/why-all-questions-became-pro-questions-today-all-of-a-sudden/124329)). The 2022 announcement had promised "Unlimited Practice and Contest participation will always continue to be free" ([Pro announcement](https://discuss.codechef.com/t/introducing-codechef-pro/102300)).
- **AI help that over-helps**
  - CodeChef's AI help "gives me the full code" (Apr 2025) ([CodeChef bug report](https://discuss.codechef.com/t/ai-code-help-giving-entire-solution/123350)).
  - Ask Leet makes unassisted skill harder to measure ([dev.to critique, competitor-authored](https://dev.to/nahom_ashagrea_c4105b4a9c/leetcode-added-an-ai-assistant-we-built-an-ai-opponent-heres-why-that-matters-4bo1)).
  - Exercism says its own ChatGPT help is "useless" half the time ([Exercism blog](https://exercism.org/blog/insiders-preview)).
- **Editorial quality and AI as tutor (HN, 2023-08-17):** "the Leetcode editorials are usually pretty poorly written" and "I am finding ChatGPT a great tutor during coding interview prep" ([HN comment](https://news.ycombinator.com/item?id=37162405)).
- **Hidden tests as a feature (HN, 2026-09-10):** "they've added some hidden test case that causes naive solutions and algorithms to blow up" ([HN comment](https://news.ycombinator.com/item?id=49647090)).
- **Kattis says it outright:** a secret-test failure gives no content, and the advice is to write your own corner-case tests ([Kattis support](https://support.kattis.com/support/solutions/articles/79000030851-my-submissions-are-getting-rejected-what-can-i-do-)).

### Inferences
- The core pain isn't that hidden tests exist (some users value them). It is that **they give no direction**. Revealing the category of a failed hidden test, and its outcome class, answers the most common complaint while keeping the "think about corner cases" learning value that the CodeChef counter-view wants.
- Distrust of AI tutors that over-help is now well documented. "Deterministic first, LLM last, with a leak check" is a story judges will recognise.

### Gaps
- **Reddit couldn't be searched** (domain blocked for this toolchain), so there are no quotes from r/leetcode, r/learnprogramming, r/codeforces or r/developersIndia. A teammate should pull 3–5 Reddit quotes manually if the pitch needs them.
- HN Algolia queries returned only a few relevant comments.
- No quantitative survey data on learner frustration was found.

---

## 6. How does Exercism's test-runner interface work (the closest open-source analogue)?

### Takeaway
Exercism's pipeline is a deterministic, well-specified template that CodeQuest can largely copy:
- **Test runner (results.json v1/v2/v3):** a status for each test (`pass`/`fail`/`error`), the code that ran, a cleaned message, up to 500 characters of the learner's own output, and an optional `task_id`.
- **Sandbox:** `--network none`, a 20 s window, 3 GB of memory.
- **Analyzers:** typed comments (`essential`/`actionable`/`informative`/`celebratory`) plus concept tags.
- **Representers:** reuse mentor feedback across normalised solutions.

Its main limitations for PS E-02:
- no hidden tests
- no separate timeout or wrong-output status for each test (a timeout halts the whole run)
- no per-learner history

### Cited Findings
- **How it is invoked:** the runner is an executable that takes the exercise slug, a **read-only** input directory and a writable output directory. It writes `results.json`, uses `/tmp` for scratch, and must exit 0 even when tests fail. Each solution gets "a 20-second window with 100% CPU and 3GB of memory". After 20 s the process is halted and reported as a timeout ([Exercism test-runner interface](https://exercism.org/docs/building/tooling/test-runners/interface)).
- **Top-level fields** (same source):
  - `version`: 1 = cannot report individual tests; 2 = reports individual tests (the minimum for Concept Exercises); 3 = tests can be linked to a task.
  - `status`: `pass` (all tests passed), `fail` (at least one test failed or errored), or `error` (no test executed, usually a compile or syntax error).
  - `message`: required on `error` or on a version-1 `fail`, with a 65,535-character limit. **Formatting guidance:** shorten paths to `<solution-dir>/relative/path`, collapse stack frames that aren't the user's code, never show a call stack without the error message, and keep error messages unchanged where possible.
  - `tests`: the array must follow the order of the test file.
- **Per-test fields** (same source):
  - `name`: required.
  - `test_code`: required for Concept Exercises, recommended otherwise.
  - `status`: `pass`, `fail`, or `error` (the test "did not return a value").
  - `message`: required on fail or error, shown to the student, with no length limit.
  - `output`: only output the user deliberately produced, **limited to 500 characters**, e.g. truncated with "Output was truncated. Please limit to 500 chars".
  - `task_id`: version 3 only. Set it only if the test maps to exactly one task; currently only Concept Exercises have tasks.
  - **On the website:** on failure the site shows the test code followed by the message; on success, only the test code.
- **Sandbox:** the example `docker run` uses `--network none`, `--tmpfs /tmp:rw` and `--rm`, with the solution bind-mounted at `/solution` and output at `/output` ([Exercism test-runner Docker docs](https://exercism.org/docs/building/tooling/test-runners/docker)).
- **Python implementation** ([runner source](https://raw.githubusercontent.com/exercism/python-test-runner/main/runner/__init__.py); [repo README](https://github.com/exercism/python-test-runner)):
  - The runner is a pytest plugin (`ResultsReporter`).
  - It registers a `task(taskno)` marker and maps it to `task_id`.
  - Test names come from pytest node IDs.
  - It forces `--tb=no` and builds messages from the report's `longrepr`, with the `E ` prefixes stripped and the working directory replaced by `.`.
  - Setup or teardown failures become `error`.
  - The reviewed `__init__.py` has **no timeout logic and no output truncation**. Those are presumably enforced by the infrastructure (the 20 s window) and elsewhere.
  - Golden tests compare the generated `results.json` with known-good files.
- **Analyzer interface:** the same 3-argument invocation with a 20 s window. It writes `analysis.json` (an optional plain-text `summary` plus `comments`, each pointing to a Markdown template in `exercism/website-copy` with `%{param}` interpolation) and, optionally, `tags.json` ([Exercism analyzer interface](https://exercism.org/docs/building/tooling/analyzers/interface)).
  - **Comment types:** `essential` soft-blocks the student; `actionable` is encouraged before completion, but only on Practice Exercises; `informative` gives information with no action expected; `celebratory` praises good work. Comments with no type default to `informative`.
- **Representers:** each track has its own `<track_slug>-representer` repo. The website orchestrates matching normalised solutions to feedback mentors have already written ([Exercism representers](https://exercism.org/docs/building/tooling/representers)).

### Inferences
- **Proposed CodeQuest schema, adapted from Exercism v3:**
  - Keep `name`, `status`, `message`, `output` (500-character cap), `test_code` (visible tests only) and `task_id`.
  - Widen `status` to `passed | wrong_output | runtime_error | timeout` for each test.
  - Add `visibility: visible|hidden`.
  - Add `category` (for example `empty_input`, `boundary`, `large_input`) and `concepts[]`. For hidden tests, emit only `name`, `status`, `category` and a plain-language message; never the input, expected value or `test_code`.
  - Time out per test (for example 2 s each within an overall cap), so one infinite loop doesn't erase all the other results the way a whole-run timeout does.
- Exercism's message-hygiene rules (shorten paths, collapse frames outside the user's code, never a stack without the error message) are a deterministic first step toward "plain-language failure explanations". A rule table mapping Python exception types to beginner wording can sit on top.
- The four analyzer comment types map naturally onto hint tiers and onto UI badges (blocking / suggestion / FYI / praise).
- Representers are a deterministic way to cache feedback: normalise a submission (via the AST) and reuse the explanation for any identical wrong approach. This is cheaper and more predictable than an LLM call per submission.

### Gaps
- How Exercism enforces the 500-character output cap and per-run memory limits in production (orchestrator code) was not reviewed.
- Which specific Python exercises the PyLint analyzer covers, and what its comments say, was not retrieved.
- Whether Exercism's web editor has added an "I'm stuck" help button since the forum discussion is unverified.

---

## 7. Gap analysis: PS E-02 requirements × platforms, and "nobody does this" opportunities

### Takeaway
Across 15 platforms, the PS E-02 requirements nobody covers are:
- recurring-mistake detection per learner, and challenge selection that adapts to those mistakes
- explanations of hidden-test failures that reveal nothing
- per-test outcome classes (including per-test timeouts)
- AI hints with an enforced anti-leak check
- debugging drills generated from the learner's own bugs

Partly covered:
- sandboxing (well documented only by Exercism and CSES)
- per-test reporting (HackerRank, Exercism, CodingBat)
- progressive hints (GfG's hint cost, CheckiO, CodingBat, which still end in solutions)

The team's extras (portfolio, LeetCode companion extension, roadmap, typing trainer) each already exist as standalone products. Their novelty has to come from feeding the same mistake model.

### Cited Findings

**Pricing relevant to students (as found)**

| Platform | Free tier | Paid | Source |
|---|---|---|---|
| LeetCode | Free problems; Ask Leet has credits | Premium about $35/month or $159/year (third-party pages, checked Oct 2026). Premium adds "500 extra monthly credits" for Ask Leet | [Toolradar](https://toolradar.com/tools/leetcode/pricing); [Lodely](https://www.lodely.com/blog/leetcode-premium-cost); [release notes (snippet)](https://leetcode.com/discuss/post/5736503/feature-release-notes-by-leetcode-9awg/) |
| CodeChef | "Unlimited Practice and Contest participation will always continue to be free" (2022), but in Oct 2025 users reported practice problems moving behind Pro | Pro at ₹3,999/year at its Aug 2022 launch (₹1,999 introductory); current price unverified | [Pro announcement](https://discuss.codechef.com/t/introducing-codechef-pro/102300); [Oct 2025 thread](https://discuss.codechef.com/t/why-all-questions-became-pro-questions-today-all-of-a-sudden/124329) |
| NeetCode | ? | $119/year or $297 lifetime | [neetcode.io/pro](https://neetcode.io/pro) |
| CodeSignal Learn | Free lessons plus 5 Cosmo "energy bars" (1 recharges every 4 h) | Up to $24.99/month for unlimited energy (Feb 2024) | [TechCrunch](https://techcrunch.com/2024/02/08/codesignal-launches-a-learning-platform-with-an-ai-powered-guide/) |
| Exercism | Practice and mentoring; ChatGPT integration is an Insiders perk | Insiders through donating or contributing | [Exercism blog](https://exercism.org/blog/insiders-preview); [Insiders](https://exercism.org/insiders) |
| Edabit | "only 15 challenges are available for free" | $39/month, $120/year, $299 lifetime (undated comparison page) | [Common Sense Education](https://www.commonsense.org/education/reviews/edabit); [Slashdot](https://slashdot.org/software/comparison/Edabit-vs-SPOJ/) |
| GfG (POTD) | Geek Bits rewards ("over 50 Geek Bits to be eligible for redeeming prizes") | ? | [GfG rule book](https://www.geeksforgeeks.org/problem-of-the-day/rule-book) |

**Sandboxing precedent (for the "restricted environment" requirement)**
- **Exercism:** `--network none`, a 20 s window, 3 GB of memory, a read-only input directory and tmpfs `/tmp` ([interface](https://exercism.org/docs/building/tooling/test-runners/interface); [Docker](https://exercism.org/docs/building/tooling/test-runners/docker)).
- **CSES:** user code runs in the **Isolate** sandbox ("namespace and control group features of the Linux kernel") on a Rust judge, and "each judge server runs at most one job at a time" to avoid timing interference ([CSES paper, 2020](https://ioinformatics.org/journal/v14_2020_105_111.pdf)).
- **CSES scale:** about 700,000 total submissions and 5,000 per day at the time of writing (2020), with India the 2nd most active country (same source).

**The extras already exist as standalone products**
- **Unified portfolio**
  - Codolio (Bangalore, founded 2024) integrates LeetCode, GfG, InterviewBit, CodeChef and Codeforces. It tracks streaks across platforms, classifies problems, charts contest ratings, and has a question tracker and company-wise sheets ([Codolio LinkedIn](https://in.linkedin.com/company/codolio)).
  - Codolio also has a browser extension (about 3,000 users per a third-party scanner) ([Extension Auditor](https://extensionauditor.com/scan/codolio-hhldiohknhejgggdehdeepiggieflfjo)).
  - Hobby dashboards such as CoderHub and coderstat do the same ([dev.to CoderHub](https://dev.to/prashantug21/i-built-coderhub-a-unified-dashboard-to-track-leetcode-codeforces-codechef-gfg-progress-2m18); [GitHub coderstat](https://github.com/amanbind898/coderstat)).
- **LeetCode companion extensions:** many already exist (AlgoBhai, LeetCode Hint Engine, CodeHelper, LeetCopilot, LeetCode Sprint; see §2), plus LeetSync, which pushes LeetCode and GfG solutions to GitHub ([Chrome Web Store](https://chromewebstore.google.com/detail/ahjbmbncipkpgfckdloiglgdbgnpeneo)).
- **Roadmap:** NeetCode Pro links a roadmap and the Blind 75 / NeetCode 150 / NeetCode 250 lists ([neetcode.io/pro](https://neetcode.io/pro)).
- **Code-typing trainers**
  - typing.io: lessons drawn from open-source code, keeping symbol keys and backspace in the drills ([typing.io](https://typing.io/)).
  - SpeedCoder: reports WPM, accuracy and a heatmap of the keys you miss most; can import code from GitHub ([speedcoder.net](https://speedcoder.net/)).
  - Typre: 2,590 snippets across 14 languages ([GitHub Typre](https://github.com/TypraVN/Typre)).

### Inferences

**Gap table.** Platforms: LC = LeetCode, CF = Codeforces, CC = CodeChef, HR = HackerRank, AtC = AtCoder, GfG = GeeksforGeeks, Ex = Exercism, CW = Codewars, Kat = Kattis, CSL = CodeSignal Learn, NC = NeetCode, CSES, CkO = CheckiO, CB = CodingBat, Eda = Edabit. Every cell comes from the evidence in §1–§6; ? means unverified, not absent.

| PS E-02 requirement | LC | CF | CC | HR | AtC | GfG | Ex | CW | Kat | CSL | NC | CSES | CkO | CB | Eda |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sandbox restrictions publicly documented (no network, bounded time/memory) | ? | ? | ? | ? | ? | ? | ✅ | ? | ? | ? | ? | ✅ | ? | ? | ? |
| Every test's outcome reported (not just the first failure) | ❌ | ❌ | ? | ✅ | ? | ? | ✅ | ? | ❌ | ? | ? | ⚠️ | ? | ✅ | ? |
| Separate outcome per test (passed / wrong output / runtime error / timeout) | ⚠️ | ⚠️ | ? | ⚠️ | ⚠️ | ? | ⚠️ | ? | ⚠️ | ? | ? | ⚠️ | ? | ⚠️ | ? |
| Hidden tests never revealed, even on failure | ❌ | ⚠️ | ⚠️ | ⚠️ | ? | ? | — | ⚠️ | ✅ | ? | ? | ⚠️ | ? | ✅ | ? |
| Plain-language failure explanation, free by default | ⚠️ | ❌ | ⚠️ | ? | ❌ | ❌ | ⚠️ | ? | ❌ | ⚠️ | ⚠️ | ❌ | ? | ❌ | ? |
| Progressive hints that never reveal the full solution | ⚠️ | ❌ | ⚠️ | ⚠️ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ | ? |
| AI hints with an enforced anti-leak guardrail | ❌ | — | ❌ | ? | — | ❌ | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ? |
| Recurring mistakes detected per learner, across submissions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Future challenges adapted to those mistakes | ❌ | ❌ | ? | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Concept-level skill/mastery tracking | ? | ❌ | ? | ? | ❌ | ? | ⚠️ | ? | ❌ | ⚠️ | ? | ❌ | ? | ❌ | ? |
| Debugging-practice ("fix this buggy code") format | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ? | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ? |
| Deterministic (non-LLM) automated feedback beyond the verdict | ⚠️ | ⚠️ | ? | ⚠️ | ❌ | ? | ✅ | ? | ❌ | ? | ? | ❌ | ? | ⚠️ | ? |

**Why some cells are marked ⚠️:**

| Platform | Reasons |
|---|---|
| LeetCode | Its verdict covers the whole submission, and the failing input is sometimes shown. Ask Leet is credit-metered and can generate full solutions. |
| Codeforces | Verdict plus test number; tests only partly visible after the contest. |
| CodeChef | WA test cases, hints and AI Help are paid or capped; AI leaked full code; DeCode was a one-off. |
| HackerRank | Status is pass/fail only; a lock icon hides tests, but Hackos can reportedly unlock them; Zig Zag is a single static exercise. |
| Exercism | Status per test is pass/fail/error and a timeout covers the whole run; there are no hidden tests; analyzers work per solution; concept tree progresses by completion. |
| Codewars | Hidden until solved or forfeited; routines are based on rank. |
| CSES | Contradictory sources on whether test data is visible. |
| CodeSignal Learn | Cosmo is metered by energy bars; paths are based on goals and level; skills profile is per course; no-answer claims come only from users. |
| NeetCode | "No giveaway" is a marketing claim, yet the debugger shows the suggested fix. |
| GfG | Hints cost marks; whether they form a ladder is unverified. |
| CodingBat | Hints may include solution code. |

**"Nobody does this": opportunities for CodeQuest AI** (none found on any of the 15 platforms)
1. **Mistake memory per learner, driving the next challenge.** Detect recurring mistake classes such as off-by-one, an unhandled empty input, a wrong comparison operator, or state not being reset. Use deterministic signals: which tagged hidden tests failed, AST patterns, and Exercism-style analyzer rules. Then choose the next challenge to target the weakest class.
   - Closest existing approaches: Exercism analyzers and representers (no learner history), Codewars routines (rank-based), CodeSignal paths (based on goals and level).
2. **Hidden-test failures explained without leaking anything.** Report, for example, "Hidden test #4 (edge case: empty input) → runtime error: IndexError on line 7 when the list has no elements". Never show the data.
   - Today platforms either reveal the data (LeetCode, CodeChef Pro, reportedly CSES) or say almost nothing (Kattis, Codeforces, HackerRank's lock icon).
3. **All tests run, with four outcome classes and a timeout per test.** Kattis, CSES and Codeforces stop at the first failure. Exercism uses a single 20 s timeout for the whole run and has no "wrong output" vs "runtime error" distinction per test.
4. **A free, deterministic plain-language explainer for Python tracebacks and verdicts,** built on Exercism's message-hygiene rules plus a table mapping exception types to explanations. Every explainer found elsewhere is an LLM and is paywalled or metered (CodeChef Pro, NeetCode Pro, LeetCode credits, Cosmo energy).
5. **A hint ladder with an enforced no-solution ceiling.** Tiers would run concept → approach → pseudo-code skeleton, with an automatic leak check (similarity or AST-diff against the reference solution) before any AI-written hint is shown, and GfG-style hint costs feeding the mastery model.
   - Every competitor whose ladder or AI help is documented either ends in the solution or has leaked it: CheckiO's final hint, NeetCode's fix diff, CodeChef's leak, Ask Leet generating solutions.
6. **Debugging drills built from the learner's own bug history.** Mutate a reference solution with the learner's recurring bug class, verify with tests that the mutant fails (BugSpotter-style), and limit the fix to "change at most N lines" (Zig Zag-style).
   - BugSpotter's bugs come from the specification, not from learner history. HackerRank and CodeChef only have a static exercise and a one-off contest.
7. **A concept-mastery view the learner can see,** linking tests, hints and mistakes to concept tags (an Exercism-style `construct:*` / `technique:*` vocabulary). Elsewhere, tracking is by completion or by tag counts, not by estimated mastery.
8. **An exam/practice switch the learner controls,** borrowing the contest platforms' habit of turning help off during contests (CodeChef: no WA debugging in contests; Codeforces and AtCoder AI bans). Exam mode withholds hints and AI and gives an honest readiness score.
9. **Extras only become novel once they share the mistake model.** For example:
   - The LeetCode companion extension reads a learner's LeetCode verdicts and feeds them into the same mistake profile.
   - The typing trainer drills the Python constructs the learner keeps getting wrong. SpeedCoder already tracks mistakes per key, not per construct.
   - The portfolio shows mastery per concept, not just how many problems were solved (Codolio's angle).

### Gaps
- Most "?" cells reflect sources that were blocked or a search budget that ran out, not confirmed absence. The most important ones to check by hand before showing judges:
  - **LeetCode:** result panel, static hints, Skills profile.
  - **GfG:** Wrong Answer message format.
  - **AtCoder / CodeChef:** per-test result tables.
  - **HackerRank:** certifications and the "AI Tutor".
  - **Codewars:** per-assertion output and any Debugging kata collection.
- **Pricing gaps:**
  - Codewars "Red" and CheckiO premium were not retrieved.
  - A single third-party claim of about $119/year LeetCode Premium for qualifying students was not verified.
  - CodeChef's current Pro price is unknown.
- The platform cheat-sheet reflects public pages as of 11 Oct 2026. AI features are changing monthly (LeetCode notes 2026.3 and 2026.5), so re-check right before the demo.
