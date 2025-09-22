# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands

- `npm install` - Install dependencies (requires Node 18+, check with `.nvmrc`)
- `npm run dev` - Start Vite dev server with React Fast Refresh (typically http://localhost:5173)
- `npm run build` - Production build to `dist/` directory
- `npm run lint` - Run ESLint across `.js/.jsx` files
- `npm run lint:fix` - Auto-fix ESLint issues where possible
- `npm run format` - Run Prettier to format the codebase
- `npm run format:check` - Check formatting without writing changes

### Deployment

- `npm run deploy` - Build and publish to `gh-pages` branch
- GitHub Actions automatically deploys to Pages on push to main/master

## Architecture Overview

This is a single-page React application (Kanban-style task board) with the following structure:

### Core Application

- **`src/WorkdayTaskBoardApp.jsx`** - Main application component (59KB single-file MVP)
  - Contains all business logic, state management, and UI components in one file
  - Uses Zustand for state management (store defined inline)
  - Implements drag-and-drop, focus timer, quick-add tokens, and task management
  - State persists to localStorage under keys:
    - `workday-board@v1` - Main data (tasks, projects, ownerRegistry)
    - `workday-board@view-mode` - View preferences

### Key Features & Implementation

- **Columns**: Backlog, Ready, In Progress, Waiting on AI, Waiting on Others, Blocked, In Review, Done
- **Priority System**: Score-based with buckets (P0-P3) and due date boost
- **Quick-Add Tokens**: Parse inline tokens (#project, !p0-p3, due:, @owner, +tags, impact:, urgency:, effort:)
- **Focus Timer**: Start/pause timer on tasks with automatic state transitions
- **Drag-and-Drop**: Custom implementation using pointer events and `elementsFromPoint`
- **Projects Module**: Multi-project support with Default project, project selector, bulk task moves

### Current Development: Enhanced Owner Management (003-we-need-to)

**Feature Branch**: 003-we-need-to

Adding centralized owner registry with persistence and improved UX:

**Key Components**:

- Owner Registry: Central collection of all unique owners with statistics
- Autocomplete UI: Combobox pattern for owner selection with suggestions
- Bulk Operations: Assign single owner to multiple selected tasks
- Data Persistence: Extended localStorage schema v1.1 with ownerRegistry

**Store Extensions**:

```javascript
// New state
ownerRegistry: {
  owners: Set<string>,
  statistics: Map<string, OwnerStats>
}

// New actions
initializeOwnerRegistry()
addOwnerToRegistry(name)
removeOwnerFromRegistry(name)
getOwnerSuggestions(partial)
bulkAssignOwner(taskIds, owner)
```

**Constraints**:

- Maximum 5 owners per task
- Owner names limited to 30 characters
- Case-sensitive storage
- Removing owner from registry unassigns from all tasks

### Tech Stack

- React 18 + Zustand for state
- Framer Motion for animations
- Tailwind CSS for styling (configured with dark mode via class)
- date-fns for date handling
- Vite for dev/build tooling

## Code Conventions

### From AGENTS.md

- Use Prettier formatting (semicolons, single quotes, 100-char width)
- Components in `.jsx` with PascalCase naming
- Hooks use `useThing` pattern
- Zustand store keys use camelCase
- Inline Tailwind classes (extract only when readability improves)
- Follow Conventional Commits (feat:, fix:, chore:)

### Testing

- No formal test runner yet - rely on manual QA
- In-app self-tests available for validation
- Playwright MCP tools for E2E testing
- Always verify: `npm run lint` and `npm run build` before commits

## GitHub Pages Deployment

- Base path configured in `vite.config.js` as `/workday-task-board/`
- Deploy workflow in `.github/workflows/deploy.yml`
- CI workflow in `.github/workflows/ci.yml` runs on all branches
- Custom domain via `GH_PAGES_CNAME` repo variable or `public/CNAME` file

### Remember When Implementing

1. Maintain single-file architecture in `WorkdayTaskBoardApp.jsx`
2. Preserve all existing functionality (8 columns, timers, quick-add)
3. Use existing Zustand patterns for state management
4. Test localStorage migration carefully
5. Ensure <100ms UI response time for owner operations
6. Validate owner names (30 char max, valid characters)
7. Respect 5 owner per task limit

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
