# CodeQuest AI: Demo Script (4 Minutes)

> Rehearse with a timer. Driver navigates while Speaker presents.

## Setup (Before Going on Stage)
- [ ] Demo laptop on reliable network/hotspot, Do-Not-Disturb ON, browser zoom 125%
- [ ] Backend running (`uvicorn codequest.api:app --port 8000`) with Docker or Local runner
- [ ] Frontend running (`npm run dev` at `http://localhost:3000`)
- [ ] Chrome extension loaded unpacked from `extension/` (ready on LeetCode test tab)
- [ ] Backup screen recording video downloaded and cued in a media player

## Persona
> **Name:** Priya · **Role:** First-year CS student learning Python  
> **Painful moment:** Submits code on automated platforms, gets an opaque "Wrong Answer" or cryptic traceback on hidden tests, copies answers from ChatGPT which bypasses debugging practice, and repeatedly makes off-by-one errors.

---

## Timed Script

| Step | Time | Driver Action | Speaker Voiceover | Fallback |
|---|---|---|---|---|
| **1. Hook & Failure** | 0:00–0:45 | Click **Try the demo as Priya** (opens **Class Average**). Paste Priya's buggy `while` loop (see `backend/tests/conftest.py`, `PRIYA_CLASS_AVERAGE`) and press Submit. | "Meet Priya. She learns Python by coding, but tracebacks give zero intuition and other platforms stop at the first failure. CodeQuest runs every test separately: one passes, one is a wrong output, one crashes, one times out. The crash card explains it in plain words, with the variables at the moment it happened: `count` was 0, so the division failed. And the hidden tests? She sees only their result and a category such as 'edge case', never the data." | Cached submission response |
| **2. Hint Ladder & Leak Guard** | 0:45–1:30 | Request Hint 1 (note the AI-worded tag if AI is on). Show the cooldown. Change one line, resubmit, request Hint 2 (a concrete failing input). | "When Priya gets stuck, platforms either say nothing or hand over the solution. CodeQuest's hints get more specific each time: where to look, then a small input where her code goes wrong, then the concept. Every hint, including any AI wording, is machine-checked against the solution before she sees it, and the AI may only reword hint 1. The struggle is preserved." | Templates (AI off) |
| **3. Mistake Memory & Adaptation** | 1:30–2:15 | Point at the **Mistake Memory: a pattern spotted** panel that appeared with the step 1 results. Click **Debug Mission: The Broken Average**. | "Here is the moment no other platform has. Priya made an off-by-one in an earlier mission, 'Add Them Up'. This submission has the same mistake in a different mission, so CodeQuest marks it as recurring, forges her a debugging mission with the same bug, re-ranks her next missions and adds a pre-flight check before her next submit." | Pre-seeded 'Priya' profile |
| **4. Unified Portfolio & Companion** | 2:15–2:55 | Open the Portfolio / Skills view and import a real public Codeforces or LeetCode handle. Then open the LeetCode Companion side panel on a LeetCode problem. | "Solving shouldn't be siloed. The portfolio leads with skills verified on CodeQuest, then adds imported LeetCode and Codeforces activity mapped to the same concepts and marked unverified. The LeetCode Companion brings the same mentor to LeetCode: approach checks, concept hints, mistake analysis, and automatic detection of her submissions. It never shows a solution and never stores LeetCode's problems." | Static portfolio snapshot |
| **5. Sandbox Arena** | 2:55–3:35 | Navigate to `/arena`. Trigger the 4 canned exploit attacks (File read `/etc/passwd`, Network socket, Memory bomb, Infinite loop). | "Judges always ask: what if student code is malicious? In our Sandbox Arena, we run live attacks in real-time. Notice each attack is trapped: network egress is killed, `/etc/passwd` reads are blocked, and fork bombs hit container PID limits. Fully secure with `--network none` and non-root execution." | Pre-run Arena report |
| **6. The Deterministic Switch & Close** | 3:35–4:00 | Turn **AI off** in Settings (a per-learner switch). Request Hint 1 on another mission. | "Finally: what if our LLM credits run out or the Wi-Fi drops? Priya turns AI off and the mentor is just as useful, because diagnosis, hints, mistake memory and adaptation are deterministic. AI only polishes wording. CodeQuest AI turns copy-pasters into resilient debuggers." | Local server mode |

---

## Rehearsal Log

| Run | Duration | Driver / Speaker | Notes / Adjustments | Result |
|---|---|---|---|---|
| 1 | 4:10 | Person B / Person A | Slightly long on hint explanation; cut 15s | Ready |
| 2 | 3:55 | Person B / Person A | Hit all 6 moments smoothly | Target achieved |
