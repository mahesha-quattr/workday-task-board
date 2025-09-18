# Repository Guidelines

## Project Structure & Module Organization
The app lives under `src/`, with `WorkdayTaskBoardApp.jsx` orchestrating state, routing user flows through the board columns, and `App.jsx` handling shell UI. Global styles and Tailwind layers load from `src/index.css`, while `index.html` bootstraps Vite. Built assets land in `dist/` (never edit by hand). Configuration for Tailwind, PostCSS, and Vite sits at the repo root, and reusable GitHub Actions are in `.github/workflows/`.

## Build, Test, and Development Commands
- `npm run dev` — start the Vite dev server with React Fast Refresh.
- `npm run build` — generate a production bundle in `dist/`.
- `npm run preview` — serve the production build locally for smoke checks.
- `npm run lint` / `lint:fix` — run ESLint across `.js/.jsx` modules (auto-fix with `:fix`).
- `npm run format` / `format:check` — apply or verify Prettier formatting.
- `npm run deploy` — build and publish `dist/` to the `gh-pages` branch (calls `predeploy`).
Use `nvm use` (see `.nvmrc`) to match the Node 18 runtime before installing dependencies.

## Coding Style & Naming Conventions
Prettier enforces semicolons, single quotes, trailing commas, and a 100-character print width; let the formatter run on save or before commits. ESLint (React, Hooks, a11y plugins) should pass with zero warnings. Components live in `.jsx` files, named with PascalCase (`FocusTimer.jsx`); hooks use `useThing` camelCase; Zustand store slices stick with camelCase keys. Tailwind utility classes belong inline—extract shared patterns only when readability improves.

## Testing Guidelines
There is no dedicated test runner yet; rely on manual QA plus the in-app self-test panel before submitting changes. Exercise quick-add tokens, drag-and-drop, focus timer, and persistence across reloads. When adding automated coverage, colocate tests under `src/__tests__/` and keep file names `<Component>.test.jsx` so future tooling (e.g., Vitest + Testing Library) can discover them. Document any new test commands in `package.json` scripts.

## Commit & Pull Request Guidelines
Follow the Conventional Commits pattern already in history (`feat:`, `fix:`, `chore:`). Favor small, scoped commits with imperative subjects and helpful bodies when behavior changes. For pull requests, include: concise summary, screenshots or clips for UI changes, `Closes #123` references when applicable, and notes about state migrations or environment tweaks. Confirm `npm run lint` and `npm run build` succeed before requesting review, and call out any follow-up tasks explicitly.

## Environment & Deployment
Copy `.env.production.example` to `.env` or `.env.local` when introducing private configuration—prefix keys with `VITE_` so Vite exposes them. GitHub Pages deploys from the `gh-pages` branch; ensure the `base` in `vite.config.js` reflects the repo slug when hosting at `https://<user>.github.io/<repo>/`. If you need a custom domain, configure `GH_PAGES_CNAME` or add `public/CNAME` as described in `README.md`.
