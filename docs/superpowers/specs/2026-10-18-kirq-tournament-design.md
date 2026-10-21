# KirQ Tournament — Implementation Plan

**Audience:** the engineer/AI implementing this. Self-contained; assumes no memory of prior conversations.
**Status:** specification, **revised 2026-10-21** (see §R). Phase 1 is implemented locally; an owner-approved UI ("easy mode") exists as a prototype.
**Date:** 2026-10-18 · revised 2026-10-21

---

## R. Revision 2026-10-21 — owner decisions that override parts of this document

**Read this section before §7, §8 and §10.** Where this section and the original text disagree, this section wins. The original text is kept for history.

### R1. The UI direction is "easy mode", not the §7 layout contract

The owner tried the §7-style courts-first prototype on 2026-10-20 and found it "hard to understand". The owner then approved a different direction (2026-10-20): **Option A for setup + Option C for play**, with players addable at any time. It is implemented in the prototype worktree `../kirkorinopickleball-prototype`, branch `prototype/play-mode`, under `src/features/easy/`:

- **Setup (Option A):** "Who's here today?" → courts stepper + doubles/singles with a plain-language preview → start. Skill and partner limit are optional, behind links.
- **Play (Option C):** tabs Courts / Players / Results / Share. Bottom tabs on phones; **left sidebar at ≥1024 px** (adaptive navigation). Tap the winning team; tap again to change or clear it.
- **Plain language:** no "rounds waited", "teammate limit" or "declare winner". Sentence case; uppercase is reserved for tiny tags. The kirkorino.com colours and Archivo stay.

So **§7's layout contract is superseded**: the sticky minimap on top, the focus pane, the bottom player rail, and §7A minimap tiles as the primary navigation. §7's accessibility rules (colour never alone, ≥44 px targets, 12 px floor, tabular figures) **still apply**.

**Court minimap / venue map:** the owner asked for a minimap on 2026-10-17. The approved easy mode does not have one. Building one is an **open owner decision** (see the next-stages plan). Do not build it or drop it without asking.

### R2. Drag and drop is mostly built; §8 is revised

Built in the prototype (`src/features/easy/Arrange.tsx`, engine `swapBlockReason` / `swapPlayers`):

