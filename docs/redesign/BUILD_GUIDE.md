# KirQ Redesign: Build Guide

Instructions for an AI coding agent redesigning **KirQ**, the live app at https://kirq.vercel.app.
Read this whole file, look at every screenshot in section 2, and open `redesign/prototype.html` in a browser before writing any code.

---

## 0. Ground rules

| Rule | Detail |
|---|---|
| **Target file** | `index.html` on branch **`kirkorino`** of the repo at `~/Desktop/kirkorinopickleball` (GitHub `thekirx/kirkorinopickleball`). That file is what kirq.vercel.app serves today. Single file, vanilla HTML/CSS/JS, no framework, no build step. Work on a new branch made from `kirkorino`. Do not touch the React branches (`codex/react-phase-1`, `prototype/play-mode`). |
| **Not the target** | `~/Desktop/kirkorinopickleball-main/index.html` is an old "PickQue" version. Ignore it. |
| **Reference implementation** | `redesign/prototype.html` is a working prototype of the new design. It is the source of truth for **look and behavior**. Reuse its CSS and markup. It is a demo page with a phone frame, marketing sections and a fake QR; the real app is not. |
| **Visual reference** | `redesign/screenshots/*.png`. Match them closely: colors, fonts, sizes, spacing, rules, states. |
| **Brand** | Keep the live app's design system exactly (section 3): paper, ink, electric blue, lime, lavender, Archivo + JetBrains Mono, **zero border radius**, 1px rules, no shadows. Do not add colors. |
| **Keep every live feature** | Sessions (switch / new / rename / delete), Share QR via Supabase with a read-only viewer (`?s=CODE`), timeouts, player changes within 2 minutes, injury substitutes, singles/doubles, court count, same-teammate limit, leaderboard, match history, PDF / CSV / backup export, clear log, localStorage persistence, print report. Section 6 lists where each one moves. |
| **Time waiting, not estimates** | Every waiting player shows a live **time waiting** clock (`mm:ss`). Never show "~4 min" estimates or predicted courts. The product owner asked for this. |

---

## 1. What changes and why

Today (`screenshots/00-before-live-app.png`) KirQ is a long two-column page: Add Player, Roster, Share, Session Config, Live Courts, Next Up, Leaderboard, Match History. It is **round-based**: "Generate Next Round" fills every court at once, so courts that finish early sit empty until the slowest game ends.

The redesign:

1. **Rolling courts.** When a game ends, that court refills immediately with the next players. No "Generate Next Round" during play.
2. **Courts first.** The organizer opens straight to the courts.
3. **Phone layout with 4 tabs:** Courts · Queue · Players · Session.
4. **One tap records a winner**, and a 6-second **Undo** reverses it (also for subs and timeouts).
5. **Live time waiting** on every queued player. Lime after 15 minutes.
6. **Fairness chart** of games played.
7. **Substitutions move into a SUB panel** on each court card (same rules as today).
8. **TV board view** (`#board`) with NOW CALLING and optional spoken call-outs (English / Taglish).
9. **Personal player card in the live view**: viewers pick their name and see their spot, waiting time and court.
10. **Play modes**: **Open play** (plain first-come queue) and **Friends & family** (fewest games first, so latecomers catch up). **Competition** is shown but unavailable until its rules are defined. See 7.2.

---

## 2. Screenshot index (match these)

All in `redesign/screenshots/`. Phone shots are 2x of a 340×720 CSS px frame (screen content 318px wide).

