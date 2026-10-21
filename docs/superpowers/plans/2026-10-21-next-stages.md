# KirQ — next stages (from 2026-10-21)

**Audience:** the AI or engineer continuing this project with no memory of earlier chats.
**Read first:** `AGENTS.md`, then `changeslog.md` (Current handoff), then this file, then `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md` **§R** (the revision that overrides parts of the original design).
**Rule:** do the stages in order. A stage marked **⛔ owner decision** must not start until the owner has answered. Record the answer in `changeslog.md` before starting. Never invent the owner's answer.

---

## Where things are on 2026-10-21

| | Main folder | Prototype folder |
|---|---|---|
| Path | `/Users/kiro/Desktop/kirkorinopickleball` | `/Users/kiro/Desktop/kirkorinopickleball-prototype` (git worktree of the same repo) |
| Branch | `codex/react-phase-1` | `prototype/play-mode` |
| Contents | Phase 1 React app with the **original** screens, plus review fixes and the expired-share fix | The same, plus **easy mode** (the owner-approved UI), drag and drop, the late-arrival setting and a responsive desktop layout |
| Tests | 12 files, **115 passed** | 13 files, **141 passed** |
| Committed? | **No.** Only `3efbb25` is committed | **No.** Same base commit |
| Pushed / deployed? | No | No |
| Preview | `npm run dev -- --port 5176` | `npm run dev:lan` (port 5177, reachable from phones on the same Wi-Fi) |

- **Production today:** `https://kirq.vercel.app` serves the legacy single-file app at commit `8b39e95`. It is not the React app.
- **Backend:** Supabase project `qagqtdctkcvqfxkysoqx`, healthy on 2026-10-21. Shares expire 7 days after their last update (applied 2026-10-21). AI connectors **cannot** reach this project; only the owner can run SQL there.
- **Never use** the folder `kirkorinopickleball-main`. It is a stale copy of `main`.
- The only differences between the two folders are the easy-mode files and these:
  - **Prototype only:** `src/features/easy/`, `src/features/play/`, `src/features/share/QrCode.tsx`, `src/domain/engine.easy.test.ts`, `src/domain/engine.swap.test.ts`, `docs/mocks/`.
  - **Main only (replaced by easy mode):** `src/features/{roster,setup,courts,queue,standings,history,sessions}/`, `src/features/share/SharePanel.tsx`, `src/App.test.tsx`, `src/App.integration.test.tsx`.
  - **Edited in both:** `src/App.tsx`, `src/domain/engine.ts`, `src/features/common.tsx`, `src/state/sessionStore.ts`, `package.json` / `package-lock.json` (`@dnd-kit/core` 6.3.1, `dev:lan`), `changeslog.md`.

## Owner decisions still open

| # | Decision | Blocks | Recorded answer |
|---|---|---|---|
| D0 | May the AI **commit and push** both branches? (Push only to `codex/react-phase-1` and `prototype/play-mode`, never `main` or `kirkorino`.) | Stage 0 | — |
| D1 | Which branch is Vercel's **Production Branch**? (Settings → Environments → Production → Branch Tracking) | Stage 0, Stage 5 | unknown |
| D2 | Adopt **easy mode as the real app** (replacing the original screens)? | Stage 1 | design direction approved 2026-10-20; adoption into the main app not yet confirmed |
| D3 | **Remember settings per game day** (courts, game type, partner limit, late-arrival rule) across reloads? | Stage 2 | — |
| D4 | Build a **court minimap / venue map**? (Originally requested; not in easy mode.) | Stage 3 scope | — |
| D5 | Real-phone feedback on **press-and-hold drag** timing (currently 180 ms) | Stage 4 | — |
| D6 | **Deploy** easy mode to production, and when? | Stage 5 | — |
| D7 | Cap how many **events** one player can enter? | Stage 6 | — |
| D8 | Are all **courts interchangeable**, or is one reserved (e.g. finals)? | Stage 6 | — |
| D9 | **Scoring**: fixed 11 / win by 2, or set per event? | Stage 6 | — |

Already decided (do not re-ask): Supabase restore; 7-day expiry (applied); sync criterion "about 17 s"; easy-mode direction (A setup + C play); late arrivals as an organizer setting; pools feeding playoffs are optional per event and off by default; sentence case instead of all-caps labels.

---

## Stage 0 — Secure the work  ⛔ D0 (and D1 before any merge)

Everything exists only on one Mac. Do this first.

1. In the main folder: `git status --short`, then commit everything on `codex/react-phase-1`. Use `git add -A`; `.gitignore` already excludes `node_modules/`, `dist/`, `.superpowers/` and `.env*.local`. Check that no `.env*` file or credential is staged. The Supabase *publishable* key in `src/services/supabase.ts` is public by design and is expected.
2. In the prototype folder: commit everything on `prototype/play-mode` the same way.
3. Push both branches to `origin` **only** if D0 says so. Pushing those branches creates Vercel *preview* deployments, not production, unless D1 says the production branch is one of them. Check D1 first.
4. **Accept:** `git status --short` is empty in both folders; `git log --oneline -1` shows the new commits; if pushed, both branches exist on GitHub. Record the commit ids in `changeslog.md`.

