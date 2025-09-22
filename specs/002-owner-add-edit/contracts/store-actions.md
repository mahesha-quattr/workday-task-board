# Store Actions Contract: Owner Management

**Date**: 2025-09-19
**Type**: Zustand Store Actions (Client-side state management)

## Actions

### addOwnerToTask

**Purpose**: Add a new owner to a task

**Signature**:

```javascript
addOwnerToTask: (taskId: string, ownerName: string) => void
```

**Preconditions**:

- Task with taskId exists
- ownerName is non-empty string (after trim)
- ownerName not already in task.owners

**Postconditions**:

- Owner added to task.owners array
- Task updatedAt updated
- UI reflects change immediately
- Change persisted to localStorage

**Error Cases**:

- Task not found: No-op
- Empty owner name: No-op
- Duplicate owner: No-op with user feedback

### removeOwnerFromTask

**Purpose**: Remove an owner from a task

**Signature**:

```javascript
removeOwnerFromTask: (taskId: string, ownerName: string) => void
```

**Preconditions**:

- Task with taskId exists
- ownerName exists in task.owners

**Postconditions**:

- Owner removed from task.owners array
- Task updatedAt updated
- UI reflects change immediately
- Change persisted to localStorage

**Error Cases**:

- Task not found: No-op
- Owner not in task: No-op

### transferTaskOwnership

**Purpose**: Replace all owners with a single new owner

**Signature**:

```javascript
transferTaskOwnership: (taskId: string, newOwnerName: string) => void
```

**Preconditions**:

- Task with taskId exists
- newOwnerName is non-empty string (after trim)

**Postconditions**:

- task.owners = [newOwnerName]
- Task updatedAt updated
- UI reflects change immediately
- Change persisted to localStorage

**Error Cases**:

- Task not found: No-op
- Empty owner name: No-op

### clearTaskOwners

**Purpose**: Remove all owners from a task

**Signature**:

```javascript
clearTaskOwners: (taskId: string) => void
```

**Preconditions**:

- Task with taskId exists

**Postconditions**:

- task.owners = []
- Task updatedAt updated
- UI reflects change immediately
- Change persisted to localStorage

**Error Cases**:

- Task not found: No-op

### setOwnerFilter

**Purpose**: Set the active owner filter for task display

**Signature**:

```javascript
setOwnerFilter: (ownerName: string | null) => void
```

**Preconditions**:

- None (can filter by any name)

**Postconditions**:

- Filter state updated
- Task list re-filtered
- Filter persisted to view state

**Error Cases**:

- None (empty results acceptable)

## Computed Values

### getTasksByOwner

**Purpose**: Get all tasks for a specific owner

**Signature**:

```javascript
getTasksByOwner: (ownerName: string) => Task[]
```

**Returns**: Array of tasks where owners includes ownerName

### getUniqueOwners

**Purpose**: Get list of all unique owner names

**Signature**:

```javascript
getUniqueOwners: () => string[]
```

**Returns**: Sorted array of unique owner names across all tasks

### getUnownedTasks

**Purpose**: Get all tasks without owners

**Signature**:

```javascript
getUnownedTasks: () => Task[]
```

**Returns**: Array of tasks where owners.length === 0

## Quick-Add Token Support

### Parse @owner Token

**Pattern**: `@<owner-name>`

**Examples**:

- "@alice Fix the bug" → owners: ["alice"], title: "Fix the bug"
- "@alice @bob Review PR" → owners: ["alice", "bob"], title: "Review PR"

**Integration**:

- Extend existing parseQuickAdd function
- Extract @mentions before other tokens
- Add to owners array on task creation

## Migration Support

### migrateOwnerField

**Purpose**: One-time migration from owner to owners

**Signature**:

```javascript
migrateOwnerField: () => void
```

**Logic**:

```javascript
tasks.forEach((task) => {
  if (!task.owners) {
    task.owners = task.owner ? [task.owner] : [];
  }
});
```

**When Called**: On store initialization, before first render
