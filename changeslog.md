# KirQ changes log and AI handoff

Last updated: 2026-11-08 (Asia/Manila).

This is the shared, repository-tracked handoff for switching between AI assistants. Read `AGENTS.md` before making changes. Update this handoff and add a history entry in the same task as every change; this is an instruction to contributors, not an automatic watcher.

## Current handoff

### COMMITTED AND PUSHED — easier open play (2026-11-08)

Owner delegated judgment after asking for anytime swaps, easier UI/UX and more automation. Implemented in `../kirkorinopickleball-prototype` on `prototype/play-mode`, baseline `d25fb98`. Canonical `codex/react-phase-1` has documentation only; its pre-existing dirty log and November 7 specs/plans were preserved. **Owner authorized “push to git” on 2026-11-08.** Implementation/docs committed as `ea2bafa` and pushed to `origin/prototype/play-mode` (`d25fb98..ea2bafa`); push succeeded. Follow-up handoff documentation records this result. No merge, manual deploy, backend/hosting settings or dependency changes. Hosting may build a preview automatically from Git; its outcome and production were not checked in this Git-only task. November 7 release entries below are historical.

- Active design/plan: `docs/superpowers/specs/2026-11-08-easier-open-play-design.md`, `docs/superpowers/plans/2026-11-08-easier-open-play.md`. This supersedes the old two-minute restriction in the tournament spec §R2; no other tournament-phase completion is claimed.
- Unlimited swaps during ongoing games; game timestamps, records and unrelated courts stay intact. Finished-game replacement stays refused; finished participants can still return to the waiting pool under existing reuse rules. Ordinary `swapPlayers` retains draft reservation protection. Explicit `swapPlayersReleasingDraft` releases only affected upcoming games, rolls back drafts on refusal, and is exposed through a picker that explains the consequence before selection.
- Current courts now precede upcoming games. Team A/B labels and a prominent **Swap players** open a two-step picker with waiting/upcoming/court labels, search, **Choose next waiting player**, and optional injury/break substitution. Scoring controls are hidden in that court while swapping. Keyboard focus moves to each step heading. Secondary drag/tap movement remains and has no time lock.
- Organizer-only `gameDay.autoPrepare`: true for new days, false when absent in existing saved days. Toggle in setup/Courts; target 1–3 games, default one. Store prepares after successful actions, settings/priority edits and reload/switch; fixed drafts stay fixed, court starts remain explicit, partner/queue rules unchanged. Clearing upcoming games disables automation; turning it off preserves announced drafts; lowering target does not discard them. Shared schema stays v3; organizer preference stays private.
- `preparationNotice` explains waiting shortages and pairing failures, including partial preparation and reload. Fresh review caught partial failures incorrectly described as player shortages; added a failing regression and fixed it. Follow-up review independently ran **42 focused tests** and found no remaining actionable issues.
- Verification in prototype: `npm test -- --run --maxWorkers=2` → **180 tests passed in 17 files**; `npm run build`, `npm run test:deployment`, changed-source `npx prettier --check ...` and `git diff --check` passed. Domain/state/UI changes were exercised RED→GREEN. Built output: `index-CG9eJ4kR.js`, `index-DHMnbkId.css`.
- Browser plugin not available; used cached Playwright/Chromium, isolated synthetic session only. Built app at `http://localhost:5178/`: setup 20 players/2 courts → auto draft → reload with 1-hour-old games → guided reserved-player swap → score/start/refill → fixed-team reload → clear/reload stays manual. Court 2 unchanged. Widths **375×812, 768×1024, 1024×768, 1440×900**: no horizontal overflow/framework overlay/page or console errors. Synthetic intercepted read response verified spectator court/upcoming rendering, no swap/start/draft/roster/checkbox controls, no localStorage writes. Initial QA script mistook serialized player IDs for objects; corrected harness and reran successfully. Screenshots inspected; evidence is supplementary, not required to resume.
- Remaining limitations: real-phone touch/keyboard/camera and actual external sharing propagation were not rechecked in this task (viewer browser check used synthetic read response; existing sharing regression tests pass). Earlier first-publish stale viewer observation remains unresolved. No new live shared rows created. Live production does not include November 8 changes. Vercel Production Branch tracking remains unconfirmed; do not push/deploy or change it without current authorization.
- Next: the authorized implementation push is complete. Review any hosting preview separately; production promotion remains a separate authorization. Existing dev server `http://localhost:5177/` and built preview `http://localhost:5178/` were started here; if stopped, run `npm run dev -- --port 5177 --strictPort` or `npx vite preview --host localhost --port 5178 --strictPort` after building. Loopback is Mac-only; use `npm run dev:lan` separately for same-Wi-Fi phone review. Latest five-hour usage check: **86% remaining**, above prior stop threshold.

