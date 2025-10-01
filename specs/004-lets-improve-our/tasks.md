# Tasks: UI/UX Improvements for Task Management

**Feature**: 004-lets-improve-our
**Input**: Design documents from `/specs/004-lets-improve-our/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅
**Target File**: `src/WorkdayTaskBoardApp.jsx` (single-file architecture)

## Execution Flow Summary

This feature implements 5 UI/UX improvements in a single-file React application:
1. Token help tooltip (collapsible)
2. Priority color coding (P0/P1/P2/P3)
3. Empty column state messages
4. Always-visible action icons
5. Autocomplete with token preview

All work happens in one file (`src/WorkdayTaskBoardApp.jsx`), so tasks are sequential within component groups but can be parallelized across independent component creation phases.

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (independent components, no file conflicts)
- All paths relative to repository root
- File: `src/WorkdayTaskBoardApp.jsx` (unless specified otherwise)

---

## Phase 3.1: Setup & Preparation

- [x] **T001** Verify development environment and dependencies
  - Run `npm install` to ensure all dependencies current
  - Verify React 18, Zustand, Framer Motion, Tailwind CSS, date-fns available
  - Confirm `npm run dev` starts server successfully
  - Confirm `npm run lint` and `npm run build` pass with current codebase

- [x] **T002** Create feature branch and initialize tracking
  - Ensure on branch `004-lets-improve-our` ✓
  - Create backup/snapshot of `src/WorkdayTaskBoardApp.jsx` for rollback if needed ✓
  - Document current file LOC count (baseline: 4571 LOC) ✓

- [x] **T003** Read and understand existing codebase structure
  - Read `src/WorkdayTaskBoardApp.jsx` to understand:
    - Zustand store structure and actions
    - Existing component hierarchy (TaskCard, Column, QuickAddInput, etc.)
    - Current token parsing logic
    - Drag-and-drop implementation
    - Tailwind class patterns used
  - Document insertion points for new components

---

## Phase 3.2: Component Creation (Parallel - Independent Components)

**IMPORTANT**: These components are defined inline in `src/WorkdayTaskBoardApp.jsx`. Each task adds a new component function to the file. Components can be created in parallel conceptually, but must be committed sequentially to avoid merge conflicts.

- [x] **T004** [P-GROUP-A] Create TokenHelpTooltip component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Location**: Add component definition after imports, before main App component
  - **Requirements** (FR-001 to FR-005):
    - Accepts props: `visible` (boolean), `onDismiss` (function)
    - Renders token syntax documentation when visible
    - Displays help content in a positioned tooltip/popover
    - Includes close button or click-outside handler
    - Auto-dismiss when user starts typing (implement via parent)
  - **Styling**: Tailwind classes, dark mode compatible
  - **Content**: All token syntax from research.md (# @ ! + due: impact: urgency: effort: expect:)
  - **Accessibility**: Focus trap, Escape key support, ARIA labels

- [x] **T005** [P-GROUP-A] Create PriorityBadge component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Location**: Add component definition in components section
  - **Requirements** (FR-006 to FR-012):
    - Accepts props: `priority` ('P0'|'P1'|'P2'|'P3'), `className` (optional)
    - Returns Tailwind border/background classes for priority
    - Use `useMemo` for color lookup performance
    - Color mapping from research.md:
      - P0: `border-red-500 dark:border-red-400`
      - P1: `border-orange-500 dark:border-orange-400`
      - P2: `border-yellow-500 dark:border-yellow-400`
      - P3: `border-gray-600 dark:border-gray-500`
  - **Accessibility**: WCAG AA contrast in both light/dark modes

- [x] **T006** [P-GROUP-A] Create EmptyColumnState component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Location**: Add component definition in components section
  - **Requirements** (FR-013 to FR-019):
    - Accepts props: `columnName` (string)
    - Returns contextual empty state message with emoji
    - Message map from research.md:
      - Backlog: "Add your ideas here 💡"
      - Ready: "Tasks ready for work will appear here ✅"
      - In Progress: "Start working on a task 🚀"
      - Waiting on AI: "Delegate to AI agents 🤖"
      - Waiting on Others: "No blockers yet 👍"
      - Blocked: "Nothing blocked right now 🎉"
      - In Review: "Ready for PR review 👀"
      - Done: "Ready to ship! 🎯"
  - **Styling**: Centered text, subtle opacity, responsive
  - **Component**: Use React.memo for performance

- [x] **T007** [P-GROUP-A] Create TaskActionIcons component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Location**: Add component definition in components section
  - **Requirements** (FR-020 to FR-026):
    - Accepts props: `onMoveLeft`, `onMoveRight`, `onStartTimer`, `showMoveLeft`, `showMoveRight`, `className`
    - Renders always-visible action icons:
      - Drag handle: ⋮⋮ (always visible, no onClick)
      - Move left: ← (conditional on `showMoveLeft`)
      - Move right: → (conditional on `showMoveRight`)
      - Timer: ▶ (always visible for timer start)
      - Menu: ⋯ (always visible for future quick actions)
    - Unicode characters styled with Tailwind
    - Touch-friendly sizing (min 44x44px tap targets)
    - Hover states for emphasis
  - **Accessibility**: ARIA labels for icon-only buttons, keyboard accessible

- [x] **T008** [P-GROUP-A] Create AutocompleteInput component base structure
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Location**: Add component definition in components section
  - **Requirements** (FR-027 to FR-036):
    - Accepts props: `value`, `onChange`, `onSubmit`, `owners`, `projects`, `tags`
    - State management:
      - `inputFocused` (boolean)
      - `autocomplete` ({ visible, type, query, suggestions, selectedIndex })
    - Render input field with focus styles (ring, border, expand)
    - Detect trigger characters (@, #, +) in input value
    - Extract partial query after trigger
    - Filter suggestions based on query
    - Render dropdown below input when autocomplete.visible
    - Keyboard navigation: Arrow keys, Enter, Escape
    - Allow free-text entry when no matches
  - **Debouncing**: 100ms debounce for autocomplete filtering
  - **Note**: Token preview will be added in T009

- [ ] **T009** Add token preview badges to AutocompleteInput
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Location**: Enhance AutocompleteInput component created in T008
  - **Requirements** (FR-027, FR-035):
    - Parse input value to detect recognized tokens
    - Reuse existing token parsing logic from Zustand store
    - Split input into text segments and token segments
    - Render tokens as inline badges/pills
    - Badge styling: Different colors for #project, @owner, +tag
    - Real-time updates (50ms debounce for parsing)
    - Performance: `useMemo` for token parsing result
  - **Implementation approach**: Controlled input OR contentEditable with overlay badges

---

## Phase 3.3: Component Integration (Sequential - Same File)

**IMPORTANT**: These tasks modify existing components in the same file. Must be done sequentially.

- [x] **T010** Integrate PriorityBadge into TaskCard component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: Existing `TaskCard` component
  - **Requirements**:
    - Import/use PriorityBadge component's color classes
    - Apply priority border classes to task card container
    - Ensure classes apply in both Board and Backlog views
    - Test with tasks of different priorities (P0, P1, P2, P3)
    - Verify no visual conflict with existing styles
  - **Performance**: Ensure `useMemo` is used for priority color lookup

- [ ] **T011** Integrate TaskActionIcons into TaskCard component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: Existing `TaskCard` component
  - **Requirements**:
    - Add TaskActionIcons component to card layout
    - Wire up existing move left/right handlers
    - Wire up existing timer start handler
    - Set `showMoveLeft`/`showMoveRight` based on column position
    - Position icons consistently (e.g., top-right or bottom of card)
    - Ensure icons don't interfere with drag-and-drop
    - Verify icons visible without hover
  - **Testing**: Test in Board and Backlog views

- [x] **T012** Integrate EmptyColumnState into Column component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: Existing `Column` component (Board view)
  - **Requirements**:
    - Add conditional rendering: if `tasks.length === 0`, render EmptyColumnState
    - Pass column name to EmptyColumnState
    - Replace existing "No tasks" text
    - Ensure empty state appears in all 8 columns when empty
    - Test by clearing each column and verifying message
  - **Styling**: Ensure message is vertically centered in column

- [x] **T013** Integrate EmptyColumnState into BacklogView component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: Existing `BacklogView` component (list view)
  - **Requirements**:
    - Add same conditional rendering logic as T012
    - Ensure empty states appear in Backlog view when columns are empty
    - Verify messages match Board view messages

- [ ] **T014** Replace QuickAddInput with AutocompleteInput component
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: Existing `QuickAddInput` or main input area
  - **Requirements**:
    - Replace existing input component with AutocompleteInput
    - Wire up to existing Zustand store actions for task creation
    - Pass owners, projects, tags from store to component
    - Ensure existing token parsing logic remains functional
    - Add Enter key submission handler (FR-033, FR-034)
    - Verify autocomplete appears on @, #, + triggers
    - Verify token preview badges render in real-time
    - Test free-text entry when no matches
  - **Migration**: Preserve all existing quick-add functionality

- [x] **T015** Add TokenHelpTooltip to main app header
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: Main app component header area
  - **Requirements**:
    - Add "?" help icon button next to task input field
    - Add React state hook for tooltip visibility
    - Render TokenHelpTooltip with `visible` state
    - Implement dismiss handler (sets visible = false)
    - Implement auto-dismiss when input receives typing
    - Hide existing inline token syntax text (previously always visible)
    - Position tooltip to not cover input field
  - **Accessibility**: Focus management, Escape key support

---

## Phase 3.4: Performance Optimization (Parallel - Different Concerns)

- [ ] **T016** [P-GROUP-B] Add memoization for priority color lookups
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: PriorityBadge component and TaskCard rendering
  - **Requirements**:
    - Verify `useMemo` is used for getPriorityColorClass
    - Add memoization if missing
    - Ensure TaskCard uses React.memo with shallow comparison
    - Test that changing one task priority doesn't re-render all cards
  - **Performance target**: Priority color lookup <100ms

- [ ] **T017** [P-GROUP-B] Add debouncing for autocomplete filtering
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: AutocompleteInput component
  - **Requirements**:
    - Add 100ms debounce to autocomplete suggestion filtering
    - Use setTimeout or React hook (useDeferredValue, useTransition)
    - Ensure rapid typing doesn't cause performance degradation
    - Test typing quickly through `@@@###+++`
  - **Performance target**: Autocomplete response <100ms

