# Quickstart: Projects Module Testing

## Prerequisites

1. Application running locally (`npm run dev`)
2. Browser with developer console open
3. Clean localStorage or backup existing data

## Test Scenario 1: Basic Project Management

### Step 1: Verify Default Project

1. Open the application
2. Look for project selector in top-left corner
3. Verify "Default" project is selected
4. Verify lock icon indicating it cannot be deleted

**Expected**: Default project visible and selected

### Step 2: Create New Project

1. Click project selector dropdown
2. Click settings/manage icon
3. Click "New Project" button
4. Enter name: "Q1 Marketing"
5. Press Enter or click Create

**Expected**:

- New project appears in list with color indicator
- Name validation prevents >15 characters
- Duplicate names rejected with inline error

### Step 3: Switch Between Projects

1. Click project selector
2. Select "Q1 Marketing"
3. Verify board shows empty state (no tasks)
4. Create a test task using quick-add
5. Switch back to "Default" project
6. Verify original tasks are visible
7. Switch back to "Q1 Marketing"
8. Verify test task is visible

**Expected**: Tasks filtered by project, context preserved

## Test Scenario 2: Task-Project Association

### Step 1: Create Tasks in Project Context

1. Select "Q1 Marketing" project
2. Use quick-add: "Design landing page !p1 due:tomorrow"
3. Verify task appears in board
4. Check task has project badge matching current project color

**Expected**: Task created with correct project association

### Step 2: Bulk Move Tasks

1. Switch to "Default" project
2. Select multiple tasks (hover to see checkboxes)
3. Click bulk actions bar at bottom
4. Select "Move to project"
5. Choose "Q1 Marketing"
6. Confirm move

**Expected**:

- Tasks disappear from current view
- Switch to "Q1 Marketing" to verify tasks moved
- Task count updates in project selector

## Test Scenario 3: Project Deletion

### Step 1: Delete Project with Tasks

1. Create test project "Temp Project"
2. Add 3 test tasks to it
3. Open project manager
4. Click delete icon on "Temp Project"
5. Verify confirmation shows "3 tasks will be deleted"
6. Confirm deletion

**Expected**:

- Project removed from list
- Tasks permanently deleted
- Automatically switched to Default if was current

### Step 2: Attempt Default Project Deletion

1. Open project manager
2. Verify Default project has no delete option
3. Verify Default project cannot be renamed

**Expected**: Default project is protected

## Test Scenario 4: Cross-Project Features

### Step 1: Timer Across Projects

1. In "Q1 Marketing", start timer on a task
2. Switch to "Default" project
3. Look for timer indicator in project selector
4. Click indicator

**Expected**:

- Small pulsing dot shows timer active in other project
- Clicking indicator switches to project with active timer
- Timer continues running during project switch

### Step 2: Drag and Drop Within Project

1. Select a project with multiple tasks
2. Drag task between columns
3. Verify task stays in same project

**Expected**: Column changes don't affect project association

## Test Scenario 5: Data Persistence

### Step 1: Refresh Browser

1. Create project "Persistent Test"
2. Add tasks to it
3. Switch to this project
4. Refresh browser (F5)

**Expected**:

- Project still exists
- Tasks remain associated
- Current project selection preserved

### Step 2: Storage Migration

1. Clear localStorage
2. Create old format data:

```javascript
localStorage.setItem(
  'workday-board@v1',
  JSON.stringify({
    state: {
      tasks: [{ id: '1', title: 'Old task' }],
      viewMode: 'board',
    },
  }),
);
```

3. Refresh application

**Expected**:

- Default project created
- Old tasks assigned to Default
- No data loss

## Test Scenario 6: Edge Cases

### Step 1: Project Name Validation

Test these names:

- Empty string → Error
- " " (spaces only) → Error
- "A" → Success
- "123456789012345" (15 chars) → Success
- "1234567890123456" (16 chars) → Error
- "Project #1" → Success
- Duplicate of existing → Error

### Step 2: Keyboard Navigation

1. Open project selector
2. Use arrow keys to navigate
3. Press Enter to select
4. Press Escape to close

**Expected**: Full keyboard support

### Step 3: Search Projects (10+ projects)

1. Create 10+ projects
2. Open selector
3. Start typing project name
4. Verify filter/search works

**Expected**: Type-to-search filters list

## Performance Tests

### Load Test

1. Create 20 projects
2. Add 50 tasks per project
3. Switch between projects rapidly

**Expected**:

- Project switch <100ms
- No UI lag
- Smooth animations

### Memory Test

1. Open browser dev tools → Performance
2. Create/delete projects repeatedly
3. Monitor memory usage

**Expected**: No memory leaks

## Manual QA Checklist

- [ ] Default project exists and cannot be deleted
- [ ] Can create projects with valid names
- [ ] Name validation works (length, duplicates)
- [ ] Project selector shows all projects
- [ ] Task filtering by project works
- [ ] New tasks get current project ID
- [ ] Bulk move tasks between projects
- [ ] Delete project removes all its tasks
- [ ] Timer indicator for other projects
- [ ] Project colors are distinct
- [ ] Data persists across refreshes
- [ ] Migration from old format works
- [ ] Keyboard navigation supported
- [ ] Mobile responsive design
- [ ] Dark mode compatibility
- [ ] Performance acceptable with many projects

## Console Commands for Testing

```javascript
// Get current state
const state = JSON.parse(localStorage.getItem('workday-board@v1'));
console.log('Projects:', state.state.projects);
console.log('Current Project:', state.state.currentProjectId);

// Count tasks per project
const tasksByProject = {};
state.state.tasks.forEach((t) => {
  tasksByProject[t.projectId] = (tasksByProject[t.projectId] || 0) + 1;
});
console.log('Tasks by project:', tasksByProject);

// Force migration test
localStorage.removeItem('workday-board@v1');
location.reload();
```

## Success Criteria

All test scenarios pass without errors:

1. ✅ Projects can be created, renamed, deleted (except default)
2. ✅ Tasks correctly associated with projects
3. ✅ Project switching filters tasks appropriately
4. ✅ Bulk operations work correctly
5. ✅ Cross-project features (timers) work
6. ✅ Data persists and migrates correctly
7. ✅ UI is responsive and intuitive
8. ✅ No performance degradation
9. ✅ All validations enforced
10. ✅ Accessibility maintained
