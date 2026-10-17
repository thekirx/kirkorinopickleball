# KirQ React Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-file KirQ application with a Vite + React 18 + TypeScript + Zustand build while preserving every behavior present at commit `8b39e95` and adding a versioned v1-to-v2 state migration.

**Architecture:** Pure domain modules own queueing, match generation, substitutions, migration, QR generation, and exports. A persisted Zustand store owns the active session, while a separate session-library adapter owns the browser's multi-session index. React components render the existing KirQ information architecture and brand without introducing Phase 2 court objects or tournament-event features.

**Tech Stack:** Vite, React 18, TypeScript, Zustand with `persist`, Vitest, Testing Library, jsdom, plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md` (Phase 1 only; the pool-to-playoff ruling applies to Phase 4 and does not change this plan)

## Global Constraints

- Build from branch `kirkorino` commit `8b39e95`; never use the stale `main` snapshot.
- Phase 1 adds no tournament features and makes no intentional user-facing redesign.
- Preserve offline-first localStorage authority, multi-session behavior, 15-second read-only viewer polling, and the existing three Supabase RPC boundaries.
- Preserve the hand-written QR algorithm as a direct port; do not add a QR runtime dependency or CDN.
- Existing v1 payloads with no `schemaVersion` migrate one way to `schemaVersion: 2`; an already printed `?s=<code>` link must still render.
- Preserve player timeouts, the two-minute ordinary replacement window, and injury substitutions from `8b39e95`.
- Preserve the existing paper/ink/electric-blue/lime visual tokens, Archivo/JetBrains Mono typography, zero radii, section order, visible copy, and responsive behavior.
- Do not change Supabase table policies, enable Realtime, or add multi-device editing.
- Keep modules focused; `App.tsx` is composition glue, not a new monolith.

## Review Focus

- Malformed or partially missing legacy payload fields must migrate to safe defaults rather than crash startup; Task 2 tests this.
- localStorage quota/security failures must leave the in-memory scorekeeper usable and expose an offline persistence warning; Task 4 tests this.
- An offline publish update must remain queued and retry on the browser's `online` event without duplicate concurrent writes; Task 6 tests this.
- A shared v1 payload containing a deleted/missing player reference must drop only the invalid match, not the roster or match log; Task 2 tests this.
- Timer expiry during an open replacement picker must prevent the change at the domain boundary even if the stale control is clicked; Task 3 tests this.

---

### Task 1: Vite/React scaffold and visual parity shell

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test/setup.ts`
- Replace: `index.html`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: the existing `index.html` as the accepted visual/copy reference.
- Produces: `App(): JSX.Element`, shared CSS tokens/classes, and the Vite/Vitest commands used by every later task.

- [ ] **Step 1: Capture the baseline**

Run the current app from commit `8b39e95` on localhost and save desktop and 375px screenshots outside the repository. Record the visible section order and first-viewport copy in the execution ledger.

- [ ] **Step 2: Add test/build configuration and install dependencies**

Create the package/configuration files for React 18, Zustand, Vite, TypeScript, Vitest, Testing Library, and jsdom. Run `npm install`.

- [ ] **Step 3: Write the failing shell test**

Create `src/App.test.tsx` asserting the real `App` renders the KirQ brand, all eight numbered section headings in the existing order, and the primary `Add to Roster` / `Generate Next Round` controls.

- [ ] **Step 4: Verify RED**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because `src/App.tsx` and its rendered shell do not exist.

- [ ] **Step 5: Implement the minimal React shell and direct CSS port**

Replace the legacy entry document with Vite mounting markup, create `main.tsx`, compose focused placeholder section components in `App.tsx`, and port the existing tokens/layout CSS without changing copy or hierarchy.

- [ ] **Step 6: Verify GREEN and build**

Run: `npm test -- --run src/App.test.tsx && npm run build`

Expected: the shell test passes and Vite produces `dist/` with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "build: scaffold KirQ React application"
```

### Task 2: Versioned session model and v1 migration

**Files:**
- Create: `src/domain/types.ts`, `src/domain/migrate.ts`, `src/domain/serialize.ts`, `src/test/fixtures/v1-session.json`
- Test: `src/domain/migrate.test.ts`, `src/domain/serialize.test.ts`

**Interfaces:**
- Consumes: raw v1 JSON shaped like commit `8b39e95` (`players`, `activeMatches`, `matchLog`, `teammateHistory`).
- Produces: `TournamentStateV2`, `migrate(payload: unknown): TournamentStateV2`, `serializeState(state: TournamentStateV2): SerializedTournamentStateV2`, and `SCHEMA_VERSION = 2`.

- [ ] **Step 1: Write failing migration tests**

Test a captured v1 payload migrates to one implicit `openRotation` event, preserves roster/stats/timeouts/log/history, assigns stable court ids to valid active matches, drops only matches with missing player references, and safely defaults malformed optional fields.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/domain/migrate.test.ts`

