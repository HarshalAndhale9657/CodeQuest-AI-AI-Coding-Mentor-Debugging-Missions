# 02 · Team & Roles

> Team of 3. Each person **owns** an area (makes the final call there) but helps anywhere. Roles are hats; swap them if skills suggest otherwise once the problem statement is known.

## Roster

| Member | Name | Primary role | Secondary hat | Strengths | Laptop/OS |
|---|---|---|---|---|---|
| A | TBD | **Tech Lead · Full-stack & Integration** | Timekeeper / PM | TBD | Windows 11 |
| B | TBD | **Frontend · UX · Demo** | Pitch deck & video | TBD | TBD |
| C | TBD | **Backend · AI/ML · Data** | Q&A tech answers | TBD | TBD |
| Pitch speaker | TBD | Best communicator presents; the others drive the demo | | | |

## Ownership

| Area | Owner | Responsibilities |
|---|---|---|
| Architecture & repo | A | Stack decision, repo, branch rules, API contracts, deploy pipeline, final merges |
| Integration & deploy | A | Wire frontend↔backend, env vars, production deploy, "demo mode" fallback |
| Time & scope | A | Run checkpoints, enforce feature freeze, keep [06_task_board.md](06_task_board.md) current |
| UI & UX | B | Screens, component library (e.g. shadcn), responsive layout, empty/loading/error states |
| Demo flow | B | Seed data, the happy-path script, screenshots, backup demo video |
| Pitch deck | B | Deck from [../pitch/pitch_deck_outline.md](../pitch/pitch_deck_outline.md), visuals, architecture diagram |
| AI / ML pipeline | C | Model/API choice, prompts, RAG/agents, evaluation on sample inputs, fallbacks |
| Data & backend | C | DB schema, endpoints, datasets, background jobs |
| README & docs | C → A | README from template, setup steps, architecture section |

## Working agreements

1. **Contract first.** Agree on API request/response JSON in the first 2 hours, so frontend can build against mocks while backend builds the real thing.
2. **Vertical slice first.** Get one ugly flow working end-to-end before polishing anything.
3. **Small commits, push often** (at least every 30–45 min). Pull before you push.
4. **Branching:** `main` is always deployable. Use short-lived `feat/<owner>-<thing>` branches, merged by A. Ownership by folder avoids conflicts (`frontend/` B, `backend/` C, root/config A).
5. **Blocked for more than 20 min → say it out loud.** Ask a teammate, a mentor, or switch tasks.
6. **Every new feature idea goes to the Backlog**, not straight into code. A decides at the next checkpoint.
7. **Secrets never get committed.** Use `.env` (gitignored) and keep `.env.example` updated.
8. **Decisions get one line in [08_decision_log.md](08_decision_log.md)** so nobody re-litigates them at 3 AM.

## Communication

- Channel: TBD (WhatsApp/Discord group). Pin: the repo link, deployed URL, `.env` sharing method (never in chat history if the group is public).
- Stand-up at every checkpoint (5 min max): done / doing next / blocked.
- Rest rotation (24h): stagger 60–90 min naps between T+10 and T+15 so that **2 of 3 are always awake**.
