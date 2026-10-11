# Brief for Person B: frontend (paste this into Claude Code / Fable)

You are working on **CodeQuest AI**, a hackathon project (12 hours total; feature freeze at **18:30**, code freeze at **21:00**).
Read `docs/pm/12H_PLAN.md` first. **You own `frontend/` only.** Do not edit `backend/` or `content/`. If you need an API change, ask Person A.

## Setup
```
cd frontend && npm install && npm run dev        # http://localhost:3000
# backend (separate terminal, from the repo root):
pip install -e backend && uvicorn codequest.api:app --app-dir backend --port 8000
```
The stack is Next.js 16, React 19, Tailwind 4, TanStack Query, `motion` and lucide icons. Types live in `src/lib/types.ts` and the fetch helper in `src/lib/api.ts`. Match the existing dark style (see `results-board.tsx`, `hint-ladder.tsx`).
Before every merge: `npm run typecheck && npm run lint` must pass. Work on branch `b/<feature>`.

## Tasks, in priority order

### P0: Skill map + Mistake Memory page (`/me`), 14:00–16:00
- Data comes from `GET /api/me` (already exists; inspect it in the browser and extend the `Me` type if needed).
- **Skill map:** a grid or radial view of concepts, coloured by mastery band (e.g. new / learning / solid / mastered), each showing its Elo. Clicking a concept lists its evidence (the missions that proved it).
- **Mistake Memory:** cards for each mistake key (off_by_one, empty_input, …) with a count, when it was last seen, and a "recurring" badge. Mistakes the learner has beaten appear in green.
- Add a link in `app-shell.tsx` nav.

### P1: Fix the results column layout (mission page `m/[id]`)
- The right column is too narrow and cards force a lot of scrolling. Options: widen it; give the hints panel and the results board separate scroll areas, or put them in tabs; auto-scroll to the first failing test after a submit.

### P1: Portfolio page `/u/[handle]`, 16:00–18:30
- Contract (frozen): `GET /api/portfolio/{handle}`. The shape is in `12H_PLAN.md`. Until A ships it, build against a local mock fixture.
- Sections: header (name, handle, share button that copies the URL); **"Verified on CodeQuest"** concept grid; mistakes-beaten timeline; stats (solved, hints per solve, debug missions); **imported platforms** cards for Codeforces (rating, solved, top tags) and LeetCode (easy/medium/hard, top tags), labelled "imported, unverified"; a form to add a handle (`POST /api/imports`).
- This is the "one profile for every platform" demo moment, so make it look great.

### P1: AI toggle
- A small switch in the header: `GET/POST /api/settings/ai`. Show "AI off: deterministic mentor" when it's off.

### P2 (only if CP2 at 18:30 is green): Syntax Warm-up typing trainer `/typing`
- Snippets come from `/data/typing-snippets.json` (`[{id, concept, title, code}]`, written by C).
- Monkeytype-style: show the code in monospace; correct characters light up, a mistyped character turns red; animate a smooth caret. Pressing Enter auto-skips leading indentation. Tab inserts 4 spaces.
- Metrics: CPM (chars/min), accuracy, and an errors-per-character map. Show a results screen with a small chart and "beat your best" ghost-pace text.
- Send `POST /api/typing/results`. Block paste.

### Polish (20:00–21:00)
Smooth motion on verdict cards, empty states, a loading skeleton, and a check at 1280px and on mobile.