- [ ] **T018** [P-GROUP-B] Add debouncing for token preview parsing
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: AutocompleteInput token preview logic
  - **Requirements**:
    - Add 50ms debounce to token parsing
    - Prevent re-parsing on every keystroke
    - Ensure badge rendering feels instant but doesn't lag
    - Test with long inputs (10+ tokens)
  - **Performance target**: Token parsing <50ms

- [ ] **T019** [P-GROUP-B] Optimize EmptyColumnState with React.memo
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Target**: EmptyColumnState component
  - **Requirements**:
    - Wrap component with React.memo
    - Ensure component doesn't re-render when sibling columns change
    - Test by adding/removing tasks from adjacent columns

---

## Phase 3.5: Testing & Validation (Using Chrome MCP)

- [ ] **T020** Automated E2E test: Token Help Tooltip
  - **Tool**: Chrome DevTools MCP (`mcp__chrome-devtools__*`)
  - **Test file**: Create test script or manual validation via MCP
  - **Requirements**:
    - Navigate to http://localhost:5173
    - Verify help icon exists (`take_snapshot`, check for icon)
    - Click help icon (`click`)
    - Verify tooltip appears (`take_snapshot`, check content visible)
    - Type in input (`type`)
    - Verify tooltip auto-dismisses
    - Verify Escape key dismisses tooltip
  - **Reference**: quickstart.md Scenario 1