| File | Shows | Key things to match |
|---|---|---|
| `00-before-live-app.png` | Today's live app | Before picture. Brand reference only. |
| `01-full-page-desktop.png` | Whole concept page | Overall feel |
| `02-masthead.png` | Brand bar, giant "KirQ" masthead, blue ticker | Same masthead treatment as the live app |
| `02b-live-demo.png` | Board next to organizer phone | How the views relate |
| `03-tv-board-default.png` | TV board | Ink ground, blue top-down courts, Up next 2×2 paper tiles, In line list, QR panel, blue ticker bar |
| `04-tv-board-now-calling.png` | Board after a result | Lime outline + lime "NOW CALLING" on the refilled court; ticker "LAST RESULT" tag in lime |
| `05-organizer-courts.png` | **Courts** tab | Ink court header with lime square + timer + SUB button; team buttons with trophy + WON; dashed NET; skill squares |
| `06-organizer-winner-undo-toast.png` | After tapping a winner | Ink toast "COURT 3: GAB & LIA WON" + lime UNDO button |
| `06b-organizer-sub-panel.png` | SUB panel open | "SUBSTITUTIONS" + "CHANGE OPEN 01:55" countdown; per player CHANGE + red INJURY |
| `06c-organizer-sub-change-picker.png` | Change picker | Select of waiting players ("Iya · 2g") + blue CONFIRM |
| `07-organizer-queue.png` | **Queue** tab | Games-played chart with "FAIR · SPREAD 1" chip; Next up list, first 4 with blue squares and "UP NEXT"; "IN LINE" divider; clock per row, lime when > 15:00 |
| `08-organizer-players.png` | **Players** tab | Add player box (input + blue ADD, skill segmented control), roster list with location and W/L, TIMEOUT buttons |
| `09-organizer-players-timeout.png` | Timed-out player | Lavender "TIMED OUT" toggle, grey name |
| `10-organizer-session.png` | **Session** tab | Session box (format, courts, teammate limit, Settings / New / Rename), Share QR "LIVE", leaderboard (leader rank in lime), match history + EXPORT PDF / CSV / BACKUP |
| `11-player-in-line.png` | Live view, waiting | Big "#5", "WAITING 03:37", "4 ahead of you" |
| `12-player-up-next.png` | Live view, next group | Blue card, lime "YOU'RE UP NEXT" |
| `13-player-on-court.png` | Live view, playing | Ink card, lime "YOU'RE PLAYING ON COURT" + big lime "1"; own court row lime in Courts now |
| `14-player-timed-out.png` | Live view, timed out | Lavender card "PAUSED" |
| `15`–`19b` | Player section, research, differentiators, engine, design system, phases | Context only |
| `20-mobile-full-page.png` | Concept page at 390px | One column, no sideways scroll |

---

## 3. Design tokens (from the live app; keep them)

