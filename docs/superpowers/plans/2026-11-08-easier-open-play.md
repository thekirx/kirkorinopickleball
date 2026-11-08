# Easier open play Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. User delegated implementation choices; no additional approval gate. One fresh review at completion.

**Goal:** Anytime swaps and a simpler, more automatic court/queue flow.
**Architecture:** Existing domain engine and Zustand transactions own swaps and automatic preparation; React presents guided controls. Existing fixed drafts and public schema v3 remain.
**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Vite, existing dnd-kit.
**Spec:** docs/superpowers/specs/2026-11-08-easier-open-play-design.md

## Global constraints
Preserve all existing work. No commit/push/deploy/backend/dependency changes. Existing days keep manual mode. Never guess winners or start courts automatically.

## Review focus
- Late swaps must not reset game time or alter another court.
- Automatic reservation must not make ordinary swaps impossible.
- Clearing upcoming games must not recreate them immediately.
- Failed automatic preparation must preserve fixed teams and explain the blockage.
- Viewers must not prepare or edit games.

### Task 1: Anytime domain swaps
- [x] Change prior time-lock assertions and add late/finished/explicit reserved-swap atomicity tests in engine.swap.test.ts and engine.test.ts; watch fail.
- [x] Remove time restriction, add swapPlayersReleasingDraft(aId,bId) with rollback on refusal and explanatory result; keep ordinary reservation guard.
- [x] Run focused domain tests.

### Task 2: Automatic upcoming preparation
- [x] Add state tests for autoPrepare defaults, legacy normalization, target refill, fixed identities, partial/failure, clear/manual/reload and day isolation; watch fail.
- [x] Extend GameDaySettings and centralize preparation in store actions/settings. Add preparation status and clearUpcomingGames store action.
- [x] Run state and queue tests.

### Task 3: Guided interface
- [x] Add/adjust integration tests for anytime guided swaps, automatic choice, reserved candidates, automatic toggle, court-first order and viewer protection; watch fail.
- [x] Extract SwapPlayers.tsx; simplify court cards and guidance; place upcoming below courts, simplify automatic/manual controls; remove stale lock copy from Arrange.
- [x] Run full tests/build/deployment check; inspect mobile/desktop with Playwright (Browser plugin unavailable), exercise scoring/start/swap/queue/settings/reload, inspect screenshots/errors/overflow.
- [x] Fresh review, address findings, update README, both handoffs and plan with actual results.

## Outcome — 2026-11-08

All three local implementation tasks complete; 180 tests/17 files, build/deployment configuration, formatting/diff and built-app browser checks passed. Fresh source review and follow-up clean after fixing partial-preparation/reload explanation. Browser plugin absent; cached Playwright, synthetic isolated data, four viewport widths. Spectator check intercepted the read RPC; no real live sharing writes/propagation or physical-phone checks. No commit/push/deploy. See changeslog.md for durable reproduction commands, delivery state and limitations.
