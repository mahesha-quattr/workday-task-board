# Workday Task Board

[![CI](https://github.com/mahesha-quattr/workday-task-board/actions/workflows/ci.yml/badge.svg)](https://github.com/mahesha-quattr/workday-task-board/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/mahesha-quattr/workday-task-board/actions/workflows/deploy.yml/badge.svg)](https://github.com/mahesha-quattr/workday-task-board/actions/workflows/deploy.yml)

Kanban-style Workday Task Board with focus timer, quick-add tokens, and simple state stored in `localStorage`.

## Getting Started

- Requirements: Node 18+ and npm

```bash
cd workday-task-board
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## Scripts

- `npm run dev`: Start Vite dev server with React Fast Refresh.
- `npm run build`: Production build to `dist/`.
- `npm run preview`: Preview the production build.
- `npm run lint`: Run ESLint across `src/` and project files.
- `npm run lint:fix`: Auto-fix lint issues where possible.
- `npm run format`: Run Prettier to format the codebase.
- `npm run format:check`: Check formatting without writing.
- `npm run deploy`: Builds and publishes `dist/` to the `gh-pages` branch.

## Features

- Columns: Backlog, Ready, In Progress, Waiting on AI, Waiting on Others, Blocked, In Review, Done.
- Priority score and bucket (`P0..P3`) with due-date boost.
- Focus timer: start/pause on a task; logs elapsed seconds.
- Preference: "Return to Ready on pause" toggle.
- Drag-and-drop between columns (hit-tested under pointer).
- Self-tests run in-app and show a quick pass/fail count.

## Quick-Add Tokens

Type into the quick-add input:

- `#project` — set `project`
- `!p0`..`!p3` — set priority bucket
- `due:today|tomorrow|YYYY-MM-DD` and optional time `HH:mm`
- `@ai` / `@me` — set owner
- `+tag` — add tags
- `impact:0..5` `urgency:0..5` `effort:0..5`
- `expect:today|YYYY-MM-DD` — expected time for AI handoff

Example:

```
"Ship PR #alpha !p1 due:today 17:00 @me +ui"
```

## Tech Stack

- React 18, Zustand, Framer Motion, date-fns, Tailwind CSS, lucide-react, clsx
- Vite for dev/build, ESLint + Prettier for linting/formatting

## Notes

- State persists in `localStorage` (`workday-board@v1`). Clear storage to reset seeded tasks.
- Tailwind is configured with `darkMode: 'class'`; use the header toggle to switch.

## Deployment

Two options:

- GitHub Actions (recommended): A workflow in `.github/workflows/deploy.yml` builds the app and publishes to GitHub Pages on pushes to `main`/`master`. Enable Pages in your repo settings, set Source to "GitHub Actions".
- Manual via `gh-pages`: Ensure your git remote is set (default `origin`). Then run:

```bash
npm run deploy
```

If deploying to a project page (i.e., `https://<user>.github.io/<repo>`), set the Vite `base` in `vite.config.js` to `'/<repo>/'` to handle asset URLs.

### Custom Domain (CNAME)

You can publish to a custom domain. Two supported ways:

- Via repo variable (recommended): Add a repository variable named `GH_PAGES_CNAME` with your domain (e.g., `tasks.example.com`). The deploy workflow will write `dist/CNAME` automatically.
- Via static file: Add a `public/CNAME` file containing your domain. Vite will copy it into `dist/`.

DNS setup:

- For a subdomain (e.g., `tasks.example.com`): create a `CNAME` DNS record pointing to `mahesha-quattr.github.io`.
- For an apex/root domain (e.g., `example.com`): create `A` records pointing to GitHub Pages IPs (see GitHub Pages docs), and optionally an `ALIAS/ANAME` if your DNS supports it.
