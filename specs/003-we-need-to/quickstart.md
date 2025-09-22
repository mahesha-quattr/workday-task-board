# Quickstart: Enhanced Owner Management System

**Feature**: Centralized owner registry with autocomplete and persistence
**Date**: 2025-09-19

## Setup

1. Ensure you're on branch `003-we-need-to`
2. Run `npm install` if needed
3. Start dev server: `npm run dev`
4. Open browser to http://localhost:5173

## Feature Validation Checklist

### Owner Registry Initialization

- [ ] **First Load - Build Registry**
  1. Open DevTools > Application > Local Storage
  2. Check for `ownerRegistry` in `workday-board@v1`
  3. Verify it contains:
     - `owners`: array of unique owner names
     - `statistics`: object with task counts per owner

### Owner Selection UI

- [ ] **Autocomplete from Registry**
  1. Create a new task
  2. Click to open edit drawer
  3. In the Owners field, start typing "al"
  4. Verify autocomplete dropdown shows:
     - Matching owners (Alice, Alan, etc.)
     - Task count for each owner
     - Sorted by usage (most used first)
  5. Click on a suggestion to add owner

- [ ] **Add New Owner to Registry**
  1. In owner field, type a new name "TestOwner"
  2. Press Enter or click Add
  3. Verify:
     - Owner added to task
     - "TestOwner" now appears in autocomplete
     - Registry updated in localStorage

### Data Persistence

- [ ] **Owners Persist Across Refresh**
  1. Add owners to several tasks
  2. Note the owner assignments
  3. Refresh the page (F5)
  4. Verify:
     - All owner assignments still present
     - Owner registry intact
     - Statistics maintained

- [ ] **Quick-Add with @owner Tokens**
  1. In quick-add field, type: "@alice @bob Fix bug #frontend !p1"
  2. Press Enter
  3. Verify task created with owners ["alice", "bob"]
  4. Refresh page
  5. Verify owners still assigned

### Central Owner Management

- [ ] **View All Owners**
  1. Click Settings/Menu icon (if implemented)
  2. Open "Owner Management" section
  3. Verify display of:
     - All unique owners in system
     - Task count for each owner
     - Last used date
     - Total: X owners

- [ ] **Remove Owner from Registry**
  1. In Owner Management, find owner with 0 tasks
  2. Click Remove/Delete icon
  3. Confirm removal
  4. Verify:
     - Owner removed from registry
     - No longer appears in autocomplete
     - localStorage updated

- [ ] **Remove Owner with Tasks**
  1. Find owner with assigned tasks
  2. Remove owner from registry
  3. Verify:
     - Owner unassigned from all tasks
     - Tasks still exist without that owner
     - Other owners on those tasks unaffected

### Bulk Operations

- [ ] **Bulk Assign Owner**
  1. Select multiple tasks (checkbox)
  2. Click "Bulk Actions" or similar
  3. Choose "Assign Owner"
  4. Select owner from dropdown
  5. Confirm action
  6. Verify:
     - Owner added to all selected tasks
     - Respects 5-owner limit per task
     - Shows count of successful/failed

### Owner Filtering

- [ ] **Filter Tasks by Owner**
  1. In filter bar, click owner filter dropdown
  2. Select specific owner (e.g., "Alice")
  3. Verify:
     - Only tasks with Alice as owner shown
     - Count shows "X tasks"
  4. Clear filter
  5. Verify all tasks visible again

### Validation & Limits

- [ ] **5 Owner Limit per Task**
  1. Add 5 owners to a task
  2. Try to add a 6th owner
  3. Verify:
     - Error message shown
     - Addition prevented
     - Existing 5 owners unchanged

- [ ] **Owner Name Validation**
  1. Try to add owner with:
     - Empty name (spaces only) → Rejected
     - 31+ characters → Rejected
     - Special characters (@#$%) → Rejected
     - Valid name "John O'Brien-Smith" → Accepted
  2. Verify appropriate error messages

### Statistics & Usage

- [ ] **Owner Statistics Accuracy**
  1. Note task count for an owner
  2. Add that owner to a new task
  3. Check statistics updated:
     - Task count increased by 1
     - Last used date updated
  4. Remove owner from a task
  5. Verify count decreased

- [ ] **Sort by Usage**
  1. In autocomplete, verify owners sorted by:
     - Task count (high to low)
     - Alphabetically for same count
  2. Most-used owners appear first

### Edge Cases

- [ ] **Case Sensitivity**
  1. Add owner "Bob"
  2. Try to add "bob"
  3. Verify handled consistently
  4. Check if treated as same or different

- [ ] **Migration from v1**
  1. Load app with old data (no ownerRegistry)
  2. Verify automatic migration:
     - Registry built from existing tasks
     - All owners captured
     - Statistics calculated
     - Version updated to 1.1

### Performance

- [ ] **Autocomplete Response Time**
  1. With 50+ owners in registry
  2. Type in owner field
  3. Verify suggestions appear in <100ms
  4. No lag or freezing

- [ ] **Bulk Operations Performance**
  1. Select 20+ tasks
  2. Bulk assign owner
  3. Verify completes in <1 second
  4. UI remains responsive

## Success Criteria

- All checklist items pass
- No console errors during operations
- Owner data persists reliably
- Autocomplete improves efficiency
- Statistics accurately track usage
- Bulk operations work smoothly
- Performance targets met
- Existing features unaffected

## Common Issues & Solutions

**Issue**: Owners not persisting after refresh

- Check localStorage schema version
- Verify migration ran correctly
- Check for console errors

**Issue**: Autocomplete not showing suggestions

- Verify registry initialized
- Check owner names in registry
- Ensure partial match logic working

**Issue**: Statistics not updating

- Check updateOwnerStatistics called
- Verify task count calculation
- Check for async timing issues

**Issue**: Bulk assign failing

- Check 5-owner limit per task
- Verify owner exists in registry
- Check selected task IDs valid
