# 01 · Hackathon Brief: Vortexa

> Single source of truth for event facts. **Fill every `TBD` as soon as it's known**, and once it's filled in, don't re-check facts anywhere else.
> Last updated: 2026-10-11 (problem statement E-02 released and pasted below)

## Event facts

| Field | Value |
|---|---|
| Event name | Vortexa |
| Organizer / college | TBD |
| Event page / registration link | TBD |
| Platform (Unstop / Devfolio / Devpost / own site) | TBD |
| Dates & timings | TBD |
| Duration | TBD (we plan for **24h**; see [03_timeline.md](03_timeline.md) for 36h/48h scaling) |
| Format | TBD (in-person / online / hybrid) |
| Venue | TBD |
| Team size | 3 (us) |
| Rounds | TBD (common: Round 1 idea PPT → shortlist → offline hack → final pitch) |
| Problem statement release | TBD (date/time, channel: Discord / WhatsApp / site) |
| Tracks / themes | TBD |
| Prizes | TBD |
| Sponsors (sponsor tech = bonus points) | TBD |
| Submission deadline | TBD |
| Submission format | TBD (repo link / video / deck / deployed URL / form) |
| Pitch length & Q&A | TBD (assume 3–5 min + 2–3 min Q&A) |
| Comms channel | TBD |
| Organizer contact | TBD |

## Rules to confirm (these change what we're allowed to prep)

- [ ] Is **pre-built code** allowed? (Many events ban it. Assume **NO**, so we prep docs/research/accounts only and write app code after the start.)
- [ ] Are boilerplates/templates/open-source libraries allowed? (Usually yes.)
- [ ] Must the repo be created after the start time? Will judges check commit timestamps?
- [ ] Is AI-assisted coding allowed or required to be disclosed?
- [ ] Are paid APIs allowed? Must the project be open source?
- [ ] Can we switch problem statements after choosing?
- [ ] Is a deployed link mandatory? A demo video? A specific video length?
- [ ] Hardware provided (if it's an IoT track)?

## Judging criteria

| Criterion | Weight | Source |
|---|---|---|
| TBD | TBD | TBD |

> Until official criteria are out, use the typical rubric in [../research/judging-and-winning-patterns.md](../research/judging-and-winning-patterns.md).

## Problem statement(s)

_Paste the raw problem statement(s) here verbatim when released, then analyze each using [../templates/ps_analysis_template.md](../templates/ps_analysis_template.md)._

Released 2026-10-11 (raw copy also at the repo root: `problem-statement`).

```
E-02 — CodeQuest AI: AI Coding Mentor & Debugging Missions Domain: 5 — AI-Powered Education & Learning Technology Problem Overview Beginners learn programming by writing code and reading what goes wrong, but feedback is often hard to use. A traceback names an error without explaining it, and a program can run and still give the wrong answer. Learners often copy complete solutions, which gets code working but skips the debugging that builds skill. Practice tools that only report pass or fail do not show where to look, and tools that give full answers too early remove the struggle that makes learning stick. Running learner code also carries risk: code from an unknown author must not read sensitive files, reach the network, or consume unlimited resources. The Challenge Build a practice environment for one programming language, with challenges at increasing difficulty. Each challenge has a description, starter code, visible tests, and hidden tests. Choose a language your team can support well within the build time. • Execute learner submissions only in a restricted environment. Full sandboxing is not required; if it is not feasible, a constrained local test runner is acceptable, but unrestricted execution of learner code is not. • Report each test’s outcome separately: passed, wrong output, runtime error, or timeout. Never reveal the content of hidden tests. • When a submission fails, explain the failure in plain language to help the learner find the problem. • Provide progressive hints. Each hint must be more specific than the last, but no hint may reveal the complete solution, including AI-generated hints. • Detect recurring mistakes across a learner’s work, such as off-by-one errors or unhandled empty inputs, and adapt future challenges to them. Track demonstrated skills by concept.
```

## Chosen problem & one-liner

- **Chosen PS:** E-02 CodeQuest AI (AI Coding Mentor & Debugging Missions), the PS we were given. Plan: `CODEQUEST_MASTER_PLAN.md` at the repo root (in progress)
- **One-liner:** "We help **[who]** do **[what]** by **[how]**, unlike **[status quo]**."
- **Demo moment (the 10-second wow):** TBD
