# KirQ changes log and AI handoff

Last updated: 2026-10-21 (Asia/Manila).

This is the shared, repository-tracked handoff for switching between AI assistants. Read `AGENTS.md` before making changes. Update this handoff and add a history entry in the same task as every change; this is an instruction to contributors, not an automatic watcher.

## Current handoff

### Start here (2026-10-21)

1. **What to do next:** `docs/superpowers/plans/2026-10-21-next-stages.md`. Its stages are ordered; owner decisions D0–D9 are listed there, and stages marked ⛔ wait for them.
2. **What to build:** `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md`. **Read §R first:** it records owner decisions that override the original §7 layout and §8 drag-and-drop text.
3. **Two folders, neither committed:**
   - this folder, branch `codex/react-phase-1`: Phase 1 React app with the original screens; 115 tests
   - `../kirkorinopickleball-prototype`, branch `prototype/play-mode`: the same plus owner-approved **easy mode**, drag and drop, the late-arrival setting and the desktop layout; 141 tests

   The prototype's own `changeslog.md` holds its detailed history. **This file is the canonical handoff.**
4. **Most urgent:** nothing is committed or pushed (Stage 0, owner decision D0), and Vercel's production branch is unknown (D1).

### Repository and scope

- Working directory: `/Users/kiro/Desktop/kirkorinopickleball`.
- Active branch at this handoff: `codex/react-phase-1`.
- GitHub repository: `thekirx/kirkorinopickleball`.
- Last committed revision checked: `3efbb25` (Phase 1 execution plan). Legacy behavior baseline: `8b39e95` (player timeouts and substitutions).
- The React implementation and this handoff documentation are currently **uncommitted and unpublished**. Inspect `git status --short`; preserve the existing changes. Do not switch to the stale `kirkorinopickleball-main` folder or replace this implementation with old `main`.
- Phase 1 is done locally; the next work follows the next-stages plan. Previews: this folder `npm run dev -- --port 5176`; the prototype `npm run dev:lan` (port 5177). Check that they are running rather than assuming it.

### Authoritative plans and phase status

- Full design: `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md`.
- Phase 1 implementation plan: `docs/superpowers/plans/2026-10-18-react-phase-1.md`.
- Phase 1 — React migration: **acceptance criteria met locally on 2026-10-19.** The consolidated review is done; its two findings are fixed with regression tests. Live sharing passed against the restored backend, and the sync criterion now reads about 17 s, which the owner accepted. All of this is **uncommitted, unpushed and undeployed**, so Phase 1 is not shipped.
- Phase 2 (revised, design §R4) — first-class courts: not implemented. The minimap is an open owner decision (D4); the §7 focus pane and player rail were superseded by easy mode.
- Phase 3 (revised, design §R2/§R4) — drag and drop: **mostly done in the prototype** (Move players mode, mouse and touch drag, tap-tap alternative that is also the keyboard path, plain refusal reasons). Remaining: a double-booking property test, a real-phone check and Escape-to-cancel (next-stages Stage 4).
- Phase 4 — Per-event formats, round robin/open rotation and organizer setup: not implemented.
- Phase 5 — Conflict-safe tournament scheduler: not implemented.
- Phase 6 — Finish projections and bottleneck warnings: not implemented.
- Phase 7 — Additional tournament formats: not implemented.

Each phase must meet its acceptance criteria before the next begins. Do not treat the existing open-play queue as the new tournament scheduler. **Easy mode (design §R1)** is the approved UI direction. It lives in the prototype until Stage 1 merges it (owner decision D2).

### Implemented locally