## COMMITTED AND PUSHED (2026-11-07, later)

Owner approved. Release code committed on `prototype/play-mode` as `6d9348d` and pushed (`df549d0..6d9348d`); scanned before commit: no `.vercel`, `.env*`, `node_modules`, `dist`, or secret patterns. The push created only a Preview deployment (`kirkorinopickleball-6656m3lrj`); kirq.vercel.app still serves `index-DMfx7vsn.js`. Remote `kirkorino` is still `8b39e95` (legacy). **Remaining risk:** if `kirkorino` is the Vercel Production Branch, a push to it would redeploy legacy; merging `prototype/play-mode` into it (or changing the Production Branch) needs owner approval.

## PRODUCTION RELEASED — kirq.vercel.app now serves the v3 reader (2026-11-07, later)

Owner approved ("Yes, switch it now"). Ran `vercel promote https://kirkorinopickleball-7c09g1ak1-thekirxs-projects.vercel.app --yes` from the prototype folder. New Production deployment `kirkorinopickleball-61msqrjvw-thekirxs-projects.vercel.app` (Ready). **Rollback target:** previous legacy production `kirkorinopickleball-s775c28pe-thekirxs-projects.vercel.app` (`vercel rollback` or promote it).

- Verified on kirq.vercel.app: bundle `index-DMfx7vsn.js` (same as tested build); v3 share `?s=c391ec843b39472897` shows drafts/courts/waiting read-only; legacy-published share `?s=c0152060c309440bb3` opens; a legacy-site session saved in the browser migrated into the new organizer with its in-progress game; no console errors.
- **Risk: the code is still uncommitted.** Production was deployed from the local working tree of `prototype/play-mode`. Any future Git push to the Vercel Production Branch (unconfirmed; last production ref was `kirkorino` 8b39e95, legacy) would replace this release with the legacy app. Commit/push of `prototype/play-mode` still needs owner approval.
- Still open: real-phone touch/camera feedback after tonight; the brief stale "not started" viewer state right after QR creation.

## PREVIEW DEPLOYED for tonight (2026-11-07, later)

Owner skipped their own phone test ("if it passes for you it is good for me"), then asked to deploy to Vercel. **Preview** deployment only; production `kirq.vercel.app` is unchanged (still legacy). No commit or push.

- Simulated phone check (375×812 mobile emulation, built-in browser, LAN origin): 10 sample players → 2 doubles courts → Share → QR. macOS CoreImage decoded the on-screen QR to the exact share link. Viewer (separate tab) read-only (only Courts/Results/Share tabs, no inputs), no horizontal overflow; scoring Court 1 + Start next game reached the viewer with Court 2 unchanged. Clicks were mouse events, not real touch; no physical camera.
- Minor finding (not fixed): a viewer opened right after "Create a QR code" briefly showed "The organizer has not started games yet" although courts were running; it corrected itself on the next 15 s poll. Likely the first published snapshot lagged the current state.
- Deploy: `vercel link --yes --project kirkorinopickleball` (created local `.vercel/`, `.env.local`, and appended 2 lines to `.gitignore`), `npm run test:deployment` passed, `vercel deploy --yes` → Preview Ready: https://kirkorinopickleball-7c09g1ak1-thekirxs-projects.vercel.app — HTTP 200 without login, bundle `index-DMfx7vsn.js` matches the tested local build, share link opened read-only on that origin with no console errors.
- Still needed for a real release: commit/push authorization, Production Branch confirmation, production promotion of the v3 reader, post-deploy checks.

