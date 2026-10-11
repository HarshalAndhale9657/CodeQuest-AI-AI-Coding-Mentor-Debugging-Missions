# LeetCode-grade UI redesign: website + Companion extension

Status: approved in chat 2026-10-11 · Owner: frontend (B) · Backend changes: none

## Goal

Bring `frontend/` (Next.js 16, React 19, Tailwind v4) and `extension/` (MV3 side panel, plain HTML/CSS/JS) to a
production-quality, LeetCode-native look using LeetCode's exact dark palette, while keeping the CodeQuest name and
identity. Fill the website gaps the backend already supports (extension pairing, profile/portfolio, AI toggle).

Success = a judge who uses LeetCode feels at home instantly; every page has real loading/empty/error states; keyboard
and phone widths work; `typecheck`, `lint` and `build` are clean; screenshots side by side with the reference
screenshots read as the same visual family.

### Decisions (from the user)
- Extension: wait for the in-progress teammate work (auto-log, memory card) to be committed, then restyle on top.
- Website scope: restyle all 4 existing pages and add Profile, Settings (AI toggle + extension pairing).
- Fidelity: exact LC palette, layout patterns and density; CodeQuest name, logo and orange accent. Not a clone.
- Figma: code first; export key screens + token sheet to a Figma file at the end.

### Non-goals
Light theme; skill map, roadmap and typing-trainer pages (later); backend changes; new extension features.

## 1. Design tokens

Single source: `frontend/src/styles/tokens.css` (CSS custom properties). A byte-identical copy lives at
`extension/tokens.css`; `frontend/scripts/check-tokens.mjs` fails if they differ; `npm run lint` becomes
`node scripts/check-tokens.mjs && eslint .`. `extension/tokens.css` is a new file, so creating it in step 1 does not
touch the teammate's in-progress extension files.
Tailwind v4 `@theme` in `globals.css` maps utilities onto these variables.

Values were pixel-sampled from the user's LeetCode screenshots (anti-aliased samples snapped to LC's known values).

| Token | Value | Use |
|---|---|---|
| `--lc-bg` | `#1a1a1a` | page background (list, profile, landing) |
| `--lc-bg-workspace` | `#0f0f0f` | workspace background (mission, arena) |
| `--lc-layer-1` | `#282828` | nav bar, cards |
| `--lc-panel` | `#262626` | workspace panels, editor background |
| `--lc-panel-header` | `#333333` | panel tab headers |
| `--lc-menu` | `#303030` | dropdowns, popovers |
| `--lc-row-alt` | `#272727` | alternating table rows |
| `--lc-hover` | `#2c2c2c` | sidebar active / row hover / inputs |
| `--lc-fill-2` | `#313131` | pills, secondary fills, dividers |
| `--lc-fill-3` | `#3c3c3c` | tags, secondary buttons |
| `--lc-fill-4` | `#3e3e3e` | company-style pills |
| `--lc-tile` | `#404040` | menu tiles |
| `--lc-btn-dark` | `#222222` | workspace action group |
| `--lc-border` | `#313131` | default border |
| `--lc-border-strong` | `#464646` | nav border, emphasized border |
| `--lc-text-1` | `#f5f5f5` | primary text |
| `--lc-text-2` | `#a8a8a8` | secondary text |
| `--lc-text-3` | `#9fa1a4` | tertiary / hints |
| `--lc-text-gutter` | `#858585` | editor line numbers |
| `--lc-brand` | `#ffa116` | brand accent, active badges, links-as-actions |
| `--lc-brand-bg` | `#2c2110` | brand button background (workspace) |
| `--lc-brand-bg-2` | `#423726` | brand button background (list pages) |
| `--lc-green` | `#2cbb5d` | accepted / passed / success |
| `--lc-green-submit` | `#28c244` | Submit button text/icon |
| `--lc-easy` | `#1cbaba` | Easy |
| `--lc-medium` | `#ffb800` | Medium |
| `--lc-hard` | `#f63737` | Hard |
| `--lc-red` | `#ef4743` | wrong answer, notification dot, errors |
| `--lc-blue` | `#0a84ff` | info, topic icon |
| `--lc-purple` | `#bf5af2` | timeout, topic icon |
| `--lc-cyan` | `#64d2ff` | topic icon |

Radius: 8px panels/cards, 6px buttons/inputs, 999px pills. Shadows: menus only
(`0 4px 16px rgba(0,0,0,.4)`). Type: LC system stack
(`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`), mono
`Menlo, Monaco, Consolas, "Courier New", monospace`; base 14px, titles 20/24px semibold.

