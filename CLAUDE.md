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
  - State persists to localStorage under key `workday-board@v1`

### Key Features & Implementation

- **Columns**: Backlog, Ready, In Progress, Waiting on AI, Waiting on Others, Blocked, In Review, Done
- **Priority System**: Score-based with buckets (P0-P3) and due date boost
- **Quick-Add Tokens**: Parse inline tokens (#project, !p0-p3, due:, @ai/@me, +tags, impact:, urgency:, effort:)
- **Focus Timer**: Start/pause timer on tasks with automatic state transitions
- **Drag-and-Drop**: Custom implementation using pointer events and `elementsFromPoint`
- **Projects Module**: (In Development) Multi-project support with Default project, project selector, bulk task moves

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
- In-app self-test panel available for validation
- Always verify: `npm run lint` and `npm run build` before commits

## GitHub Pages Deployment

- Base path configured in `vite.config.js` as `/workday-task-board/`
- Deploy workflow in `.github/workflows/deploy.yml`
- CI workflow in `.github/workflows/ci.yml` runs on all branches
- Custom domain via `GH_PAGES_CNAME` repo variable or `public/CNAME` file

## Current Development: Projects Module

### Feature Branch: 001-projects-i-want

Adding multi-project support to organize tasks by context:

**Data Model Changes**:

- New `Project` entity with id, name, color, isDefault flag
- Tasks extended with `projectId` field
- Store extended with projects array and currentProjectId

**Key Implementation Points**:

- Default project always exists, cannot be deleted
- Project names limited to 15 chars, must be unique
- Tasks filtered by currentProjectId for display
- Bulk move tasks between projects supported
- Timer state preserved across project switches

**Store Actions to Implement**:

- `createProject(name)` - Creates new project with auto color
- `deleteProject(id)` - Deletes project and all its tasks (except default)
- `renameProject(id, name)` - Renames project with validation
- `switchProject(id)` - Changes current project filter
- `moveTasksToProject(taskIds, targetProjectId)` - Bulk move operation

**UI Components**:

- Project selector dropdown in top-left
- Project management panel for CRUD operations
- Project badges on task cards
- Active timer indicator across projects

**Migration**:

- Automatic v1�v2 migration on first load
- Existing tasks assigned to default project
- No data loss during upgrade

### Remember When Implementing

1. Maintain single-file architecture in `WorkdayTaskBoardApp.jsx`
2. Preserve all existing functionality (8 columns, timers, quick-add)
3. Use existing Zustand patterns for state management
4. Test localStorage migration carefully
5. Ensure <100ms project switching performance