## RESUMED — release checks (2026-11-07, later)

Resumed after owner instruction with 28% five-hour usage remaining (22% at last check). No code changed; no commit, push, deploy, dependency or backend/hosting setting changes.

- Re-verified on `prototype/play-mode` (44 uncommitted paths preserved): `npx vitest run` → **173/173, 17 files**; `npm run build` passed; `git diff --check` passed. Preview still listening on port 5177; LAN address still `http://172.20.10.2:5177`.
- **Fresh live legacy-link recheck: passed.** Legacy production `kirq.vercel.app` published a new synthetic 4-player session (QA Alpha–Delta, one generated doubles round) → `?s=` link opened in the updated local viewer at the LAN origin: Court 1 lineup correct, empty Next in queue and Waiting sections shown, only Courts/Results/Share view tabs (no edit controls), no console errors. One new synthetic shared row expires in 7 days.
- Still needed: physical-phone camera/touch test (owner), explicit Git/release authorization, Production Branch tracking confirmation, updated reader deployment and production verification.



## STOPPED — owner usage threshold reached (2026-11-07)

Final five-hour usage check returned **10% remaining**, so implementation, checks and release work stopped immediately. Only handoff writing followed. No commit, merge, push, deploy, dependency or backend/hosting setting changes.

Exact stopping point: final formatting check completed successfully (all matched files use Prettier style). It initially flagged src/state/gameDay.test.ts; that file was formatted and the broad check then passed. git diff --check passed. The next usage check returned10%. An initial handoff-update script had an indentation error before executing; this corrected handoff save is the only retry, not resumed feature work.

Finished locally: Next in queue supports1–3 additional fixed waiting-only drafted games, maximum3 pending, FIFO consumption on the next available court, public waiting/current/upcoming views and reservation safety. **173 tests/17 files, build, deployment configuration, formatting/diff passed**. LAN-origin QR rendered; actual read-only network viewer showed3 identical drafts/current/waiting and draft→Court1 in14.025s, Court2 unchanged, four widths no overflow. Source review found no blocking issue. Public schema3 reader accepts legacy v1/v2; old production/preview readers are unchanged and cannot show v3 drafts.

Still needed (legacy-link recheck since passed, see RESUMED above): physical-phone camera/touch test, explicit Git/release authorization, Production Branch tracking confirmation, updated reader deployment and production verification. No further feature implementation is known to be required. Current preview remains local on port5177 (LAN address was172.20.10.2; recheck later).

Next actions: **wait for owner instruction to resume**, then check usage again, read AGENTS.md/changeslog.md and docs/superpowers/specs/2026-11-07-drafted-games-design.md plus its plan. Preserve both worktrees and existing uncommitted changes; do not redo implementation. Implementation: /Users/kiro/Desktop/kirkorinopickleball-prototype on prototype/play-mode. Canonical docs: /Users/kiro/Desktop/kirkorinopickleball on codex/react-phase-1. Additional handoff is LOCAL ONLY outside Git: /Users/kiro/Desktop/kirq-local-usage-handoff.md; never commit/upload/push it.


### Drafted queue — locally verified, release pending (2026-11-07)

