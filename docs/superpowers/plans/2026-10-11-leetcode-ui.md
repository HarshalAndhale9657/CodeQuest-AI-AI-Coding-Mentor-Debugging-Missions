# LeetCode-grade UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the CodeQuest website and Companion extension with LeetCode's exact dark palette and layouts, and add Profile + Settings pages.

**Architecture:** One CSS token file (`frontend/src/styles/tokens.css`, mirrored to `extension/tokens.css`) feeds Tailwind v4 `@theme`. A small in-house UI kit in `frontend/src/components/ui/` builds two shells (`AppShell` list pages, `WorkspaceShell` mission/arena) and every page. The extension side panel restyles against the same tokens, keeping its element IDs.

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4 / TanStack Query / motion / Monaco; new deps `react-resizable-panels`, `@radix-ui/react-dropdown-menu`. Extension: MV3, plain HTML/CSS/JS.

**Spec:** `docs/superpowers/specs/2026-10-11-leetcode-ui-design.md`

**Execution:** user asked for speed with no review wait: native execution in-session, no per-task commits (CLAUDE.md: commit only when asked). The frontend has no unit-test runner, so each task's gate is `npm run typecheck && npm run lint` and the final gate adds `npm run build` + browser check. The only scripted test is the token-parity check.

## Global Constraints

- Colours only via tokens from spec section 1; no raw hex in components (exceptions: Monaco theme object, SVG gradient stops reading tokens are fine).
- Verdicts: passed→green `#2cbb5d`, wrong_output→red `#ef4743`, runtime_error→medium `#ffb800`, timeout→purple `#bf5af2`.
- Difficulty: tiers 1–2 Easy `#1cbaba`, 3 Medium `#ffb800`, 4–5 Hard `#f63737`.
- Brand accent `#ffa116`; Submit `#28c244` on `#222222`.
- No backend changes. Existing API error handling (`ApiError`, 401 clears session) reused.
- Extension: keep every existing element ID and `data-needs-problem` hook; JS edits limited to the pairing input helper and panel toggles.
- No horizontal page scroll at 375px; `prefers-reduced-motion` disables animations.

## Review Focus

- Unknown/empty data: a learner with 0 solved, 0 skills, no imports, no typing runs → every card shows an empty state, never `undefined`/`NaN` (ProgressRing with total 0 renders 0%).
- Pairing code expiry while the tab is in the background → countdown recomputes from timestamps, shows "expired, get a new one" (reused `ConnectExtension`).
- Profile handle not found / server down → `/u/[handle]` shows ErrorState with retry, not a crash; logged-out visitors can view it.
- Narrow viewport on mission page → panels stack, editor keeps ≥ 28rem height, no resize handles rendered.
- Long mission titles / long test inputs → truncate with `title` in rows; `break-all` in result details.

---

### Task 1: Tokens, globals, Monaco theme, token check

**Files:** Create `frontend/src/styles/tokens.css`, `extension/tokens.css` (copy), `frontend/scripts/check-tokens.mjs`. Modify `frontend/src/app/globals.css`, `frontend/package.json` (lint script, deps), `frontend/src/components/code-editor-inner.tsx` (theme), `frontend/src/lib/format.ts` (`difficultyForTier`).

**Produces:** Tailwind utilities `bg-bg`, `bg-bg-ws`, `bg-layer-1`, `bg-panel`, `bg-panel-header`, `bg-menu`, `bg-row-alt`, `bg-hover`, `bg-fill-2/3/4`, `bg-tile`, `bg-btn-dark`, `border-line`, `border-line-strong`, `text-text-1/2/3`, `text-gutter`, `*-brand`, `*-brand-bg`, `*-brand-bg-2`, `*-green`, `*-green-submit`, `*-easy`, `*-medium`, `*-hard`, `*-red`, `*-blue`, `*-purple`, `*-cyan`; legacy aliases (`ink`, `panel-2`, `muted`, `text`, `accent`, `pass`, `wrong`, `error`, `timeout`) remapped so untouched markup keeps working. `difficultyForTier(tier): { label: "Easy"|"Medium"|"Hard"; className: string }`.

- [ ] Write tokens.css (values from spec §1), copy to extension, write check-tokens.mjs (byte compare, exit 1 with message).
- [ ] Run `node scripts/check-tokens.mjs` → PASS; temporarily edit the copy → FAIL; revert.
- [ ] globals.css `@theme inline` mapping + base styles + scrollbars + focus ring; Monaco `codequest-dark` theme via `beforeMount`.
- [ ] `npm i react-resizable-panels @radix-ui/react-dropdown-menu`; lint script `node scripts/check-tokens.mjs && eslint .`.
- [ ] `npm run typecheck && npm run lint` → clean.

### Task 2: UI kit

**Files:** Create `frontend/src/components/ui/{button,card,tabs,tag,progress-ring,skeleton,states,difficulty}.tsx`; restyle `verdict-badge.tsx`.

