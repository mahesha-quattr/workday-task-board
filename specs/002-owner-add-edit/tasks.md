# Tasks: Owner Add-Edit-Remove

**Input**: Design documents from `/specs/002-owner-add-edit/`
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
- Tests and validation via manual QA (no test runner)
- This is a single-file React application

## Phase 3.1: Data Model & Migration

- [ ] T001 Add owners array field to task model in src/WorkdayTaskBoardApp.jsx (extend task interface)
- [ ] T002 Implement migrateOwnerField function in src/WorkdayTaskBoardApp.jsx (owner → owners migration)
- [ ] T003 Add migration call to store initialization in src/WorkdayTaskBoardApp.jsx (run on load)

## Phase 3.2: Store Actions

- [ ] T004 Implement addOwnerToTask action in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T005 Implement removeOwnerFromTask action in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T006 Implement transferTaskOwnership action in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T007 Implement clearTaskOwners action in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T008 Add owner validation helper functions in src/WorkdayTaskBoardApp.jsx (trim, duplicate check, max length)

## Phase 3.3: Computed Values & Filters

- [ ] T009 Implement getTasksByOwner computed value in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T010 Implement getUniqueOwners computed value in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T011 Implement getUnownedTasks computed value in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T012 Add ownerFilter state and setOwnerFilter action in src/WorkdayTaskBoardApp.jsx Zustand store
- [ ] T013 Update task filtering logic to include owner filter in src/WorkdayTaskBoardApp.jsx

## Phase 3.4: UI Components - Display

- [ ] T014 Create OwnerBadge component in src/WorkdayTaskBoardApp.jsx (single owner display)
- [ ] T015 Create OwnersList component in src/WorkdayTaskBoardApp.jsx (multiple owners with overflow)
- [ ] T016 Add owners display to TaskCard component in src/WorkdayTaskBoardApp.jsx
- [ ] T017 Update task card layout to accommodate owner badges in src/WorkdayTaskBoardApp.jsx

## Phase 3.5: UI Components - Editing

- [ ] T018 Create OwnerInput component in src/WorkdayTaskBoardApp.jsx (text input with validation)
- [ ] T019 Create OwnerEditor component in src/WorkdayTaskBoardApp.jsx (add/remove UI)
- [ ] T020 Add owner editing to task edit mode in src/WorkdayTaskBoardApp.jsx
- [ ] T021 Implement transfer ownership UI in task edit mode in src/WorkdayTaskBoardApp.jsx

## Phase 3.6: Filter UI

- [ ] T022 Add owner filter dropdown to filter bar in src/WorkdayTaskBoardApp.jsx
- [ ] T023 Populate owner filter with unique owners list in src/WorkdayTaskBoardApp.jsx
- [ ] T024 Connect owner filter to store filter state in src/WorkdayTaskBoardApp.jsx

## Phase 3.7: Quick-Add Integration

- [ ] T025 Add @owner token regex pattern in src/WorkdayTaskBoardApp.jsx parseQuickAdd
- [ ] T026 Extract and parse @owner tokens in src/WorkdayTaskBoardApp.jsx parseQuickAdd
- [ ] T027 Apply parsed owners to new task creation in src/WorkdayTaskBoardApp.jsx

## Phase 3.8: View Modes

- [ ] T028 Ensure owners display correctly in board view in src/WorkdayTaskBoardApp.jsx
- [ ] T029 Ensure owners display correctly in backlog view in src/WorkdayTaskBoardApp.jsx
- [ ] T030 Verify owner badges don't interfere with drag-drop in src/WorkdayTaskBoardApp.jsx

## Phase 3.9: Automated Testing with Playwright MCP

- [ ] T031 [P] Test basic owner operations with Playwright:
  - Navigate to app, create task
  - Add single owner "Alice" via edit mode
  - Add second owner "Bob"
  - Remove "Alice", verify only "Bob" remains
  - Use browser_snapshot to verify UI state

- [ ] T032 [P] Test transfer ownership functionality with Playwright:
  - Create task with multiple owners
  - Use transfer ownership to single new owner
  - Verify all previous owners removed
  - Confirm new owner is sole owner

- [ ] T033 [P] Test quick-add @owner token parsing with Playwright:
  - Type "@alice @bob Fix bug #frontend !p1" in quick-add
  - Submit and verify task created with owners ["alice", "bob"]
  - Verify other tokens also parsed correctly