- Owner approved 1–3 fixed waiting-only drafts, maximum three pending, FIFO to the next available court; fewer if insufficient eligible people. Preserves independent courts/all-four rotation, skill/record/streak matching, manual priority, search and per-day settings. Active design/plan: `docs/superpowers/specs/2026-11-07-drafted-games-design.md`, `docs/superpowers/plans/2026-11-07-drafted-games.md`.
- Implementation is local/uncommitted in `/Users/kiro/Desktop/kirkorinopickleball-prototype`, branch `prototype/play-mode`, baseline `df549d0`. Canonical main folder `/Users/kiro/Desktop/kirkorinopickleball`, `codex/react-phase-1`, has docs/handoff only. Preserve all existing changes. No merge, commit, push, deploy, dependencies or backend/hosting settings changes.
- Public domain schema is **v3** with `queuedGames` (fixed ID teams/type) and `waitingPlayerIds` (actual public order). Internal types are SessionState/SerializedSessionState. Migration accepts unversioned/v1/v2/v3, validates max3 disjoint active waiting reservations after preserving ongoing matches, retains IDs/records/timers/shares/local keys, and rejects future versions. Existing local organizer metadata stays private. Public queues/drafts persist, export and sync through existing JSON RPCs. **Older React viewers reject v3:** production release must include new reader at the sharing origin; older live/preview builds are unchanged. Existing legacy links open in this reader.
- Drafting reserves but changes no wins/waits/start times/teammate history. Pending games append without reshuffling, count capped at3. Start next game consumes the first fixed draft on any available court and records its actual type/teammates then. Busy/reserved players are excluded from fallback selection, replacements and movement; whole-board initialization is refused while drafts exist. Failed/partial generation preserves prior drafts and explains the result. Manual picks feed drafting and are consumed when reserved.
- Store reconciliation publishes new session references on manual queue edits, not merely settings references. Shared waiting order is preserved by viewer migration and used for actual upcoming selection. Break/removal/result reopening invalidates affected drafts atomically with an owner notice; game type/partner-limit changes clear drafts. Reserved players show Upcoming game N. Fixed lineups are not silently redrawn on skill/record edits. Changing court count still preserves ongoing games and disables refills above configured count.
- New `DraftGames.tsx` displays Next in queue to organizer and viewer; only organizer sees count/draft/clear controls. Waiting list uses published order. Shared viewer has no roster/start/draft/cancel controls. Share copy includes upcoming/current/waiting; loopback-address notice explains phone limitation. Use network-origin preview for same-Wi-Fi phones; current Vite address was `http://172.20.10.2:5177/` (recheck IP).
- Verification: **173 tests in17 files passed**, production TypeScript/Vite build and `npm run test:deployment` passed; `git diff --check` passed. New queue unit tests cover three disjoint drafts/no play effects, partial/cap/append/cancel, fixed FIFO start preserving other court, reservation swap protection, unavailability and v2→v3/public-order validation. Store test covers reload/private priority publication/settings invalidation. UI test covers count3/fixed reload/clear. Earlier166 tests and two200-session invariant suites remain passing.
- Browser/live: isolated synthetic28-player v2 fixture migrates; creates3 drafts, teams survive reload, 375/768/1024/1440 widths have no overflow; network-origin QR rendered with LAN URL; read-only viewer shows all three identical drafts/waiting/current courts without editing controls. First draft transitioned to Court1 in **14.025 s**, Court2 lineup unchanged, no page errors. One new synthetic shared row expires after7 days. QR encoder baseline/independent-oracle tests pass; physical-camera scan remains untested. Prior v1 link compatibility passed before this v3 change; v2 fixture migration is verified now, fresh live legacy-link recheck still advisable before release.
- Focused builder-check and fresh code review found no blocking draft-queue defects. Review was source-only, no independent test rerun for this addition. README/schema comments updated per minor feedback. Remaining known limits: name-based streak inheritance, real-phone touch/scroll/physical camera, production deployment/reader compatibility. Venue map/Court[]/tournament scheduler remain unimplemented separate phases.
- Usage: owner requires stopping at<=10% five-hour remaining and writing additional local-only handoff outside Git. Initial27%, then19/17/13%; final observed10%; stopped at owner threshold. Wait for owner resume instruction. `/Users/kiro/Desktop/kirq-local-usage-handoff.md` must never be committed/pushed.

### Resume and release safely