Expected: FAIL because the migration module does not exist.

- [ ] **Step 3: Implement the minimal types and migration**

Define v2 types needed for parity only. Implement a pure, one-way migration and schema-version dispatch; do not add Phase 4 tournament-format machinery beyond the single implicit `openRotation` event required by the spec.

- [ ] **Step 4: Verify migration GREEN**

Run: `npm test -- --run src/domain/migrate.test.ts`

Expected: all migration cases pass.

- [ ] **Step 5: Write failing serialization round-trip tests**

Assert `serializeState(migrate(v1Fixture))` remains v2 after a second `migrate()` call and preserves all ids, availability flags, timestamps, history, and share-safe fields.

- [ ] **Step 6: Verify RED, implement serialization, verify GREEN**

Run before implementation: `npm test -- --run src/domain/serialize.test.ts`

Expected: FAIL because `serializeState` does not exist.

Run after implementation: `npm test -- --run src/domain/migrate.test.ts src/domain/serialize.test.ts`

Expected: all migration and serialization tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/domain src/test/fixtures
git commit -m "feat: add versioned session migration"
```

### Task 3: Open-rotation domain engine and substitution parity

**Files:**
- Create: `src/domain/openRotation.ts`, `src/domain/playerActions.ts`, `src/domain/matchActions.ts`
- Port/Delete: `tests/player-availability-and-substitution.test.js`
- Test: `src/domain/openRotation.test.ts`, `src/domain/playerActions.test.ts`, `src/domain/matchActions.test.ts`

**Interfaces:**
- Consumes: `TournamentStateV2`, `Player`, `ActiveMatch` from Task 2.
- Produces: `createRoundPlan`, `applyRoundPlan`, `declareWinner`, `setPlayerActive`, `replaceMatchPlayer`, `substituteInjuredPlayer`, `getPrioritizedQueue`, `getRankedPlayers`, and `PLAYER_CHANGE_WINDOW_MS`.

- [ ] **Step 1: Port the four existing availability/substitution tests to TypeScript before domain code**

Exercise the public functions directly against real state objects. Add the expiry race case: a replacement selected before two minutes but submitted at the deadline must return `change-window-expired` and leave state unchanged.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/domain/playerActions.test.ts src/domain/matchActions.test.ts`

Expected: FAIL because the domain action modules do not exist.

- [ ] **Step 3: Implement player and match actions, verify GREEN**

Run: `npm test -- --run src/domain/playerActions.test.ts src/domain/matchActions.test.ts`

Expected: all action and timer-boundary tests pass.

- [ ] **Step 4: Write failing open-rotation tests**

Cover strict wait priority, tie randomization through injected RNG, singles/doubles team construction, skill scoring, teammate limits, reduced court count, inactive-player exclusion, winner logging, and leaderboard ordering.

- [ ] **Step 5: Verify RED, implement the engine, verify GREEN**

Run before implementation: `npm test -- --run src/domain/openRotation.test.ts`

Expected: FAIL because the engine does not exist.

Run after implementation: `npm test -- --run src/domain/*.test.ts`

Expected: all domain tests pass.

- [ ] **Step 6: Remove the legacy VM-based JavaScript test only after its TypeScript cases are green**

Run: `npm test -- --run`

Expected: the complete suite passes without evaluating functions out of the legacy HTML.

- [ ] **Step 7: Commit**

```bash
git add src/domain tests/player-availability-and-substitution.test.js
git commit -m "feat: port open rotation domain logic"
```

### Task 4: Zustand store and multi-session offline persistence

**Files:**
- Create: `src/state/sessionStore.ts`, `src/state/sessionLibrary.ts`, `src/state/storage.ts`
- Test: `src/state/sessionStore.test.ts`, `src/state/sessionLibrary.test.ts`, `src/state/storage.test.ts`

**Interfaces:**
- Consumes: migration, serialization, and pure domain actions from Tasks 2–3.
- Produces: `createSessionStore(deps)`, `useSessionStore`, `SessionLibrary`, the existing storage keys, and a persistence-warning state surfaced to React.

- [ ] **Step 1: Write failing storage and session-library tests**

