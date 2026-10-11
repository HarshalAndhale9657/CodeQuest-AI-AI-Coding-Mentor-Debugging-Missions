# CodeQuest Companion (Chrome / Edge, Manifest V3)

Your CodeQuest mentor on LeetCode. It never shows a solution.

| Feature | What happens | Server endpoint |
|---|---|---|
| Check my approach | Your 1–2 sentence plan is compared with the problem's topic tags → verdict + a question | `POST /api/ext/approach` |
| Hint | Concept-level hints that get more specific (max 3), keyed by topic tags, never LeetCode's own hints | `POST /api/ext/hint` |
| Analyze my code | Reads your Python from the LeetCode editor on click and runs CodeQuest's mistake detectors | `POST /api/ext/analyze` |
| **Auto-detected submissions** | When you press **Submit** on LeetCode, the final verdict is detected automatically. With **Auto-log** on, the result and your Python code are logged to CodeQuest; otherwise one click logs it | `POST /api/ext/sync` |
| Mistake Memory | Your recurring and beaten mistakes plus your next CodeQuest mission, shared with the web app | `GET /api/ext/me` |

Mistakes are recorded only when a detector finding meets a failed verdict, the same rule the web app uses.

## Install (unpacked)

1. Start the CodeQuest API (default `http://localhost:8000`).
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and choose this `extension/` folder. After pulling changes, press **Reload** on the extension card and reload any open LeetCode tabs.
3. Click the CodeQuest icon to open the side panel.
4. In the CodeQuest web app, open **Home → LeetCode Companion → Connect the extension**, and type the 6-character code into the panel. The code works once and expires after 10 minutes.
5. For a deployed server, open **Settings** in the panel and enter its `https://` URL. Chrome asks for permission to reach that origin.

## How submission detection works

- `content/page-hook.js` runs in the page at `document_start` and observes LeetCode's judge endpoint `/submissions/detail/<numeric id>/check/`. It reports only a **final** verdict (`state: SUCCESS`) of a real submission. "Run" results (`runcode_…` ids) are ignored, as are repeated polls. It never changes requests or responses.
- `content/relay.js` forwards that message to the service worker, which **re-validates** it (`lib/submission.js`), drops duplicates and anything not from `leetcode.com/problems/…`, and logs it only if Auto-log is on.
- Code from a detected submission is kept only in session storage until you log it, and only Python code is ever sent.

## Privacy and safety

- Code leaves the browser only when you press a button, or on Submit if you switched **Auto-log** on (off by default).
- Only the problem's slug, title, difficulty and topic tags are read. Never the statement or LeetCode's hints.
- Disabled on `leetcode.com/contest/*` pages (content scripts excluded there, and the worker double-checks), because LeetCode bans outside help during contests.
- All text is rendered with `textContent`, and the extension page CSP allows only its own scripts.
- The extension token is separate from your web session and expires after 7 days.

## Tests

`extension-tests/` holds dev-only harnesses (not shipped):

```bash
python extension-tests/server.py         # http://localhost:5600 (imitates leetcode.com's judge endpoints)
# API must allow the origin: CQ_ALLOWED_ORIGINS=http://localhost:5600
# Pipeline (hook -> validator -> service worker -> API), 17 checks:
#   http://localhost:5600/problems/two-sum/?token=<extension token>&api=http://localhost:8000
# Side panel UI with stubbed chrome APIs:
#   http://localhost:5600/tests/harness.html?scenario=python|java|contest
```
