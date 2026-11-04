You are redesigning **KirQ**, a pickleball open-play queue manager that is live at https://kirq.vercel.app. Your job is **Phase 1** of the redesign: rebuild `index.html` so it matches the new design and behavior exactly, while keeping every feature the live app already has.

## 1. Where everything is

| What | Path |
|---|---|
| Live app source (your target) | `index.html` on branch **`kirkorino`** in the git repo `/Users/kiro/Desktop/kirkorinopickleball` (GitHub `thekirx/kirkorinopickleball`). kirq.vercel.app serves this file byte for byte. |
| Existing tests | `tests/player-availability-and-substitution.test.js` on the same branch |
| **Build guide (the spec)** | `/Users/kiro/Desktop/kirkorinopickleball-main/redesign/BUILD_GUIDE.md` |
| **Working prototype (look + behavior reference)** | `/Users/kiro/Desktop/kirkorinopickleball-main/redesign/prototype.html` |
| **Screenshots to match** | `/Users/kiro/Desktop/kirkorinopickleball-main/redesign/screenshots/` (25 PNGs, listed in section 2 of the guide) |

Ignore `/Users/kiro/Desktop/kirkorinopickleball-main/index.html` (an old version) and the React branches `codex/react-phase-1` and `prototype/play-mode`. Do not modify them.

## 2. Set up (don't disturb the current checkout)

The main repo folder is checked out on `codex/react-phase-1`, and a second worktree uses `prototype/play-mode`. Leave both alone. Make your own worktree from `kirkorino`:

```bash
cd /Users/kiro/Desktop/kirkorinopickleball
git fetch origin
git worktree add ../kirkorinopickleball-redesign -b redesign/phase-1 origin/kirkorino
cd ../kirkorinopickleball-redesign
node --test tests/
```

All existing tests must pass before you start. Work only in `/Users/kiro/Desktop/kirkorinopickleball-redesign`.

## 3. Read before writing code

1. Read **all** of `BUILD_GUIDE.md`. It is the spec: design tokens, layout, every component, where each live feature moves (section 6), engine rules (section 7), exact copy (section 8), the "Do not" list (section 10) and the acceptance checklist (section 11).
2. Open every screenshot in `redesign/screenshots/` and look at it. Your result must look like these: same colors, fonts, sizes, spacing, square corners, 1px rules and states.
3. Open `prototype.html` in a browser and use it: tap winners, Undo, SUB → Change / Injury, Timeout, add a player, switch tabs. Read its CSS and JS. Reuse its CSS, markup and class names wherever you can.
4. Read the live `index.html` end to end so you know every existing feature: sessions, Supabase share + read-only viewer (`?s=CODE`), timeouts, the 2-minute change window, injury subs, history, PDF / CSV / backup export, print report, localStorage.

## 4. Phase 1 scope

Build in `index.html` (single file, vanilla HTML/CSS/JS, no framework, no build step, no new dependencies):

- **Rolling courts engine**: when a result is recorded, that court refills immediately from the queue (guide 7.2–7.4). "Generate Next Round" is replaced by a single **START COURTS** at the start of a session.
- **Play modes and queue order** (guide 7.2 and 13), in one `compareQueue(a, b, mode)` function used everywhere:
  - **Open play** (default): plain first-come queue by time joined the line. Games played don't affect order.
  - **Friends & family**: fewest games first, then longest wait, so a late arrival (0 games) goes to the front and catches up.
  - **Competition**: visible in the mode picker but disabled ("Coming soon"). Don't invent its rules.
  - `games` is **always** wins + losses, the real record. A late arrival is 0W 0L in every mode; modes only change the order.
