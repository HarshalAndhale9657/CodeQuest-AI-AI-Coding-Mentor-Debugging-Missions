# 07 · Risk Register

> Pre-mortem: "It's T+24 and we lost. Why?" Each risk has a mitigation we set up **before** it bites.

| # | Risk | Likelihood | Impact | Mitigation (do in advance) | Trigger → response |
|---|---|---|---|---|---|
| R1 | **Live demo breaks** in front of judges | High | Critical | "Demo mode" flag with seeded data and cached AI responses; **backup video recorded by T+20**; demo on our own hotspot | Anything fails live → switch to video without apologizing at length |
| R2 | LLM/API **rate limit, outage, or key revoked** | High | High | 2 providers behind one interface (see the API research); keys from 2 accounts; cache responses; local Ollama model as last resort | 429/5xx → automatic fallback provider |
| R3 | **Scope creep** / over-ambition | High | High | MoSCoW written at T+1:30; feature freeze at T+17; A owns scope calls | Behind at Checkpoint 1 → cut Shoulds immediately |
| R4 | **Venue Wi-Fi** slow or blocked | Med | High | Phone hotspots; pre-pulled Docker images and npm caches; offline docs | Switch to hotspot; avoid big downloads |
| R5 | **Deployment fails** late | Med | High | Deploy hello-world at T+2 and on every merge to `main` | Deploy broken → roll back to the last good deploy; localhost + tunnel as a fallback |
| R6 | **Merge conflicts** / broken `main` | Med | Med | Folder ownership; small PRs; A merges; run before you push | Broken main → revert the commit first, debug after |
| R7 | Required **data not available** | Med | High | Check data access during idea scoring (kill criterion); synthetic data generator as plan B | Can't get data in 1h → use realistic synthetic data and say so honestly |
| R8 | **Teammate exhaustion** / illness | Med | Med | Rest rotation; water and food; every task documented on the board so others can pick it up | Anyone fading → mandatory 60-min nap |
| R9 | **Laptop/hardware failure** | Low | High | Push every 30–45 min; everyone can run the project; chargers and extension board | Swap to a teammate's machine |
| R10 | **Secrets leaked** in a public repo | Med | Med | `.env` gitignored from commit 1; `.env.example` only; rotate keys after the event | Leak → rotate the key immediately |
| R11 | **Rule violation** (pre-built code, late commits) | Low | Critical | Confirm the rules in [01_hackathon_brief.md](01_hackathon_brief.md); create the app code after the start; commit steadily | Unsure → ask organizers in writing |
| R12 | **Weak pitch** despite a good product | Med | High | Deck started at T+14; 3 timed rehearsals; Q&A drill from the judging research | Over time in rehearsal → cut slides, not the demo |
| R13 | **Misread the PS** / built the wrong thing | Low | Critical | Decode step with the template; mentor sanity check at T+1:30 | Mentor flags a mismatch → re-align by Checkpoint 1 |