- [ ] **T021** Automated E2E test: Priority Colors
  - **Tool**: Chrome DevTools MCP
  - **Requirements**:
    - Create 4 tasks with different priorities (!p0, !p1, !p2, !p3)
    - Use `take_snapshot` to capture board
    - Use `evaluate_script` to verify border color classes on task cards
    - Verify P0/P1 have red/orange borders
    - Verify P2 has yellow border
    - Verify P3 has gray border
    - Test in both light and dark mode
  - **Reference**: quickstart.md Scenario 2

- [ ] **T022** Automated E2E test: Action Icons Visibility
  - **Tool**: Chrome DevTools MCP
  - **Requirements**:
    - Navigate to board with task cards
    - Use `take_snapshot` without hovering
    - Use `evaluate_script` to verify icons are rendered and visible
    - Check for ⋮⋮, ←, →, ▶, ⋯ icons
    - Verify icons have proper ARIA labels
    - Test clicking icons works (`click`)
  - **Reference**: quickstart.md Scenario 4

- [ ] **T023** Automated E2E test: Autocomplete & Token Preview
  - **Tool**: Chrome DevTools MCP
  - **Requirements**:
    - Click input field (`click`)
    - Type `@` (`type`)
    - Verify autocomplete dropdown appears (`take_snapshot`)
    - Type partial owner name (`type`)
    - Verify filtered suggestions
    - Press Enter to select (`press_key`)
    - Verify badge appears
    - Type `#project @owner +tag`
    - Verify all badges render in real-time
    - Press Enter to submit
    - Verify task created
  - **Reference**: quickstart.md Scenario 5

