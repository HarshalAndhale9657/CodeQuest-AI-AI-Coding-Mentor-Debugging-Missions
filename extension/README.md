# CodeQuest Companion (Chrome / Edge, Manifest V3)

Your CodeQuest mentor on LeetCode. It never shows a solution, only these four tools:

| Button | What happens | Server endpoint |
|---|---|---|
| Check my approach | Your 1–2 sentence plan is compared with the problem's topic tags; you get a verdict and a question | `POST /api/ext/approach` |
| Hint | Concept-level hints that get more specific (max 3), keyed by topic tags, never LeetCode's own hints | `POST /api/ext/hint` |
| Analyze my code | Reads your Python from the LeetCode editor on click and runs CodeQuest's mistake detectors | `POST /api/ext/analyze` |
| Log this attempt | Records the LeetCode result; mistakes count only when a detector finding meets a failed verdict | `POST /api/ext/sync` |

## Install (unpacked)

1. Start the CodeQuest API (default `http://localhost:8000`).
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and choose this `extension/` folder.
3. Click the CodeQuest icon to open the side panel.
4. In the CodeQuest web app, get a pairing code (`POST /api/ext/pairing-code`, shown by the "Connect LeetCode Companion" button), and type it into the panel. Codes are 6 characters, single-use, and expire after 10 minutes.
5. For a deployed server, open **Settings** in the panel and enter its `https://` URL. Chrome asks for permission to reach that origin.

## Privacy and safety

- Code is read from the page **only when you press a button**, and is sent only to your CodeQuest server.
- Only the problem's slug, title, difficulty and topic tags are read. Never the statement or LeetCode's hints. Nothing from LeetCode is stored server-side except the slug and tags you log.
- The panel is disabled on `leetcode.com/contest/*` pages, because LeetCode bans outside help during contests.
- All text is rendered with `textContent`, and the extension page CSP allows only its own scripts.
- The extension token is separate from your web session and expires after 7 days.