Cover legacy-key adoption, create/rename/switch/delete, active-session index updates, one-session deletion refusal, per-session share metadata, and read/write exceptions returning structured failures without destroying in-memory state.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --run src/state/storage.test.ts src/state/sessionLibrary.test.ts`

Expected: FAIL because the adapters do not exist.

- [ ] **Step 3: Implement adapters and verify GREEN**

Run: `npm test -- --run src/state/storage.test.ts src/state/sessionLibrary.test.ts`

Expected: all adapter cases pass.

- [ ] **Step 4: Write failing store tests**

Assert store actions call the real pure domain functions, persist schema v2 after each mutation, restore through `migrate()`, keep mutations usable after storage failures, and set a user-visible persistence warning.

- [ ] **Step 5: Verify RED, implement the store, verify GREEN**

Run before implementation: `npm test -- --run src/state/sessionStore.test.ts`

Expected: FAIL because the store does not exist.

Run after implementation: `npm test -- --run src/state/*.test.ts`

Expected: all state tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/state
git commit -m "feat: add persisted multi-session store"
```

### Task 5: QR encoder and export ports

**Files:**
- Create: `src/lib/qr.ts`, `src/lib/csv.ts`, `src/lib/jsonExport.ts`, `src/features/reports/PrintReport.tsx`
- Test: `src/lib/qr.test.ts`, `src/lib/csv.test.ts`, `src/features/reports/PrintReport.test.tsx`

**Interfaces:**
- Consumes: serializable v2 state and ranked-player/match-log selectors.
- Produces: `encodeQr`, `renderQrPath`, `buildHistoryCsv`, `buildBackupJson`, and `PrintReport`.

- [ ] **Step 1: Write failing QR parity tests**

For 41 fixed inputs spanning versions 1–40 and ECC levels L/M/Q/H, invoke `/opt/homebrew/bin/qrencode` in test setup to derive the expected module grid and compare the pure `encodeQr` output module-for-module. Skip with an explicit diagnostic only when the executable is unavailable.

- [ ] **Step 2: Verify RED, port the encoder directly, verify GREEN**

Run before implementation: `npm test -- --run src/lib/qr.test.ts`

Expected: FAIL because `encodeQr` does not exist.

Run after implementation: `npm test -- --run src/lib/qr.test.ts`

Expected: 41/41 QR parity cases pass with no QR runtime dependency.

- [ ] **Step 3: Write failing CSV/JSON/report tests**

Assert RFC-compatible quoting, stable v2 backup JSON, all existing PDF report sections, empty-state copy, numeric columns, and print-only markup.

- [ ] **Step 4: Verify RED, port exports/report, verify GREEN**

Run before implementation: `npm test -- --run src/lib/csv.test.ts src/features/reports/PrintReport.test.tsx`

Expected: FAIL because export/report modules do not exist.

Run after implementation: `npm test -- --run src/lib/csv.test.ts src/features/reports/PrintReport.test.tsx`

Expected: all export and report tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib src/features/reports
git commit -m "feat: port QR and session exports"
```

### Task 6: Supabase publish/sync and read-only viewer

**Files:**
- Create: `src/services/supabase.ts`, `src/services/syncManager.ts`, `src/services/sharedSession.ts`
- Test: `src/services/supabase.test.ts`, `src/services/syncManager.test.ts`, `src/services/sharedSession.test.ts`

**Interfaces:**
- Consumes: `serializeState`, `migrate`, store mutation hooks, and existing Supabase URL/publishable key.
- Produces: the three RPC methods, `createSyncManager`, `loadSharedSession`, 900ms write coalescing, online retry, and 15-second viewer refresh.

- [ ] **Step 1: Write failing RPC contract tests**

Using a dependency-injected real `fetch` boundary, assert exact RPC URLs, headers, request bodies, error extraction, and response normalization for create/update/read.

- [ ] **Step 2: Verify RED, implement RPC client, verify GREEN**

Run before implementation: `npm test -- --run src/services/supabase.test.ts`

Expected: FAIL because the client does not exist.

Run after implementation: `npm test -- --run src/services/supabase.test.ts`

Expected: all RPC contract tests pass.

- [ ] **Step 3: Write failing sync/viewer tests**

Use fake timers and injected event/timer dependencies to cover 900ms coalescing, one in-flight update, queued follow-up, offline failure retention, one retry on `online`, 15-second viewer polling, v1 shared-payload migration, and read-only mode never writing local scorekeeper state.

- [ ] **Step 4: Verify RED, implement sync/viewer services, verify GREEN**

Run before implementation: `npm test -- --run src/services/syncManager.test.ts src/services/sharedSession.test.ts`

Expected: FAIL because the services do not exist.

Run after implementation: `npm test -- --run src/services/*.test.ts`

Expected: all service tests pass without network access.

- [ ] **Step 5: Commit**

```bash
git add src/services
git commit -m "feat: port shared session synchronization"
```

### Task 7: Wire the complete React scorekeeper UI

**Files:**
- Modify: `src/App.tsx`, `src/styles.css`, `src/state/sessionStore.ts`
- Create: `src/features/roster/RosterPanel.tsx`, `src/features/setup/SetupPanel.tsx`, `src/features/courts/CourtsPanel.tsx`, `src/features/queue/QueuePanel.tsx`, `src/features/standings/LeaderboardPanel.tsx`, `src/features/history/HistoryPanel.tsx`, `src/features/sessions/SessionBar.tsx`, `src/features/share/SharePanel.tsx`
- Test: `src/App.integration.test.tsx`, feature-local component tests as needed.

**Interfaces:**
- Consumes: all Tasks 2–6 public interfaces.
- Produces: the complete interactive React application matching commit `8b39e95` behavior and visible information architecture.

- [ ] **Step 1: Write failing integration tests for the organizer flow**

Exercise through accessible controls: add players, reject duplicates, time out/reactivate, configure/generate a round, replace inside two minutes, injury-substitute after expiry, declare a winner, observe queue/leaderboard/history, and switch sessions without data leakage.

- [ ] **Step 2: Write failing integration tests for exports/share/viewer**

Assert export actions call download/print boundaries with real generated contents, publish exposes a QR/link, `?s=` renders read-only state, mutation controls are absent in viewer mode, and a v1 shared payload renders.

- [ ] **Step 3: Verify RED**

Run: `npm test -- --run src/App.integration.test.tsx`

Expected: FAIL because placeholder sections are not wired.

- [ ] **Step 4: Implement focused feature components and wire `App`**

Keep each component responsible for one existing panel. Use store selectors/actions rather than duplicating domain logic in React. Reuse the exact visible copy and CSS container model from the legacy app.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- --run src/App.integration.test.tsx && npm test -- --run`

Expected: organizer/viewer flows pass and the full suite is green.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: wire React scorekeeper interface"
```

### Task 8: Phase 1 acceptance and deployment readiness

**Files:**
- Create: `vercel.json`
- Modify: only files required by evidence-backed acceptance fixes.
- Test: full suite, production build, Browser/IAB desktop and 375px flows.

**Interfaces:**
- Consumes: the complete React application from Tasks 1–7 and the baseline screenshots from Task 1.
- Produces: a Vite `dist/` build, browser parity evidence, a fidelity ledger, and a Phase 1 branch ready for review.

- [ ] **Step 1: Add the failing deployment-config assertion**

Add a test or script assertion that Vercel serves the Vite SPA from `dist` and rewrites non-asset routes to `index.html`.

- [ ] **Step 2: Verify RED, add `vercel.json`, verify GREEN**

Run before implementation: `npm run test:deployment`

Expected: FAIL because Vite deployment configuration is absent.

Run after implementation: `npm run test:deployment`

Expected: PASS.

- [ ] **Step 3: Run fresh automated acceptance**

Run: `npm test -- --run && npm run build && npm run test:deployment`

Expected: all tests pass, TypeScript/build succeeds, and `dist/` is deployable.

- [ ] **Step 4: Run Browser/IAB parity acceptance**

Verify desktop and 375px organizer flows, read-only viewer rendering from a v1 fixture, no horizontal mobile overflow, no console warnings/errors, session persistence across reload, and the two-minute substitution lock. Capture latest screenshots outside the repository.

- [ ] **Step 5: Perform the required visual comparison**

Use `view_image` on the Task 1 baseline and latest desktop/mobile screenshots. Write the fidelity ledger with at least five comparison points: copy/section order, palette, typography, borders/radii, spacing/container model, and responsive behavior. Fix every material mismatch before proceeding.

- [ ] **Step 6: Commit acceptance fixes/configuration**

```bash
git add vercel.json package.json package-lock.json src
git commit -m "chore: verify React migration parity"
```

- [ ] **Step 7: Stop before external deployment mutations**

Changing Vercel's Production Branch or publishing is outside the worktree. Report that code acceptance is complete and request action-time confirmation before changing project settings or deploying. Do not push, merge, or publish as part of this task.
