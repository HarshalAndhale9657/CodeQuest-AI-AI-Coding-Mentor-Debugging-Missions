# CLAUDE.md: Vortexa hackathon workspace

## Context
- Team of 3 preparing for **Vortexa**, a college/third-party hackathon (not the energy-data company Vortexa). Event details live in `docs/pm/01_hackathon_brief.md`; treat that file as the source of truth and update it when facts arrive.
- Format unknown; plans assume a **24h sprint** (`docs/pm/03_timeline.md` has scaling for 36h/48h/online).
- **Tech stack is deliberately undecided** until the problem statement is released. Use the matrix in `docs/research/tech-stack-playbook.md`; don't assume a stack.
- **No application code before the event starts** unless `01_hackathon_brief.md` confirms pre-built code is allowed. Pre-event work = docs, research, accounts.

## When the user pastes a problem statement
1. Save it verbatim into `docs/pm/01_hackathon_brief.md`.
2. Follow `docs/pm/04_ps_release_playbook.md`: analyze each PS with `docs/templates/ps_analysis_template.md` (save under `docs/ps/`), generate ideas (draw on `docs/research/themes-and-idea-bank.md`), score them in `docs/pm/05_idea_scoring.md`.
3. Record decisions in `docs/pm/08_decision_log.md` (newest on top), and tasks in `docs/pm/06_task_board.md`.

## Conventions
- Time is expressed as **T+hh:mm** relative to the hack start.
- Code layout once the stack is chosen: `frontend/` (owner B), `backend/` (owner C), root config (owner A). Single-app stacks live at the root.
- Secrets in `.env` (gitignored); keep `.env.example` in sync.
- Prefer free-tier services from `docs/research/apis-tools-free-tiers.md`; always wire a fallback LLM provider and a "demo mode" with seeded/cached data.
- Optimize for: a working deployed demo > feature count. Respect the feature freeze in the timeline.
- Commit only when the user asks.