- A separate **Move players** mode, so drag can never collide with tap-to-win.
- dnd-kit **MouseSensor** (6 px) + **TouchSensor** (180 ms press, so a finger can still scroll); auto-scroll; announcements in plain words.
- Every drag has a **tap-one-then-tap-another** alternative. Each name is a real button, so this is also the **keyboard path**. dnd-kit's arrow-key `KeyboardSensor` is **deliberately not used**: it is clumsy, and it would hijack Enter/Space. This replaces §8's "KeyboardSensor gives space-to-lift" requirement; WCAG 2.2 2.5.7 is met by the tap path.
- `swapBlockReason` is the single source of refusal reasons (§6's `rejectReason` idea). It keeps the 2-minute change window, so courts that started more than 2 minutes ago are locked; "Got hurt" still works after that.

### R3. Late arrivals (owner decision 2026-10-20)

There is an organizer setting: **back of the line** (default, fair for open play) or **play in the next round** (family and friends), via engine `prioritizeForNextRound`. Late arrivals in the same round share one priority level. The §6 scheduler must keep supporting this choice.

### R4. Revised phase definitions

- **Phase 2 (revised): Courts become objects.** Introduce first-class `Court[]` with stable ids, labels and open/closed state, replacing numbering by `activeMatches` index. Easy mode's court cards stay; the minimap is excluded unless the owner decides otherwise (R1). Any schema change needs `schemaVersion` 3 with a migration from v2 **and** a viewer-compatibility plan, because the React `migrate()` refuses unknown versions: an older viewer opening a newer payload would fail.
- **Phase 3 (revised): Drag and drop.** Done in the prototype except: a property test that no input path can double-book; a real-phone check by the owner; Escape-to-cancel confirmed with a real key press.
- Phases 4–7 are unchanged in scope. Their UI must follow easy mode (R1), not §7.

The ordered, step-by-step continuation is `docs/superpowers/plans/2026-10-21-next-stages.md`.

---

## 0. Required reading before any code

| Fact | Detail |
|---|---|
| Canonical source | `github.com/thekirx/kirkorinopickleball`, branch **`kirkorino`**, commit `8b39e95` |
| **Do NOT use** | branch `main` — it is 4 commits stale (47 KB vs 133 KB) and missing every current feature |
| Live production | `https://kirq.vercel.app` (Vercel project `kirkorinopickleball`) |
| Backend | Supabase project ref `qagqtdctkcvqfxkysoqx` |
| Production branch caveat | Vercel's Production Branch setting is **not** yet pointed at `kirkorino`; pushes build previews only |

Start by cloning `kirkorino` into a clean directory. Do not build on top of any `-main` folder.

### What already exists and must not be lost

The current single-file `index.html` (~133 KB, vanilla JS) already implements, all of which must survive the migration:

- Queue-priority rotation (group by rounds waited, shuffle ties, take from top)
- Skill-balanced team generation with a configurable same-teammate limit
- Click-to-win scoring, leaderboard, match log
- Multi-session library (create / rename / switch / delete), localStorage-backed
- CSV + JSON export, and a print-to-PDF session report (no PDF library — uses the browser print pipeline)
- A **hand-written QR encoder** (byte mode, versions 1–40, all 4 ECC levels), verified module-for-module against `libqrencode` across 41 cases. **Port this as-is. Do not replace it with a CDN library** — it works offline, and it keeps roster data out of third-party services
- Supabase share/sync: publish a session, read-only live view via `?s=<code>`, ~15s poll
- Player timeouts and match substitutions (`player.active`), added in `8b39e95`

---

## 1. Goals

1. **Tournament mode** with multiple concurrent events: Men's/Women's Singles, Men's/Women's Doubles, Mixed Doubles.
2. **Organizer-configurable format per event** — tournaments are not all the same.
3. **No waiting game.** A player entered in several events must never be double-booked, never block a court, and never sit idle for an unreasonable stretch.
4. **Drag-and-drop** reassignment of players between courts, with a non-drag equivalent.
5. **Court minimap** reflecting the real venue.
6. **React rewrite** replacing the single-file vanilla build.

### Non-goals (explicitly out of scope)

- Multi-device scorekeeping. Today exactly one device holds the edit token and may write; everyone else is read-only. Keep that.
- Live realtime push. The 15s poll is adequate and keeps the database locked down. Do not open the table to Supabase Realtime.
- Online registration/payments.

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite + React 18 + TypeScript** | Fast, Vercel preset exists |
| State | **Zustand** + `persist` middleware | Current app is one global mutable object; Zustand maps cleanly and avoids a Redux rewrite |
| Drag & drop | **`@dnd-kit/core`** | Ships keyboard sensor + screen-reader announcements. **Do not use react-beautiful-dnd** (unmaintained) or raw HTML5 DnD (does not work on touch — this is a courtside tablet app) |
| Styling | Plain CSS with design tokens | Brand already defined; no UI kit needed |
| Tests | **Vitest** + Testing Library | Port the existing `tests/*.test.js` |
| Backend | Existing Supabase RPCs | No schema change needed for v1 |

### Deployment change

The app becomes a build artifact rather than a static file. In Vercel: framework preset **Vite**, build `npm run build`, output `dist`. Set **Production Branch** to the working branch at the same time.

---

## 3. Why the first mock failed

A clickable mock was built and rejected as *"doesn't look easy to use at all."* The diagnosis matters, because it constrains the redesign:

| Problem | Consequence | Rule it implies |
|---|---|---|
| Court diagrams rendered large | 6 courts = enormous vertical scroll | A minimap must be **small** — tiles, not diagrams |
| Bench was a tall vertical list (12 chips × ~96px) | Could not see bench and courts simultaneously | **Drag source and target must be co-visible at all times** |
| Court SVG was decorative | Consumed ~40% of screen, conveyed nothing operational | Screen space must be earned by information |
| 23 competing "Move" buttons | Visual noise, no clear primary action | One obvious primary action per screen |
| Event tabs filtered nothing | Looked functional, wasn't | No non-functional chrome |

**The binding constraint:** on a 375px phone, the player rail and at least one drop target must be visible at the same time, without scrolling. Every layout decision follows from this.

---

## 4. Domain model

The single most important change: **courts become first-class objects.** Today a court is merely `activeMatches[index]` and is labelled by its array position, which is why none of the three requested features can be built.

```ts
type EventCode = string;                  // 'MD' | 'XD' | organizer-defined
type Gender = 'M' | 'F' | 'X';            // X = any / mixed

interface Player {
  id: string;
  name: string;
  gender: Exclude<Gender, 'X'>;
  skill: 1 | 2 | 3;                       // beginner | intermediate | pro
  active: boolean;                        // false = timed out / injured / left
  entries: EventCode[];                   // which events they signed up for
}

interface TournamentEvent {
  code: EventCode;                        // 'MD'
  label: string;                          // "Men's Doubles"
  teamSize: 1 | 2;
  gender: Gender;                         // 'M' | 'F' | 'X'
  format: FormatConfig;                   // see §5 — organizer-chosen
  seeds?: string[];                       // teamIds, seeded order
}

interface Team {                          // a singles "team" has one member
  id: string;
  eventCode: EventCode;
  playerIds: string[];
}

interface Match {
  id: string;
  eventCode: EventCode;
  round: number;
  slotA: TeamRef;                         // concrete team, or an unresolved dependency
  slotB: TeamRef;
  status: 'pending' | 'ready' | 'assigned' | 'live' | 'finished';
  courtId: string | null;
  winnerTeamId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

// A bracket slot may not be known yet: "winner of match 12"
type TeamRef =
  | { kind: 'team'; teamId: string }
  | { kind: 'winnerOf'; matchId: string }
  | { kind: 'loserOf'; matchId: string }
  | { kind: 'bye' };

interface Court {
  id: string;
  label: string;                          // "Court 1" / "Center Court"
  gridX: number;                          // venue layout position
  gridY: number;
  status: 'open' | 'assigned' | 'live' | 'closed';
  matchId: string | null;
}
```

### Derived, never stored

```ts
courtOf(playerId)        // the court a player currently occupies, or null
isBusy(playerId)         // courtOf() !== null
owed(playerId)           // matches still outstanding across ALL entered events
lastFinishedAt(playerId) // for rest enforcement
```

`owed()` is the key quantity — §6 explains why.

---

## 5. Configurable tournament formats

> *"since tournaments are not all the same, have the option to let the organizer set this"*

Format is chosen **per event**, not per tournament. A single day can run Men's Doubles as round robin while Mixed runs single elimination.

Implement formats behind one interface so the scheduler never learns their internals:

```ts
interface TournamentFormat {
  readonly id: FormatId;
  readonly label: string;

  /** Build the draw. Brackets may emit matches with unresolved TeamRefs. */
  generateDraw(teams: Team[], cfg: FormatConfig): Match[];

  /** Can this match be played now? (dependencies resolved, byes applied) */
  isReady(match: Match, state: TournamentState): boolean;

  /** Matches this player still owes. Drives scheduling priority. */
  remainingFor(playerId: string, state: TournamentState): number;

  /** Apply a result: advance a bracket, update standings. Pure. */
  applyResult(match: Match, winnerTeamId: string, state: TournamentState): Patch[];

  /** Is the event finished? */
  isComplete(state: TournamentState): boolean;
}

type FormatId =
  | 'roundRobin'        // pools; every team plays every other
  | 'singleElim'        // knockout
  | 'doubleElim'        // winners + losers bracket
  | 'swiss'             // N rounds, pair on similar records, no rematches
  | 'openRotation'      // current KirQ behaviour: endless fair rotation
  | 'ladder';           // king-of-the-court; winners move up

interface FormatConfig {
  id: FormatId;
  poolCount?: number;        // roundRobin
  advancePerPool?: number;   // roundRobin -> playoff
  rounds?: number;           // swiss
  thirdPlace?: boolean;      // singleElim
  consolation?: boolean;
  scoring: { pointsTo: 11 | 15 | 21; winBy: 1 | 2; bestOf: 1 | 3 | 5 };
}
```

### Build order for formats

Ship `roundRobin` and `openRotation` first — they cover almost all club play and make `remainingFor()` exact. `singleElim` next. `swiss`, `doubleElim`, `ladder` are additive and must not require touching the scheduler.

**Important:** `remainingFor()` is exact for round robin (combinatorially known in advance) but only an **estimate** for elimination formats, where a player's remaining matches depend on whether they keep winning. For brackets, return *maximum possible remaining depth*. The scheduler must treat it as a heuristic, never a guarantee.

### Organizer setup UI

A per-event form: format dropdown → format-specific fields appear progressively (do not show Swiss round count when round robin is selected) → scoring → draw preview before commit. Generating a draw is destructive once matches have results; require confirmation and never silently discard played results.

---

## 6. The scheduling engine — solving the waiting game

> *"if a player signs up for multiple legs there is a waiting game happening so we need to avoid this"*

### The problem, stated precisely

A player is a **resource with exclusive occupancy**: they can be on exactly one court at one time. When someone enters Mixed + Men's Doubles + Singles, three independent event schedules compete for them. Three distinct failures follow:

1. **Double-booking** — scheduled in two events at once; one court stalls.
2. **Blocking** — a match can't start because one of its four players is mid-match elsewhere.
3. **Tail latency** — the day ends with forty people watching one person play their last six matches.

(3) is the one organizers actually feel, and it is the one naive schedulers cause.

### The engine

One global scheduler across **all** events. Events never schedule themselves.

```
assignRound(state) -> Assignment[]

1. CANDIDATES
   For every event, ask format.isReady(match) -> ready matches.

2. HARD FILTER (a violation here is a bug, never a warning)
   Drop any match where any participant:
     - is already on a court           (exclusivity)
     - has active === false            (timed out / injured / left)
     - violates the event's gender rule
     - is inside minRestMinutes of their last finish

3. SCORE  (higher = schedule sooner)
   score(match) =
       W_LOAD     * maxOwed(match)          // longest-job-first  <-- kills tail latency
     + W_WAIT     * maxWaitMinutes(match)   // fairness
     + W_LAG      * eventLagFactor(match)   // keep events in step
     + W_CRITICAL * bracketDepth(match)     // brackets gate everything downstream
     - W_REPEAT   * teammateRepeatCount(match)
     - W_IMBALANCE* skillGap(match)

4. GREEDY ASSIGN
   Sort by score desc.
   For each match: if a compatible court is free AND no participant is
   locked by an earlier assignment in this pass -> assign, lock players.

5. REPORT
   Return assignments + the reason each unassigned ready match was skipped.
   Never fail silently. "Court 4 idle: all eligible players are mid-match
   in Mixed" is the single most useful sentence this app can print.
```

**Why longest-job-first.** This is the job-shop heuristic and it is the actual fix for the waiting game. Scheduling the player who still owes 7 matches ahead of the one who owes 2 flattens the tail: the heaviest-loaded players are never left holding the bottleneck at 6pm. Make the weights constants in one file so they can be tuned without touching the algorithm.

### Constraints

| Hard (never violate) | Soft (scored, overridable) |
|---|---|
| Player on ≤ 1 court | Minimum rest between matches |
| Match dependencies resolved | Teammate repeat limit |
| Gender/draw eligibility | Skill balance |
| Player `active === true` | Event progress parity |
| Court not already occupied | Court preference |

Minimum rest is deliberately **soft**: if honouring it would idle every court, the organizer should be offered the match with a visible "no rest" warning rather than have the system stall. Default `minRestMinutes: 10`, configurable, settable to 0.

### Proactive projection — stop the problem before it happens

Do not merely react. Compute and surface continuously:

- **Projected finish per event**, from remaining matches ÷ courts allocated × average match duration (use observed durations once ≥5 matches have real timings; fall back to a configured estimate before that).
- **Bottleneck warning:** flag any player whose `owed × avgDuration` exceeds the projected end of the whole tournament. Surface as: *"Marco Reyes owes 7 matches across 3 events — he is 40 minutes past the projected finish. Consider dropping him from Mixed, or add a court."*

That warning at 2pm is worth more than any amount of clever scheduling at 6pm.

### Rejection reasons are product surface, not debug output

`rejectReason(playerId, court)` must return a short human string — `"On Court 2"`, `"Not entered"`, `"Wrong draw"`, `"Resting 6 min"`, `"Timed out"`. It is shown on hover, in the move dialog next to disabled targets, and announced to screen readers. One function, used by the scheduler, the drag validator, and the UI, so all three can never disagree.

---

## 7. UX redesign

> **Superseded in part by §R1 (2026-10-21).** The layout contract below was replaced by owner-approved easy mode. The accessibility and density rules still apply.

### Layout contract

Three fixed regions. The middle one scrolls; the outer two never do.

```
┌──────────────────────────────────────────┐
│ A. COURT MINIMAP            (sticky top) │  ~96–140px
│    all courts at a glance, drop targets  │
├──────────────────────────────────────────┤
│ B. FOCUS PANE                 (scrolls)  │
│    selected court, or the next-up queue  │
├──────────────────────────────────────────┤
│ C. PLAYER RAIL           (sticky bottom) │  ~72px
│    horizontal scroll, drag sources       │
└──────────────────────────────────────────┘
```

This satisfies the binding constraint from §3: a name in C and a court tile in A are **always** on screen together, at 375px, so a drag is always possible without scrolling. The previous mock violated this and was unusable as a result.

### A. Court minimap

Small tiles, not diagrams. Each tile ≈ 104×72px, so six fit in two rows on a phone.

Per tile: court number · event badge · status · up to 4 truncated surnames.

- Status uses **colour + icon + text**, never colour alone (an organizer in sunlight, or colourblind, must still read it): `open` (hairline, "OPEN"), `live` (blue fill, play icon, elapsed timer), `finished` (lime, check icon), `closed` (hatched, "CLOSED").
- Tap a tile → focus that court in pane B.
- Tiles are drop targets.
- **Venue layout mode:** the organizer arranges tiles on a grid (`court.gridX/gridY`) to mirror the physical site, so the minimap reads like the venue — this is what makes it "see the actual courts" rather than an abstract list. Drag-to-arrange in settings; read-only during play.

Use elapsed-time text (`14:02`) rather than a court diagram. Elapsed time is what an organizer actually needs; a top-down court drawing tells them nothing they can't see by looking up.

### B. Focus pane

Selected court detail: the two sides as large drop targets, player names at ≥16px, the single primary action (**Declare winner** during play, **Start match** when assigned) as a full-width button, and a secondary **Swap / Move** affordance. Keep a court diagram here if desired — at this size it is affordable and no longer competes with the bench.

### C. Player rail

Horizontal scrolling rail of compact chips (name + load badge + status dot). Filter control: *Available · All · This event*. Chips are drag sources and are keyboard focusable.

### Primary action

A persistent **Next round** button, with a one-line summary of what it will do (*"Fills 4 courts · 2 blocked"*). The organizer's most common action must never require hunting.

### Density and type

Dense dashboard spacing (4/8px rhythm, 8–32px scale). Minimum **12px** for any rendered text and 16px for names — the shipped app already enforces a 12px floor; do not regress it. Tabular figures for scores, timers and counts so columns don't jitter.

### Brand

Keep the existing kirkorino.com system: paper `#f4f2ed`, ink `#0a0a0a`, electric blue `#1d36ff`, lime `#e7ff4f`, danger `#c8102e`; Archivo 900 display, JetBrains Mono labels; zero border radius; hairline rules. A design-system generator was run against this brief and proposed a red Hero-Centric marketing layout — it was **rejected** as wrong for a dense operational tool. Do not reintroduce it.

---

## 8. Drag and drop

> **Revised by §R2 (2026-10-21).** Built in the prototype; keyboard support is through tap-to-swap buttons, not dnd-kit's KeyboardSensor.

### Non-negotiable: every drag needs a non-drag equivalent

WCAG 2.2 **AA 2.5.7 "Dragging Movements"** requires a single-pointer alternative for any author-controlled drag. This is also plain practicality: when the destination court is scrolled off-screen, or the organizer is holding a phone one-handed in the rain, dragging fails. Ship **Move-first, drag-as-shortcut**:

- Every player chip has a **Move** button → dialog listing every court slot, with ineligible ones **disabled and labelled with the reason**.
- `@dnd-kit` `KeyboardSensor` gives space-to-lift, arrows-to-move, space-to-drop for free.
- Announce every outcome through dnd-kit's `announcements` API into an `aria-live="polite"` region.

### Mechanics

| Requirement | Spec |
|---|---|
| Input | Pointer Events via dnd-kit `PointerSensor` — works for mouse **and** touch. HTML5 DnD does not fire on touch; do not use it |
| Activation | `activationConstraint: { distance: 8 }` so taps and scrolls aren't read as drags |
| Scroll | dnd-kit `AutoScroll` **must** be enabled — the previous mock had no auto-scroll and off-screen courts were undroppable |
| Feedback | Live validity on the hovered target: blue inset = allowed, red inset = refused, plus the reason as text |
| Refusal | Validate on **drop**, not only on hover. Refuse with an announcement; never drop a player into an invalid slot and "fix it later" |
| Touch targets | ≥44×44px (and ≥24×24 CSS px minimum per WCAG 2.2 AA 2.5.8) |
| Re-render safety | Do **not** rebuild the DOM mid-drag. Key every droppable by stable `court.id` + slot index. A full re-render during a drag invalidates drop targets — this was a real defect in the mock |

### Semantics of a drop

- Bench → empty slot: assign.
- Bench → occupied slot: replace; displaced player returns to bench.
- Court → court: **swap**, and both directions must independently pass `rejectReason`. Reject the whole swap if either side fails — never half-apply.
- Court → bench: unassign.
- Any move touching a `live` match must prompt: *"Court 3 is mid-match. Substitute?"* — this is the existing substitution flow from `8b39e95`; reuse it, don't reinvent it.

---

## 9. Persistence, sync and migration

### Keep the existing backend

The Supabase schema needs **no change** for v1. It stores an opaque JSON payload behind three `SECURITY DEFINER` RPCs:

- `kirq_create_session(payload)` → `{ code, edit_token }`
- `kirq_update_session(code, edit_token, payload)`
- `kirq_read_session(code)` → `{ payload, updated_at }`

The table has RLS enabled with **no policies**, so the publishable key cannot read or write it directly — all access is through those three functions. Reading needs only the share code; writing additionally needs the edit token, which never leaves the organizer's device. **Preserve this model exactly.** Do not add table policies, and do not enable Realtime (it would require opening the table up).

### Payload versioning — do this before anything else

Existing payloads are v1 (flat roster, `activeMatches`, no events). Add `schemaVersion` and write a one-way migration:

```ts
function migrate(payload: unknown): TournamentState {
  if (!('schemaVersion' in payload)) return migrateV1toV2(payload); // legacy
  switch (payload.schemaVersion) { case 2: return payload; ... }
}
```

`migrateV1toV2` wraps the old session as a single `openRotation` event with one implicit court per `activeMatches` entry. **A v1 share link that someone already printed on a QR code must still open.** Write a test with a real captured v1 payload.

### Offline-first is a hard requirement

The organizer's device is the source of truth and must work with no signal — it is a pickleball court, not an office. localStorage (via Zustand `persist`) is authoritative; Supabase is a publish target. Queue writes while offline and flush on reconnect. Viewers need connectivity; the scorekeeper never does.

### Port, don't rewrite

Carry over as direct ports: the QR encoder, the print-to-PDF report, CSV/JSON export, the share/publish flow, and the multi-session library. These are all verified and working; a rewrite only risks regressions.

---

## 10. Build phases

Each phase ends shippable. Do not start a phase before the previous one's acceptance criteria pass.

### Phase 1 — Scaffold and port (no new features)
Vite + React + TS + Zustand. Port the design tokens, QR encoder, PDF report, exports, session library, and Supabase sync. Implement `schemaVersion` + `migrateV1toV2`.
**Accept:** feature parity with `8b39e95`; an existing v1 share link still opens; a published session still syncs to a second device within about 17 s (worst case: 0.9 s write debounce + network + one 15 s poll; owner-accepted 2026-10-19).

### Phase 2 — Courts become objects

> **Revised by §R4:** no minimap unless the owner decides; keep easy-mode court cards.

Introduce `Court[]`, replace `activeMatches[index]`. Build the minimap (§7A) and focus pane (§7B).
**Accept:** courts have stable ids; the minimap renders ≥6 courts without vertical scroll at 375px; tapping a tile focuses it.

### Phase 3 — Drag and drop

> **Revised by §R2/§R4:** mostly done in the prototype; see R4 for what remains.

dnd-kit with pointer + keyboard sensors, auto-scroll, Move dialog, `rejectReason` everywhere.
**Accept:** every drag is reproducible via keyboard **and** via the Move dialog; an invalid drop is refused with a spoken reason; no double-booking is reachable by any input path.

### Phase 4 — Events and formats
`TournamentEvent`, `Team`, `TeamRef`, the `TournamentFormat` interface, plus `roundRobin` and `openRotation`. Organizer setup UI.
**Accept:** two events with different formats run simultaneously; a draw can be generated, previewed and committed.

### Phase 5 — The scheduler
The §6 engine, with hard/soft constraints, weights in one file, and skip-reason reporting.
**Accept:** the property test in §11 passes; every idle court reports why.

### Phase 6 — Projection and warnings
Projected finish per event, bottleneck warnings, observed match durations.
**Accept:** a deliberately overloaded player triggers a bottleneck warning before the tournament's projected end.

### Phase 7 — Remaining formats
`singleElim`, then `swiss` / `doubleElim` / `ladder`.
**Accept:** adding a format touches **no** scheduler code — if it does, the §5 abstraction is wrong and must be fixed rather than worked around.

---

## 11. Testing

Port the existing `tests/player-availability-and-substitution.test.js` first — it encodes real behaviour.

**The critical test is a property test, not an example test.** Over randomized tournaments (3–8 events, 10–60 players with overlapping entries, 2–12 courts, 200 rounds):

> **Invariant: no player ever appears on two courts in the same round.**

Assert it after every generated round *and* after every drag, swap, substitution and manual move. This single invariant is the entire waiting-game fix; everything else is optimization.

Also test:
- `remainingFor()` is exact for round robin (compare against the closed-form count)
- Swap is atomic — a rejected half never leaves the board mutated
- v1 payload migration round-trips
- QR output still matches `libqrencode` after the port
- Schedulers are deterministic given a seed (so bugs are reproducible)

Accessibility checks: keyboard-only completion of every drag, `prefers-reduced-motion`, 4.5:1 contrast in both themes, 375px with no horizontal scroll.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Rewrite loses verified behaviour (QR, PDF, sync) | Port as modules, don't reimplement; Phase 1 gates on parity |
| Bracket `remainingFor()` is an estimate | Treat as heuristic; never let scheduling correctness depend on it |
| Greedy scheduler is locally optimal only | Acceptable — it must be fast and explainable. Do **not** reach for a constraint solver; an organizer must be able to understand why someone was picked |
| Full re-render breaks in-flight drags | Stable droppable keys; never rebuild the tree during a drag |
| Vercel still deploys from the wrong branch | Set Production Branch during Phase 1 |
| Scope creep into live realtime / multi-scorekeeper | Explicit non-goals (§1) |

---

## 13. Open questions for the organizer

1. **Pools → playoffs — decided:** optional per event and off by default. When enabled, no playoff match becomes `ready` until every match in its source pool is finished and standings are finalized.
2. **Can a player's events be capped?** A hard cap (e.g. max 2 events) is far cheaper than scheduling around someone in five.
3. **Are courts interchangeable?** If a show court is reserved for finals, `Court` needs an `allowedEvents` field.
4. **Scoring:** fixed 11/win-by-2, or per-event? §5 assumes per-event.
5. **Late arrivals — decided 2026-10-20:** an organizer setting (see §R3).
6. **Court minimap — open (2026-10-21):** originally requested, but not in approved easy mode (see §R1).
