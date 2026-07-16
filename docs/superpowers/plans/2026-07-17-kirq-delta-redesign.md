# KirQ Delta Sports Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing KirQ game-day dashboard with Delta Sports Arena's near-black, cyan, pink, condensed-type visual language while preserving every existing workflow and data behavior.

**Architecture:** Keep the current static HTML/CSS/JavaScript architecture and use CSS tokens plus component-level overrides as the primary implementation mechanism. Make only small semantic branding edits in `index.html`; leave `app.js` behavior unchanged unless a display hook is strictly necessary.

**Tech Stack:** Semantic HTML5, CSS custom properties and responsive media queries, vanilla JavaScript, localStorage, Browser/IAB responsive QA.

## Global Constraints

- Keep **KirQ** as the product name and use **Powered by KirQ** as supporting branding.
- Use `#080d11`, `#101920`, `#061116`, `#15b9dc`, `#ec1764`, `#f7f9fa`, `#9aacb6`, and `#26343d` as the core palette.
- Preserve matchmaking, queue priority, player state, court assignments, persistence, leaderboard, history, and settings behavior.
- Maintain 16px minimum body text, 44 by 44 pixel targets, visible focus states, semantic labels, and WCAG AA contrast.
- Prevent horizontal scrolling and overlap from 390px upward.
- Do not copy or embed the Delta Sports logo.

---

### Task 1: Brand Foundation And Design Tokens

**Files:**
- Modify: `index.html:5-24`
- Modify: `index.html:137-166`
- Modify: `styles.css:1-80`

**Interfaces:**
- Consumes: Existing KirQ markup, CSS class names, and Google Fonts integration.
- Produces: Delta-aligned color/type tokens and KirQ/Powered by KirQ brand copy used by all later component styling.

- [ ] **Step 1: Capture the current baseline**

Run the local app at `http://127.0.0.1:4173`, capture desktop and 390px screenshots, and record current console warnings and document scroll width.

- [ ] **Step 2: Update branding metadata and typography imports**

Change the theme color to `#080d11`, load Oswald for display headings and Inter for body/control text, retain the title's KirQ identity, add `Powered by KirQ` supporting copy, and bump the CSS cache key.

- [ ] **Step 3: Replace global design tokens**

Define near-black surfaces, cyan and pink accents, cool-white text, slate borders, restrained radii, and compact elevation. Map existing variables such as `--lime`, `--blue`, `--danger`, `--text`, and `--muted` to the new system so application state classes continue to work without JavaScript changes.

- [ ] **Step 4: Verify foundation**

Run `git diff --check` and reload the app. Expected: KirQ branding remains visible, the browser theme and typography use the new system, and no console errors appear.

### Task 2: Arena Command Shell And Core Controls

**Files:**
- Modify: `styles.css:55-230`
- Modify: `styles.css:310-430`

**Interfaces:**
- Consumes: Task 1 color and typography variables.
- Produces: Delta-aligned header, session command bar, workflow banner, buttons, form controls, status tags, court cards, and settings surfaces.

- [ ] **Step 1: Restyle the app shell**

Use a near-black command header with a cyan/pink KirQ mark treatment, condensed uppercase section typography, squared borders, and a compact active-session strip.

- [ ] **Step 2: Restyle action hierarchy**

Use cyan fills for Generate Matchup and Start Match, pink fills for Record Winner and destructive confirmations, and slate outlined styling for Add Player, Edit Settings, tabs, and secondary actions. Preserve disabled and focus-visible states.

- [ ] **Step 3: Restyle operational components**

Apply sharper panel geometry, compact rectangular status tags, cyan match-ready treatment, pink winner treatment, stronger table headers, and consistent input/segmented-control styling.

- [ ] **Step 4: Restyle overlays and notifications**

Update settings drawer, confirmation dialog, toast, and overlay colors without changing their positioning or interaction behavior.

- [ ] **Step 5: Verify component states**

Load the sample session and inspect empty, populated, match-ready, active, finished, settings, and confirmation states. Expected: all labels remain readable and no status depends on color alone.

### Task 3: Responsive Density And Mobile Navigation

**Files:**
- Modify: `styles.css:380-550`

**Interfaces:**
- Consumes: Task 2 component styles and the existing game-day grid areas.
- Produces: Stable desktop, tablet, and mobile compositions with no overlap or document-level overflow.

- [ ] **Step 1: Tune desktop density**

Keep the two-column command layout, reduce excess panel padding, preserve the activity panel below courts, and keep the control rail independently sized.

- [ ] **Step 2: Tune tablet stacking**

At 1150px and below, stack courts, controls, and activity in that order while retaining a two-column controls layout where space permits.

- [ ] **Step 3: Tune mobile controls**

At 800px and below, use a high-contrast Delta-styled bottom navigation and contextual action button. Ensure court teams, queue rows, tabs, metrics, and settings fields wrap cleanly.

- [ ] **Step 4: Run responsive overflow checks**

Measure `document.documentElement.scrollWidth` against `clientWidth` at 390px, 540px, 768px, 900px, 1150px, and 1280px. Expected: exact width match and zero visible elements outside the viewport except intentional internal tab scrolling.

### Task 4: Functional And Visual Regression QA

**Files:**
- Verify: `index.html`
- Verify: `styles.css`
- Verify: `app.js`

**Interfaces:**
- Consumes: Completed redesign.
- Produces: Evidence that the redesign is visual-only and production-safe.

- [ ] **Step 1: Run source checks**

Run `node --check app.js` and `git diff --check`. Expected: both exit with status 0.

- [ ] **Step 2: Exercise the core workflow**

Load sample players, switch Mixed Skills and Same Skill Only, generate a matchup, start a match, record a winner, open each Players/Leaderboard/Match History tab, open and close settings, and cancel a Remove All Players confirmation.

- [ ] **Step 3: Audit browser health**

Check page identity, meaningful DOM content, framework-overlay absence, and console warnings/errors at desktop and mobile widths.

- [ ] **Step 4: Compare with Delta reference**

Inspect at least palette, typography, header geometry, button hierarchy, panel borders/radii, and mobile navigation against `https://deltasports.vercel.app`. Record and fix material drift while preserving KirQ identity.

- [ ] **Step 5: Review final diff**

Run `git status --short --branch` and inspect the complete diff. Expected: only the approved design documents, `index.html`, and `styles.css` change; `app.js` remains behaviorally unchanged.
