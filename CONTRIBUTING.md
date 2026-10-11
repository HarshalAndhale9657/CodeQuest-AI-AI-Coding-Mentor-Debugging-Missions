# Contributing to CodeQuest AI

## Development setup

Follow the [Quick start](README.md#quick-start). In short: build the sandbox image, run the API from `backend/`, run the web app from `frontend/`, and load `extension/` unpacked.

## Where things live

| Area | Folder | Notes |
|---|---|---|
| API, judge, mentor, learner model | `backend/codequest/` | Keep decisions deterministic; AI may only reword verified text |
| Sandbox | `backend/codequest/sandbox/`, `runner/Dockerfile` | `harness.py` runs next to untrusted code: standard library only, trust nothing it returns |
| Missions | `content/challenges/` | See [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) |
| Web app | `frontend/` | Next.js 16: read `frontend/AGENTS.md` before changing framework code |
| Extension | `extension/` | See [docs/EXTENSION.md](docs/EXTENSION.md) |

## Before you open a pull request

```bash
cd backend && python -m pytest -q                  # all 188+ tests must pass
cd frontend && npm run typecheck && npm run lint   # lint also checks design tokens
```

- Add or update tests with every behaviour change. New missions must pass `tests/test_content.py`.
- Never weaken the disclosure policy: hidden-test data must not reach any public view, explanation, hint or log.
- Any new hint or tutor text must pass the leak guard (`hints.leak_check`) or the chat output guard (`companion_chat.reply_is_safe`).
- Never put API keys in the frontend or the extension. Secrets live in `.env` (gitignored); keep `.env.example` in sync.
- Changes to the sandbox flags need a matching update in [docs/SECURITY.md](docs/SECURITY.md).

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) with a scope, as in the existing history:

```
feat(extension): tutor chat that follows your LeetCode problem
fix(judge): log judging failures and retry once after a sandbox blip
docs: add architecture and security guides
```

## Reporting security issues

Please use a private security advisory on GitHub rather than a public issue.
