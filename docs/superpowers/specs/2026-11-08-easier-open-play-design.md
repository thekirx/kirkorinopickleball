# Easier open play and anytime swaps — 2026-11-08

Owner instruction: “use your judgement, make it as much as possible easy to use, automated as much as possible”. This opts out of further design questions. Implementation stays in the existing prototype worktree on prototype/play-mode; canonical worktree retains documentation only. No commit, push, deploy, backend or hosting changes authorized.

## Decisions
- Remove the two-minute limit for all ongoing games, including tap and drag swaps. Finished results stay protected. No timer or play history reset on a swap.
- Keep court cards first. Add brief task guidance, explicit team labels and a prominent Swap players action. Use a guided two-step picker: choose outgoing player, then incoming player; waiting candidates first, with an automatic fair waiting-player choice. Retain drag/tap board as a secondary control.
- Automatically prepare a target of 1–3 upcoming games for new game days (default one). Existing saved days retain manual preparation unless enabled. Persist this organizer-only preference; do not alter shared schema v3.
- Maintain fixed drafts after successful organizer changes and starts, never reshuffle an existing draft. No automatic game starts or winner guesses: organizer confirms a court is ready. Preserve manual priority and partner limits; show insufficient-player/partner-limit status without repeated toasts.
- A swap picker may explicitly offer a player reserved in an upcoming game, warning before selection that the affected upcoming game is released and automatically prepared again if enabled. Domain operation must be atomic on refusal; regular swap API retains reservation protection.
- Manual preparation remains available with automatic mode off. Clearing upcoming games turns automatic preparation off to avoid instant recreation. Lowering the target preserves existing fixed drafts.

## Verification and boundaries
Tests cover late swaps, finished protection, reservations, automatic refill/fixed teams/reload/day isolation, manual mode, failure safety, and UI picker/queue controls/read-only spectator view. Run complete test suite, build, deployment configuration check, format/diff checks and browser mobile/desktop interactions. No new dependencies or visual redesign. This is an open-play usability improvement, not completion of tournament phases. Physical phone and live external sharing checks must be reported separately.
