# Workday Task Board Constitution

## Core Principles

### I. Kanban Flow Integrity
The board preserves a single-page kanban with eight canonical statuses—Backlog, Ready, In Progress, Waiting on AI, Waiting on Others, Blocked, In Review, Done—in that order. Every change must keep drag-and-drop, keyboard shortcuts, and status transitions predictable so users can see work flowing left to right without hidden lanes or surprise automation.

### II. Task Metadata Fidelity
Tasks carry rich metadata (priority score and bucket, due dates, owners, tags, dependencies) that must stay accurate when edited inline or created through quick-add tokens. Parsing for `#project`, `!p0..p3`, `due:`, `@ai/@me`, `+tag`, `impact:`/`urgency:`/`effort:`, and `expect:` is mandatory so users can capture context in one line and trust the computed score.

### III. Focus Timer Accountability
Starting the focus timer instantly moves the card to In Progress, shows a live chip, and records elapsed seconds until paused. Pausing stops logging, writes to `timeLogSecs`, and honors the "Return to Ready on pause" preference; no change may desync logged time, timestamps, or the timer controls visible on the card toolbar.

### IV. Local Persistence & Offline Resilience
Application state persists to `localStorage` under `workday-board@v1` (tasks) and `workday-board@view-mode` (layout). Features must function offline, guard against malformed stored data, and migrate storage deliberately—never breaking existing boards without a recovery path.

### V. Seamless Productivity Experience
The UI lives entirely in `WorkdayTaskBoardApp.jsx`, styled with Tailwind and supporting light/dark themes, board/backlog views, and in-app self-tests. Enhancements must keep interactions snappy, accessible (ARIA labels, focus management), and consistent with the app’s single-file architecture.

## Product Requirements & Constraints
- Maintain the eight defined columns with their helper text and shortcuts; new flows are negotiated before altering this set.
- Tasks expose fields for title, description, project, owner (`self`, `ai`, `other`), priority metrics, tags, dependencies, due/expected dates, and timer metadata.
- Priority score follows the existing weighted formula (impact ×2, urgency ×1.5, minus effort, with due-date boosts) and maps to bucket `P0`–`P3`; UI badges must reflect both score and bucket colors.
- Quick-add input accepts the documented tokens and defaults (e.g., due-time 18:00) and must remain resilient to malformed text without crashing or corrupting state.
- View mode toggles between board and backlog while keeping filters, selections, and scroll positions intuitive.
- Dark mode toggle operates via the root `class` and must be preserved across sessions.
- Built-in self-tests remain discoverable from the header and should cover any new surface area introduced.

## Development Workflow & Quality Gates
- Develop with Node 18+ using `npm run dev`; ship with `npm run build` and ensure assets target Vite’s configured `base` for GitHub Pages deployment.
- Run `npm run lint` and `npm run format:check` before submitting changes; eslint/prettier violations block release.
- Perform manual QA on drag-and-drop, quick-add parsing, focus timer start/pause, auto-return preference, dark mode toggle, and storage persistence before merge.
- Document notable behavior shifts in `CHANGELOG.md` and keep `AGENTS.md`/`CLAUDE.md` aligned when introducing new tooling or workflows.

## Governance
This constitution supersedes ad-hoc practices; every pull request, review, and release must confirm compliance with the principles and requirements above. Amendments require stakeholder approval, a migration or fallback plan for stored state, synchronized template updates under `.specify/`, and a version bump recorded below.

**Version**: 1.0.0 | **Ratified**: 2025-09-18 | **Last Amended**: 2025-09-18
