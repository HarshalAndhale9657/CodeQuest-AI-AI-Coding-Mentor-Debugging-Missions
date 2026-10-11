# 03 · Timeline & Checkpoints

> **T+0 = hacking officially starts** (or problem statement release, if they coincide). Times are relative so this works for any start time. Fill in the wall-clock column when dates are known.

## 24-hour plan (default)

| T+ | Wall clock | Phase | What "done" looks like | Owner |
|---|---|---|---|---|
| 0:00–0:45 | | **Decode & diverge** | PS analyzed with the template; 6–10 raw ideas listed | All |
| 0:45–1:30 | | **Converge & scope** | Idea picked via [05_idea_scoring.md](05_idea_scoring.md); demo moment defined; MoSCoW scope; stack picked | All, A decides |
| 1:30–2:15 | | **Bootstrap** | Repo + scaffold + hello-world **deployed**; API contract (mock JSON) committed; tasks on board | A (B, C set up locally) |
| 2:15–7:00 | | **Vertical slice** | One complete happy-path flow works end-to-end (mocks OK) | All |
| **7:00** | | 🚩 **Checkpoint 1** | Demo the slice to each other. Go/no-go on Should-haves. Re-cut scope if behind. | A |
| 7:00–12:00 | | **Real integrations** | Real AI/data/APIs replace mocks; core Must-haves done | B, C |
| 10:00–15:00 | | Rest rotation | 60–90 min nap each, staggered | All |
| **12:00** | | 🚩 **Checkpoint 2 (midpoint)** | All Must-haves work on the deployed URL. Pick ONE wow feature. | A |
| 12:00–17:00 | | **Wow + polish** | Wow feature in; UI polished; loading/error states; seed/demo data | B, C |
| 14:00 | | Deck starts | Deck v1 skeleton from outline | B |
| **17:00** | | 🧊 **FEATURE FREEZE** | No new features. Only bug fixes, copy, polish. | A enforces |
| 17:00–20:00 | | **Ship & package** | Prod deploy verified on a fresh device; README; **backup demo video recorded**; deck v2 | A, B, C |
| 20:00–22:30 | | **Rehearse** | 3 full timed pitch run-throughs + Q&A drill | All |
| **22:30** | | 📤 **SUBMIT** | All submission items in (90-min buffer for upload/form issues) | A |
| 22:30–24:00 | | Buffer | Fix anything flagged; rest before judging | All |

## Scaling for other formats

| Format | Adjustments |
|---|---|
| **36h** | Vertical slice by T+9, Checkpoint 2 at T+18, freeze at T+28, submit at T+34. Use the extra time for one more wow feature or real-user testing, not for scope creep. |
| **48h** | Day 1 = slice + core. Sleep a real 4–5h on night 1. Freeze at T+40, submit at T+46. |
| **Multi-day online** | Day 1: idea + architecture + deploy skeleton. Middle days: build in daily sprints with a daily checkpoint. Last day: freeze by noon, then video/deck/README. Record the demo video **a day early**. |
| **Idea round first (PPT shortlist)** | Use [../pitch/pitch_deck_outline.md](../pitch/pitch_deck_outline.md) § "Round-1 idea submission deck". Lock the idea there, which gives you a head start on the build round. |
| **PS released days in advance** | Run the [04_ps_release_playbook.md](04_ps_release_playbook.md) immediately. Research, architecture, and data sourcing can happen before the event, but **write no app code** if pre-built code is banned. |

## Checkpoint stand-up script (5 min)

1. Each person: done / next / blocked (30s each)
2. Run the current build on the deployed URL (2 min)
3. A: scope call. What to cut, what's next, who's on what (1 min)
4. Update [06_task_board.md](06_task_board.md)
