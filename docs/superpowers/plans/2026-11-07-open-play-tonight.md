# Tonight’s Open Play Implementation Plan

> Turnover behavior is superseded by the owner-approved per-court flow in `docs/superpowers/specs/2026-11-07-independent-courts-design.md`. Keep this document as the earlier search/queue/settings record.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Finish player search and ordered organizer queue selections in easy mode for tonight.
**Architecture:** Keep v2 shared domain state unchanged. Persist validated local game-day settings/selection IDs alongside each session; pass ordered IDs into round planning. Reuse existing swap/scoring/sharing paths.
**Tech Stack:** Existing React 18, TypeScript, Zustand, Vite, Vitest, Testing Library; no new dependencies.
**Spec:** `docs/superpowers/specs/2026-11-07-open-play-tonight-design.md`

## Global Constraints
- Keep current matches intact and the two-minute swap limit.
- FIFO manual selections precede fair rotation; consume only on successful play, preserve overflow and failed-plan selections.
- Defaults: 2 courts, doubles, teammate limit twice, back-of-line late arrivals.
- Organizer metadata stays outside shared v2/exports; no hosting/backend changes.
- Work in existing isolated `prototype/play-mode`; leave commits/push/deployment for owner authorization.

## Review Focus
- Break/remove/swap-in must clear stale selections, including across reload.
- Overflow and failed plans retain the correct pending order.
- Session changes and delayed sharing saves must preserve settings for the correct day.
- Invalid stored settings must not stop startup or corrupt public payloads.
- Search empty/clear states and narrow touch layouts remain usable.

### Task 1: Persist settings and ordered next-round selections
**Files:** `src/state/gameDay.ts` (new), `src/state/sessionLibrary.ts`, `src/state/sessionStore.ts`, `src/domain/types.ts`, `src/domain/engine.ts`; tests in `src/state/gameDay.test.ts` and `src/domain/engine.easy.test.ts`.
**Interfaces:** `GameDaySettings`, `defaultGameDaySettings()`, `normalizeGameDaySettings(raw)`, store `gameDay`, `setGameDaySettings(patch)`, `queuePlayer(id)` and `cancelQueuedPlayer(id)`; optional `RoundConfig.priorityPlayerIds: string[]`.
- [x] Write and run failing tests for FIFO planning with duplicates/inactive IDs, reload/session isolation, cancellation/break/removal, failed planning and metadata privacy.
- [x] Implement validated per-day local persistence and deterministic selection ordering before the existing priority queue. Prune inactive/missing/playing IDs after domain actions.
- [x] Run `npm test -- --run --maxWorkers=2`; require all tests pass.

### Task 2: Integrate the event-day controls
**Files:** `src/features/play/RoundControls.tsx`, `src/features/easy/PlayersTab.tsx`, `src/features/easy/CourtsTab.tsx`, `src/features/easy/NextPlayers.tsx` (new), `src/features/easy/easy.css`, `src/features/easy/easyMode.test.tsx`.
**Interfaces:** RoundControls reads/writes store settings and supplies ordered selections to planning; NextPlayers renders store selections/cancel buttons; PlayersTab filters names and queues eligible people.
- [x] Add failing UI tests for search/empty/clear, selection/cancel, current-court protection and generated participant inclusion.
- [x] Implement search with visible labels, Play next buttons and ordered/cancellable selections on Players and Courts; persist all round controls.
- [x] Run full suite and `npm run build`; require pass.

### Task 3: Verify event readiness and record handoff
**Files:** `src/domain/engine.swap.test.ts`, `README.md`, `changeslog.md`; design and this plan in both worktrees.
- [x] Add seeded randomized invariant coverage over 200 sessions, including generation/swaps/injury replacement and queue priorities; require unique assignments after every operation.
- [x] Run full suite, build, `npm run test:deployment`, touched-file formatting and `git diff --check`.
- [x] Browser: setup → play → search → queue → reload → score → next round; tap swap, drag + Escape; 375×812, 768×1024, 1024×768, 1440×900; page identity, no blank/overlay/console errors or overflow. Use existing Playwright because Browser plugin is absent; no browser dependency installs.
- [x] Verify live sharing if backend is available; report external blockers and do not alter backend settings.
- [x] Fresh code review; fix important findings with regression tests. Update both handoffs with commands, exact results, delivery status, phone/deployment limitations and tonight’s usage instructions.

## Progress
- Baseline: prototype 141 tests passed; mobile sample flow rendered without errors/overflow.
- Approval: owner selected existing easy mode with search/FIFO Play next/current-match preservation/two-minute swap limit on 2026-11-07.
- Tasks 1–3 implemented and verified locally in `prototype/play-mode`; main folder has documentation/handoff only. No merge/commit/push/deploy performed.
- 149 tests in 14 files passed; TypeScript/Vite build and deployment configuration passed. Initial build failed on six unsupported Testing Library `exact` options in new tests; removed those options and subsequent build passed.
- Browser flow passed at all four required sizes; no overflow, page errors or framework overlays. Search, FIFO five picks on one court, reload, overflow, tap swap, real mouse drag + Escape, and print-only report passed.
- Live React publish/read-only viewer and score polling passed in 14.435 s; legacy production-published v1 link opened correctly in the local easy-mode viewer. Three synthetic QA rows were created (including one ambiguous-locator retry), all expire automatically; no backend settings changed.
- Fresh reviewer independently reran 149 tests, found no blocking findings. Minor deferred coverage: no explicit queued-player swap/injury → reload regression; shared pruning was reviewed and browser tap swap works.
- Final CSS makes new disabled queue controls readable; responsive browser run and final checks repeated after it.
- Remaining delivery gates: real-phone touch/scroll check, owner authorization to commit/push/deploy, final Production Branch confirmation before any merge/release. Existing online preview is unchanged.