Read AGENTS.md, README, active design/plan and `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md` §R. Prior plans describe previous versions; do not reimplement done work. Do not use stale `kirkorinopickleball-main`. Supabase `qagqtdctkcvqfxkysoqx` is responding via real RPC tests; no backend settings changed. If paused/DNS fails, owner restores this existing project (outside AI connector’s accessible org), never provision replacement. Shares expire seven days after updates; viewer polling15s + write debounce≈0.9s, accepted about17s.

Local preview port5177 remains running; restart with `npm run dev:lan`. Commit/push/deploy requires current authorization; Vercel Production Branch tracking remains unconfirmed. Last production inspection was legacy8b39e95 on kirq.vercel.app, ref kirkorino/source redeploy, not proof of branch tracking. No production release in this task.

Exact checks in prototype:

```sh
git status --short
npm test -- --run --maxWorkers=2
npm run build
npm run test:deployment
npx prettier --check src/domain/*.ts src/state/*.ts src/features/easy/*.tsx src/features/easy/easy.css src/features/play/RoundControls.tsx src/features/reports/PrintReport.tsx src/lib/exports.ts
git diff --check
npm run dev:lan
```

Code: `src/domain/queue.ts`, `queue.test.ts`, `types.ts`, `migrate.ts`, `serialize.ts`, `engine.ts`; `src/state/sessionStore.ts`, `sessionLibrary.ts`, `gameDay.ts`/tests; `src/features/easy/DraftGames.tsx`, CourtsTab/NextGame/PlayersTab/players/Arrange/ShareTab; existing `src/services/useSharing.ts` reacts to changed session reference. Older type imports were mechanically renamed throughout source. No edit tokens/private payloads/player data in logs.

## Change history

### 2026-11-08 — Easier open-play implementation committed and pushed

- Owner authorized Git delivery. Committed the18 intended implementation/test/docs paths as `ea2bafa` on `prototype/play-mode` and successfully pushed `d25fb98..ea2bafa` to the GitHub origin. No unrelated canonical-worktree files were staged; pre-existing canonical documentation remains uncommitted.
- Reverified `npm test -- --run --maxWorkers=2` →180 tests/17 files, `npm run build`, `npm run test:deployment`, `git diff --check` and staged diff check. Staged excluded-file/credential-pattern checks passed; no environment/build/hosting/private handoff files staged.
- This follow-up documentation records the successful implementation push. No merge, manual deployment or backend/hosting settings changed. Automatic hosting build and production status not checked; existing physical-phone/live-sharing limitations remain.

### 2026-11-08 — Git push authorized

- Owner requested “push to git”. Inspected the actual prototype branch, full changed/untracked file list and GitHub remote; remote `prototype/play-mode` equals local `d25fb98`. Preparing only the November 8 implementation/docs in that worktree; canonical pre-existing changes remain uncommitted.
- Reverified before commit: `npm test -- --run --maxWorkers=2` →180 passed/17 files; `npm run build`, `npm run test:deployment` and `git diff --check` passed. Commit/push outcome pending; no merge or manual deployment requested.

### 2026-11-08 — Anytime swaps and easier automatic open play implemented locally

- Changed: `src/domain/engine.ts` and domain regressions remove ongoing-game time locks and add explicit atomic affected-draft release for swaps. `src/state/gameDay.ts`, `sessionLibrary.ts`, `sessionStore.ts` and state tests add private automatic-preparation settings, target refill, reload/switch handling, clear-and-disable, and accurate partial/failure status. `src/features/easy/SwapPlayers.tsx` is new; CourtsTab/Arrange/DraftGames/SetupFlow/CSS/UI tests guide swaps, show courts first and expose automatic controls. Prototype README and both worktrees' spec/plan/handoff updated.
- Checks actually run: `npm test -- --run --maxWorkers=2` →180/180 in17 files; `npm run build`, `npm run test:deployment`, changed-source Prettier check and `git diff --check` pass. Fresh review independently ran42 focused tests; status finding fixed with RED→GREEN regression, follow-up clean.
- Browser: cached Playwright on built local preview,20 synthetic players/2 courts; automatic target/refill, late reserved-player swap, score/start, independent Court2, reload/manual clear, four widths/no overflow/no errors, synthetic read-only viewer/no writes verified. Screenshots visually inspected. QA harness ID/object mistake corrected and check rerun. No actual backend writes, real-phone or external sharing propagation checks this task.
- Delivery: local/uncommitted in prototype; canonical docs only. No commit/push/deploy/dependency/backend/hosting changes. Existing personal sessions untouched. Remaining real-phone/live propagation/release approval and existing first-publish stale-viewer limitation described in Current handoff.

