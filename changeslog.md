# KirQ redesign handoff

Last updated: 2026-11-04 (Asia/Manila).

## Current handoff

- Active work: single-file redesign Phase 1, branch `redesign/phase-1`, based on `8b39e95` from `origin/kirkorino`. React migration and tournament phases are separate and untouched.
- Scope/spec: `docs/redesign/BUILD_GUIDE.md`, `docs/redesign/AGENT_PROMPT.md`; plan: `docs/superpowers/plans/2026-11-04-redesign-phase-1.md`.
- Owner decision: modes included now. `games` always equals wins + losses. Default `open` sorts only by `since`; `family` sorts real games then `since`; Competition disabled, Coming soon. Late arrivals always 0W/0L, games 0, since now.
- Baseline: clean worktree, four existing tests passed with `node --test tests/*.test.js`. `node --test tests/` fails on Node 24.6.0 (directory treated as a module); use the explicit glob.
- Implemented locally: rolling engine, real-record mode ordering, legacy migration, settings/court retirement, exact Undo, prototype-based phone tabs/desktop rail, player/settings sheets, SUB and Session feature rehousing. Sharing ownership is scoped to the initiating session.
- Pending: organizer UI, browser acceptance and review; Phase 1 acceptance is not yet complete.
- Reference inspection: reviewed all 25 PNGs and prototype source. Interactive `file://` prototype opening was blocked by browser URL policy; no workaround attempted.
- Delivery: local only; no push, merge, deployment, SQL or production sharing writes authorized.

## Change history

### 2026-11-04 — Organizer redesign and session-safe sharing

- Changed: replaced organizer layout/renderers in `index.html` with prototype classes, typography, colors and SVG symbols. Added four phone tabs, fixed header/scrolling content, desktop courts plus 400px rail, mode picker, fairness chart, clocks, SUB picker, one-tap scoring/Undo, timeout/edit sheets, settings and in-page session dialogs. Sessions, QR, read-only viewer polling, leaderboard, full history, CSV/backup and unchanged print-report builder remain.
- Sharing regression tests reproduced delayed publish ownership and queued update ownership bugs in the legacy baseline. Requests now capture their originating session, payload and share credentials; private edit-token shape and all RPC names/arguments remain unchanged. Added a local stubbed QA server at `tests/serve-browser-fixtures.cjs`; no production writes used.
- Verified: `node --test tests/*.test.js` → 25 passed (four original tests unchanged); `git diff --check` passed; Prettier formatted the touched HTML/new tests. In-app browser at 390x844: no overflow, initial console checks clean; score/refill leaves another court timestamp untouched; score/change/injury/timeout Undo; expired Change with Injury still enabled; late arrival first in Family and last in Open; player record edit and removal. Session creation/rename/switch were exercised. Browser backup downloaded and parsed, games invariant holds and private credentials absent.
- Remaining: complete desktop, migration, viewer, CSV/print, final review and comparison evidence. A browser download wait timed out after the backup actually downloaded; its file was inspected afterwards. Interactive prototype opening remains blocked.
- Delivery: local commit with this entry; no push, merge, deployment or backend settings changes.


### 2026-11-04 — Rolling engine and mode migration

- Changed: `index.html` adds `compareQueue`, rolling fill/result functions, per-session mode/settings, stable court numbers, court retirement, real games, late-arrival timestamps and exact Undo snapshots. Substitution candidates follow the same queue comparator; Change swaps queue timestamps. Existing `createRoundPlan` / `applyRoundPlan` remain compatibility entry points for the unchanged four baseline tests.
- Tests: `tests/rolling-courts.test.js` adds 16 cases. Observed RED (missing compareQueue), then an exact-Undo defect (migration added a field); direct snapshot restoration fixed it. `node --test tests/*.test.js` → 20 passed; `git diff --check` passed.
- Remaining: UI wiring still round-based in this intermediate engine commit; no browser acceptance claim. Legacy finished matches are removed from active courts during migration, with their existing log/records retained.
- Delivery: committed locally with this entry; no push, merge or deployment.


### 2026-11-04 — Redesign setup and approved mode clarification

- Added tracked copies of the updated brief, implementation plan and README in the new worktree. This branch previously had none of the React branch's handoff files.
- Verified baseline: `node --test tests/*.test.js` → 4 passed, 0 failed. No product code changed yet.
- Remaining: execute the plan and record checks as run. Competition, board/speech and personal viewer card are excluded.
- Delivery: local, uncommitted.
