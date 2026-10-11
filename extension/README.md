# CodeQuest Companion (Chrome / Edge, Manifest V3)

Your CodeQuest tutor on LeetCode: a chat that knows which problem you're on. It never shows a solution.

| Feature | What happens | Server endpoint |
|---|---|---|
| **Tutor chat** | Knows the open problem (title, difficulty, topics, statement) and, if you allow it, your code. Ask anything; the tutor answers Socratically, one idea at a time | `POST /api/ext/chat` |
| Quick actions | **Hint** (3 levels, each more specific), **Check my approach**, **Review my code**, **Explain the problem**, **Edge cases**, **Complexity** | `POST /api/ext/chat` (mode) |
| **Auto-detected submissions** | When you press **Submit** on LeetCode, the verdict appears in the chat with one-click review. With **Auto-log** on, the result and your Python code are logged to CodeQuest | `POST /api/ext/sync` |
| Progress tab | Auto-log, last submission, and your Mistake Memory (recurring/beaten mistakes + next mission), shared with the web app | `GET /api/ext/me` |

How the tutor stays honest:
- **Rules first.** Requests for code or answers, and prompt-injection phrasing, are refused without calling a model.
- **Deterministic grounding.** Every reply is built on CodeQuest's own analysis (static mistake detectors, approach check, concept hint ladder). That analysis is also the full fallback when AI is off, out of budget or unavailable, so the panel always works.
- **Guarded AI** (`gpt-4.1-mini`, configurable with `CQ_CHAT_MODEL`). It follows progressive disclosure (no algorithm or key trick until hint 3), never invents bugs, and every reply passes an output guard (no code blocks, no code-shaped lines) with one strict retry.
- **Privacy.** The statement and your code are sent only with a message, used for that one reply, never stored or logged. Chats live in the browser's session storage. Replies are labelled **AI tutor** or **CodeQuest** (rules).

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