### 2026-11-08 — Easier open-play scope and plan

- Recorded owner-delegated implementation choices and plan for unlimited ongoing-game swaps, guided controls and automatic upcoming preparation. Existing days retain manual mode.
- Inspected both actual branches/worktrees, README, handoff, tournament revision and relevant queue/court designs. Runtime verification pending.
- Local documentation only at this point; prior changes preserved, no release actions.

### 2026-11-07 — Upcoming draft games and shared queue implemented locally

- Changed: new domain queue validation/reconciliation and public schema3 drafts/waiting order, v1/v2 migration, reservation-safe drafting/FIFO per-court consumption; store/library reconcile on load/act/settings/manual edits for persistence and sync. New DraftGames UI (choose1–3, append max3, clear), queued player status, reserved movement protection, shared waiting list and viewer read-only controls. Share copy/loopback notice, README and both plans/logs updated. Internal types renamed SessionState/SerializedSessionState; intended schema expectations updated. No backend/dependency changes.
- Verified: `npm test -- --run --maxWorkers=2` →173 passed/17 files; `npm run build`, `npm run test:deployment`, `git diff --check` passed. Tests were first RED for missing queue module, queue edits not changing public-session reference and missing draft controls; GREEN after implementation. One roundtrip test exposed missing engine waiting reconciliation; fixed at successful initial/per-court starts. Existing166 tests remain passing.
- Live/browser: isolated synthetic28-player fixture,3 fixed drafts/reload/four widths/no errors; actual LAN-origin QR rendered, read-only viewer shows drafts/waiting/current games, first draft→Court1 in14.025s and Court2 unchanged. One new synthetic Supabase row expires in7 days. Physical camera/real-phone touch not tested; automated QR encoder tests pass. Fresh source review had no blocking findings; documentation minors fixed. Final broad formatting/diff checks passed after formatting gameDay.test.ts. Subsequent usage check reached10%; work stopped.
- Remaining: final formatting/diff/handoff completion, physical-phone checks, fresh legacy live-link recheck before release, explicit Git/release authorization and deployed v3 reader. Usage latest13% remaining; stop at10% and update additional local-only handoff.
- Delivery: local/uncommitted prototype; canonical docs only; no commit/merge/push/deploy or backend/hosting settings changes. Older production/viewers do not supportv3 drafts.


### 2026-11-07 — Drafted queue scope recorded

- Changed: design/plan and handoff for owner-approved waiting-only fixed upcoming games (1–3) and public QR queue visibility.
- Verified: actual prototype uncommitted state inspected;166-test prior baseline retained. Five-hour usage27% remaining; no new runtime checks yet.
- Remaining: schema/migration/reservation engine, UI/shared queue, live QR checks/review. No release authorization.
- Delivery: local/uncommitted documentation only at this step; no commit/push/deploy or settings changes.

### 2026-11-07 — Independent court games, skill intake and fair teams verified locally

