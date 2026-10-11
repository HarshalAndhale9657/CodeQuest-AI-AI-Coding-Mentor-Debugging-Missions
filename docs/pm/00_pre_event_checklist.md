# 00 · Pre-Event Checklist (do before the problem statement drops)

> Everything here is allowed prep: no app code. Tick these off as a team.

## Event logistics
- [ ] Registration confirmed for all 3; confirmation emails/QR codes saved offline
- [ ] Event facts filled in [01_hackathon_brief.md](01_hackathon_brief.md) (dates, venue, rounds, rules, judging)
- [ ] Joined the official comms (Discord/WhatsApp); notifications ON for the PS release
- [ ] Rules read; pre-built-code policy confirmed (see the brief)
- [ ] Travel and arrival time planned (in-person); college ID / govt ID packed

## Accounts & keys (create NOW, since email/phone verification during the event wastes time)
> Exact recommended services: see the signup checklist in [../research/apis-tools-free-tiers.md](../research/apis-tools-free-tiers.md).
- [ ] GitHub: all 3 accounts added to a shared org/repo; `gh auth login` done on every laptop
- [ ] Hosting: Vercel / Render / HF Spaces (at least one frontend and one backend host), logged in via CLI
- [ ] LLM keys from **2+ providers** (primary + fallback), tested with a one-line curl
- [ ] Database/auth: Supabase or Firebase project-ready account
- [ ] Any sponsor platforms announced by the organizers
- [ ] Shared password manager or secure note for keys (not the public group chat)

## Machines (each teammate)
- [ ] Node 22+ (`node -v`), Python 3.12 (`python --version`), git, VS Code / Cursor, `gh` CLI
- [ ] Package managers ready: `npm`, `pnpm` (optional), `uv` or `pip`
- [ ] Hosting CLIs installed: `npm i -g vercel` (and others per the research)
- [ ] Optional offline fallback: [Ollama](https://ollama.com) + one small model pulled (e.g. a 3–8B instruct model)
- [ ] Docker Desktop (only if a stack needs it; it's heavy on Windows)
- [ ] Windows: PowerShell execution policy allows npm scripts (`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`)
- [ ] Screen recorder ready (OBS / Windows Game Bar `Win+Alt+R` / Loom) for the demo video
- [ ] Browser profile with dev tools, a JSON viewer, and pinned docs tabs

## Kit bag (in-person)
- [ ] Laptops + chargers + **extension board**
- [ ] Phone hotspot data balance (backup internet)
- [ ] HDMI/USB-C adapters for the venue projector
- [ ] Earphones, water bottle, snacks, a warm layer (venues get cold at 3 AM)
- [ ] Notebook + markers (for the architecture sketch and brainstorm)

## Team prep
- [ ] Roles agreed in [02_team_and_roles.md](02_team_and_roles.md); strengths filled in
- [ ] Everyone has skimmed: the [PS playbook](04_ps_release_playbook.md), the [idea bank](../research/themes-and-idea-bank.md), and the [judging research](../research/judging-and-winning-patterns.md)
- [ ] A has dry-run the bootstrap commands from [../research/tech-stack-playbook.md](../research/tech-stack-playbook.md) in a **scratch folder outside this repo** (then deleted it), so nothing surprises us on the day
- [ ] Pitch speaker chosen; 30-second self-intro of the team drafted