- **Phone layout** with 4 bottom tabs: **Courts · Queue · Players · Session** (screenshots `05`–`10`). **Desktop ≥ 1024px**: courts grid + 400px rail with Queue / Players / Session tabs.
- Keep the brand bar, the giant "Kir**Q**" masthead and the blue ticker (`02-masthead.png`); collapse to the compact header on phones once a session has players.
- **One-tap winner** with a 6-second **Undo** toast (also for change, injury sub and timeout).
- **Live time-waiting clocks** (`mm:ss`) on every queued player, lime after 15:00. **No wait estimates anywhere.**
- **Fairness chart** (games played) on the Queue tab.
- **SUB panel** per court card with the live substitution rules unchanged (Change within 2 minutes, Injury any time, closest skill, injured player timed out).
- **Timeout** toggle on Players rows (same `active` field as today) and an edit sheet replacing the 5 per-player buttons.
- **Session tab** rehousing sessions, Share QR, leaderboard (top 5 + see all), match history and exports. Settings sheet for match type, courts and teammate limit.
- **State migration** so sessions saved by the current live app still load (guide 7.1).

**Out of scope** for this task: the `#board` TV view and spoken call-outs (Phase 2), the personal card in the viewer (Phase 3), and Competition mode's rules (not defined yet).

## 5. Hard rules

- Use only the live design system: paper `#f4f2ed`, ink `#0a0a0a`, blue `#1d36ff`, lime `#e7ff4f`, lavender `#aeb8ff`, white, danger `#c8102e`; Archivo + JetBrains Mono; **border-radius 0**, no shadows, no gradients, no emoji.
- Don't break or remove any live feature (guide section 6 maps each one).
- Don't change the Supabase RPCs, the SQL files, the share-code format or the edit-token handling.
- No `alert()`, `confirm()` or `prompt()`.
- Inputs at 16px font, touch targets ≥ 44px, visible focus, `prefers-reduced-motion` respected, no horizontal scroll at 375px.

## 6. Tests

The existing test reads the **first inline `<script>`** in `index.html` and evaluates everything **before the `EVENT LISTENERS` banner comment**. It calls `setPlayerActive`, `createRoundPlan`, `applyRoundPlan`, `replaceMatchPlayer`, `substituteInjuredPlayer` and `getAssignedPlayerIds`.

- Keep that structure: logic first, then the `EVENT LISTENERS` banner, then DOM wiring.
- Keep those tests passing. If the rolling engine makes a test's expectation genuinely obsolete (for example round-based waiting), update that test on purpose and explain the change in your report. Never delete a test just to make it pass.
- Add tests for: Open play order (time joined only, late arrival at the back); Friends & family order (games, then wait, late arrival at the front); `games` always equal to wins + losses; switching mode re-sorting the queue without touching live courts; a result refilling only that court; Undo restoring state exactly; teammate-limit handling when filling a court; the change window still locking at 2:00 under the new engine; migration of an old saved session.
- Run `node --test tests/` before every commit.

## 7. Verify like a designer, not just a test runner

- Serve the worktree locally (for example `python3 -m http.server 8080` in the worktree) and open it in a browser.
- At **390×844** and **1280×800**, put your screens next to the matching screenshots (`05`, `06`, `06b`, `06c`, `07`, `08`, `09`, `10`) and fix differences in spacing, type size, weight, color, rules and states.
- Walk the acceptance checklist in guide section 11, item by item.
- Check the console for errors, and load the app with an old saved session in localStorage to test migration.
- **Do not press "Publish & Get QR" against the production Supabase** unless the owner asks; it creates real shared sessions. Test the viewer with an existing code if you're given one, or stub the network call.

## 8. Git and delivery

- Commit in small, clear steps on `redesign/phase-1`.
- **Do not push, merge into `kirkorino`, or deploy.** kirq.vercel.app is live; the owner will review first.
- When done, report:
  1. what you built, checked against the acceptance checklist;
  2. screenshots of your result at 390px and 1280px for the Courts, Queue, Players and Session tabs, beside the reference screenshots;
  3. test results, including any test you changed and why;
  4. every place you deviated from the guide or prototype, and why;
  5. open questions.

If the guide and the prototype disagree: for **visual details** (spacing, sizes, colors, states) follow the **prototype and screenshots**; for **rules, scope and features** follow the **guide**. Mention every such case in your report. If something is ambiguous or would remove a live feature, stop and ask instead of guessing.
