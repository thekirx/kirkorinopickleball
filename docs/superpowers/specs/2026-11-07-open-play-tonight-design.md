# Open play for tonight — 2026-11-07

> Turnover behavior is superseded by the owner-approved per-court flow in `docs/superpowers/specs/2026-11-07-independent-courts-design.md`. Keep this document as the earlier search/queue/settings record.
## Intent and scope
Prepare the existing React easy-mode app for a friends-and-family event: find a player quickly, give a waiting player the next available queue spot, swap players safely, and retain game-day settings on refresh. This is open play, not completion of the tournament phases.

## Approved approach
Use the existing easy-mode worktree and retain its court cards, tabs, scoring, sharing and two-minute swap limit. Add a case-insensitive name search on Players, a Play next action for active players who are not in an unfinished match, and a visible ordered list of organizer selections with cancellation. Selections are FIFO, before the normal fair rotation; if there are more selections than court spaces, the remainder stays queued. Being selected does not interrupt a current game or promise an exact court/team. Taking a break or being removed clears a selection. Repeated selection does not duplicate/reorder a player.

Store organizer settings and selections per game day outside the public v2 payload, preserving existing viewer compatibility. Defaults stay 2 courts, doubles, teammate limit twice, late arrivals at the back. Existing family-and-friends late-arrival priority remains supported. Successful round generation consumes only selected players who actually play; failed generation consumes nothing. Normal rotation resumes automatically after selections are used.

## Alternatives considered
- Extend the existing easy mode (recommended): builds on the approved direction and existing swap tests; lowest event-day risk.
- Patch the legacy live app: duplicates new behavior and leaves the approved easy mode unfinished.
- Redesign courts or allow unrestricted mid-game swaps: expands scope and changes scoring assumptions immediately before the event; defer unless explicitly requested.

Owner approved finishing easy mode with these rules on 2026-11-07. Saved settings are included in event preparation; no production deployment authorization is inferred.

## Acceptance
- Search matches partial names regardless of case; clear and no-results states work.
- Organizer can select/cancel waiting players in FIFO order; playing and paused players cannot be selected; current matches do not change.
- Settings and pending selections survive reload and are isolated between game days; private organizer metadata never enters shared payloads/exports.
- No duplicate court assignments after randomized generation, swaps and injury replacements across at least 200 sessions.
- Existing and new tests, production build, deployment configuration and responsive browser checks pass. Escape cancels dragging. Real-phone touch behavior remains an owner check.
- Provide a reviewable local version; do not push, merge into production, deploy or change hosting/backend settings without current authorization. Read-only hosting inspection is allowed. Do not mark all staged project phases complete.