## Stage 1 — Adopt easy mode into the main app  ⛔ D2

1. Main folder: `git merge prototype/play-mode` (both branches must be committed first; Stage 0).
2. The only expected conflict is `changeslog.md`. Resolve it by keeping the main folder's **Current handoff** (refreshed for the merge) and keeping **all** history entries from both files, newest first. `styles.css` is already identical in both. Code files should merge cleanly, because the prototype was copied from this tree and only the prototype changed them since.
3. After the merge: `npm ci`, then `npx vitest run --maxWorkers=2` (expect at least 141), `npm run build`, `npm run test:deployment`.
4. Browser checks (record measured results, not impressions): at **375×812, 768×1024, 1024×768, 1440×900**, no horizontal overflow; setup → play; tap a winner, change it, clear it; Move players by mouse drag and by tap-tap; a late arrival under both rules; publish a QR; open the `?s=` link in a second tab, confirm it is read-only, and confirm a result arrives within about 17 s; a **v1 link published by the legacy production app** opens in the easy-mode viewer; Results → Save as PDF prints only the report.
5. Afterwards, the prototype worktree can be removed with `git worktree remove ../kirkorinopickleball-prototype`, **only with the owner's agreement**.
6. **Accept:** all of step 4 passes; `changeslog.md` has one Current handoff that describes the merged state.

## Stage 2 — Remember settings per game day  ⛔ D3

Today `src/features/play/RoundControls.tsx` keeps courts, game type, partner limit and the late-arrival rule in React state, so they reset to defaults on reload.

1. Store them with each session. Preferred: a small `settings` object saved next to the session in `SessionLibrary.save()` (`src/state/sessionLibrary.ts`), outside the shared payload, so viewers and the v2 schema are unaffected. If they must go in the payload instead, bump `schemaVersion` (see §R4 in the design doc).
2. A new game day starts with defaults (2 courts, doubles, at most twice, back of the line).
3. **Accept:** tests show that settings survive a store re-creation (a reload) and are per session; switching days switches settings; the full suite passes.

## Stage 3 — Phase 2 (revised): courts become objects  ⛔ D4 for the minimap part only

Follow design §R4 and the §4 domain model. Courts get stable ids, labels and open/closed state, replacing "Court N = array index".

1. Schema: introduce `Court[]` and link each match to a court id. This changes the payload, so add `schemaVersion: 3` and `migrateV2toV3`. **Viewer compatibility:** the React `migrate()` throws on unknown versions, so make sure no deployed viewer will receive v3 before it can read it. Either ship a reader that accepts v3 first, or keep v2-compatible fields.
2. Organizer UI in easy mode: rename a court; close or reopen it (closed courts are skipped by round generation); court order is stable across rounds.
3. Keep swap rules and the 2-minute window keyed by court id.
4. Minimap / venue layout only if D4 says yes; its design must follow easy mode (§R1).
5. **Accept:** court ids are stable across rounds; closing a court reduces the courts used next round; the v2 → v3 migration test passes with the fixture in `src/test/fixtures/`; existing share links still open; the full suite and browser checks pass.

## Stage 4 — Finish Phase 3 (drag and drop)

1. Property test: over randomised sessions, any sequence of `swapPlayers`, substitutions and round generations never puts a player on two courts or twice on one court. Put it in `src/domain/`.
2. Confirm Escape cancels a drag with a **real** key press in a real browser.
3. ⛔ D5: apply the owner's feedback on the hold-to-drag delay (the `TouchSensor` `delay` in `src/features/easy/Arrange.tsx`).
4. **Accept:** the property test passes over at least 200 random sessions; Escape is confirmed; D5 is applied and recorded.

## Stage 5 — Ship open-play easy mode  ⛔ D1, D6

1. Open a PR from the merged branch. Let Vercel build a preview, and give the owner the preview URL to try on a phone.
2. Production only with D6, and through the branch D1 identifies. Never push to `main` or `kirkorino` to "finish a task".
3. After deploying: check that `https://kirq.vercel.app` serves the React build; publish → second device within about 17 s; a legacy QR code still opens.
4. **Accept:** the owner confirms in chat; the deployment and its checks are recorded.

## Stage 6 onward — tournament mode (design Phases 4–7)  ⛔ D7, D8, D9 before Phase 4

Follow design §10 Phases 4–7 and §11 testing, with the UI in easy mode (§R1). Key points:

- Format is chosen **per event** (§5). Ship `roundRobin` + `openRotation` first.
- The scheduler (§6) is global across events, players are exclusive resources, and it prioritises the longest remaining load. It must keep honouring the late-arrival setting (§R3).
- The single most important test is the §11 property test: no player on two courts in the same round, after every generated round **and** every manual move.

---

## Checks to run after any code change

```sh
git status --short
npx vitest run --maxWorkers=2
npm run build
npm run test:deployment
npx prettier --check src   # one pre-existing warning on src/test/fixtures/v1-session.json; leave it unless asked
```

Then update `changeslog.md`: refresh the Current handoff, and add a dated history entry with the checks you actually ran and their results.