- Changed in prototype: `src/domain/engine.ts` adds atomic `startCourtGame`, stable court-number helper, finished-entry retirement across every reuse path, busy-player exclusion/wait preservation and guarded removal; pairing uses `src/domain/strength.ts` (new) with skill-dominant record/streak estimates and exact three-pairing selection for a single doubles game. Existing pro storage displays Advanced. New `engine.courts.test.ts` / `strength.test.ts` cover scheduling, reload/invariants and strength decisions. Updated prior swap tests for finished-player reuse.
- Changed UI: new `src/features/easy/NextGame.tsx`, per-court actions and last-result cards in `CourtsTab.tsx`; remove global next-round action/badge, retain initial setup only through `RoundControls.tsx`. `players.tsx` asks each new player’s skill; PlayersTab displays skill/streak, Arrange exposes eligible waiting players and stable court labels, Move players (drag or tap) is explicit. Results/report/CSV use games instead of rounds. README explains the revised flow. Existing search/FIFO/persistence work remains. Both worktrees contain updated design/plan/handoff; main folder has documentation only.
- Verified: full `npm test -- --run --maxWorkers=2` → **166 tests, 16 files passed**; `npm run build`, `npm run test:deployment`, exact Prettier glob command in Current handoff and `git diff --check` passed. 200 independent-court randomized sessions include starts/swaps/injuries/reload without losing ongoing games or double-booking; prior 200-session suite remains. Domain/UI score/history/skill/queue/court-count checks pass.
- Browser verification: isolated synthetic players only, Playwright/cached Chromium because Browser plugin absent. All tabs at 375×812, 768×1024, 1024×768, 1440×900: explicit skills, search, Court 1 restart with Court 2 id/lineup/timer unchanged, five FIFO picks with overflow, reload, queued swap-in, tap/drag/Escape and report-only print passed. No page errors/overflow/overlays. Real-phone touch not tested.
- Live: Supabase synthetic-session read succeeded; publish → read-only viewer independent game update **14.347 s**, sparse-court label/result update **14.959 s**, safe disjoint v2 payloads. Fresh v1 link published by legacy production opened in the updated viewer. Two new synthetic QA rows in this follow-up expire in seven days. No backend settings changed.
- Failed checks honestly resolved: new APIs/strength tests first failed before implementation; UI tests failed on missing controls. A temporary JSX closing-block error prevented UI transform/build and was corrected. One UI preservation assertion initially compared JSON key order instead of values; corrected to deep value equality. Obsolete finished-court swap refusal expectation was revised for the approved all-four reuse flow. New paused-player removal regression failed before guard fix. Reviewer reproduced count-reduction bug; domain/UI tests both failed before the bound/disabled-control fix, then the full suite/build/browser checks passed. No external blocker remains for local verification.
- Decisions/limitations: schema stays v2 with existing courtId fields and disjoint board references; histories are retained, archive becomes read-only after participant reuse. Requested count reductions retain games/results but stop refills above the count. Name-only streak identity remains a documented minor limitation; prior queued-swap/reload gap now tested. No venue map built; no Court[]/tournament-phase completion claim.
- Usage: owner added stop-at-10%-remaining five-hour-window instruction. Checked through account usage tool: initially 31%, finally 29% remaining, so work continued; additional local-only handoff is outside Git at `/Users/kiro/Desktop/kirq-local-usage-handoff.md`. Never push that file.
- Remaining: owner real-phone feedback, explicit commit/push/release authorization, Production Branch tracking confirmation, actual deployment and post-deploy checks. Delivery: **local/uncommitted prototype**, canonical documentation updated; no merge/commit/push/deploy, dependencies or hosting/backend configuration changes.


### 2026-11-07 — Per-court flow and fair-team requirements recorded

- Changed: added independent-courts design/plan; owner approved all-four rotation and requested explicit skill intake plus form-informed team balance. The previous local readiness statement is superseded pending implementation and fresh checks. No product code changed in this planning step.
- Verified: inspected actual uncommitted prototype state, engine/migration/UI; fresh read of synthetic Supabase QA session succeeded. No test rerun for this documentation-only step.
- Remaining: independent court scheduling, team-strength/skill intake, per-court UI, tests/review/browser/sharing checks. Venue map is still open; existing drag mode is retained.
- Delivery: local/uncommitted; no commit, merge, push, deploy or backend settings changes.

### 2026-11-07 — Friends-and-family open play finished locally

