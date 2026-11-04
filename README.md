# KirQ redesign — Phase 1

Single-file vanilla HTML/CSS/JS redesign of the live `kirkorino` baseline, isolated on `redesign/phase-1`. No framework or build step.

Read [changeslog.md](changeslog.md) before contributing. The approved brief is [docs/redesign/BUILD_GUIDE.md](docs/redesign/BUILD_GUIDE.md); the implementation plan is [docs/superpowers/plans/2026-11-04-redesign-phase-1.md](docs/superpowers/plans/2026-11-04-redesign-phase-1.md).

Run locally: `python3 -m http.server 8080 --bind 127.0.0.1`.
Tests: `node --test tests/*.test.js` (Node 24 does not accept `tests/` as a test directory argument).

Do not publish test sessions to production Supabase. No push, merge or deployment is authorized.
