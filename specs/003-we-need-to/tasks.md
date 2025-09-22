# Tasks: Enhanced Owner Management System

**Input**: Design documents from `/specs/003-we-need-to/`
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

## Path Convention

- **Single-file app**: All changes in `src/WorkdayTaskBoardApp.jsx`
- Tests via in-app self-tests and Playwright MCP
- This is a single-file React application - no separate test files

## Phase 3.1: Data Model & Storage Schema

- [ ] T001 Add ownerRegistry state to Zustand store in src/WorkdayTaskBoardApp.jsx (Set for owners, Map for statistics)
- [ ] T002 Implement validateOwnerName function in src/WorkdayTaskBoardApp.jsx (trim, max 30 chars, valid chars)
- [ ] T003 Create migrateToV1_1 function in src/WorkdayTaskBoardApp.jsx (scan tasks, build registry from existing owners)
- [ ] T004 Update loadFromStorage to call migration and initialize registry in src/WorkdayTaskBoardApp.jsx
- [ ] T005 Update saveToStorage to serialize ownerRegistry (Set→Array, Map→Object) in src/WorkdayTaskBoardApp.jsx

## Phase 3.2: Store Actions - Registry Management

- [ ] T006 Implement initializeOwnerRegistry action in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T007 Implement addOwnerToRegistry action in src/WorkdayTaskBoardApp.jsx (validate, add to Set, init statistics)
- [ ] T008 Implement removeOwnerFromRegistry action in src/WorkdayTaskBoardApp.jsx (remove from all tasks, update registry)
- [ ] T009 Implement updateOwnerStatistics action in src/WorkdayTaskBoardApp.jsx (scan tasks, count per owner)
- [ ] T010 Implement unassignOwnerFromAllTasks helper in src/WorkdayTaskBoardApp.jsx

## Phase 3.3: Store Actions - Queries & Operations

- [ ] T011 Implement getOwnerSuggestions computed value in src/WorkdayTaskBoardApp.jsx (partial match, sort by usage)
- [ ] T012 Implement getAllOwnersWithStats computed value in src/WorkdayTaskBoardApp.jsx
- [ ] T013 Implement bulkAssignOwner action in src/WorkdayTaskBoardApp.jsx (add owner to multiple tasks, respect 5 limit)
- [ ] T014 Update existing addOwnerToTask to add to registry if new in src/WorkdayTaskBoardApp.jsx
- [ ] T015 Update existing removeOwnerFromTask to update statistics in src/WorkdayTaskBoardApp.jsx

## Phase 3.4: UI Components - Owner Selection

- [ ] T016 Create OwnerCombobox component in src/WorkdayTaskBoardApp.jsx (text input with dropdown suggestions)
- [ ] T017 Implement autocomplete logic in OwnerCombobox (debounce, filter, sort) in src/WorkdayTaskBoardApp.jsx
- [ ] T018 Add keyboard navigation to OwnerCombobox (arrow keys, enter, escape) in src/WorkdayTaskBoardApp.jsx
- [ ] T019 Add ARIA attributes for accessibility (role="combobox", aria-autocomplete) in src/WorkdayTaskBoardApp.jsx
- [ ] T020 Style OwnerCombobox with Tailwind classes matching existing patterns in src/WorkdayTaskBoardApp.jsx

## Phase 3.5: UI Components - Owner Management Panel

- [ ] T021 Create OwnerManagerPanel component in src/WorkdayTaskBoardApp.jsx (collapsible section in settings)
- [ ] T022 Display owner list with task counts and last used in OwnerManagerPanel in src/WorkdayTaskBoardApp.jsx
- [ ] T023 Add remove owner button with confirmation dialog in src/WorkdayTaskBoardApp.jsx
- [ ] T024 Add search/filter for owners in management panel in src/WorkdayTaskBoardApp.jsx
- [ ] T025 Add "No owners yet" empty state in src/WorkdayTaskBoardApp.jsx

## Phase 3.6: UI Integration - Task Edit Drawer

