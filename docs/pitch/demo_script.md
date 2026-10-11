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
| **1. Hook & Failure** | 0:00–0:45 | Select **Class Average**. Click Submit with buggy empty-list handling (`total / len(nums)`). | "Meet Priya. She learns Python by coding, but tracebacks give zero intuition and standard platforms hide everything. She just hit a `ZeroDivisionError`. CodeQuest displays discrete per-test cards: passed tests stay green, and the failing hidden test is explained *without* revealing test data or expected answers. The explanation tells her directly: `nums is empty, so dividing by len(nums) divides by 0`." | Cached submission response |
| **2. Hint Ladder & Leak Guard** | 0:45–1:30 | Request Hint 1, then Hint 2. Point out the countdown cooldown. | "When Priya gets stuck, platforms either show nothing or give away the solution. CodeQuest unlocks a 4-tier monotonic hint ladder: where to look, what case failed, and the core concept. Notice our Leak Guard: even if an AI wording model is hooked up, it is mathematically blocked from leaking solution code. The struggle is preserved." | Local template fallback |
| **3. Mistake Memory & Adaptation** | 1:30–2:15 | Show third off-by-one error trigger. Watch the adaptation badge appear on the Quest Map. | "Here is the wow moment no other platform has: CodeQuest's AST analyzer noticed Priya made her third off-by-one mistake across separate missions. CodeQuest flags this in her **Mistake Memory** and automatically swaps her next recommended mission to **Debug Mission: The Broken Average** to actively cure the misconception." | Pre-seeded 'Priya' profile |
| **4. Unified Portfolio & Companion** | 2:15–2:55 | Navigate to Portfolio / Skills view. Show Codeforces & LeetCode imported concept tags. Open Chrome Extension on LeetCode. | "Solving shouldn't be siloed. CodeQuest unifies verified mastery across platforms. We import Priya's Codeforces and LeetCode activity, mapping them to single concept masteries. Plus, our LeetCode Companion extension brings the same mentor and hint ladder directly inside LeetCode without ever scraping or leaking answers." | Static portfolio snapshot |
| **5. Sandbox Arena** | 2:55–3:35 | Navigate to `/arena`. Trigger the 4 canned exploit attacks (File read `/etc/passwd`, Network socket, Memory bomb, Infinite loop). | "Judges always ask: what if student code is malicious? In our Sandbox Arena, we run live attacks in real-time. Notice each attack is trapped: network egress is killed, `/etc/passwd` reads are blocked, and fork bombs hit container PID limits. Fully secure with `--network none` and non-root execution." | Pre-run Arena report |
| **6. The Deterministic Switch & Close** | 3:35–4:00 | Toggle **AI Mode: OFF** via the API/Settings. Re-run an explanation. | "Finally: what if our LLM credits expire or Wi-Fi drops? Watch us flip AI completely off. The mentor remains 100% functional, accurate, and insightful, because our AST analysis and pedagogical engine are deterministic first. CodeQuest AI turns passive copy-pasters into resilient debuggers." | Local server mode |

---

## Rehearsal Log

| Run | Duration | Driver / Speaker | Notes / Adjustments | Result |
|---|---|---|---|---|
| 1 | 4:10 | Person B / Person A | Slightly long on hint explanation; cut 15s | Ready |
| 2 | 3:55 | Person B / Person A | Hit all 6 moments smoothly | Target achieved |