- [ ] **T024** Performance profiling via Chrome MCP
  - **Tool**: Chrome DevTools MCP Performance API
  - **Requirements**:
    - Use `performance_start_trace` (reload=false, autoStop=false)
    - Interact with all 5 features:
      - Open/close token help
      - Render priority colors across board
      - Trigger autocomplete multiple times
      - Type tokens and watch preview
    - Use `performance_stop_trace`
    - Analyze trace for:
      - Frame drops (should maintain 60fps)
      - Autocomplete latency (<100ms)
      - Token parsing latency (<50ms)
      - Priority color rendering (<100ms)
  - **Reference**: quickstart.md Performance Validation

- [ ] **T025** Manual testing: Empty column states
  - **Type**: Manual QA (visual UX quality)
  - **Requirements**:
    - Clear all tasks from each of the 8 columns one by one
    - Verify each column shows correct contextual message:
      - Backlog: "Add your ideas here 💡"
      - Ready: "Tasks ready for work will appear here ✅"
      - In Progress: "Start working on a task 🚀"
      - Waiting on AI: "Delegate to AI agents 🤖"
      - Waiting on Others: "No blockers yet 👍"
      - Blocked: "Nothing blocked right now 🎉"
      - In Review: "Ready for PR review 👀"
      - Done: "Ready to ship! 🎯"
    - Verify messages are readable and well-positioned
    - Verify no text overflow
  - **Reference**: quickstart.md Scenario 3

- [ ] **T026** Accessibility audit
  - **Tool**: Chrome MCP + Manual testing
  - **Requirements**:
    - Keyboard navigation:
      - Tab through all interactive elements
      - Focus indicators visible
      - Help icon accessible via keyboard
      - Autocomplete navigable with arrows
      - Enter key works for selection and submission
      - Escape key dismisses tooltips and dropdowns
    - Screen reader testing (VoiceOver/NVDA):
      - Action icons have descriptive ARIA labels
      - Autocomplete announces result count
      - Empty states are readable
      - Token badges are announced
    - Color contrast (WCAG AA):
      - All priority colors meet 3:1 contrast minimum
      - Test in both light and dark modes
  - **Reference**: quickstart.md Accessibility Validation

- [ ] **T027** Cross-browser manual testing
  - **Type**: Manual QA
  - **Browsers**: Firefox, Safari (Chrome tested via MCP)
  - **Requirements**:
    - Test all 5 features in Firefox
    - Test all 5 features in Safari
    - Verify no visual regressions
    - Verify all interactions work (click, type, keyboard nav)
    - Document any browser-specific issues

---

## Phase 3.6: Final Validation & Polish

- [ ] **T028** Execute full quickstart.md acceptance test suite
  - **Type**: Manual walkthrough
  - **Requirements**:
    - Run through all 5 test scenarios in quickstart.md
    - Check all acceptance criteria checkboxes
    - Document any failures
    - Verify integration tests pass
    - Verify edge cases handled
  - **Reference**: Full quickstart.md document

- [ ] **T029** Verify constitutional compliance
  - **Requirements**:
    - Verify all changes in single file (`src/WorkdayTaskBoardApp.jsx`)
    - Verify no new files created (constitutional requirement I)
    - Verify no Zustand store schema changes (constitutional requirement II)
    - Verify performance benchmarks met (constitutional requirement III):
      - <100ms UI response ✓
      - 60fps drag-and-drop maintained ✓
      - <50ms autocomplete ✓
    - Run `npm run lint` - must pass (constitutional requirement IV)
    - Run `npm run build` - must succeed (constitutional requirement IV)
    - Verify all 8 columns preserved (constitutional requirement V)
    - Verify all existing features work (timer, drag-drop, quick-add)

- [ ] **T030** Code cleanup and documentation
  - **File**: `src/WorkdayTaskBoardApp.jsx`
  - **Requirements**:
    - Add inline comments explaining new components
    - Document token help content source
    - Document priority color mapping
    - Document empty state message strategy
    - Remove any console.logs or debug code
    - Ensure consistent code style (Prettier)
    - Verify no ESLint warnings

- [ ] **T031** Update CLAUDE.md with implementation notes
  - **File**: `CLAUDE.md`
  - **Requirements**:
    - Document new components added
    - Document performance optimizations (memoization, debouncing)
    - Update "Current Development" section to mark feature complete
    - Add notes about token help tooltip pattern
    - Add notes about autocomplete implementation

- [ ] **T032** Final build and deployment validation
  - **Requirements**:
    - Run `npm run format` to format code
    - Run `npm run lint` - must pass with zero errors
    - Run `npm run build` - must complete successfully
    - Test production build locally
    - Verify GitHub Pages deployment will work (no asset path issues)
    - Document final file size: `src/WorkdayTaskBoardApp.jsx` LOC count

