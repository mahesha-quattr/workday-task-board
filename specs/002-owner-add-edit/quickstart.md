# Quickstart: Owner Management Feature

**Feature**: Task ownership with multiple owners
**Date**: 2025-09-19

## Setup

1. Ensure you're on branch `002-owner-add-edit`
2. Run `npm install` if needed
3. Start dev server: `npm run dev`
4. Open browser to http://localhost:5173

## Feature Validation Checklist

### Basic Owner Operations

- [ ] **Add Single Owner**
  1. Create a new task: "Test task #1"
  2. Click the task to open edit mode
  3. Add owner "Alice"
  4. Verify "Alice" appears on task card
  5. Refresh page - verify owner persists

- [ ] **Add Multiple Owners**
  1. Open task from above
  2. Add second owner "Bob"
  3. Verify both "Alice" and "Bob" shown
  4. Add third owner "Carol"
  5. Verify display shows all or "+1 more" format

- [ ] **Remove Owner**
  1. Open multi-owner task
  2. Click remove (x) next to "Bob"
  3. Verify "Bob" removed, others remain
  4. Refresh page - verify change persists

- [ ] **Transfer Ownership**
  1. Create task with owners ["Alice", "Bob"]
  2. Use transfer action to "David"
  3. Verify only "David" remains as owner
  4. Other owners should be cleared

### Quick-Add Integration

- [ ] **Single Owner via Quick-Add**
  1. Type: "@alice Fix login bug !p1"
  2. Press Enter
  3. Verify task created with:
     - Owner: ["alice"]
     - Title: "Fix login bug"
     - Priority: P1

- [ ] **Multiple Owners via Quick-Add**
  1. Type: "@alice @bob Review PR #backend"
  2. Press Enter
  3. Verify owners: ["alice", "bob"]
  4. Project: "backend"

### Filtering

- [ ] **Filter by Owner**
  1. Create 3 tasks with different owners
  2. Apply owner filter for "Alice"
  3. Verify only Alice's tasks shown
  4. Clear filter - all tasks visible

- [ ] **Multi-Owner Filter**
  1. Task with ["Alice", "Bob"]
  2. Filter by "Alice" - task visible
  3. Filter by "Bob" - same task visible
  4. Filter by "Carol" - task hidden

### Edge Cases

- [ ] **Duplicate Prevention**
  1. Task with owner "Alice"
  2. Try adding "Alice" again
  3. Verify duplicate rejected
  4. Verify appropriate feedback shown

- [ ] **Empty Owner**
  1. Try adding empty/spaces owner
  2. Verify rejected
  3. No empty strings in owners array

- [ ] **Tasks Without Owners**
  1. Create task without owners
  2. Verify task displays normally
  3. Verify can add owners later

- [ ] **Remove Last Owner**
  1. Task with single owner
  2. Remove that owner
  3. Task exists with empty owners[]
  4. Can still add new owners

### View Modes

- [ ] **Board View**
  1. Verify owners visible on cards
  2. Drag task - owners preserved
  3. Owner badges don't interfere with drag

- [ ] **Backlog View**
  1. Switch to backlog view
  2. Verify owners shown in list
  3. Edit works same as board view

### Data Persistence

- [ ] **LocalStorage Check**
  1. Open DevTools > Application > Local Storage
  2. Find `workday-board@v1` key
  3. Verify tasks have `owners` array
  4. Make changes - verify immediate save

- [ ] **Migration Test**
  1. If old data exists with `owner` field
  2. Reload page
  3. Verify migrated to `owners` array
  4. Old owner becomes owners[0]

## Performance Validation

- [ ] Task operations < 100ms response
- [ ] No lag when filtering 100+ tasks
- [ ] Smooth UI transitions
- [ ] No console errors during operations

## Accessibility Check

- [ ] Owner badges have proper contrast
- [ ] Keyboard navigation works
- [ ] Screen reader announces owners
- [ ] Focus management in edit mode

## Final Integration Test

1. Create complex task via quick-add:

   ```
   @alice @bob Implement feature #frontend !p0 due:tomorrow +urgent
   ```

2. Verify all attributes:
   - Owners: ["alice", "bob"]
   - Title: "Implement feature"
   - Project: frontend
   - Priority: P0
   - Due date set
   - Tag: urgent

3. Edit task:
   - Remove "alice"
   - Add "carol"
   - Transfer to "david"

4. Filter by "david" - task visible
5. Drag to different column - owners preserved
6. Refresh page - all changes persist

## Success Criteria

- All checklist items pass
- No console errors
- No performance degradation
- Existing features still work
- Data migrations successful