```css
:root {
  --paper: #f4f2ed;      /* page + phone background */
  --ink: #0a0a0a;        /* text, court headers, board ground, toast */
  --blue: #1d36ff;       /* action, "up next", court surface, active tab bar */
  --lime: #e7ff4f;       /* live dot, NOW CALLING, waited > 15 min, Undo, leader */
  --lavender: #aeb8ff;   /* timed out, chart bars, wordmark Q on dark */
  --white: #ffffff;      /* cards, inputs */
  --danger: #c8102e;     /* injury, delete */
  --line: rgba(10, 10, 10, 0.25);   /* hairline rules inside cards */
  --line-strong: #0a0a0a;           /* card borders, section rules */
  --muted: rgba(10, 10, 10, 0.72);  /* secondary text */

  /* board (on ink) */
  --b-line: rgba(244, 242, 237, 0.22);
  --b-muted: rgba(244, 242, 237, 0.66);
  --b-tile: rgba(244, 242, 237, 0.08);

  --display: "Archivo", "Archivo Black", "Arial Black", Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

The live app already loads the fonts:
`https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap`

### Type

| Use | Font | Size | Style |
|---|---|---|---|
| Screen title (COURTS, QUEUE) | Archivo 900 | 2.3rem (36.8px) | uppercase, line-height .84, letter-spacing -.05em |
| Masthead "KirQ" | Archivo 900 | clamp(2.75rem, 12vw, 8.5rem) | as live: uppercase, -.045em, "Q" in blue |
| Court header "COURT 1" | Archivo 900 | 1.05rem | uppercase, -.03em, paper on ink |
| Player names (team buttons, lists) | Archivo 900 | 1rem | uppercase, -.03em, line-height 1.15 |
| Player-view big number | Archivo 900 | 5.6rem | line-height .82, -.06em |
| Labels, timers, buttons, chips, status | JetBrains Mono 700 / 400 | .62–.82rem | uppercase, letter-spacing .04–.08em |
| Running copy / notes | JetBrains Mono 400 | .78–.82rem | sentence case, letter-spacing .01em, line-height 1.6 |
| Timers and counts | JetBrains Mono | — | `font-variant-numeric: tabular-nums` |

### Shape

- **border-radius: 0 everywhere** (inputs, buttons, chips, cards, toast, courts). Only the device bezel in the prototype is rounded; the app has no rounded corners.
- Cards: 1px `--line-strong` border, white fill. Rows inside cards are split by 1px `--line` rules (lists have **no gaps**, just rules, like the live app).
- No shadows. Hover on primary buttons: blue → ink (as live).
- Touch targets: 44px minimum. Team buttons 56px, queue rows 54px, tabs 52px, inputs/buttons 46px.
- Focus: `outline: 2px solid var(--blue); outline-offset: 2px` (as live).

### Color jobs (keep consistent)

| Color | Means |
|---|---|
| Blue | Action, selected, "up next" (queue positions 1–4, next card, player card), court surface |
| Ink | Live court header, on-court player card, toast, board |
| Lime | Live dot, NOW CALLING, waited > 15 min, Undo button, leaderboard #1 |
| Lavender | Timed out, secondary chart bars |
| Danger red | Injury substitute, delete |

Always pair color with a word ("UP NEXT", "TIMED OUT", "FAIR · SPREAD 1").

---

## 4. Layout

### Keep the brand chrome

Keep the live **brand bar** (`KO®` + "Court Session Manager / kirkorino.com ↗"), the **masthead** (giant "Kir**Q**"), and the **blue scrolling ticker** (see `02-masthead.png`). On phones, collapse the masthead to the compact header in 4.1 once a session has players; show the full masthead on the empty start screen and on desktop.

### 4.1 Phone (< 768px), primary target

Matches `05`–`10` (minus the bezel):

```
┌──────────────────────────────────┐
│ SAT OPEN PLAY · 18 PLAYERS   KO® │  mono .68rem muted / Archivo 900
│ COURTS                           │  Archivo 900 2.3rem
├──────────────────────────────────┤  1px ink rule
│ [court card]                     │  scroll area, 12px padding, 12px gap
│ [court card]                     │
│ [UP NEXT card, blue]             │
│               [toast]            │  above the tab bar
├──────────────────────────────────┤  1px ink rule
│ COURTS  QUEUE 6  PLAYERS SESSION │  4 tabs: icon + mono label
└──────────────────────────────────┘
```

- Tab bar: paper background, top rule. Active tab: 3px blue bar on top of the tab, ink label, blue icon. Queue tab carries a blue count badge.
- Hide the scrollbar of the scroll area.

### 4.2 Desktop (≥ 1024px)

Keep the live two-column idea, but courts first:

```
brand bar / masthead (smaller) / ticker
┌──────────────────────────────────────────┬──────────────────────┐
│ 05 / IN PLAY   LIVE COURTS                │ tabs: QUEUE | PLAYERS │
│ court cards: repeat(auto-fill,minmax(300px,1fr)) │ | SESSION     │
│ UP NEXT card full width                   │ 400px rail            │
└──────────────────────────────────────────┴──────────────────────┘
```

Keep the numbered eyebrow labels ("05 / In Play") on panel headers. Never show the bottom tab bar and the rail tabs at the same time.

### 4.3 Start of session

With fewer than 4 players (2 in singles), open on the Players tab with the add form focused and a note: "Add at least 4 players. Courts fill automatically." When enough players exist, one primary button **START COURTS** fills every court. After that there is no round button. Above START COURTS, show a 3-way segmented control **OPEN PLAY / FRIENDS & FAMILY / COMPETITION** (Open play preselected; Competition disabled with a mono "Coming soon" note) and one line of mono help for the selected mode: "First come, first served." / "Fewest games plays first. Latecomers catch up."

### 4.4 Board view (`#board`, Phase 2)