- [ ] T026 Replace existing owner input with OwnerCombobox in task edit drawer in src/WorkdayTaskBoardApp.jsx
- [ ] T027 Show owner count limit (X/5 owners) in UI in src/WorkdayTaskBoardApp.jsx
- [ ] T028 Disable add when 5 owners reached with error message in src/WorkdayTaskBoardApp.jsx
- [ ] T029 Update owner badges to show consistent styling in src/WorkdayTaskBoardApp.jsx

## Phase 3.7: Bulk Operations UI

- [ ] T030 Add bulk owner assignment UI when multiple tasks selected in src/WorkdayTaskBoardApp.jsx
- [ ] T031 Create BulkAssignDialog component with owner selection in src/WorkdayTaskBoardApp.jsx
- [ ] T032 Show success/failure counts after bulk operation in src/WorkdayTaskBoardApp.jsx
- [ ] T033 Add bulk action to toolbar when tasks selected in src/WorkdayTaskBoardApp.jsx

## Phase 3.8: Filter Integration

- [ ] T034 Update owner filter dropdown to use registry data in src/WorkdayTaskBoardApp.jsx
- [ ] T035 Sort filter options by task count in src/WorkdayTaskBoardApp.jsx
- [ ] T036 Show task count next to each owner in filter in src/WorkdayTaskBoardApp.jsx

## Phase 3.9: Quick-Add Integration

- [ ] T037 Ensure parseQuickAdd @owner tokens add to registry in src/WorkdayTaskBoardApp.jsx
- [ ] T038 Validate owner names from quick-add before adding in src/WorkdayTaskBoardApp.jsx

## Phase 3.10: Settings Integration

- [ ] T039 Add "Owner Management" section to settings/menu in src/WorkdayTaskBoardApp.jsx
- [ ] T040 Integrate OwnerManagerPanel into settings UI in src/WorkdayTaskBoardApp.jsx

## Phase 3.11: Self-Tests

- [ ] T041 Add self-test for owner registry initialization in src/WorkdayTaskBoardApp.jsx
- [ ] T042 Add self-test for owner persistence across reload in src/WorkdayTaskBoardApp.jsx
- [ ] T043 Add self-test for migration from v1 to v1.1 in src/WorkdayTaskBoardApp.jsx
- [ ] T044 Add self-test for owner validation rules in src/WorkdayTaskBoardApp.jsx
- [ ] T045 Add self-test for 5 owner limit enforcement in src/WorkdayTaskBoardApp.jsx

## Phase 3.12: Testing with Playwright MCP Tools

**Note**: Use Playwright MCP tools (browser_navigate, browser_click, browser_type, browser_snapshot, etc.) to test functionality directly. DO NOT create separate test files.

- [ ] T046 [P] Test owner registry initialization and persistence using Playwright MCP:
  - Navigate to app, check localStorage for ownerRegistry
  - Refresh page and verify registry persists
  - Use browser_evaluate to inspect localStorage structure

- [ ] T047 [P] Test autocomplete functionality using Playwright MCP:
  - Type partial owner name in owner field
  - Verify suggestions appear with browser_snapshot
  - Click suggestion and verify owner added

- [ ] T048 [P] Test bulk owner assignment using Playwright MCP:
  - Select multiple tasks with browser_click
  - Use bulk assign action
  - Verify owner added to all selected tasks

- [ ] T049 [P] Test owner removal with task updates using Playwright MCP:
  - Remove owner from registry
  - Verify owner removed from all assigned tasks
  - Check tasks still exist without that owner

- [ ] T050 [P] Test owner filtering using Playwright MCP:
  - Select owner from filter dropdown
  - Verify only tasks with that owner are visible
  - Clear filter and verify all tasks return

- [ ] T051 [P] Test quick-add @owner token integration using Playwright MCP:
  - Type "@alice @bob Fix bug #test !p1" in quick-add
  - Submit and verify task has owners ["alice", "bob"]
  - Verify owners added to registry

