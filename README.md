# KirQ

Offline-first open-play pickleball session manager. This branch ports the existing KirQ scorekeeper to React 18, TypeScript, Vite, and Zustand. Tournament scheduling is a later phase.

## Switching AI assistants

Start with [changeslog.md](changeslog.md) for the current status, decisions, verification, and next steps. All AI contributors must follow [AGENTS.md](AGENTS.md) and update the log whenever they make changes. `CLAUDE.md` and `GEMINI.md` point to the same instructions.

## Run locally

Use Node.js 22.12+ or 24+.

```sh
npm ci
npm run dev -- --port 5176
```

Open http://localhost:5176. Local session data stays in your browser; published links are read-only.

```sh
npm test -- --run
npm run build
npm run test:deployment
```

The QR port has 41 baseline regression cases and 41 independent libqrencode comparisons. The independent comparisons require Python 3 and libqrencode (Homebrew: `brew install qrencode`) and explicitly skip when that library is unavailable. Different valid QR masks are normalized for comparison; the production encoder is unchanged.

## Friends and family open play (2026-11-07 local preparation)

Use the easy-mode app on `prototype/play-mode`. This version is locally tested; the published production app and older preview do not include these changes until explicitly deployed.

1. Start a game day and add each player with **Beginner, Intermediate, or Advanced** skill. Existing skills/records remain saved; use **Players → More** to adjust a skill. Set courts and singles/doubles, then **Start playing** to fill available courts.
2. Each court runs independently. Tap its winning team when a game finishes; all four players return to the waiting pool. Tap **Start next game** on that court to fill it again. Other games keep their players, scores and original swap timers. There is no global next-round action.
3. Use **Players → Search players** to find part of a name. **Play next** gives an active waiting player the next available organizer queue spot. The ordered picks appear on Players and Courts; cancel returns someone to normal rotation. An available court takes the first picks it can fit, leaving overflow queued. Busy players are excluded. Failed scheduling retains all picks.
4. Teams are balanced among the next eligible players using skill first, then smoothed win/loss record and recent win streak. Queue priority is preserved. All three possible doubles pairings are checked for a single court, within the existing partner-repeat limit. If no allowed pairing is found, increase that limit under **Change → More options**. Skill/form matching is a heuristic, not a guaranteed player rating.
5. **Courts → Move players (drag or tap)** shows draggable player names on court cards and waiting players. Drag one onto another, or tap one name and then another. There is no separate venue map yet. Ordinary changes close two minutes after that court’s game starts; injury replacements remain available afterward. Escape cancels dragging.
6. A finished score can be changed/cleared on its court until the participants are reused. After reuse, the saved result remains in **Results** and the card shows a read-only last result. No finished card reserves players or reopens a game with players now busy elsewhere. Court labels remain stable when other finished cards are archived.
7. On Courts, **Next in queue → Games to draft** selects 1–3 games to add, up to three pending total. Drafts reserve waiting players only and keep their announced teams. If fewer games fit, the app explains why. Drafting does not count as play. **Clear upcoming games** releases reservations; breaks/removals/reopening a result cancel affected games with a notice. Changing game type or partner limit clears drafts. The first fixed game starts on whichever court opens next.
8. **Share → Create a QR code** gives friends a read-only live view of upcoming games, waiting order, current courts and results. **Results → Download a backup** saves session results. Keep using the organizer’s original browser for editing.

Court count/type, partner limit, late-arrival choice and pending picks are saved per game day in the same browser. Late arrivals can join the back or be prioritized for the next available game. Changing game type affects newly started games; existing games retain their lineups. Reducing the available court count preserves ongoing games/results but disables new starts on higher-numbered courts. Increasing it re-enables those courts. Individual court naming/closing is a later phase.

Organizer settings and raw manual-pick metadata stay private; the resulting waiting order and fixed upcoming games are shared and included in JSON backups. Skill keys remain backward-compatible (`pro` displays as Advanced). Streaks use retained match history and player names: clearing recent games clears the streak signal but preserves wins/losses; a removed/re-added name may inherit a bounded historical streak. Equal waiting priorities are shuffled. Large arrival/pick groups may need several court openings.

For a phone on the same Wi-Fi as the Mac: `npm run dev:lan` (port 5177), then use the network URL Vite prints. The local preview needs the Mac/server running. Real-phone touch/scroll feedback and explicitly authorized production deployment remain release checks.

## Persistence and compatibility

Existing `kirq-index-v1` and `kirq-session-*` keys are retained. Legacy unversioned/v1/v2 sessions migrate to schema 3 on first mutation. Migration preserves player ids, records, timeouts, match timestamps, teammate history, and the session's printed share code. Exported/shared payloads never include the private edit token.

Each mutation runs against a freshly relinked domain draft. Zustand's persist adapter writes the active session while the session library manages the index and per-session share credentials. If browser storage fails, the scorekeeper continues in memory and displays a backup warning. Future schema versions are preserved and shown as unsupported rather than overwritten.

The Supabase endpoint and publishable key remain the existing public configuration in `src/services/supabase.ts`. Only `kirq_create_session`, `kirq_update_session`, and `kirq_read_session` are called. There are no schema, RLS, or Realtime changes. Viewer polling is 15 seconds; failed updates remain queued for reconnect.

## Deployment

`vercel.json` configures Vite, `npm run build`, and `dist/`. Review and deploy this branch explicitly before changing the Vercel project's Production Branch. Local development does not change hosting settings.

The detailed scope is in `docs/superpowers/plans/2026-10-18-react-phase-1.md`.

## Shared queue compatibility

The public payload is now schema 3 (`queuedGames`, `waitingPlayerIds`). This reader accepts legacy unversioned/v1/v2 shares. Older React readers reject v3, so the updated viewer must be deployed at the sharing origin before a production release publishes v3 sessions. No database/RPC/hosting settings changed. In local use, open the network address printed by Vite before creating a QR for phones on the same Wi-Fi; a loopback address works only on the organizer’s computer.
