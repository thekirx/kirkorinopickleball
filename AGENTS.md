# Instructions for AI contributors

These instructions apply to the entire repository.

## Required handoff record

1. Before working, read `changeslog.md`, `README.md`, and any linked plan relevant to the task. Check the actual branch, working tree, and files; the handoff is context, not proof of current state.
2. Update `changeslog.md` whenever you change code, configuration, dependencies, documentation, tests, or implementation decisions. Do this in the same task and commit as the change, before handing back to the user. Documentation-only changes count too.
3. Keep its **Current handoff** accurate: active phase, implemented versus pending work, blockers, important decisions, verification results, and next steps. Add a dated entry under **Change history** describing what changed, relevant files, checks actually run, and remaining limitations. Newest entries go first; preserve older entries.
4. Record work-in-progress and failed or blocked checks honestly. Distinguish local implementation, tests, commit, push, and deployment. Never mark a phase complete solely because its code exists.
5. Include enough context for another AI to continue without the previous chat. Use repository-relative paths and exact commands. Do not rely on temporary files, private scratch ledgers, or a running reviewer as the only source of required context.
6. Never include credentials, edit tokens, private session payloads, or personal player data in the log. Do not invent test results or silently remove unresolved blockers.

For a read-only conversation, no log update is necessary unless it establishes a new decision or materially changes the handoff status. This is a contributor requirement, not a background file watcher.

## Scope and safety

- Preserve existing uncommitted work, including changes made by another AI.
- Follow the approved phase acceptance criteria in `docs/superpowers/specs/2026-10-18-kirq-tournament-design.md`; do not conflate the React migration with completion of the seven-phase tournament project.
- Do not push, deploy, or change backend/hosting settings merely to finish a local task. Follow the user's current authorization.
- Before claiming verification, run appropriate checks and record their actual outcome. If an external service prevents an acceptance check, report it explicitly.