**Produces:** `Button({variant: "primary"|"success"|"secondary"|"ghost"|"danger", size: "sm"|"md", loading?})`, `Card`, `Panel`, `PanelHeader`, `Tabs({tabs: {id,label,icon?}[], value, onChange, children?})` with arrow-key roving focus, `Tag`, `CountBadge`, `ProgressRing({value, total, size?})` (total 0 → 0%), `Skeleton({className})`, `EmptyState({icon,title,text?,action?})`, `ErrorState({message,onRetry?})`, `DifficultyLabel({tier})`.

- [ ] Implement; `npm run typecheck && npm run lint`.

### Task 3: Shells + user menu

**Files:** Rewrite `frontend/src/components/app-shell.tsx`; create `frontend/src/components/workspace-shell.tsx`, `frontend/src/components/user-menu.tsx`, `frontend/src/components/logo.tsx`, `frontend/src/lib/session.ts` (move `useHydratedSession`).

**Interfaces:** `AppShell({children, requireAuth = true})`; `WorkspaceShell({title?, actions?: ReactNode, children})`; `UserMenu({name, handle?})`; `useHydratedSession(): {token,name,hydrated}`.

- [ ] Implement LC top bar (50px, layer-1, underline active link), AI pill (`api.aiStatus`), solved chip (`api.me`), Radix user menu with tiles (Profile, Extension → `/settings#extension`, AI Mentor → `/settings#ai`) and list (Settings, Sign out). Mobile: nav links move into the menu.
- [ ] `npm run typecheck && npm run lint`.

### Task 4: Quest home (LC problem list)

**Files:** Rewrite `frontend/src/app/home/page.tsx`; create `frontend/src/components/quest/{sidebar,mission-table,right-rail}.tsx`.

- [ ] Sidebar, concept pills (All Concepts + one per concept from missions), search + type filter + ProgressRing "x/y Solved", alternating rows with DifficultyLabel, right rail (Next up brand card, Mistake Memory, Skills pills). Skeleton/empty/error states. Keep `ConnectExtension` reachable via Settings (remove from home).
- [ ] Gate: typecheck + lint.

### Task 5: Mission workspace

**Files:** Rewrite `frontend/src/app/m/[id]/page.tsx`; restyle `results-board.tsx`, `hint-ladder.tsx`, `adaptation-panel.tsx`, `code-editor.tsx` loading.

- [ ] `WorkspaceShell` with Hint + Submit actions; `react-resizable-panels` `Group` horizontal (left Description|Hints tabs, right vertical Code / Test Result), `autoSaveId`; stacked layout < lg via `useMediaQuery`. Result view: coloured headline, "x / y testcases passed", visible-case tabs, hidden dots grid. Auto-switch left tab to Hints when a hint arrives.
- [ ] Gate: typecheck + lint.

### Task 6: Arena + Landing

**Files:** Rewrite `frontend/src/app/arena/page.tsx`, `frontend/src/app/page.tsx`.

- [ ] Arena in WorkspaceShell with runner status card and attack rows; Landing hero with animated mock results board.
- [ ] Gate: typecheck + lint.

### Task 7: API client + Settings + Profile

**Files:** Modify `frontend/src/lib/api.ts`, `frontend/src/lib/types.ts`; create `frontend/src/app/settings/page.tsx`, `frontend/src/app/u/[handle]/page.tsx`, `frontend/src/app/profile/page.tsx`, restyle `frontend/src/components/connect-extension.tsx`.

**Produces:** `api.portfolio(handle): Promise<Portfolio>`, `api.requestImport(platform, handle): Promise<{status}>`, `api.aiStatus(): Promise<AiStatus>`, `api.setAi(enabled): Promise<AiStatus>`; `Me.user.handle: string`.

- [ ] Settings: AI card (switch, provider, budget, rephrased, leaks blocked; disabled when unavailable) + ConnectExtension (6 big code boxes, copy, countdown, steps). Profile: header card, stats + ring, concept bars, mistakes timeline, imports with own-profile form + polling (2s, ≤30s), typing card. `/profile` redirects to own handle.
- [ ] Gate: typecheck + lint.

### Task 8: Verification

- [ ] `npm run build` clean; start backend + `npm run dev`; Chrome pass at 1440 and 390 widths on `/`, `/home`, `/m/class_average` (submit once), `/arena`, `/settings`, `/u/<handle>`; fix issues.
- [ ] Backend `pytest` unchanged/passing.

### Task 9: Extension

**Files:** Modify `extension/sidepanel.html`, `extension/sidepanel.css`, `extension/sidepanel.js` (pairing boxes + panel toggles only), `extension-tests/make_icons.py` (brand colours) → regenerate icons.

- [ ] Link `tokens.css`; LC header, problem card with difficulty, collapsible tool panels, green primary buttons, 6-box pairing input writing into `#pair-code`.
- [ ] Load `extension-tests/harness.html` / pipeline harness in Chrome to confirm the panel renders and existing harness passes.

### Task 10: Figma export

- [ ] New Figma file "CodeQuest UI": token sheet + frames of key screens from the running app.
