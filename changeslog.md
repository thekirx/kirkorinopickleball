# KirQ changes log and AI handoff

Last updated: 2026-10-19 (Asia/Manila).

This is the shared, repository-tracked handoff for switching between AI assistants. Read `AGENTS.md` before making changes. Update this handoff and add a history entry in the same task as every change; this is an instruction to contributors, not an automatic watcher.

## Current handoff

> **Canonical handoff:** `/Users/kiro/Desktop/kirkorinopickleball/changeslog.md` (the main folder). Start there, then `docs/superpowers/plans/2026-10-21-next-stages.md`. Identical copies of that plan and of the revised design doc (§R) are in this folder. This file keeps the prototype's detailed history; when Stage 1 merges this branch, carry its history entries into the main log.

> **This is the PROTOTYPE worktree** (`/Users/kiro/Desktop/kirkorinopickleball-prototype`, branch `prototype/play-mode`, uncommitted). It is the Phase 1 tree plus **easy mode**, a redesign the owner approved on 2026-10-20: Option A (guided setup) for setup and Option C (phone tabs) for play, with players addable any time. It has not been merged. Preview: `npm run dev:lan` (port 5177, all interfaces). The earlier courts-first prototype in this worktree has been replaced.
>
> **Easy mode at a glance (`src/features/easy/`):**
> - `EasyApp.tsx`: setup until the first round, then the Courts / Players / Results / Share tabs. Spectators get a read-only Courts / Results / Share. The "Today's games" sheet covers new, rename, switch and delete. It replaces the old browser prompt/confirm dialogs, and new day names are made unique.
> - `SetupFlow.tsx` (Option A): "Who's here today?", then courts stepper and doubles/singles with a plain-language preview, then start. Skill levels and the partner limit are optional, under links. "Try it with 10 sample players" creates a separate practice session, so the real one stays clean.
> - `CourtsTab.tsx`: tap the winning team; tap the other team to change it, or the same one to clear it (engine `clearResult`). "Swap a player" keeps the 2-minute swap window and injury replacement. "Start next round" opens a sheet before discarding unfinished games.
> - `PlayersTab.tsx`: add late arrivals any time; Break / I'm back; under More: skill (engine `setPlayerSkill`), record fixes, Remove. Remove has Undo (store `restoreSession`) and is blocked for anyone on a court, because removing deletes their court.
> - `ResultsTab.tsx`, `ShareTab.tsx`: standings, recent games, PDF/CSV/backup, clear (behind a sheet); the QR uses the same publish/sync, including expired-share recovery.
> - `ui.tsx`, `players.tsx`, `easy.css` (scoped under `.easy`; neutralises the old global label/select styles; hidden in print, so the PDF report still prints).
> - Removed (replaced): the eight old panels under `src/features/{roster,setup,courts,queue,standings,history,sessions}` and `share/SharePanel.tsx` (`QrCode` moved to `share/QrCode.tsx`); the old UI tests `App.test.tsx`, `App.integration.test.tsx` and `features/play/playMode.test.tsx`. `features/play/RoundControls.tsx` now returns `needs-confirm` instead of calling `window.confirm`.
> - Tests: `src/features/easy/easyMode.test.tsx` (12, replacing the old UI tests' coverage plus the new behaviour); `src/domain/engine.easy.test.ts` (4).
>
> **Late arrivals (owner decision 2026-10-20):** an organizer setting under Courts → Change → More options. **"They join the back of the line"** (default, fair for open play) leaves a newcomer at waited 0. **"They play in the next round"** (family and friends) calls engine `prioritizeForNextRound`, which sets them one above the longest current wait. Late arrivals within the same round share that level and are shuffled, so a later arrival can't leapfrog an earlier one. The toast and the Players tab say which rule applies. Limitation: like the court count and game type, the choice lives in memory (`RoundControls`) and resets to the fair default on reload.
>
> **Not done:** not tried on a real phone by the owner; the `src/test/fixtures/v1-session.json` Prettier warning is pre-existing (identical in the main tree) and was left alone.

### Repository and scope

- Working directory: `/Users/kiro/Desktop/kirkorinopickleball`.
- Active branch at this handoff: `codex/react-phase-1`.
- GitHub repository: `thekirx/kirkorinopickleball`.
- Last committed revision checked: `3efbb25` (Phase 1 execution plan). Legacy behavior baseline: `8b39e95` (player timeouts and substitutions).
- The React implementation and this handoff documentation are currently **uncommitted and unpublished**. Inspect `git status --short`; preserve the existing changes. Do not switch to the stale `kirkorinopickleball-main` folder or replace this implementation with old `main`.
- Current scope is **Phase 1**, not the whole tournament redesign. Local preview was started at `http://localhost:5176`; check availability or restart it rather than assuming it is still running.

### Authoritative plans and phase status

- Full design: `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md`.
- Phase 1 implementation plan: `docs/superpowers/plans/2026-10-18-react-phase-1.md`.
- Phase 1 — React migration: **acceptance criteria met locally on 2026-10-19.** The consolidated review is done; its two findings are fixed with regression tests. Live sharing passed against the restored backend, and the sync criterion now reads about 17 s, which the owner accepted. All of this is **uncommitted, unpushed and undeployed**, so Phase 1 is not shipped.
- Phase 2 — Court objects, minimap, focused court pane: not implemented.
- Phase 3 — Accessible drag and drop, keyboard controls, Move dialog: not implemented.
- Phase 4 — Per-event formats, round robin/open rotation and organizer setup: not implemented.
- Phase 5 — Conflict-safe tournament scheduler: not implemented.
- Phase 6 — Finish projections and bottleneck warnings: not implemented.
- Phase 7 — Additional tournament formats: not implemented.

Each phase must meet its acceptance criteria before the next begins. Do not treat the existing open-play queue as the new tournament scheduler.

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

These results were observed during the 2026-10-18 implementation session, not rerun merely to create this documentation:

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
- **Prototype, not merged: courts-first play mode** in a separate git worktree, `../kirkorinopickleball-prototype`, on branch `prototype/play-mode`, uncommitted. That copy starts from this tree including the fixes above; this tree does not contain the prototype. Details are in that worktree's own `changeslog.md`. Do not merge it without the owner's decision.
- **Pre-existing, kept for parity:** "Generate Next Round" replaces the current round even if its matches are unfinished, and those matches are discarded without a result. The legacy app did the same. Raise it with the owner before Phase 2, which reworks courts.
- Initial independent review reported cross-session offline update loss and blocked-storage startup failure. Both were reproduced with failing regression tests, fixed, and included in the passing suite. The final consolidated review (Claude, 2026-10-19) covered domain, migration, storage, session store, Supabase client, sync manager, the sharing hook and the court/share panels against legacy `8b39e95`. It found and fixed two defects, recorded under Verification; it found no further defects in the Phase 1 scope.
- Nothing from this implementation has been pushed or deployed. No Vercel Production Branch setting was changed. The plan's warning about production pointing at the wrong branch remains unresolved and requires inspection before any authorized deployment.
  - Observed 2026-10-18: production serves the legacy single-file build at exactly `8b39e95` (latest `kirkorino` commit), not the earlier manually promoted `e73a1c7`. So `8b39e95` reached production after that promotion, either because Production Branch is now `kirkorino` or through a later manual promote — **which one is unknown**. If it is the branch setting, merging this React work into `kirkorino` would auto-deploy unfinished Phase 1 to production. Check Vercel → Settings → Git before any merge into `kirkorino`.
  - 2026-10-19: the owner shared a screenshot of Vercel's **Git → Connected Git Repository** page (repository `thekirx/kirkorinopickleball`, connected Jun 25). That page does not show the production branch, so it is **still unknown**. In current Vercel it is under **Settings → Environments → Production → Branch Tracking**.

### Next steps for the incoming AI

1. Phase 1 acceptance is met locally. Commit and push only when the owner asks; as of 2026-10-19 that has not been authorized. Before any merge into `kirkorino`, find out the Vercel Production Branch (see Blockers).
2. The 7-day expiry is live (2026-10-21). If the backend becomes unreachable again, the owner must check the Supabase dashboard.
3. Rerun the checks below after code changes; inspect the rendered app and print output when relevant. Update this log with actual results.
4. Keep the preview available for the user. Commit/push/deploy only in accordance with the user's current request; distinguish those actions from local completion.
5. Start Phase 2 only after Phase 1 acceptance is satisfied and within the authorized scope. Update this handoff at each phase boundary.

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
- `src/features/`: scorekeeper panels, session controls, report and shared UI.
- `src/lib/`: QR encoder, exports and regression tests.
- `src/App.tsx`, `src/main.tsx`, `src/styles.css`: React composition, entry point and ported styling.
- `src/test/fixtures/v1-session.json`: synthetic captured legacy session fixture; no real player data.
- `vercel.json`, `scripts/check-deployment.mjs`: local deployment configuration and its check.

## Change history

### 2026-10-21 — Stage 0: both branches committed and pushed

- Changed: committed everything. Main folder `24df4f6` on `codex/react-phase-1` (61 files); prototype `28ec6e1` on `prototype/play-mode` (67 files). The owner asked to "push to git", so both were pushed to `origin` under those names only. `main` and `kirkorino` were not touched. This log update is a follow-up commit on each branch.
- Verified before committing: staged files contained no `.env*`, `.vercel`, `service_role` or `sb_secret_` content, and no `node_modules/` or `dist/`. Tests: main 115 passed, prototype 141 passed; both builds passed. After pushing: `git ls-remote --heads origin` shows `codex/react-phase-1` = `24df4f6`, `prototype/play-mode` = `28ec6e1`, `kirkorino` = `8b39e95`, `main` = `264a2c2`. `vercel ls` shows two new **Preview** deployments (Ready) and no new Production one. Both previews return 200, and each serves the expected screens. `kirq.vercel.app` still serves the legacy build.
- Remaining: Stage 1 (merge easy mode into `codex/react-phase-1`) needs owner decision D2; D1 still needs final confirmation in Vercel before Stage 5.
- Delivery: committed and pushed to two non-production branches; nothing deployed to production.

### 2026-10-21 — Handoff made ready for the next stages (prototype copy)

- Changed: removed the dead courts-first CSS block from `src/styles.css`. All of its selectors were unreferenced, and the file now equals the main folder's, which removes a merge conflict. Copied in the revised design doc (§R) and `docs/superpowers/plans/2026-10-21-next-stages.md` from the main folder (identical files). Added the canonical-handoff pointer above.
- Verified: 13 files, **141 passed**; `npm run build` passed; easy mode renders with no overflow and no console errors.
- Delivery: worktree only, uncommitted.

### 2026-10-21 — 7-day share expiry applied to the live database

- Changed: nothing in the repository. The owner ran `supabase-expiry-7d.sql` against project `qagqtdctkcvqfxkysoqx` and confirmed `column_default` contains `7 days` and `update_uses_7_days = true`.
- Verified from here against the live RPCs: create returned a code and token; update with the token succeeded; read by code returned the updated payload; a forged token was rejected with "edit token rejected"; direct table read was still denied (`42501`). So the replaced function kept its grants. One test session was created and will expire on its own in 7 days.
- Delivery: database change by the owner; repository untouched apart from this log.

### 2026-10-20 — Drag and drop to swap players and change courts (prototype worktree only)

- Why: the owner asked for players to be draggable, both to change players and to move them between courts.
- Design: drag lives in a separate **Move players** mode (Courts tab, next to Change). In normal play a tap on a team records the winner; letting names also be draggable there would let a drag record a result, or a winner tap start a drag. In Move players mode tap-to-win is off, and you drag a name onto another name to swap them: across courts, across the net (changing teams), or with someone sitting out. Every drag has a tap alternative (tap one name, then another; WCAG 2.2 2.5.7 Dragging Movements), and because each name is a real button, that is also the keyboard path. dnd-kit's arrow-key keyboard dragging is deliberately not used: it is clumsy, and it would take over Enter/Space.
- Changed: added the `@dnd-kit/core` **6.3.1** dependency (exact pin, released 2024-12-05) in this worktree only. `src/domain/engine.ts`: `swapBlockReason(a, b, now)` (plain-language refusal: same person, both sitting out, same team, on a break, court finished, or court started over 2 minutes ago, which keeps the existing change-window rule) and `swapPlayers(a, b, now)` (moves teammate history with the players; a bench↔court swap uses substitution bookkeeping: incoming waited 0, outgoing waited +1). `src/features/easy/Arrange.tsx` (new board: MouseSensor with 6 px distance; TouchSensor with 180 ms press so a finger can still scroll; drop targets show dashed (ok) or dotted (no) outlines, never colour alone; plain announcements in dnd-kit's live region; a drag-then-click guard). `CourtsTab.tsx` (Move players mode; the Swap panel now also offers people on other courts). `easy.css` (chip styles, `touch-action: manipulation`).
- Verified: `src/domain/engine.swap.test.ts` (5) and 4 new UI tests in `easyMode.test.tsx` (tap-to-swap across courts; bench in by tapping; finished court locked with a reason; Swap panel cross-court). Full suite **13 files, 141 passed**; build passed (JS gzip 67.5 → 85.0 kB, mostly dnd-kit); deploy check passed. Real-browser checks (jsdom has no layout, so these are the drag evidence): **mouse** at 1440×900, Marco dragged onto Carla swapped courts with no stray tap-selection; Joy from the bench onto Ethan brought her in; a bench-onto-bench drop was refused with its reason and nothing changed; mid-drag, all 8 court names marked valid and the other bench name invalid, a floating copy shown, and the live region read "Over Carla. Drop to swap." **Touch** at 375×812: press-and-hold then drag swapped Joy and Ria; a quick swipe started no drag (the page still scrolls); holding near the top edge auto-scrolled from 224 to 0, so dragging from the bench up to a court works. No console errors. Fixed during checks: the pickup announcement read "Over Nico. Pick someone else to swap with." (now "Holding Nico. Drag onto someone to swap.").
- Not verified: on a real phone with a real finger (simulated touch events only). Escape-to-cancel was not confirmed, because the synthetic key event lacked the key code a real key press sends.
- Delivery: worktree only, uncommitted.

### 2026-10-20 — Easy mode fits desktop and tablet as well as phones (prototype worktree only)

- Why: the owner confirmed easy mode works on mobile and asked for it to fit desktop too. Before, desktop showed a 480 px phone column in the middle of the screen.
- Changed: `src/features/easy/easy.css` has a responsive block with two breakpoints and no change below 768 px (the approved phone layout). **≥768 (tablet):** content up to 960 px; courts two across; bottom sheets become centred dialogs. **≥1024 (desktop):** bottom tabs become a sticky left sidebar (232 px), following ui-ux-pro-max `adaptive-navigation`; a court grid with a 320 px sticky side rail ("Sitting out this round" + a desktop-only "Someone arrived?" add form); "Start next round" pinned to the bottom of the content column; Players in two columns; Results and Share in two columns; setup as a centred 760 px column. Markup: `CourtsTab.tsx` (grid + side rail), `ResultsTab.tsx`, `ShareTab.tsx` (two-column wrappers), `PlayersTab.tsx` (`ez-player-grid`), `EasyApp.tsx` (banner wrapper; nav moved before main so the desktop sidebar comes first in keyboard and screen-reader order).
- Verified in the built-in browser with measured geometry: **1440×900** sidebar 232 px, two courts side by side, rail at x=1092, Next button at 830–882 px (bottom), Players/Results 2 columns, Share 300 px + 820 px, dialog centred and closes on Escape; **1024×768** sidebar shown, courts one column next to the rail, Next at the bottom; **768×1024** bottom tabs, courts two across, quick-add hidden, Next above the tabs; **375×812** unchanged phone layout. No horizontal overflow at any size; no console errors. Found and fixed: a `margin: 0` shorthand cancelled `margin-top: auto`, so the desktop Next button floated mid-page with few courts. Tests: 132 passed (layout isn't visible to jsdom, so the browser checks above are the layout evidence); build passed.
- Delivery: worktree only, uncommitted.

### 2026-10-20 — Organizer choice for late arrivals (prototype worktree only)

- Why: the owner wants late arrivals prioritized for family-and-friends games but not for normal open play, where it is unfair to people already waiting.
- Changed: `src/domain/engine.ts` (`prioritizeForNextRound(playerId, sameRoundArrivals)`), `src/features/play/RoundControls.tsx` (`lateArrivals`, `placeNewPlayer`, same-round tracking), `src/features/easy/players.tsx` (applies the rule on add and says so in the toast), `SetupFlow.tsx` (the "When someone arrives late" choice under More options, now shown for singles too; shorter partner-limit labels that fit a 375 px screen, and "Only once" replacing a misleading first draft), `PlayersTab.tsx` (states the current rule), `easy.css`.
- Verified: new tests in `src/domain/engine.easy.test.ts` (3: prioritized arrival selected in 25 of 25 random draws; same-round arrivals share a level; default stays 0) and `easyMode.test.tsx` (2: default rule; the organizer switches the rule and the arrival plays next round). Mutation check: with prioritization disabled, the UI test first failed only 7 of 10 runs (it could pass by luck). It was strengthened to assert the arrival outranks everyone waiting, and then failed 5 of 5; restored, all pass. Full suite **132 passed**, build passed. Browser at 375 px: both choices render with the fair one selected, no overflow.
- Delivery: worktree only, uncommitted.

### 2026-10-20 — Easy mode implemented: Option A setup + Option C play (prototype worktree only)

- Changed: see the prototype note at the top of Current handoff.
- Verified: `npx vitest run --maxWorkers=2` → **12 files, 127 tests passed**; `npm run build`, `npm run test:deployment` and Prettier passed (the only exception is the pre-existing fixture warning). Built-in browser at 375×812: an existing saved session opened straight into play; a new day from the sheet landed on step 1 with Next disabled; names typed with real keystrokes were added and focus stayed in the box; setup → courts preview → play worked; tapping a winner finished the court and the footer said "All games are done"; a late arrival was added from the Players tab; no console errors. Found and fixed in browser and tests: toasts covered the primary button (moved under the header); duplicate default names for a second day on the same date; "1 sit out" grammar; wording that promised late arrivals the next round.
- Remaining: owner tries it on a real phone; owner decides the late-arrival rule; decide whether easy mode replaces the Phase 1 UI.
- Delivery: worktree only, uncommitted, not pushed.

### 2026-10-20 — Easy-mode redesign mock: three directions (prototype worktree only)

- Why: the owner found the courts-first prototype still "hard to understand" and asked for redesigns that people who have never run a queue can use.
- Changed: added `docs/mocks/easy-mode-options.html`, a self-contained, clickable mock. It is not wired to the app, and no app code changed. One shared mock engine (longest wait plays first, partners shuffled) drives three switchable options: **A · Step by step** (3-step guided setup: who's here → courts → play), **B · Court board** (tablet-style; tap the side of the court that won), **C · Phone tabs** (Courts / Players / Results / Share). Shared rules: plain language with no jargon ("Sitting out this round", "Taking a break", "Tap the team that won"); sentence case; one primary action per screen; disabled buttons explain why; "Try with 10 sample players" in empty states; undo on remove; a warning sheet instead of silently discarding games still in play; tap a winner again to correct it; inline SVG icons.
- Verified (built-in browser): page served at `/docs/mocks/easy-mode-options.html` by `npm run dev:lan`. A: the full newcomer flow, Next disabled with a reason, duplicate refused, remove + undo, early Next warns, winner correction, and the 3 who sat out round 1 all played round 2. B (768 px): tap-a-side scoring and an arrival form. C: four tabs, and a player on a break was skipped next round. No horizontal overflow at 375 or 768 px; no console errors. Found and fixed during verification: "Sitting out" listed players whose game had just finished (it now counts only people not in any match this round); the duplicate-name message echoed the typed casing; the empty-state hint read as two jammed sentences.
- ui-ux-pro-max: verified results used (skip/back, empty-state action, touch targets). Two progressive-disclosure queries returned off-topic results, so its general Quick Reference guidance was used instead.
- Remaining: the owner picks a direction or mix; nothing is implemented in the app.
- Delivery: prototype worktree only, uncommitted.

### 2026-10-19 — Courts-first prototype (prototype/play-mode worktree only)

- Changed: see the prototype note at the top of Current handoff. Created with `git worktree add ../kirkorinopickleball-prototype -b prototype/play-mode`, then the uncommitted Phase 1 tree was copied in with `rsync` (excluding `.git`, `dist/`, `.env*.local`, `.vercel/`, `.superpowers/`), then `npm ci`.
- Verified: before any changes the copy passed 115/115, the same as the main tree. After: **13 files, 121 tests passed**; `npm run build` passed; Prettier passed on the touched files. Built-in browser at 375×812: the measurements above. Interaction checks: Next Round while matches were live asked first, and cancelling kept the round; finishing every court showed "All courts finished" (lime bar); Next Round then started Round 2 with no prompt and kept both results. `http://192.168.1.222:5177/` returned 200 from this Mac (address valid on 2026-10-19).
- Remaining: owner review on a real phone; decide whether to adopt it into Phase 2.
- Delivery: worktree only, uncommitted, not pushed.

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