- Changed in prototype: `src/features/easy/PlayersTab.tsx` (search/Play next), new `NextPlayers.tsx` (ordered/cancellable picks), `CourtsTab.tsx` (picks and rotation explanation), `easy.css` (responsive accessible search/controls); `src/features/play/RoundControls.tsx` (persisted settings and priority IDs); `src/state/gameDay.ts` (validated organizer metadata/pruning), `sessionLibrary.ts` / `sessionStore.ts` (per-day persistence, queue/cancel actions); `src/domain/types.ts` / `engine.ts` (optional FIFO priority IDs before fair rotation). Added/extended `src/state/gameDay.test.ts`, `src/domain/engine.easy.test.ts`, `engine.swap.test.ts`, and `src/features/easy/easyMode.test.tsx`. Updated README with tonight’s usage. Both worktrees record the approved design, implementation plan and this handoff; main folder has documentation only.
- Verified: full prototype `npm test -- --run --maxWorkers=2` → **149/149**, 14 files; independent reviewer also passed 149. `npm run build`, `npm run test:deployment`, Prettier on all touched source/test files, `git diff --check` passed. Browser procedure: setup one court + family late arrivals → Players/search → select five waiting players → reload → score court → next round → assert first four played and fifth retained → Move players drag/Escape and tap swap → inspect all four tabs at 375×812, 768×1024, 1024×768, 1440×900 → print media. No overflow/runtime errors/overlays. Live publish/read-only viewer/polling passed at 14.435 s; legacy-published v1 link opened correctly in the new viewer. Three synthetic QA rows expire automatically. No backend settings changed.
- RED→GREEN: five new domain/store tests failed on missing queue/settings behavior, then passed; two new UI tests failed on absent search/Play next, then passed. Initial TypeScript build failed on six unsupported `exact` options in new Testing Library queries; removed those options and build passed. Browser harness initially queried `.ez-who` instead of court `.ez-names` (assertion corrected, app unchanged); sharing harness had an ambiguous Share link label (scoped to textbox, retry passed). Final formatting check flagged `gameDay.test.ts`, then formatting was corrected and check passed. These were resolved check failures, not external blockers.
- Decisions: metadata is local beside the session, keeping public schema v2 and existing viewers unchanged. Manual picks precede normal/late-arrival priority, retain overflow and cancel on breaks/removal/court entry; existing team-repeat constraints remain. No new dependencies. Fresh code review had no blocking findings; explicit queued swap/injury → reload test remains a deferred minor.
- Remaining: real-phone touch/scroll feedback; release authorization and Production Branch confirmation; merge/adoption and post-deploy verification. Existing production/preview URLs still serve their previous versions. No tournament completion claim.
- Delivery: **local/uncommitted in `prototype/play-mode`**, canonical handoff/docs updated on `codex/react-phase-1`; nothing committed, merged, pushed or deployed by this task.


### 2026-11-07 — Tonight’s open-play preparation started

- Changed: handoff records tonight’s requested scope and current baseline. Canonical main folder adds `docs/superpowers/specs/2026-11-07-open-play-tonight-design.md`; design approved by owner 2026-11-07.
- Verified: both working trees initially clean; prototype `npm test -- --run --maxWorkers=2` passed 141 tests in 13 files. HTTP GET of production and easy-mode preview returned 200; production HTML is legacy and preview has React module assets.
- Browser baseline: Browser plugin not available, so used existing Playwright with cached Chromium 1248 (no dependency changes). At `http://localhost:5177`, 375×812: sample session → courts setup → start → Players rendered 10 players, no horizontal overflow, and no page errors. Initial default Chromium launch failed because Playwright expected absent revision 1234; Chrome channel also absent; explicit cached Chromium 1248 launch worked.
- Remaining: implementation, fresh checks and post-change browser verification. Current live app lacks requested search and manual Play next controls. Local dev server started on port 5177; this is not a published update.
- Delivery: documentation only, local/uncommitted; nothing pushed or deployed.

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
