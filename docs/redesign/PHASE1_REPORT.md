# KirQ redesign — Phase 1 report

Branch `redesign/phase-1` (from `origin/kirkorino`). Nothing is pushed, merged or deployed.

## Result

Phase 1 is built and checked. All 26 tests pass (`node --test tests/*.test.js`).

The final check found two small bugs, and both are fixed:

1. **Viewers could export CSV and Backup.** The live app shows them only the PDF, so CSV and Backup are hidden in the read-only view again.
2. **The hidden Undo popup could still be reached** by keyboard and screen readers when it wasn't on screen. It is now unreachable until it appears.

## Acceptance checklist (BUILD_GUIDE section 11)

| Item | Status | How it was checked |
|---|---|---|
| Phone tabs match `05`, `07`, `08`, `10` | Pass | 390px screenshots in `evidence/390-*.jpg` |
| Tap winner: stats, instant refill, toast, Undo restores everything | Pass | Tests (undo restores state and log exactly) and the browser |
| SUB panel, Change within 2:00, Injury picks closest skill and times out the injured player | Pass | Tests and `evidence/390-sub.jpg`, `390-picker.jpg` |
| Clocks tick every second and turn lime after 15:00 | Pass | Browser: `wait long` class, background #e7ff4f at 16:01 |
| Timeout toggle matches `09`; timed-out players are never called | Pass | Tests and `evidence/390-timeout.jpg` |
| `games` = wins + losses; a late arrival shows 0W 0L | Pass | Tests |
| Open play: order by time joined, late arrival at the back | Pass | Tests |
| Friends & family: late arrival first until caught up | Pass | Tests |
| Competition is disabled ("Coming soon") | Pass | Tests (`setMode("competition")` refused) and the UI |
| Switching mode re-sorts the queue, live courts untouched | Pass | Tests |
| Teammate limit respected; an impossible court stays idle with a message | Pass | Tests |
| Singles works | Pass | Tests |
| Old saved sessions load and keep their order | Pass | Tests and the browser, with a legacy seed and a second reload |
| Sessions, Share QR / viewer, history, exports | Pass | See below |
| Desktop ≥1024px: courts grid, 400px rail, no bottom tabs | Pass | Browser at 1280×800: rail 400px, bottom nav hidden, no sideways scroll |
| No console errors; no sideways scroll at 375px | Pass | All four tabs are 375px wide; the console is empty |
| Phase 2 `#board`, Phase 3 personal card | Not in scope | |

### Share and viewer

Tested with a fake Supabase layer added only to a scratch copy, so nothing reached production.

- **Publish & Get QR:** calls `kirq_create_session`, then shows the QR, the `?s=` link and "Live — up to date". Recording a result pushes it with `kirq_update_session`.
- **Opening `?s=CODE`:**
  - It calls `kirq_read_session` and shows the "LIVE VIEW · READ-ONLY" banner.
  - Courts, queue, roster and leaderboard all show.
  - There are no Won, Sub, Timeout, Add or Publish controls.
  - The organizer's saved data on the same device stays unchanged.
  - Nothing scrolls sideways at 390px, and the console has no errors.
- **Viewer Session tab:** shows a "Read-only view" button, its own link and QR, and the PDF export only.

### PDF export

- The **Export PDF** button builds the report, opens the print dialog and names the file `KirQ-Session-Report-<time>`.
- In print layout only the report shows: standings, match results and a footer (`evidence/pdf-report-a4.jpg`).
- Under rolling courts, every finished game counts as one "round" in the report, so the Round column is the game number.

## Open points for the owner

- **Competition mode:** its rules are still to be defined.
- **Friends & family:** should a latecomer get a rest between back-to-back games while catching up?
- **Report wording:** "Round" in the PDF and CSV could be renamed to "Game". It was kept as is so the export format matches the live app.
- **Rail tabs on desktop:** they scroll away with the page instead of staying fixed at the top. This is cosmetic.

## Board theme (added after review)

The owner asked for the phone and desktop screens to look like the TV board (`03` / `04`), so the organizer and viewer now use the board's style:

- **Colors:** black background, light text and lavender labels. Lime marks what's happening now.
- **Header:** session details, the KirQ wordmark and a live clock.
- **Courts:** each court is drawn from above. Tapping a team's half of the court records that team's win, and Undo works as before. A freshly filled court gets a lime outline and "Now calling" for 20 seconds.
- **Below the courts:**
  - "Up next" as light tiles, with how long the oldest of them has waited.
  - "In line" with live waiting times.
  - A blue "Last result" strip, which shows "Tonight" before any game has finished.
- **Danger actions** (Injury, Delete, Clear log) are solid red so they're readable on black.
- **Print:** the theme applies on screen only, so the printed PDF report is still black on white.

Checked at 390px and 1280px, and in the shared viewer: no sideways scrolling and no console errors. All 26 tests pass.

## Queue and court editing (added after the court test)

Built from the owner-approved mock:

- **Queue order you can change.**
  - Hold a player (or grab the handle) and drag them to a new spot.
  - Or use **More**: Move to top, Up one, Down one, To the back, Swap with…, Partner with…, Timeout.
  - A moved player is marked **Moved** and keeps that spot until they play. They move up as the people ahead of them are called, and everyone else keeps following the mode's order.
- **Partners.** Locked partners wait together and play on the same team, even past the teammate limit. A pair never splits across the last spot on a court; the player just ahead of them waits one more game instead.
- **Search.** The Queue tab's search finds any player.
  - **Play next** moves a waiting player to #1.
  - Players on court show which court; timed-out players get **Back in line**.
  - A new name can be added to play next or added to the back.
- **On court.**
  - Tap a name for options: swap with someone on the other team, bring in one of the next four from the queue (inside the 2-minute change window), or an injury sub.
  - Hold a name and drop it on a player of the other team to swap them.
  - **Won** records the result. Swaps update the teammate history.
- **Courts fit the screen.** As many columns as fit at 150px or more. Each court is as wide as its column and grows taller when the names need room.
- **The shared view stays read-only**, with no drag, menus or result buttons.

Tests: 33 pass, covering pins, swaps, partners, a pair at the last spot, saving and reloading, and court swaps with teammate history.