Semantic mappings:
- Verdicts: passed → green, wrong_output → red, runtime_error → medium yellow, timeout → purple.
- Difficulty from tier: tiers 1–2 Easy, tier 3 Medium, tiers 4–5 Hard (`difficultyForTier()` in `lib/format.ts`).
- Skill bands: ready → text-2, learning → medium, almost → brand, mastered → green.
- Monaco: custom theme `codequest-dark` (base `vs-dark`, background `--lc-panel`, line numbers `--lc-text-gutter`,
  region highlight brand at 12% alpha, crash line red at 14% alpha).

## 2. Component kit (`frontend/src/components/ui/`)

Small, single-purpose, typed components; no component library. Each exposes `className` passthrough.
- `Button` (variants: `primary` brand, `success` green-submit on `--lc-btn-dark`, `secondary` fill-3, `ghost`;
  sizes sm/md; `loading` state with spinner; always `type="button"` unless set).
- `Panel` + `PanelHeader` (workspace panel with `#333` header) and `Card` (layer-1 card).
- `Tabs` (roving-tabindex, arrow-key navigation, `role=tablist/tab/tabpanel`), styled like LC panel tabs with icons.
- `Tag`/`Pill`, `CountBadge` (orange count), `DifficultyLabel`, `VerdictBadge` (restyled existing).
- `ProgressRing` (SVG, solved/total), `Skeleton`, `EmptyState`, `ErrorState` (with retry).
- `UserMenu` on `@radix-ui/react-dropdown-menu`: tiles grid (Profile, Connect Extension, AI Mentor) + list
  (Settings, Sign out), matching screenshot 1.
- `Kbd`. No tooltip component: icon-only buttons get `aria-label` + `title`.

New dependencies (only these): `react-resizable-panels`, `@radix-ui/react-dropdown-menu`.

## 3. Shells

- `AppShell` (list pages): sticky 50px `--lc-layer-1` top bar, bottom border `--lc-border`. Left: CodeQuest mark
  (orange) + wordmark; nav links Quest / Arena / Profile — active = `--lc-text-1` + 2px `--lc-text-1` underline,
  inactive `--lc-text-2`. Right: AI status pill (green dot when enabled), solved chip (flame icon + count),
  `UserMenu`. Below `md`: nav collapses into the user menu. Content max width 1440px.
- `WorkspaceShell` (mission, arena): `--lc-bg-workspace`, compact top bar with back link "Quest", mission title,
  centered action group (Hint, Submit) on `--lc-btn-dark`, user menu right. Panels fill viewport with 8px gutters.
- Auth guard behavior unchanged (redirect to `/` when no token); the "Loading your quest…" text becomes a skeleton.

## 4. Pages

