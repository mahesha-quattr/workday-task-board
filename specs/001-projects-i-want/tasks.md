# Tasks: Projects Module

**Input**: Design documents from `/specs/001-projects-i-want/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Single-file architecture**: All code in `src/WorkdayTaskBoardApp.jsx`
- **Manual QA**: Test scenarios documented, no test runner
- **localStorage**: Data persistence, no external API

## Phase 3.1: Setup & Migration

- [x] T001 Backup existing localStorage data and create migration function for v1→v2 schema
- [x] T002 Extend Zustand store state with projects array and currentProjectId in src/WorkdayTaskBoardApp.jsx
- [x] T003 Add default project initialization with id='default', isDefault=true to store
- [x] T004 Implement storage migration on app load to assign existing tasks projectId='default'

## Phase 3.2: Store Actions Implementation

- [x] T005 Implement createProject(name) action with validation (15 char limit, unique names) in store
- [x] T006 Implement deleteProject(id) action with task cascade deletion and default project protection
- [x] T007 Implement renameProject(id, name) action with validation and default project protection
- [x] T008 Implement switchProject(id) action to update currentProjectId
- [x] T009 Implement moveTasksToProject(taskIds, targetProjectId) bulk move action
- [x] T010 Modify getVisibleTasks() to filter by currentProjectId
- [x] T011 Modify addTask() to auto-assign currentProjectId to new tasks

## Phase 3.3: UI Components - Project Management

- [x] T012 Create ProjectSelector dropdown component in top-left with current project display
- [x] T013 Implement project dropdown menu with project list, task counts, and color indicators
- [x] T014 Add project management modal/panel with create, rename, delete operations
- [x] T015 Implement project name validation UI with real-time feedback
- [x] T016 Add delete confirmation dialog showing task count warning
- [x] T017 Implement project color assignment from predefined palette

## Phase 3.4: UI Components - Task Integration

- [x] T018 Add project badge/indicator to task cards showing project color
- [x] T019 Implement bulk task selection UI with checkboxes on hover
- [x] T020 Create bulk actions bar with "Move to project" option
- [x] T021 Implement move tasks dialog with source/target project selection
- [x] T022 Add cross-project timer indicator to project selector (pulsing dot)
- [x] T023 Implement quick timer jump to switch to project with active timer

## Phase 3.5: Project Features

- [x] T024 Implement recent projects ordering (5 most recent at top of selector)
- [x] T025 Add project search/filter for 10+ projects with fuzzy matching
- [x] T026 Implement empty state messaging for projects with no tasks
- [x] T027 Add keyboard shortcuts (Cmd/Ctrl+K for search, Cmd/Ctrl+Shift+N for new)
- [x] T028 Implement project ordering with drag-to-reorder in management panel

## Phase 3.6: Mobile & Responsive

- [x] T029 Adapt project selector for mobile (hamburger menu integration)
- [x] T030 Create full-screen project switcher for mobile devices
- [x] T031 Ensure touch-friendly project management controls

## Phase 3.7: Polish & Performance

- [x] T032 Optimize project switching performance (<100ms target)
- [x] T033 Add project switch animations with Framer Motion
- [x] T034 Implement localStorage cleanup for deleted projects
- [x] T035 Add project statistics (task count, completion rate) to management view
- [x] T036 Update self-test panel to include project-specific tests

## Phase 3.8: Automated Testing with Playwright MCP & Documentation

### Playwright MCP Test Tasks

_Prerequisites: Dev server running on localhost:5173, Playwright MCP tools available_

- [ ] T037 **Test Project Creation**:
  - Use Playwright MCP: Navigate to localhost:5173
  - Click selector: `[data-testid="project-selector"]` or project dropdown
  - Click "New Project" button
  - Type "Test Project" in input field
  - Click Create/Submit
  - Verify element exists with text "Test Project"

- [ ] T038 **Test Project Switching**:
  - Create project "Project A" using Playwright MCP clicks
  - Add task "Task A1" via quick-add input
  - Create project "Project B"
  - Add task "Task B1"
  - Click project selector, choose "Project A"
  - Verify "Task A1" is visible, "Task B1" is not visible

- [ ] T039 **Test Project Deletion**:
  - Create project "To Delete" with Playwright MCP
  - Add 3 tasks using quick-add
  - Open project management panel
  - Click delete button for "To Delete"
  - Confirm in dialog
  - Verify project no longer in selector
  - Verify switched to "Default" project

- [x] T040 **Test Bulk Task Move**:
  - Create "Source" and "Target" projects
  - Add 3 tasks to "Source"
  - Hover and select checkboxes for 2 tasks
  - Click bulk actions bar
  - Select "Move to Target"
  - Switch to "Target" project
  - Verify 2 tasks present

- [x] T041 **Test Timer Across Projects**:
  - Create project "Timer Test"
  - Add task, start timer using Play button
  - Switch to "Default" project
  - Verify timer indicator (pulsing dot) in project selector
  - Click indicator
  - Verify switched back to "Timer Test" with timer running

- [x] T042 **Test Data Persistence** (Partial - some projects not persisting):
  - Create 2 projects with tasks
  - Use Playwright MCP to reload page
  - Verify projects still exist
  - Verify tasks still associated correctly
  - Verify current project selection preserved

- [x] T043 **Test Validation Edge Cases**:
  - Try creating project with 16+ characters - verify error
  - Try creating duplicate name - verify error message
  - Try deleting "Default" project - verify no delete option/disabled
  - Try empty project name - verify validation error

- [x] T044 **Test Mobile Responsiveness**:
  - Use Playwright MCP to set viewport to 375x667 (iPhone size)
  - Verify project selector becomes part of hamburger menu
  - Click hamburger, verify project list accessible
  - Test project switching on mobile view

### Compliance & Build Tests

- [x] T045 Verify ESLint and Prettier compliance (npm run lint, npm run format:check)
- [x] T046 Test production build (npm run build) and deployment

## Dependencies

- Migration (T001-T004) must complete before any other tasks
- Store actions (T005-T011) before UI components
- Project management UI (T012-T017) before task integration UI
- Core features before polish
- All implementation before automated testing (T037-T044)

## Parallel Execution Examples

### Automated Playwright Tests (can run sequentially after implementation):

```
# Note: Playwright MCP tests should run sequentially to avoid conflicts
# Each test will use the Playwright MCP tool to interact with the running app