Same file. `index.html#board` shows only the board (`03`, `04`), full screen, for a TV or tablet. Opened from a "Board" button in the Session tab.

---

## 5. Components (copy from `prototype.html`)

Class names are the prototype's. Reuse them.

### 5.1 Court card `.ocourt` (`05`)
- White, 1px ink border.
- Header `.ocourt-h`: ink background, paper text. Left "COURT n". Right: 7px **lime square** + `mm:ss` timer (mono 700), then a **SUB** button (mono, 1px paper/50% border; when open: lime background, ink text, `aria-expanded="true"`).
- Body: team A button, NET divider, team B button.
- NET: mono "NET" .62rem, letter-spacing .2em, dashed ink lines either side (`repeating-linear-gradient(90deg, var(--ink) 0 4px, transparent 4px 8px)`).
- Idle court: body text "Needs 4 players in the queue."

### 5.2 Team button `.team`
- Full width `<button>`, min-height 56, padding 9×11, 1px `--line` border, white.
- Left: names (Archivo 900, uppercase) each followed by skill squares. Right: trophy icon + "WON" (mono 700 .68rem).
- Hover: blue background, white text (live winner-button hover). Active: ink.
- `aria-label="Mark Kirk and Bea as winners on court 1"`.
- **Tap = record result immediately**, then Undo toast (5.9). No confirm dialog.

### 5.3 Skill squares `.pips`
Three 6×6 **square** marks, 3px gap. Filled `--blue`, empty `--line`. Beginner 1, Intermediate 2, Pro 3. `aria-label="Skill 2 of 3"`. Replaces "(Intermediate)" text.

### 5.4 SUB panel `.subpanel` (`06b`, `06c`)
Opens under the court body. Paper background, ink top rule.
- Header: "SUBSTITUTIONS" left; right a live countdown "CHANGE OPEN **01:55**" while within 2 minutes of the game start, else "CHANGE CLOSED · INJURY ONLY".
- One row per player on court: name + **CHANGE** button + **INJURY** button (red border/text).
- CHANGE (only within the window, only if someone is waiting) opens a picker row: select of waiting players in queue order ("Iya · 2g") + blue **CONFIRM**.
- INJURY works any time if someone is waiting (rules in 7.5).

### 5.5 Up next card `.nextcard`
Blue, white text. Header mono "UP NEXT" / "NEXT FREE COURT" (or "NEED n MORE"). Names as square chips with 1px white/50% border, Archivo 900. Footer mono "Sent to the first court that frees up."

### 5.6 Box `.box` (generic card used on Queue / Players / Session)
White, 1px ink border. Header `.box-h`: Archivo 900 title left, mono `.chip` right, ink rule under it. Chips: 1px ink border; `.ok` blue fill white text; `.warn` lime fill.

### 5.7 Queue (`07`)
- **Games played** box: "FAIR · SPREAD n" chip (blue) when spread ≤ 1, otherwise "SPREAD n" (lime). Histogram of games-played counts: bars are square, lowest-games bar blue, others lavender, mono labels "1G · 4".
- **Next up** box: ordered list.
  - Row: 26px square position (blue fill for the next group), name + skill squares, mono "1 GAME · UP NEXT" (blue for the next group), clock icon + `mm:ss` time waiting.
  - After the next group, a mono "IN LINE" divider row (paper fill, ink rules), then the rest.
  - **Time waiting** updates every second and turns into a **lime chip with an ink outline after 15:00**.
  - Waiting time starts when the player joins the queue (added, finished a game, back from timeout, or swapped out).

