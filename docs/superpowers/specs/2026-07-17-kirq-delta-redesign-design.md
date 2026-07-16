# KirQ Delta Sports Redesign

## Goal

Restyle the existing KirQ game-day dashboard so it feels native to the Delta Sports Arena brand while preserving all current player, queue, court, matchmaking, leaderboard, history, and settings behavior.

## Brand Hierarchy

- Keep **KirQ** as the product name in the primary app mark.
- Use **Powered by KirQ** as supporting copy when the dashboard is framed as Delta Sports open-play operations.
- Do not rename controls, data concepts, or stored application state to Delta-specific terms.
- Do not copy the Delta logo. Align through palette, typography, geometry, and visual rhythm.

## Visual Direction

The interface will use Delta's high-energy arena aesthetic instead of KirQ's current soft green SaaS treatment.

- Background: near-black navy `#080d11`.
- Raised surfaces: deep blue-black `#101920` and `#061116`.
- Primary accent: Delta cyan `#15b9dc`.
- High-priority or destructive accent: Delta pink `#ec1764`.
- Primary text: cool white `#f7f9fa`.
- Secondary text: blue-gray `#9aacb6`.
- Borders: slate `#26343d`, with cyan or pink emphasis by state.
- Headings: condensed, bold, uppercase display typography inspired by Delta's Oswald treatment.
- Body and controls: highly readable sans-serif typography with at least 16px body text.
- Geometry: sharper panels, restrained corner radii, visible borders, minimal shadows, and no soft lime glow.

## Layout And Components

- Preserve the current compact game-day grid: Live Courts and Players/Results in the main column, controls and queue in the side rail.
- Restyle the header as an arena command bar with KirQ branding, session status, and a clear settings action.
- Use cyan for primary operational actions such as Generate Matchup and Start Match.
- Use pink for Record Winner emphasis, destructive confirmations, and urgent highlights where appropriate.
- Use neutral outlined controls for Add Player, Edit Settings, tabs, and secondary actions.
- Replace rounded pills where possible with compact rectangular status tags while retaining readable text labels.
- Keep status meaning available through text and icons, never color alone.
- Keep the settings drawer fixed over the page without resizing or transforming the dashboard.

## Branding Copy

- Header brand: **KirQ**.
- Supporting header/footer copy: **Powered by KirQ** or **Delta open play, powered by KirQ**.
- Session name, workflow guidance, court labels, queue labels, and action text remain functionally unchanged.

## Responsive Behavior

- Desktop retains the two-column game-day command layout.
- Tablet stacks the control rail below courts without horizontal overflow.
- Mobile retains Courts, Queue, Players, and More bottom navigation plus the contextual action button.
- All controls maintain at least 44 by 44 pixel targets.
- Long names, labels, session summaries, and status text wrap without overlapping.
- Browser zoom and viewport widths from 390px upward must not create document-level horizontal scrolling.

## Accessibility

- Maintain WCAG AA contrast for text, controls, borders, and states.
- Preserve visible focus rings, semantic headings, permanent form labels, and current ARIA attributes.
- Keep body text at 16px or larger and avoid thin font weights.
- Respect reduced-motion preferences.

## Implementation Boundaries

- Primary changes belong in `styles.css`, with minimal branding markup changes in `index.html`.
- `app.js` may only change if required to support display copy or CSS state hooks.
- Do not alter matchmaking scoring, queue priority, player state, court assignment, persistence, leaderboard, history, or settings logic.
- Do not add external image assets or reproduce the Delta Sports logo.

## Verification

- Verify empty, populated, match-ready, active-match, completed-match, and settings-drawer states.
- Verify Mixed Skills and Same Skill Only settings remain functional.
- Verify Add Player, Generate Matchup, Start Match, Record Winner, tabs, Remove All Players confirmation, and settings save interactions.
- Test desktop, tablet, and mobile widths, including 390px, 540px, 768px, 900px, and 1280px.
- Confirm no console errors, no horizontal overflow, and no overlapping content.
- Compare the rendered palette, typography, geometry, header, controls, and panel treatment against the Delta Sports reference.
