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

## Persistence and compatibility

Existing `kirq-index-v1` and `kirq-session-*` keys are retained. Sessions without `schemaVersion` migrate to schema 2 on first mutation. Migration preserves player ids, records, timeouts, match timestamps, teammate history, and the session's printed share code. Exported/shared payloads never include the private edit token.

Each mutation runs against a freshly relinked domain draft. Zustand's persist adapter writes the active session while the session library manages the index and per-session share credentials. If browser storage fails, the scorekeeper continues in memory and displays a backup warning. Future schema versions are preserved and shown as unsupported rather than overwritten.

The Supabase endpoint and publishable key remain the existing public configuration in `src/services/supabase.ts`. Only `kirq_create_session`, `kirq_update_session`, and `kirq_read_session` are called. There are no schema, RLS, or Realtime changes. Viewer polling is 15 seconds; failed updates remain queued for reconnect.

## Deployment

`vercel.json` configures Vite, `npm run build`, and `dist/`. Review and deploy this branch explicitly before changing the Vercel project's Production Branch. Local development does not change hosting settings.

The detailed scope is in `docs/superpowers/plans/2026-10-18-react-phase-1.md`.