---

## Dependencies

### Critical Path
```
T001-T003 (Setup)
  ↓
T004-T009 (Component Creation - can be parallel conceptually, sequential in practice)
  ↓
T010-T015 (Integration - must be sequential, same file)
  ↓
T016-T019 (Performance - can be parallel)
  ↓
T020-T027 (Testing - mostly parallel except manual tests)
  ↓
T028-T032 (Final validation - sequential)
```

### Blocking Dependencies
- T010 requires T005 (PriorityBadge must exist)
- T011 requires T007 (TaskActionIcons must exist)
- T012, T013 require T006 (EmptyColumnState must exist)
- T014 requires T008, T009 (AutocompleteInput complete)
- T015 requires T004 (TokenHelpTooltip must exist)
- T016-T019 require T010-T015 (components integrated)
- T020-T027 require T016-T019 (implementation complete)
- T028-T032 require T020-T027 (testing complete)

---

## Parallel Execution Examples

### Group A: Component Creation (Conceptually Parallel)
```
# NOTE: In practice, must commit sequentially to avoid merge conflicts
# But components are independent and can be designed/written in parallel

Task: "Create TokenHelpTooltip component in src/WorkdayTaskBoardApp.jsx"
Task: "Create PriorityBadge component in src/WorkdayTaskBoardApp.jsx"
Task: "Create EmptyColumnState component in src/WorkdayTaskBoardApp.jsx"
Task: "Create TaskActionIcons component in src/WorkdayTaskBoardApp.jsx"
Task: "Create AutocompleteInput base in src/WorkdayTaskBoardApp.jsx"
```

### Group B: Performance Optimization (Truly Parallel)
```
Task: "Add memoization for priority lookups in src/WorkdayTaskBoardApp.jsx"
Task: "Add debouncing for autocomplete in src/WorkdayTaskBoardApp.jsx"
Task: "Add debouncing for token parsing in src/WorkdayTaskBoardApp.jsx"
Task: "Optimize EmptyColumnState with React.memo in src/WorkdayTaskBoardApp.jsx"
```

### Group C: Automated Testing (Parallel)
```
Task: "E2E test token help via Chrome MCP"
Task: "E2E test priority colors via Chrome MCP"
Task: "E2E test action icons via Chrome MCP"
Task: "E2E test autocomplete via Chrome MCP"
```

---

## Notes

- **Single-file architecture**: All tasks modify `src/WorkdayTaskBoardApp.jsx`
- **No [P] within same file**: Tasks T004-T009 are marked [P-GROUP-A] to indicate conceptual parallelism, but must be executed sequentially in practice to avoid merge conflicts
- **TDD not applicable**: This is UI-only work with Chrome MCP E2E testing post-implementation
- **Commit frequency**: Commit after each component creation (T004-T009) and after each integration (T010-T015)
- **Testing strategy**: Chrome MCP for automation, manual for UX quality checks
- **Performance verification**: Must verify <100ms, 60fps, <50ms targets in T024

---

## Validation Checklist

**GATE: Must verify before marking tasks complete**

- [ ] All 5 components created (TokenHelp, PriorityBadge, EmptyState, ActionIcons, Autocomplete)
- [ ] All components integrated into existing UI (TaskCard, Column, QuickAddInput, App header)
- [ ] All performance optimizations applied (memoization, debouncing)
- [ ] Chrome MCP E2E tests pass for all 5 features
- [ ] Manual testing complete for edge cases and UX quality
- [ ] Accessibility requirements met (keyboard, screen reader, contrast)
- [ ] Constitutional compliance verified (single-file, no schema changes, performance met)
- [ ] Build and lint pass with zero errors
- [ ] All 36 functional requirements (FR-001 to FR-036) implemented
- [ ] quickstart.md acceptance tests pass

---

## Estimated Effort

- **Total Tasks**: 32
- **Setup**: 3 tasks (~1 hour)
- **Component Creation**: 6 tasks (~4-6 hours)
- **Integration**: 6 tasks (~3-4 hours)
- **Performance**: 4 tasks (~1-2 hours)
- **Testing**: 8 tasks (~3-4 hours)
- **Final Polish**: 5 tasks (~2 hours)

**Total Estimated Time**: 14-19 hours for experienced React developer

---

**Status**: Ready for execution
**Next Step**: Begin with T001 (Setup) and proceed sequentially through critical path
