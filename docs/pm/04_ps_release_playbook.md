# 04 · Problem-Statement Release Playbook

> The first 90 minutes decide the outcome more than the next 20 hours. Follow this step by step, with a timer running.

## Step 0: Capture (5 min)
- Paste every problem statement **verbatim** into [01_hackathon_brief.md](01_hackathon_brief.md).
- Note the tracks, sponsor-specific statements, judging criteria, and any "must use X" constraints.
- If there are many PSs (SIH-style list), do a 10-min **triage pass** first: tag each one 🟢 (fits our skills + clear demo) / 🟡 / 🔴, and only deep-analyze the 🟢s (max 4).

## Step 1: Decode (10 min per shortlisted PS)
Fill [../templates/ps_analysis_template.md](../templates/ps_analysis_template.md) for each. The key questions:
- **Who** exactly is the user? What's their painful moment?
- What do the organizers **literally ask for**, and what's the **implied evaluation** (keywords such as "scalable", "real-time", "AI-driven", "low-cost", "offline", "multilingual")?
- What data/APIs exist? (check [../research/apis-tools-free-tiers.md](../research/apis-tools-free-tiers.md) and [../research/themes-and-idea-bank.md](../research/themes-and-idea-bank.md))
- What would a **winning demo** show in 60 seconds?

## Step 2: Diverge (15 min)
- **5 min silent:** each person writes 3+ ideas alone (this avoids groupthink).
- **10 min share:** one sentence per idea, no criticism yet. Combine and remix.
- Pull seeds from the idea bank if relevant, but **twist them toward the exact PS wording**.

## Step 3: Converge (15 min)
- Score the top 3–5 ideas in [05_idea_scoring.md](05_idea_scoring.md) (each person scores independently, then average).
- Apply the **kill criteria** (data unavailable, needs hardware we lack, more than one unfamiliar technology in the critical path, no visual demo).
- A makes the final call if there's a tie. Log it in [08_decision_log.md](08_decision_log.md).

## Step 4: Define the win (15 min)
Write these down before any code:
1. **One-liner:** We help ___ do ___ by ___, unlike ___.
2. **Demo moment:** the single 10-second "wow" the judges will remember.
3. **Demo script v0:** 5 steps a judge will watch (see [../pitch/demo_script.md](../pitch/demo_script.md)).
4. **MoSCoW scope:**
   - **Must** (the demo breaks without it, max 4 items)
   - **Should** (makes it impressive, max 3)
   - **Could** (only if ahead at Checkpoint 2)
   - **Won't** (explicitly out, written down to stop scope creep)
5. **Stack decision** using the matrix in [../research/tech-stack-playbook.md](../research/tech-stack-playbook.md). Prefer what the team already knows over what's trendy.
6. **Architecture sketch:** boxes and arrows (photo of paper is fine, redrawn for the deck later).

## Step 5: Contract & split (15 min)
- Define the API endpoints and JSON shapes, and commit `docs/api-contract.md` (or OpenAPI) plus mock JSON fixtures.
- Break the Musts into tasks of ≤2h each on [06_task_board.md](06_task_board.md), and assign owners.
- A: scaffold and deploy hello-world **now** (it de-risks deployment on day 1, not at hour 22).

## Step 6: Mentor sanity check (optional, 5 min)
- If mentors are around, pitch the one-liner and the demo moment. Ask: *"What would make this a winner for you?"* and *"What's the biggest flaw?"* Record the answers.

---

## Idea quality bar (quick self-check)

- [ ] Solves the **PS as written**, not a tangent we like better
- [ ] A non-technical judge understands the value in 15 seconds
- [ ] Has a **visible, interactive** demo (not just "a model in a notebook")
- [ ] AI is used **for something hard**, not as a chatbot bolted on
- [ ] Uses real or realistic data
- [ ] Buildable core in about 10h by 3 people, with room left for polish
- [ ] Clear impact story with a number (users, time saved, ₹ saved, lives, CO₂)
- [ ] There's an answer to "how is this different from X?"