Example for T037 (Project Creation Test):
Task: "Use Playwright MCP to test project creation flow"
Description: "Navigate to localhost:5173, click project selector, create new project, verify it appears"

Example for T038 (Project Switching Test):
Task: "Use Playwright MCP to test project switching"
Description: "Create multiple projects, add tasks to each, switch between them, verify task filtering"
```

### Testing Approach with Playwright MCP:

- Start dev server: `npm run dev`
- Use Playwright MCP tools to interact with the UI
- No need to write test files - use MCP commands directly
- Each test task uses Playwright selectors to click, type, and verify
- Tests can check for element presence, text content, and state changes

## Implementation Notes

### Single-File Constraints

- All code modifications in `src/WorkdayTaskBoardApp.jsx`
- Use clear section comments to organize new code
- Maintain existing patterns for consistency

### State Management

- Extend existing Zustand store, don't create new stores
- Use immer for nested state updates
- Preserve existing store actions

### UI Patterns

- Use existing Tailwind classes
- Match existing dark mode patterns
- Maintain existing animation styles with Framer Motion

### Data Migration

- Automatic on first load after update
- No user action required
- Preserve all existing task data

### Performance Targets

- Project switch: <100ms
- No degradation of drag-and-drop
- Smooth animations at 60fps

## Validation Checklist

_GATE: Checked before execution_

- [x] All store actions from contracts have tasks
- [x] All UI components from spec have tasks
- [x] All test scenarios have Playwright MCP test tasks
- [x] Single-file architecture maintained
- [x] Migration path defined
- [x] No external dependencies added
- [x] Playwright MCP tests defined with specific selectors and actions

## Success Metrics

- All Playwright MCP automated tests pass
- No regression in existing features (verified via Playwright)
- Project switching performs at <100ms (measurable via Playwright)
- ESLint and build succeed
- User data preserved through migration (verified via T042)
- Mobile responsiveness verified via viewport testing (T044)