### 5.8 Players (`08`, `09`)
- **Add player** box: mono label "PLAYER NAME", input (46px, 16px font) joined to a blue **ADD** button; segmented control BEGINNER / INTERMEDIATE / PRO (selected = ink fill, paper text). Enter submits; input clears and keeps focus.
- **Roster** box: alphabetical rows: name + skill squares, then mono "COURT 2 · 1W 1L" / "IN QUEUE · …" / "TIMED OUT · …". Right: **TIMEOUT** toggle (mono, ink border). Pressed: lavender fill, label "TIMED OUT", name greys. Not shown while the player is on court.
- Tapping a row opens an edit sheet: wins − n +, losses − n +, skill, and a separated red "Remove player" (replaces today's 5 buttons per card: Win ±1, Loss ±1, Remove).

### 5.9 Toast + Undo `.toast` (`06`)
Absolute, 12px from the sides, above the tab bar. Ink background, paper mono uppercase text. Right: lime **UNDO** button with undo icon. Visible 6s, slides up 10px + fades in (.2s linear). `role="status"`. Used for: result recorded, change, injury sub, timeout on/off. Not for exports (no Undo button then).

### 5.10 Session tab (`10`)
Stacked boxes:
1. **Session**: name + SWITCH chip (opens the live session switcher); key/value rows MODE / FORMAT / COURTS / SAME TEAMMATE; buttons SETTINGS · NEW · RENAME (DELETE inside Settings, red, with in-page confirm).
2. **Share QR**: today's publish flow. Not published: blue "PUBLISH & GET QR". Published: chip "LIVE", QR, "Players scan to follow", copy-link button.
3. **Leaderboard**: top 5 (rank #1 cell lime), W/L and win %. "See all" opens the full list.
4. **Match history**: latest results "C3 GAB & LIA def. NICO & TIN"; buttons EXPORT PDF (blue) · CSV · BACKUP; CLEAR LOG inside Settings.

Settings sheet: play mode (Open play / Friends & family / Competition disabled "Coming soon"), match type (Singles / Doubles segmented), courts (− n +), same-teammate limit (No limit / Max once / twice / thrice). Changing courts adds a court (filled at once if enough are waiting) or removes the highest court after its game.

### 5.11 TV board `#board` (`03`, `04`)
- Ink background, paper text, 1px `--b-line` rules between zones.
- Top: mono meta "KO® · SAT OPEN PLAY · 3 COURTS", wordmark "KIR**Q**" (Q in lavender on ink), clock right (Archivo 900 2.6rem).
- Courts grid `repeat(auto-fit, minmax(160px, 1fr))`. Each: "COURT n" + mono timer, then the court surface: blue, square corners, aspect-ratio 20/30, team A top, team B bottom, names Archivo 900 uppercase white. Lines:

```html
<svg viewBox="0 0 20 30" preserveAspectRatio="none" aria-hidden="true">
  <rect x="0" y="10.2" width="20" height="9.6" fill="rgba(10,10,10,.22)"/>
  <g stroke="rgba(255,255,255,.8)" stroke-width="1.5" fill="none">
    <rect x="1" y="1" width="18" height="28" vector-effect="non-scaling-stroke"/>
    <path d="M1 10.2H19M1 19.8H19M10 1V10.2M10 19.8V29" vector-effect="non-scaling-stroke"/>
  </g>
  <path d="M0 15H20" stroke="#ffffff" stroke-width="3" vector-effect="non-scaling-stroke"/>
</svg>
```

- **NOW CALLING**: for 10s after a court refills, 3px lime outline + centered lime chip "NOW CALLING" (mono 700, ink text).
- Idle court: surface `--b-tile`, mono "WAITING FOR 4 PLAYERS".
- Side column (260px): **Up next** (2×2 paper tiles with ink names; mono "To the **next free court** · waited up to 16m", highlight in lime), **In line** (positions 5–10, name, minutes waited, lime if > 15m), **QR** (the session's real share QR; hide this panel if the session isn't published).
- Bottom bar: blue, mono uppercase, lime tag "LAST RESULT" + "COURT 3: GAB & LIA DEF. NICO & TIN". Before any result: tag "TONIGHT" + "18 PLAYERS · 3 COURTS · DOUBLES · OPEN PLAY" (or "· FRIENDS & FAMILY").

### 5.12 Player live view (`11`–`14`, Phase 3)
The existing viewer (`?s=CODE`, read-only) gets a name picker ("Who are you?", remembered in localStorage) and then:
- Ink banner "LIVE VIEW · READ-ONLY".
- Mono session name, "HI, KIRK" (Archivo 900 2.1rem).
- Hero card, 1px ink border:
  - **In line**: white; mono blue "YOUR SPOT IN LINE"; big "#5"; "WAITING 03:37"; mono "4 ahead of you · 2 played".
  - **Up next**: blue fill, white text, lime label "YOU'RE UP NEXT", "Get ready for the next free court", waiting clock.
  - **On court**: ink fill, lime label "YOU'RE PLAYING ON COURT", big lime court number, "WITH BEA", mono "vs Migs & Jo · 09:22".
  - **Timed out**: lavender fill, "PAUSED", "You won't be called".
- Stats strip (4 cells, ink border, rules between): GAMES / WINS / LOSSES / WIN %.
- "COURTS NOW" list; the viewer's court row in lime.
- Keep the full read-only standings below.

### 5.13 Icons
Inline SVG `<symbol>`s, 2px stroke, **square caps and miter joins** (matches the hard-edged brand). Copy from `prototype.html`: `ic-courts`, `ic-queue`, `ic-users`, `ic-session`, `ic-clock`, `ic-undo`, `ic-sound`, `ic-trophy`. No emoji. Icons beside text get `aria-hidden="true"`.

---

## 6. Live features: where each one goes

| Live feature (today) | In the redesign |
|---|---|
| Add Player panel | Players tab, Add player box |
| Roster cards with Win ±1 / Loss ±1 / Remove / availability toggle | Players tab rows: TIMEOUT toggle + edit sheet |
| `active: false` "timed out" | Same field. TIMEOUT toggle, lavender, skipped by the queue |
| Session bar (select, Share QR, New, Rename, Delete) | Session tab box + Settings sheet |
| Share panel (Publish & Get QR, Refresh, Copy link) | Session tab, Share QR box. Keep `kirq_create_session` RPC and push-after-change exactly as today |
| Viewer mode (`?s=`, `body.is-viewer`, 15s poll) | Keep. Add the personal card (5.12) |
| Session Config (match type, courts, teammate limit) | Settings sheet |
| Generate Next Round | Removed during play; START COURTS once at the start |
| Live Courts with Change / Injury Substitute per player | Court card SUB panel (5.4), same rules |
| Next Up | Queue tab |
| Leaderboard | Session tab top 5 + "See all" |
| Match History + Export PDF / CSV / Backup / Clear Log | Session tab, Match history box (Clear Log moves into Settings) |
| Print report (`#print-report`, `buildPrintReport`) | Keep unchanged; restyle not needed |
| localStorage persistence | Keep; add the new fields (7.1) |

---

## 7. Behavior and engine

### 7.1 State changes
Keep the live state shape and add:

```js
state.mode        // "open" | "family" | "competition" (competition not selectable yet), saved per session
player.games      // ALWAYS wins + losses. The player's real record. Never set it to anything else.
player.since      // epoch ms when the player last joined the queue (replaces roundsWaited for ordering)
match.startedAt   // reuse match.generatedAt; when this court's game started
state.called      // { court, at } for NOW CALLING
```

Migrate old saved sessions: `mode = "open"`; `games = wins + losses`; `since = now − roundsWaited × 12 min` so today's order is kept.

### 7.2 Queue order (depends on the play mode)
Waiting = `active !== false` and not on a court. Put the ordering in **one function**, `compareQueue(a, b, mode)`, used by both the queue display and court filling, so modes can be added without touching anything else.

| Mode | Order | Late arrival |
|---|---|---|
| **Open play** (`"open"`, default) | `since` ascending only: a plain first-come queue. Games played do not affect order. | Joins at the back of the line. |
| **Friends & family** (`"family"`) | `games` ascending, then `since` ascending. | Has 0 games, so goes to the front and keeps priority until caught up with the group. Back-to-back games are allowed while catching up. |
| **Competition** (`"competition"`) | Not defined yet. Show it in the mode picker as disabled, labeled "Coming soon". | — |

The display shows exactly this order. The mode can be changed mid-session from Settings; the queue re-sorts immediately and courts already playing are not touched.

### 7.3 Filling a court
When a court is free and enough players wait (4 doubles / 2 singles), take the top of the queue.
- **Doubles:** sort the 4 by skill, high to low: `a, b, c, d`. Score the splits `[a,d] v [b,c]`, `[a,c] v [b,d]`, `[a,b] v [c,d]`:
  `score = |skill(team1) − skill(team2)| × 3 + (teammateCount(team1) + teammateCount(team2)) × 2`.
  Skip splits that break the same-teammate limit; pick the lowest score. If all 3 break it, try swapping in the 5th, 6th… player (keep the first 3). If still impossible, leave the court idle with: "Court 2 can't be filled without repeating teammates. Raise the teammate limit in Settings."
- **Singles:** the top 2 play.
- Then set `startedAt = now`, update teammate history, set `state.called`, announce (7.7), save, and push to Supabase if shared.

### 7.4 Recording a winner
Tap a team → snapshot state for undo → winners `wins++`, losers `losses++`, all `games++` → all four `since = now` (winners first) → add the match-log entry as today → free the court and **fill it immediately** → Undo toast. Undo restores the snapshot exactly and removes the log entry.

### 7.5 Substitutions (same rules as live)
- **Change**: allowed while `now − startedAt < 2 min` (`PLAYER_CHANGE_WINDOW_MS`) and someone is waiting. The chosen waiting player takes the spot. The outgoing player goes back to the queue **with the incoming player's `since`** (they swap places). Teammate history adjusts as in `replaceMatchPlayer`.
- **Injury**: any time someone is waiting. Auto-pick the waiting player with the closest skill (ties: queue order). The injured player is timed out (`active = false`). Same as `substituteInjuredPlayer`.
- Both show the Undo toast.

### 7.6 Other rules
- **Late arrival** joins with `wins = losses = games = 0` and `since = now`. Where they land in the queue depends on the mode (7.2).
- **Timeout off** sets `since = now`, then fills any idle court.
- **Remove player on court**: cancel that game (no result), the others return to the queue with their old `since`, and the court refills.

### 7.7 Board, call-outs, sync (Phase 2)
- `speechSynthesis` only after the organizer turns it on.
  - English: `Court 2 is ready. Kirk and Bea, versus Migs and Jo.`
  - Taglish: `Court 2, tara na! Kirk at Bea, laban kina Migs at Jo.`
- Board in a second tab: sync with `BroadcastChannel("kirq")`, falling back to the `storage` event.

### 7.8 Timers
One `setInterval(…, 1000)` that only updates text in elements with `data-start` / `data-since` / `data-window`. Never re-render lists that contain inputs on the timer.

---

## 8. Copy (exact strings)

| Where | Text |
|---|---|
| Team button | `WON` |
| Toasts | `COURT 3: GAB & LIA WON` · `IYA REPLACED CARLO` · `INJURY SUB: CARLO IN, KIRK TIMED OUT` · `GAB TIMED OUT` · `GAB IS BACK IN LINE` (+ `UNDO`) |
| SUB panel | `SUBSTITUTIONS`, `CHANGE OPEN 01:55`, `CHANGE CLOSED · INJURY ONLY`, `CHANGE`, `INJURY`, `CONFIRM` |
| Up next card | `UP NEXT` / `NEXT FREE COURT` or `NEED n MORE` |
| Queue | `GAMES PLAYED`, `FAIR · SPREAD 1`, `NEXT UP`, `n WAITING`, `1 GAME · UP NEXT`, `IN LINE` |
| Players | `ADD PLAYER`, `PLAYER NAME`, `ADD`, `ROSTER`, `TIMEOUT` / `TIMED OUT` |
| Board | `NOW CALLING`, `UP NEXT`, `IN LINE`, `WAITED`, `LAST RESULT`, `TONIGHT`, `WHERE AM I?` |
| Live view | `YOUR SPOT IN LINE`, `YOU'RE UP NEXT`, `YOU'RE PLAYING ON COURT`, `TIMED OUT` / `PAUSED`, `WAITING mm:ss` |

Short, plain, uppercase mono for labels; sentence case for notes (as live).

---

## 9. Accessibility and quality

- Text contrast ≥ 4.5:1. White on blue, ink on lime, ink on lavender, paper on ink all pass.
- Visible focus ring on every control.
- Tabs: `role="tablist"` / `role="tab"` / `aria-selected`. SUB button: `aria-expanded`. Toggles: `aria-pressed`.
- Toast and board use polite live regions; never move focus.
- `prefers-reduced-motion`: stop the ticker and the toast slide (live already stops the ticker).
- `touch-action: manipulation` on buttons. Inputs at 16px. No horizontal scroll at 375px.

---

## 10. Do not

- Keep round-based "Generate Next Round" during play.
- Show estimated wait times or predicted courts. Show **time waiting** only.
- Use `alert()` / `confirm()` / `prompt()`.
- Add rounded corners, shadows, gradients, or colors outside section 3.
- Use any font other than Archivo and JetBrains Mono.
- Use emoji as icons.
- Remove or break: sessions, Supabase share and viewer, timeouts, the 2-minute change window, injury subs, PDF / CSV / backup export, print report.
- Re-render input-containing lists on the 1-second timer.
- Touch the React branches.

---

## 11. Acceptance checklist

Compare the new `index.html` with the screenshots.

- [ ] Phone (375–430px): Courts, Queue, Players, Session tabs match `05`, `07`, `08`, `10`.
- [ ] Tap a team: stats update, the court refills at once, the board/toast match `04` / `06`; Undo restores everything (including the history entry).
- [ ] SUB panel matches `06b` / `06c`; Change only within 2:00; Injury auto-picks the closest skill and times out the injured player.
- [ ] Queue clocks tick every second and turn lime after 15:00.
- [ ] Timeout toggle matches `09`; timed-out players are never called.
- [ ] `games` always equals wins + losses; a late arrival shows 0W 0L.
- [ ] Open play: late arrival joins at the back; order is by time joined only.
- [ ] Friends & family: late arrival goes to the front and keeps priority until caught up.
- [ ] Competition appears as disabled "Coming soon" and can't be selected.
- [ ] Switching mode mid-session re-sorts the queue without touching live courts.
- [ ] Teammate limit respected; impossible courts stay idle with the message.
- [ ] Singles mode works.
- [ ] Old saved sessions load and keep their order.
- [ ] Sessions, Share QR / viewer, history and exports still work.
- [ ] Desktop ≥ 1024px: courts grid + 400px rail, no bottom tabs.
- [ ] Phase 2: `#board` matches `03` / `04`.
- [ ] Phase 3: live view personal card matches `11`–`14`.
- [ ] No console errors; no horizontal scroll at 375px.

---

## 12. Phases

1. **Phase 1, `index.html`:** rolling-courts engine, 4-tab phone layout + desktop rail, toast + undo, time-waiting clocks, fairness chart, SUB panel, timeout toggle, Session tab (all live features rehoused), state migration, **Open play and Friends & family modes** (Competition shown as unavailable).
2. **Phase 2, no server:** `#board` view, BroadcastChannel sync, spoken call-outs (English / Taglish).
3. **Phase 3, existing Supabase share:** personal card in the viewer, faster refresh than the 15s poll, board readable from the share link.

---

## 13. Play modes (decided by the product owner)

KirQ has three modes. **Open play** and **Friends & family** are built in Phase 1 (rules in 7.2). **Competition** is shown but unavailable until its rules are defined; do not invent them.

- **Open play**: a normal queue. Players are called by when they joined the line; nobody is prioritized.
- **Friends & family**: balances games between players. A late arrival is prioritized so they catch up on games played.
- **Competition**: to be defined with the product owner.

`games` is always the player's real record (wins + losses) in every mode. Modes only change the queue order.

Note: the prototype and its screenshots demonstrate the Friends & family order (fewest games first). The board ticker text "FEWEST GAMES PLAYS FIRST" in the prototype is replaced by the mode name (5.11).
