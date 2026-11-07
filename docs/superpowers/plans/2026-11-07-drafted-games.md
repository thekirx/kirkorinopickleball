# Drafted Games and Player Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans inline with test-first implementation.

**Goal:** Queue master drafts 1–3 fixed upcoming games; QR viewers see upcoming/waiting/current games.
**Architecture:** Shared v3 session drafts/order, validated migration, queue reconciliation, existing RPC sync. Fixed reservations consumed by per-court start.
**Tech Stack:** Existing React/TypeScript/Zustand/Vitest; no new dependencies or backend settings.
**Spec:** `docs/superpowers/specs/2026-11-07-drafted-games-design.md`

## Global Constraints
- Waiting-only, disjoint reservations, at most3 drafts, FIFO consumption, preserve current games and timers.
- Skill/record/streak team balance and hard partner limit; drafting has no play side effects.
- v1/v2 migration and v3 reader compatibility; no credential/organizer-settings exposure.
- Preserve user’s real browser state; isolated synthetic QA only; no commit/push/deploy authorization.
- Stop at <=10% remaining and update local-only handoff outside Git.

## Review Focus
- Queue edits must trigger shared-session synchronization.
- Reuse/reopening/injury paths must never double-book queued players.
- Partial generation must retain previous drafts without false play stats.
- Reload/malformed v3 must not drop ongoing courts or misorder valid drafts.
- Local QR must not imply a loopback link works on another phone.

### Task 1: Shared queue schema and reservation engine
**Files:** domain types/migrate/serialize/queue.ts/engine.ts; state store/library/gameDay; tests.
- [x] Write/run failing tests for v2→v3 retained data, 1–3 drafts/partial/cap/fixed teams/no stats, FIFO start/other court preservation, invalidation/reservations and shared ordering.
- [x] Implement validated shared draft state and store reconciliation; consume first draft atomically, protect reservations, preserve public waiting order.
- [x] Full suite/build; revise only intentionally obsolete schema-version expectations.

### Task 2: Organizer and player queue views
**Files:** new DraftGames.tsx, CourtsTab/PlayersTab/NextGame/RoundControls/ShareTab/styles; UI/sharing tests.
- [x] Fail tests for draft count selection, append/clear, queued player status and read-only viewer content/control boundaries.
- [x] Show upcoming games and waiting order to owner/viewer; persist count preference; explain partial/invalidation and loopback-link limitation.
- [x] Verify full tests/build/deployment/format/diff and browser flows at four sizes.

### Task 3: Real sharing, review and handoff
- [x] Live network-origin QR decode and read-only queue/current game viewer; queue edit and draft→active polling; legacy link compatibility.
- [x] Fresh code review; fix blocking findings with regression tests. Update README, both logs and local-only usage handoff; record remaining release/phone limits.

## Local results
173 tests/17 files and build/deployment checks passed; focused review found no blocker. LAN-origin shared viewer shows3 drafts/current/waiting, fixed draft→active in14.025s, Court2 unchanged. Physical camera/touch, final formatting/handoff and production release remain explicit delivery limitations; v3 requires updated viewer. Usage13% remaining latest, stop<=10%. No Git/release/settings mutations.