- **Landing `/`**: dark hero on `--lc-bg`; headline with orange emphasis; CTAs primary (orange, "Try the demo as
  Priya") and secondary; hero visual = animated mock results board (motion, respects reduced motion); 3 pillars
  as LC cards; footer line. Same session logic as today.
- **Quest `/home`** (LC problem list): 3 columns ≥ xl (sidebar 240px / list / right rail 320px); rail hides < xl,
  sidebar becomes a horizontal pill row < lg.
  - Sidebar: Quest (active), Arena, Profile, Settings; divider; "My Lists" → Mistake Memory (count), Debug missions.
  - Center: concept pills row (All Concepts first, white-active like LC "All Topics"); search input + type filter
    (All / Build / Debug) + "x/y Solved" with `ProgressRing`; mission rows alternating `--lc-row-alt` / transparent,
    44px tall: status icon (green check when solved, empty space otherwise; the API has no "attempted" flag), "n. Title", concept chips (muted),
    Debug badge, difficulty label right. Rows are links; keyboard focus visible.
  - Right rail: "Next up" card in brand gradient (`--lc-brand-bg` tones) with up to 3 items + reason; Mistake
    Memory card (recurring with strength bar, beaten with trophy); Skills card as pills with `CountBadge`
    (verified count) coloured by band.
  - States: skeleton rows; empty search result; error with retry.
- **Mission `/m/[id]`** (LC workspace, `react-resizable-panels`, layout persisted to localStorage via the
  library's `autoSaveId`): horizontal split left (Description | Hints tabs) / right; right is a vertical split
  Code (top) / Test Result (bottom). Draggable handles are keyboard-operable.
  - Description tab: title, difficulty label, Debug badge, concept tags, description, max-changed-lines note,
    examples block (mono, `--lc-fill-2` background), hidden-test count with lock, "Things to consider".
  - Hints tab: restyled `HintLadder` (levels as stepper, locked levels show unlock countdown).
  - Code panel header: `{id}.py`, "Python 3" label, Saved indicator; footer status `Ln, Col`.
  - Test Result panel: idle prompt, judging skeleton/progress, `ResultsBoard` restyled as LC result view
    (big verdict headline coloured, "x / y testcases passed", case tabs for visible tests, hidden tests as a
    compact grid of status dots); adaptation panel and mission-complete banner live here. On a new result the
    Test Result panel auto-expands if collapsed.
  - Submit stays Ctrl/Cmd+Enter. < lg: panels stack (Description, Code, Result) without resizing.
- **Arena `/arena`**: `WorkspaceShell`; header card with runner + sandboxed status; attack rows (title, code
  preview collapsible, Run button, result badge "Contained" green / "Escaped" red, detail text).
- **Profile `/u/[handle]`** (new, public, works logged-out): left card (avatar initial, name, handle, copy-link
  button); stats row (`ProgressRing` solved/total, hints per solve, debug missions, attempts); concept mastery
  bars coloured by band; mistakes timeline (first/last seen attempt, times, recurring/beaten badge); imports
  section: Codeforces and LeetCode cards with status (ok/stale/error/queued), rating/rank/solved where present,
  and — only when viewing your own profile — a handle form posting `/api/imports` then polling the portfolio
  every 2s until not queued (max 30s); typing summary card (best CPM, accuracy, runs) or empty state.
  `/profile` redirects to the current user's `/u/[handle]`.
- **Settings `/settings`** (new): AI Mentor card — switch bound to `GET/POST /api/settings/ai`, shows provider,
  budget left (USD), rephrased count, leaks blocked; disabled with explanation when `available` is false.
  Connect LeetCode Companion card — "Generate pairing code" → `POST /api/ext/pairing-code`; code shown as 6 large
  mono boxes, copy button, live countdown from `expires_in_s`, regenerate when expired; 3-step instructions.

API client additions in `lib/api.ts` + types: `me.user.handle`, `portfolio(handle)`, `requestImport`,
`aiStatus`, `setAi`, `pairingCode`. All existing error handling (`ApiError`, 401 clears session) reused.

## 5. Extension side panel (after teammate commit)

- `extension/tokens.css` linked before `sidepanel.css`; `sidepanel.css` rewritten against tokens.
- Header bar `--lc-layer-1` with orange mark + "CodeQuest Companion", settings icon button.
- Problem card: title, difficulty colour (if detected), topic pills `--lc-fill-4`.
- Tools (Approach, Hint, Analyze, Submissions) as collapsible panels with `--lc-panel-header` headers; primary
  actions styled like LC Submit (green on `--lc-btn-dark`), secondary `--lc-fill-3`; verdict colours per tokens.
- Pairing view: 6 segmented inputs (paste fills all, backspace moves back) writing into the existing
  `#pair-code` input (kept in the DOM, visually hidden) so `sidepanel.js` logic is untouched beyond a small input helper.
- Existing element IDs and `data-*` hooks preserved; JS changes limited to the pairing input helper and toggling
  panel open state. Icons regenerated by `extension-tests/make_icons.py` with brand orange `#ffa116` on `#1a1a1a`.

## 6. Quality bar

- Accessibility: visible focus ring (2px `--lc-brand`), all interactive elements keyboard reachable, menus/tabs/
  resize handles operable by keyboard, `aria-live` on results and hint output, text contrast ≥ 4.5:1
  (text-2 on bg ≈ 8:1; text-3 used only ≥ 12px on layer-1 ≈ 6:1).
- Motion: `motion` for result reveal, menu and hero; all disabled under `prefers-reduced-motion`.
- Responsive: no horizontal page scroll at 375px; layouts described per page above.
- Verification: `npm run typecheck`, `npm run lint` (includes token check), `npm run build`; backend test suite
  unchanged and passing; manual pass in Chrome at 1440px and 390px for every page, compared with the reference
  screenshots; extension loaded unpacked and checked on a LeetCode problem.

## 7. Figma export (last)

New Figma file "CodeQuest UI": token sheet (colour styles from section 1) and frames for Landing, Quest, Mission,
Profile, Settings and the extension panel, generated from the running app.

## Build order

1. Tokens + globals + Monaco theme + UI kit. 2. Shells + UserMenu. 3. Quest home. 4. Mission workspace.
5. Arena + Landing. 6. API client + Settings + Profile. 7. Verification pass. 8. Extension (once teammate work is
committed). 9. Figma export.