- [ ] T034 [P] Test owner filtering with Playwright:
  - Create tasks with different owners
  - Apply owner filter via dropdown
  - Verify only matching tasks displayed
  - Clear filter, verify all tasks visible

- [ ] T035 [P] Test edge cases with Playwright:
  - Try adding duplicate owner (should prevent)
  - Try adding empty/whitespace owner (should reject)
  - Test maximum owners limit (20)
  - Remove last owner (task should exist without owners)

- [ ] T036 [P] Test data persistence with Playwright:
  - Add owners to tasks
  - Use browser_evaluate to check localStorage
  - Refresh page with browser_navigate
  - Verify owners persist after refresh

- [ ] T037 [P] Test UI interactions with Playwright:
  - Verify owner badges display on task cards
  - Check "+N more" overflow for >3 owners
  - Test drag-drop doesn't break with owner badges
  - Verify owner editing in both board and backlog views

## Phase 3.10: Polish & Cleanup

- [ ] T038 Add owner-related keyboard shortcuts in src/WorkdayTaskBoardApp.jsx
- [ ] T039 Update in-app self-test panel with owner tests in src/WorkdayTaskBoardApp.jsx
- [ ] T040 Run npm run lint and fix any issues
- [ ] T041 Run npm run format to ensure consistent formatting
- [ ] T042 Verify npm run build completes successfully

## Dependencies

- Data model (T001-T003) must complete first (foundation)
- Store actions (T004-T008) depend on data model
- Computed values (T009-T013) depend on store actions
- UI display (T014-T017) depends on computed values
- UI editing (T018-T021) depends on store actions
- Filter UI (T022-T024) depends on computed values
- Quick-add (T025-T027) depends on store actions
- View modes (T028-T030) depend on UI components
- Testing (T031-T037) after all implementation
- Polish (T038-T042) at the end

## Parallel Execution Examples

Since this is a single-file application, most tasks modify the same file and cannot run in parallel. However, the Playwright automated tests can run concurrently as they don't modify code:

```
# Launch T031-T037 together (Playwright automated testing):
Task: "Test basic owner operations with Playwright (add single, add multiple, remove owner)"
Task: "Test transfer ownership functionality with Playwright (replace all owners)"
Task: "Test quick-add @owner token parsing with Playwright"
Task: "Test owner filtering with Playwright (filter by owner, clear filter)"
Task: "Test edge cases with Playwright (duplicate prevention, empty owner, max owners)"
Task: "Test data persistence with Playwright (localStorage, page refresh)"
Task: "Test UI interactions with Playwright (owner badges, overflow display, edit mode)"
```

## Implementation Notes

- All changes in single file: `src/WorkdayTaskBoardApp.jsx`
- Maintain existing patterns from codebase
- Use inline Tailwind classes for styling
- Preserve existing functionality (no breaking changes)
- Test each phase before moving to next
- Use Playwright MCP tools for automated testing (T031-T037)
- Playwright tests can run in parallel as they don't modify code
- Commit after completing each phase

## Task Generation Rules Applied

1. **From Contracts**:
   - Store actions contract → T004-T008 (store actions)
   - Computed values → T009-T011 (getters)
   - Filter contract → T012-T013 (filtering)

2. **From Data Model**:
   - Task entity extension → T001 (add owners field)
   - Migration strategy → T002-T003 (migration logic)
   - Validation rules → T008 (validation helpers)

3. **From User Stories**:
   - Add/remove owners → T018-T021 (editing UI)
   - Filter by owner → T022-T024 (filter UI)
   - Quick-add @owner → T025-T027 (token parsing)

4. **From Quickstart**:
   - Each checklist section → T031-T034 (manual testing)
   - Performance criteria → T036
   - Accessibility → T037

## Validation Checklist

_Verified during task generation_

- [x] All contracts have corresponding implementation tasks
- [x] All entities have model tasks
- [x] Data model comes before implementation
- [x] Single-file constraint respected
- [x] Each task specifies exact component/function
- [x] Testing tasks separated for potential parallelism
- [x] All quickstart scenarios covered

## Total Tasks: 42

Estimated completion time: 4-6 hours for experienced developer familiar with the codebase.
