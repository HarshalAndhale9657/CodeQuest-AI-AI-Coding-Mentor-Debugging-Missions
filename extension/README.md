# CodeQuest Companion (Chrome / Edge, Manifest V3)

Your CodeQuest tutor on LeetCode: a side-panel chat that knows which problem you're on, reads your code when you allow it, and never shows a solution.

**Full guide: [docs/EXTENSION.md](../docs/EXTENSION.md)** (features, architecture, permissions, privacy, troubleshooting, testing, publishing).

## Install (unpacked)

1. The panel uses the deployed API (`https://codequest-api-31eg.onrender.com`) by default. For local development, start the API (`http://localhost:8000`) and enter that URL in the panel's **Settings** (gear icon).
2. Open `chrome://extensions` (or `edge://extensions`), switch on **Developer mode**, click **Load unpacked**, and choose this `extension/` folder.
3. Pin **CodeQuest Companion for LeetCode** and click its icon to open the side panel.
4. In the CodeQuest web app, open **Settings → LeetCode Companion**, click **Generate pairing code**, and type the 6-character code into the panel. The code works once and expires after 10 minutes; the extension token lasts 7 days.
5. For a different deployed server, open the panel's **Settings** and enter its API `https://` origin (not the website's). Chrome asks for permission to reach that origin.

After pulling changes, press **Reload** on the extension card and reload any open LeetCode tabs.

## What it does

| Feature | Server endpoint |
|---|---|
| Problem-aware tutor chat (title, difficulty, tags, statement; your code if *Include my code* is ticked) | `POST /api/ext/chat` |
| Quick actions: **Hint** (3 levels), **Check my approach**, **Review my code**, **Explain the problem**, **Edge cases**, **Complexity** | `POST /api/ext/chat` (mode) |
| Auto-detected submissions: the verdict appears in the chat on **Submit**; with **Auto-log** on (off by default), the verdict and Python code are logged | `POST /api/ext/sync` |
| Progress tab: last submission, manual logging, Mistake Memory shared with the web app | `GET /api/ext/me` |

Requests for the answer and prompt-injection phrasing are refused by rules before any model call. Every reply is grounded in CodeQuest's deterministic analysis, AI replies must pass a no-code output guard, and each reply is labelled **AI tutor** or **CodeQuest**. Mistakes are recorded only when a detector finding meets a failed verdict.

## Privacy in short

- The problem statement and your code are read from the page only when you message the tutor (or on Submit with Auto-log on) and sent to your CodeQuest server. When the AI tutor is on, the server forwards them to the configured model provider (OpenAI) for that one reply. They are never stored. Only Python code is logged.
- LeetCode's own hints and solutions are never read. Chats live in session storage.
- Disabled on `leetcode.com/contest/*`.
- All text is rendered with `textContent`; the extension page CSP allows only its own scripts.

## Tests

Dev-only harnesses in [`extension-tests/`](../extension-tests/) (not shipped):

```bash
python extension-tests/server.py         # http://localhost:5600 (imitates leetcode.com's judge endpoints)
# API must allow the origin: CQ_ALLOWED_ORIGINS=http://localhost:5600
# Pipeline (hook -> validator -> service worker -> API), 17 checks:
#   http://localhost:5600/problems/two-sum/?token=<extension token>&api=http://localhost:8000
# Side panel UI with stubbed chrome APIs:
#   http://localhost:5600/tests/harness.html?scenario=python|java|contest
# Automated side-panel suite, 44 checks (run against an AI-off API so it's free and deterministic):
#   OPENAI_API_KEY= CQ_ALLOWED_ORIGINS=http://localhost:5600 uvicorn codequest.api:app --port 8002
#   http://localhost:5600/tests/harness.html?autotest=1&code=<pairing code>&api=http://localhost:8002
```