- React 18 + TypeScript + Vite + Zustand replace the monolithic HTML application. Existing styling and eight-panel order are preserved, rather than redesigned in Phase 1.
- Typed domain engine preserves queue priority, round generation, scoring, player timeouts/reactivation, single-player changes during the first two minutes from round generation, and injury substitutions after that window. There is no separate Start Match action.
- Schema v2 migration handles legacy browser sessions, retains existing storage keys and share codes, relinks match participants to player records, and protects unsupported future schemas from overwrite.
- Multi-session creation, switching, renaming and deletion; browser-storage failure warning with usable in-memory state.
- Existing handwritten QR encoder, CSV, safe JSON backup, and printable report ported to modules/components.
- Existing Supabase RPC boundaries retained; viewer polling every 15 seconds, debounced writes, reconnect retry, and per-share-code pending queues. Public/shared payloads exclude private edit tokens.

### Important implementation decisions

- Port the existing generation/scoring algorithm into a typed state-scoped engine; do not introduce tournament scheduling behavior during the parity migration.
- Serialize participant IDs and map entries explicitly; migration relinks references for each state snapshot. Credentials belong only in local per-session storage, never the public payload.
- The implicit open-rotation event and stable match `courtId` metadata are present in v2. First-class `Court[]` and court UI belong to Phase 2.
- Event formats are configured per event, not per tournament. Pools feeding playoffs are optional per event and off by default; implement the appropriate readiness barrier when that option is enabled in the relevant later phase.
- Delayed publish responses save credentials to their original session even if the organizer switched sessions while waiting.
- Offline jobs are coalesced separately by share code so switching sessions cannot discard another session's pending update.
- Browser `localStorage` property access is deferred inside the safe storage adapter, covering getter-level `SecurityError` as well as failed reads/writes.
- `.npmrc` uses `legacy-peer-deps=true` because npm's optional-peer resolution crashed during setup; required Testing Library DOM dependency is explicitly declared.

### Verification already performed

Results below are dated. On 2026-10-21 this folder's suite was rerun: **12 files, 115 passed**. Earlier entries are kept as recorded:

- `npm test -- --maxWorkers=2`: **9 test files, 108 tests passed** after the offline-queue and storage-getter regression fixes.
- `npm run build`: strict TypeScript and Vite production build passed.
- `npm run test:deployment`: local Vite SPA deployment configuration passed; this does not verify an actual Vercel deployment.
- `git diff --check`: passed before this documentation task; rerun for subsequent changes.
- QR checks include 41 comparisons with the legacy implementation and 41 independent libqrencode matrix comparisons. The independent oracle skips explicitly if its native library is unavailable.
- Browser checks at desktop 1440px and mobile 375px: same section order and visual styling, no horizontal overflow. Add players, pause, generate round, replace player, enforce two-minute deadline, injury substitute, declare result, export backup and reload history passed without console errors.
- Print-media browser check reproduced session controls leaking into the report; CSS was corrected and the check then passed.
- Supabase RPC contract, viewer polling, safe payload and offline retry are covered with injected HTTP responses. These are not evidence of live backend availability.
- **Consolidated review fixes, 2026-10-19.** (1) `src/state/sessionLibrary.ts` called `crypto.randomUUID()` with no fallback, so creating a session threw `TypeError` on browsers without it (Safari < 15.4 is still inside Vite's default build target; also insecure http origins). Added the same fallback the engine uses. Regression test: `src/state/sessionLibrary.test.ts`. (2) `src/services/useSharing.ts` memoized the sync manager but disposed it in an effect cleanup. Under React StrictMode's mount/cleanup/mount cycle, the same disposed manager was reused and every later write was silently dropped. The app is not currently wrapped in StrictMode, so this was latent, not live. The manager is now created inside the effect and held in a ref. Regression test: `src/services/useSharing.strictmode.test.tsx`. Both tests failed before the fixes (`TypeError: crypto.randomUUID is not a function`; `expected 0 to be greater than 0`) and pass after. Then: `npx vitest run --maxWorkers=2` → **11 files, 110 tests passed**; `npm run build` passed; `npm run test:deployment` passed; `npx prettier --check` passed on the four touched files. A live React-to-React run with the fixed code still synced in **11.3 s**.
- **Live sharing, 2026-10-19, against the restored backend** (built-in browser, two tabs acting as two devices). Production `https://kirq.vercel.app` (legacy `8b39e95`): publish succeeded; the read-only viewer showed the roster with no scoring controls; a recorded result reached the viewer in **10.8 s**. React dev build (`http://localhost:5176`, branch `codex/react-phase-1`): a share link **published by the legacy production app** opened in the React viewer with the correct roster, finished court, standings and match log, which covers the "existing v1 share link opens" criterion. A further legacy-published result reached that React viewer in **16.0 s**. React publishing worked, the React viewer hid the scoring and roster controls, and a React-published result reached the React viewer in **11.3 s**. Direct `kirq_sessions` table reads with the publishable key were still refused (`42501`). The test sessions were deleted from both browser origins afterwards; their three server rows expire automatically after 30 days.

### Blockers and unfinished work

- **Resolved 2026-10-19:** the Supabase project `qagqtdctkcvqfxkysoqx` was down (DNS failed from 2026-10-18), which broke production sharing for real users as well as testing. The owner restored it in the Supabase dashboard. It now resolves, and the URL, publishable key and schema are unchanged. Keep in mind:
  - The project is **not** in the Supabase org the AI connector uses (`thekirx's Org`); the connector gets "permission denied". Only the owner, signed in with the account that created it on 2026-08-31, can see its status or restore it.
  - Free-tier projects can be paused again after inactivity. If DNS fails again, ask the owner to check the dashboard first; do not provision a replacement.
  - **Done 2026-10-21:** shared sessions now expire **7 days after their last update**. The owner ran `supabase-expiry-7d.sql` in the Supabase SQL Editor and confirmed the check query returned a `7 days` column default and `true` for the update function. Each score update pushes the expiry forward again, so a session in use never expires mid-play. Sessions created before the change keep their earlier expiry (at most 30 days) until their next update.
- **Decided 2026-10-19:** the sync criterion is now "within about 17 s" in `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md`. Worst case is the 0.9 s write debounce, plus network time, plus one 15 s poll. The owner accepted it; poll interval and debounce are unchanged.
- **Fixed 2026-10-19 (owner approved): an expired share can now be re-published.** Before, a share that expired made `src/services/syncManager.ts` report "Offline — will retry" forever and kept Publish disabled. Now the server's "session not found, expired, or edit token rejected" error counts as permanent. The job is dropped (not retried), status becomes `expired`, and `clearShare(sessionId, code)` in `src/state/sessionStore.ts` clears exactly that session's credentials, only if they still match the rejected code. The share panel shows "Share expired — publish again for a new QR code", and Publish works again for the same session with its data intact. The old printed code stays dead by design.
- **Prototype, not merged: easy mode** in a separate git worktree, `../kirkorinopickleball-prototype`, on branch `prototype/play-mode`, uncommitted. The owner approved the design direction on 2026-10-20: guided setup (Option A) + phone tabs (Option C), players addable any time. The worktree starts from this tree; this tree does not contain it. Details are in that worktree's `changeslog.md`. It includes an organizer setting the owner requested for late arrivals: back of the line (default, fair for open play) or play in the next round (family and friends). Do not merge without the owner's decision.
- **Pre-existing, kept for parity:** "Generate Next Round" replaces the current round even if its matches are unfinished, and those matches are discarded without a result. The legacy app did the same. Raise it with the owner before Phase 2, which reworks courts.
- Initial independent review reported cross-session offline update loss and blocked-storage startup failure. Both were reproduced with failing regression tests, fixed, and included in the passing suite. The final consolidated review (Claude, 2026-10-19) covered domain, migration, storage, session store, Supabase client, sync manager, the sharing hook and the court/share panels against legacy `8b39e95`. It found and fixed two defects, recorded under Verification; it found no further defects in the Phase 1 scope.
- Nothing from this implementation has been pushed or deployed. No Vercel Production Branch setting was changed. The plan's warning about production pointing at the wrong branch remains unresolved and requires inspection before any authorized deployment.
  - Observed 2026-10-18: production serves the legacy single-file build at exactly `8b39e95` (latest `kirkorino` commit), not the earlier manually promoted `e73a1c7`. So `8b39e95` reached production after that promotion, either because Production Branch is now `kirkorino` or through a later manual promote — **which one is unknown**. If it is the branch setting, merging this React work into `kirkorino` would auto-deploy unfinished Phase 1 to production. Check Vercel → Settings → Git before any merge into `kirkorino`.
  - 2026-10-19: the owner shared a screenshot of Vercel's **Git → Connected Git Repository** page (repository `thekirx/kirkorinopickleball`, connected Jun 25). That page does not show the production branch, so it is **still unknown**. In current Vercel it is under **Settings → Environments → Production → Branch Tracking**.

### Next steps for the incoming AI

Follow `docs/superpowers/plans/2026-10-21-next-stages.md` in order:

1. **Stage 0 — secure the work** (needs owner decision D0 to commit and push; D1 before any merge into a production branch).
2. **Stage 1 — merge easy mode into this branch** (needs D2).
3. **Stage 2 — remember settings per game day** (needs D3).
4. **Stage 3 — courts become objects** (minimap only with D4).
5. **Stage 4 — finish drag and drop.**
6. **Stage 5 — ship** (needs D1, D6).
7. **Stage 6+ — tournament phases 4–7** (needs D7–D9).

Commit, push and deploy only when the owner says so, and record which of those actually happened. Update this handoff at every stage boundary.

### Useful commands and code map

```sh
git status --short
git branch --show-current
npm ci
npm run dev -- --port 5176
npm test -- --run --maxWorkers=2
npm run build
npm run test:deployment
git diff --check
```

- `src/domain/`: types, legacy/v2 migration, serialization, match/queue engine and tests.
- `src/state/`: safe storage, session library, Zustand store and tests.
- `src/services/`: Supabase RPC client, shared-session reader, sync manager, React sharing hook and tests.
- `src/features/`: in this folder, the original scorekeeper panels, session controls, report and shared UI. In the prototype, these are replaced by `src/features/easy/` (screens), `src/features/play/RoundControls.tsx` (round settings and the late-arrival rule) and `src/features/share/QrCode.tsx`.
- `src/lib/`: QR encoder, exports and regression tests.
- `src/App.tsx`, `src/main.tsx`, `src/styles.css`: React composition, entry point and ported styling.
- `src/test/fixtures/v1-session.json`: synthetic captured legacy session fixture; no real player data.
- `vercel.json`, `scripts/check-deployment.mjs`: local deployment configuration and its check.

## Change history

### 2026-10-21 — Handoff made ready for the next stages

- Changed: added `docs/superpowers/plans/2026-10-21-next-stages.md` (ordered Stages 0–6+, owner decisions D0–D9, acceptance criteria and exact commands, plus a measured list of every file that differs between the two folders). Added design-doc **§R** (2026-10-21) recording the owner decisions that override the original §7 layout and §8 drag-and-drop text, with superseded/revised banners on §7, §8 and Phases 2/3, and open questions 5–6. Rewrote the top of this handoff: a **Start here** block, corrected Phase 2/3 status (Phase 3 is mostly built in the prototype, not "not implemented"), next steps that point to the plan, and the prototype's code locations.
- Prototype worktree: removed a dead CSS block appended to `src/styles.css` by the superseded courts-first prototype. Every selector in it (`next-round-bar`, `play-layout`, `roster-row`, `roster-edit`, `court-edit`, `has-round-bar`, `is-playing`) had no reference left. That file is now identical to this folder's, which removes one merge conflict. The same design doc, plan and this entry were copied there.
- Verified: this folder `npx vitest run --maxWorkers=2` → 12 files, **115 passed**. Prototype after the CSS removal → 13 files, **141 passed**; `npm run build` passed; a browser check showed easy mode rendering with no overflow and no console errors. `diff -rq` between the folders gave the file list recorded in the plan.
- Delivery: local and uncommitted in both folders.

### 2026-10-21 — 7-day share expiry applied to the live database

- Changed: nothing in the repository. The owner ran `supabase-expiry-7d.sql` against project `qagqtdctkcvqfxkysoqx` and confirmed `column_default` contains `7 days` and `update_uses_7_days = true`.
- Verified from here against the live RPCs: create returned a code and token; update with the token succeeded; read by code returned the updated payload; a forged token was rejected with "edit token rejected"; direct table read was still denied (`42501`). So the replaced function kept its grants. One test session was created and will expire on its own in 7 days.
- Delivery: database change by the owner; repository untouched apart from this log.

### 2026-10-19 — Expired shares can be re-published; courts-first prototype started

- Changed: `src/services/syncManager.ts` (new `expired` status; permanent errors are dropped instead of retried), `src/services/useSharing.ts` (`isExpiredShareError`, `EXPIRED_MESSAGE`; queued jobs carry their `sessionId`), `src/state/sessionStore.ts` (`clearShare`), `src/features/share/SharePanel.tsx` (expired label). New tests: `src/services/expiredShare.test.tsx` (5).
- Verified: confirmed the server's real rejection with `curl` (HTTP 400, `P0001`, "KirQ session not found, expired, or edit token rejected"). Mutation check: with the classifier disabled, the main expiry test failed; restored, all 5 pass. Full suite **12 files, 115 tests passed**; `npm run build`, `npm run test:deployment` and Prettier passed. Live against the real backend: published, made the saved token invalid (the server returns the same error as a real expiry), reloaded. The panel showed the expired label (not "offline"), Publish re-enabled, and re-publishing the same session gave a new working code with its players intact. The test session was deleted afterwards.
- Remaining: the owner still has to run `supabase-expiry-7d.sql`. The prototype is in `../kirkorinopickleball-prototype` (see Blockers).
- Delivery: local and uncommitted.

### 2026-10-19 — Phase 1 consolidated review, 7-day expiry, 17 s criterion

- Changed: two review fixes with regression tests in `src/state/sessionLibrary.ts`, `src/state/sessionLibrary.test.ts`, `src/services/useSharing.ts` and `src/services/useSharing.strictmode.test.tsx` (details under Verification). The sync criterion now reads about 17 s in `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md`. Added `supabase-expiry-7d.sql` to cut share expiry to 7 days after the last update, and aligned `supabase-setup.sql` (no `30 days` left).
- Verified: both new tests failed before the fixes and pass after. Full suite: 11 files, 110 tests passed. `npm run build`, `npm run test:deployment` and Prettier on the touched files all passed. A live React publish synced to a second tab in 11.3 s. The SQL has **not** been run against the database.
- Remaining: the owner must run the 7-day SQL; a decision on the expired-share re-publish fix; the Vercel Production Branch is still unknown; commit/push is not authorized; owner-requested UI/UX improvements for the React version were proposed (mobile measurements are below) but not implemented.
- UX measurements (375×812, 10 players, one round live): the page is 9,234 px tall (11.4 screens); "Generate Next Round" sits at 5,584 px and the first "Declare winner" at 6,271 px; the roster panel alone runs about 3,700 px; 93 visible buttons, 60 of them per-player roster controls. These feed the Phase 2/3 layout work.
- Delivery: local and uncommitted.

### 2026-10-19 — Live sharing verified after backend restore

- Changed: `changeslog.md` only. The Supabase outage is marked resolved, the 2026-10-19 live-sharing results are recorded, and two new items are noted: the 30-day session expiry and the 15-second criterion that can't be guaranteed as worded. No code, configuration, backend or hosting changes.
- Verified: `dig +short qagqtdctkcvqfxkysoqx.supabase.co` now resolves. REST without a key returns 401; table access with the publishable key returns `42501`. Two-tab browser runs: legacy production publish → viewer in 10.8 s; legacy-published link opens in the React viewer; legacy → React viewer update in 16.0 s; React publish → React viewer update in 11.3 s; both viewers read-only. Phase 1's automated suite was not rerun, because no code changed.
- Remaining: the final consolidated code review of Phase 1; the user's decision on the 15-second wording; the Vercel Production Branch check before any merge into `kirkorino`.
- Delivery: local and uncommitted. The three test sessions exist only as server rows that expire after 30 days; the local test sessions were deleted.

### 2026-10-18 — Production state check: shared sessions are down in production

- Changed: `changeslog.md` only. Expanded the Supabase and Vercel blocker entries under **Blockers and unfinished work** with verified observations of the live deployment. No code, configuration, backend or hosting changes.
- Verified: `dig +short qagqtdctkcvqfxkysoqx.supabase.co` returned no answer and `curl https://qagqtdctkcvqfxkysoqx.supabase.co/rest/v1/` could not connect (status `000`). `curl -L https://kirq.vercel.app` returned 200; the response is byte-identical (`cmp`) to `git show 8b39e95:index.html`, differs from `e73a1c7`, and references that same Supabase hostname. Supabase connector `list_organizations`/`list_projects` show only `thekirx's Org` without this project.
- Remaining: confirm the project's status in the Supabase dashboard and restore it if paused (owner action); confirm Vercel's Production Branch before merging into `kirkorino`. Live-sharing acceptance for Phase 1 stays pending until the backend resolves.
- Delivery: local and uncommitted, alongside the existing uncommitted Phase 1 work.

### 2026-10-18 — Shared AI handoff and update policy

- Added `changeslog.md` with phase status, implementation decisions, code map, historical verification, known blockers and next steps so another AI can continue without chat history.
- Added `AGENTS.md` requiring contributors to read and update this log for every change, in the same task/commit. Added `CLAUDE.md` and `GEMINI.md` pointers to the shared instructions, and a README entry linking the handoff.
- Documentation only; no runtime behavior, backend, GitHub or hosting changes. Verified: `git diff --check` passed; a Node assertion check confirmed handoff target paths, all seven phase entries, and instruction/README pointers. Runtime tests were not rerun for this documentation-only change. Delivery: local and uncommitted.

### 2026-10-18 — Phase 1 local React migration (work in progress)

- Ported the legacy application to React/Vite/TypeScript/Zustand, retaining existing scorekeeper features and adding versioned migration and typed module boundaries. Added domain, state, sharing, QR, export and React tests.
- Fixed delayed-publish session ownership, per-session offline queue retention, blocked-storage startup fallback, and print-only report visibility.
- Replaced `index.html` with the React entry point; legacy HTML VM tests are removed in favor of equivalent typed engine/integration coverage. New application/configuration files remain uncommitted alongside that intentional deletion.
- Verification: 108 tests passed, production build and deployment-config check passed; responsive browser flow and print-media checks passed as described above.
- Limitations: final review pending, live sharing blocked by backend DNS, no push/deployment, remaining phases not implemented.

### Prior baseline — Existing behavior and approved plan

- `8b39e95`: player timeouts and match substitutions baseline.
- `3efbb25`: approved Phase 1 execution plan and full tournament design stored under `docs/superpowers/`.

## Entry template

For the next change, add an entry above the existing history entries and refresh Current handoff:

```markdown
### YYYY-MM-DD — Short description

- Changed: what changed and why; relevant repository paths.
- Verified: exact commands/checks and their observed results, or explicitly not run.
- Remaining: blockers, incomplete acceptance criteria and concrete next steps.
- Delivery: local/uncommitted, commit identifier, pushed or deployed — only what actually happened.
```