- [ ] T052 [P] Test 5 owner limit validation using Playwright MCP:
  - Add 5 owners to a task
  - Try to add 6th owner
  - Verify error message and addition blocked

## Phase 3.13: Polish & Cleanup

- [ ] T053 Add loading states for async operations in src/WorkdayTaskBoardApp.jsx
- [ ] T054 Add error boundaries around new components in src/WorkdayTaskBoardApp.jsx
- [ ] T055 Optimize re-renders with React.memo where appropriate in src/WorkdayTaskBoardApp.jsx
- [ ] T056 Run npm run lint and fix any issues
- [ ] T057 Run npm run format to ensure consistent formatting
- [ ] T058 Update CHANGELOG.md with feature details
- [ ] T059 Verify npm run build completes successfully
- [ ] T060 Manual testing following quickstart.md checklist

## Dependencies

- Data model (T001-T005) must complete first (foundation)
- Store actions (T006-T015) depend on data model
- UI components (T016-T025) can start after store actions defined
- Integration tasks (T026-T040) require both store and UI
- Self-tests (T041-T045) after implementation
- Playwright tests (T046-T052) can run in parallel after implementation
- Polish (T053-T060) at the end

## Parallel Execution Examples

Since this is a single-file application, most tasks modify the same file and must be sequential. However, Playwright MCP testing tasks can run in parallel:

```
# Launch T046-T052 together (all Playwright MCP testing):
Task: "Test owner registry initialization and persistence using Playwright MCP tools"
Task: "Test autocomplete functionality using Playwright MCP tools"
Task: "Test bulk owner assignment using Playwright MCP tools"
Task: "Test owner removal with task updates using Playwright MCP tools"
Task: "Test owner filtering using Playwright MCP tools"
Task: "Test quick-add @owner token integration using Playwright MCP tools"
Task: "Test 5 owner limit validation using Playwright MCP tools"
```

These testing tasks use Playwright MCP tools like:

- browser_navigate() to load the app
- browser_click() to interact with UI elements
- browser_type() to enter text
- browser_snapshot() to verify UI state
- browser_evaluate() to check localStorage
- browser_wait_for() to handle async operations

## Implementation Notes

- All changes in single file: `src/WorkdayTaskBoardApp.jsx`
- Maintain existing patterns from codebase
- Use inline Tailwind classes for styling
- Preserve existing functionality (no breaking changes)
- Test each phase before moving to next
- Use Playwright MCP tools for E2E testing (NOT separate test files)
  - browser_navigate, browser_click, browser_type for interactions
  - browser_snapshot for UI verification
  - browser_evaluate for localStorage inspection
  - No need to write .test.js or .spec.js files
- Commit after completing each phase

## Task Generation Rules Applied

1. **From Data Model**:
   - OwnerRegistry entity → T001 (state), T003 (migration)
   - Validation rules → T002 (validateOwnerName)
   - Storage schema → T004-T005 (load/save)

2. **From Contracts**:
   - Each store action → T006-T015 (one task per action)
   - Component contracts → T016-T025 (UI components)
   - Validation contracts → T028, T038, T044

3. **From Quickstart Test Scenarios**:
   - Registry initialization → T041, T046
   - Autocomplete → T017, T047
   - Bulk operations → T031-T033, T048
   - Data persistence → T042, T046
   - Owner filtering → T034-T036, T050

4. **From Research Decisions**:
   - Combobox pattern → T016-T020
   - Settings panel → T021-T025, T039-T040
   - Performance optimization → T055

## Validation Checklist

_Verified during task generation_

- [x] All contracts have corresponding implementation tasks
- [x] All entities have model/state tasks
- [x] Data model comes before implementation
- [x] Single-file constraint respected throughout
- [x] Each task specifies exact component/function
- [x] Playwright tests marked [P] for parallelism
- [x] All quickstart scenarios covered in tests

## Total Tasks: 60

Estimated completion time: 8-10 hours for experienced React developer familiar with the codebase
