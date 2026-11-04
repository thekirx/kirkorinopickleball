# KirQ single-file redesign implementation plan

> **For agentic workers:** use superpowers:executing-plans to implement task by task.

**Goal:** Ship a locally reviewable Phase 1 redesign on redesign/phase-1.
**Architecture:** Retain the first inline script's logic / EVENT LISTENERS boundary, legacy storage keys, QR encoder, RPC contract, private token storage and print report. Add rolling court identities and mode-aware queue ordering; replace organizer markup/renderers with the supplied prototype's components.
**Tech Stack:** Single-file HTML/CSS/vanilla JS; node:test and browser QA. No application dependencies.
**Spec:** docs/redesign/BUILD_GUIDE.md and docs/redesign/AGENT_PROMPT.md, with owner clarification dated 2026-11-04: real games only; Open Play default; Family catch-up; Competition disabled.

## Global constraints
- Work only in this worktree. No push, merge, deployment or backend writes.
- Preserve every existing feature. Board, speech and personal viewer card remain later phases.
- 44px targets, 16px inputs, square corners, original fonts and palette; one text-only timer interval.

## Review focus
- Undo after immediate refill must restore IDs, timestamps, teammate history and records.
- Delayed sharing responses must not assign another session's edit token.
- Retiring courts must finish their games before removal, including multiple retirements.
- Legacy finished matches must not trap players outside the queue or duplicate records.
- Viewer controls must never mutate local or remote sessions; private tokens never enter payloads.

### Task 1: Rolling engine and migration
- [x] Add and run failing tests for compareQueue, mode changes, late arrivals, record invariants, migration, refill isolation, singles, teammate limits, Undo, substitution deadline and court retirement.
- [x] Implement engine functions in index.html; retain createRoundPlan/applyRoundPlan test entry points.
- [x] Run existing and new tests; update changeslog.md and commit.

### Task 2: Organizer UI
- [x] Reuse prototype CSS, SVG symbols and component classes for phone tabs and desktop rail.
- [x] Implement modal sheets, session management, modes, player editing, timeouts, SUB, Undo and text-only clocks.
- [x] Preserve sharing, viewer, QR and all exports/printing; test with stubbed requests only.
- [x] Run tests; update changeslog.md and commit.

### Task 3: Acceptance and delivery
- [ ] Serve locally; verify 390x844, 1280x800 and 375px overflow.
- [ ] Exercise migration, modes, scoring/Undo, SUB deadlines, timeouts, settings, sessions, exports and stubbed sharing/viewer.
- [ ] Save screenshots for all four tabs beside references, document deviations and actual results.
- [ ] Review complete diff, fix findings, run tests and diff checks, update handoff and commit.
