# Independent Court Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. Steps use checkbox syntax.

**Goal:** Let each court turn over independently, with queue-safe and skill/form-balanced games.
**Architecture:** Atomic domain per-court action, stable existing courtId metadata, finished-result archival when players are reused, existing schema v2. Strength heuristics influence teams rather than queue order.
**Tech Stack:** Existing React/TypeScript/Zustand/Vitest/Testing Library; no dependencies.
**Spec:** `docs/superpowers/specs/2026-11-07-independent-courts-design.md`

## Global Constraints
- Preserve previous uncommitted event features and owner’s saved session.
- All four return to queue; no global in-play reset; never consume busy players or reset their timers.
- Keep v2 fields and public credential boundary, manual FIFO picks and hard teammate limits.
- Skill intake labels Beginner/Intermediate/Advanced; retain pro internally.
- No venue map, backend/hosting settings or production deployment in this task.

## Review Focus
- Finished-player reuse must not cause v2 migration to drop ongoing courts.
- Sparse court arrays must keep court labels and log attribution stable.
- Archived score cards must not revive players assigned elsewhere.
- Failed scheduling must preserve picks and existing games.
- Form strength must affect equal-skill matching without bypassing queue.

### Task 1: Domain independent court turnover
**Files:** `src/domain/engine.ts`, new `src/domain/engine.courts.test.ts`, existing randomized tests.
**Interfaces:** `getCourtNumber(match)`, `startCourtGame(court, config, now)`, existing plan/scoring/swap APIs; no new payload fields.
- [x] Write/run failing tests for one-court replacement, busy-player exclusion, reuse of finished players, archive/history, sparse labels, timer/wait preservation and failure atomicity.
- [x] Implement stable numbered court metadata, per-court atomic scheduling and finished-entry retirement across scheduling/swaps/substitutions/removal.
- [x] Run targeted and full tests; update any obsolete round-scope expectations intentionally.

### Task 2: Fair teams and explicit skill intake
**Files:** new `src/domain/strength.ts`, `engine.ts`, `src/features/easy/players.tsx`, PlayersTab/SetupFlow; new strength tests and UI tests.
**Interfaces:** `playerStrength(player, log)`, `winStreak(player, log)`; existing persisted Skill keys unchanged.
- [x] Write/run failing tests for skill dominance, same-skill record/streak splitting, three-pairing optimum and queue preservation.
- [x] Add bounded strength heuristic and exact four-player pairing selection; visible required skill picker for each newly added player, Advanced label and player form display.
- [x] Run full tests and build.

### Task 3: Per-court interface and verification
**Files:** RoundControls, CourtsTab, Arrange, EasyApp, PlayersTab, SetupFlow, NextPlayers, report/CSV copy, README, both changeslogs; update UI/invariant tests.
- [x] Test finished Court 1 starts while Court 2 remains active/unchanged, refusal on unfinished court, queue/skill/reload/archive behavior and clear movement label.
- [x] Replace global next-round UI with per-court actions; derive ready/archived court cards; remove round-facing language and retain initial setup.
- [x] Verify full suite/build/deployment/format/diff; 200-session per-court invariant; browser at four viewport sizes; isolated synthetic data only. Live read-only sharing and v1 compatibility.
- [x] Fresh code review, fix blocking findings, update both handoffs with actual checks and release limitations. No commits/push/deploy without authorization.

## Progress
- 149-test previous version is verified, but is not accepted as tonight-ready after the owner’s per-court correction.
- Owner approved all-four rotation. Fairness and explicit skill intake are direct additional requests.
- Supabase read of synthetic QA session succeeded on 2026-11-07; no settings changed.

## Completed local verification (2026-11-07)
- Full suite: 16 files, 166 tests passed. Both 200-session suites pass, including per-court generation/reuse/swaps/injuries/reload without losing ongoing games.
- TypeScript/Vite build, deployment configuration, source formatting and diff checks passed.
- Synthetic isolated browser: mandatory skills (including Advanced stored as pro), search, finished Court 1 start while Court 2 id/lineup/timer stay unchanged, five FIFO picks/overflow, reload, queue swap-in, real drag/Escape, print, all four tabs at 375×812/768×1024/1024×768/1440×900. No runtime errors/overlay/overflow. Real-phone touch remains untested.
- Fresh code review found one Important count-reduction bug. Domain/UI regression tests both failed before the fix; start above configured count now rejects/disables while retaining games/results. Full 166-test suite and browser/build checks passed afterward. No re-review dispatched.
- Live sharing: per-court update in 14.347 s, sparse-court viewer in 14.959 s; read-only and public v2 disjoint payload checks passed. Fresh legacy-published v1 link opened correctly in the updated viewer. Supabase responding; two additional synthetic QA shares expire automatically in seven days.
- Deferred minor: name-based historical streak attribution on remove/re-add; documented compatibility limit, no identity schema change. Previous minor queued swap/reload gap is now covered.
- No commit, merge, push, deployment, dependencies or backend/hosting setting changes. Main branch documentation only; implementation remains uncommitted in prototype worktree.
