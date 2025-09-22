# Owner Registry API Contracts

**Version**: 1.0
**Type**: Internal Store Actions (not REST API - single-file app)

## Store Action Contracts

Since this is a single-file React application with Zustand store, these contracts define the store actions and their expected behavior.

### 1. Initialize Owner Registry

**Action**: `initializeOwnerRegistry()`

**Trigger**: On app load, after loading from localStorage

**Input**: None (uses existing tasks in store)

**Process**:

1. Check if ownerRegistry exists in state
2. If not, scan all tasks to build registry
3. Calculate statistics for each owner

**Output**:

```javascript
{
  ownerRegistry: {
    owners: Set(["Alice", "Bob", "Carol"]),
    statistics: Map([
      ["Alice", { taskCount: 5, lastUsed: Date, createdAt: Date }],
      ["Bob", { taskCount: 3, lastUsed: Date, createdAt: Date }]
    ])
  }
}
```

**Side Effects**:

- Updates localStorage if registry was built
- Triggers re-render of owner-dependent components

### 2. Add Owner to Registry

**Action**: `addOwnerToRegistry(ownerName: string)`

**Validation**:

- Name trimmed and non-empty
- Max 30 characters
- Valid characters only
- Not already in registry

**Input**:

```javascript
{
  ownerName: 'David'; // New owner name
}
```

**Output**:

```javascript
{
  success: true,
  owner: "David"
}
```

**Error Cases**:

- `INVALID_NAME`: Name validation failed
- `DUPLICATE_OWNER`: Owner already exists
- `NAME_TOO_LONG`: Exceeds 30 characters

### 3. Remove Owner from Registry

**Action**: `removeOwnerFromRegistry(ownerName: string)`

**Input**:

```javascript
{
  ownerName: 'Bob'; // Owner to remove
}
```

**Process**:

1. Find all tasks with this owner
2. Remove owner from each task's owners array
3. Remove from registry
4. Update statistics

**Output**:

```javascript
{
  success: true,
  tasksUpdated: 3  // Number of tasks that had owner removed
}
```

### 4. Get Owner Suggestions

**Action**: `getOwnerSuggestions(partial: string)`

**Input**:

```javascript
{
  partial: 'al'; // Partial name to match
}
```

**Output**:

```javascript
{
  suggestions: [
    { name: 'Alice', taskCount: 5 },
    { name: 'Alan', taskCount: 2 },
    { name: 'Albert', taskCount: 1 },
  ];
}
```

**Sorting**: By task count (descending), then alphabetically

### 5. Bulk Assign Owner

**Action**: `bulkAssignOwner(taskIds: string[], ownerName: string)`

**Validation**:

- Owner must exist in registry (or be added)
- Each task respects 5-owner limit

**Input**:

```javascript
{
  taskIds: ["task-1", "task-2", "task-3"],
  ownerName: "Alice"
}
```

**Output**:

```javascript
{
  success: true,
  tasksUpdated: 3,
  tasksFailed: 0,  // Tasks that hit 5-owner limit
  failedTaskIds: []
}
```

### 6. Update Owner Statistics

**Action**: `updateOwnerStatistics()`

**Trigger**: After any owner assignment change

**Process**:

1. Scan all tasks
2. Count tasks per owner
3. Update last used times
4. Remove statistics for owners with no tasks

**Output**: None (internal update)

### 7. Get All Owners with Stats

**Action**: `getAllOwnersWithStats()`

**Input**: None

**Output**:

```javascript
{
  owners: [
    { name: 'Alice', taskCount: 5, lastUsed: '2025-09-19T10:00:00Z' },
    { name: 'Bob', taskCount: 3, lastUsed: '2025-09-18T15:00:00Z' },
    { name: 'Carol', taskCount: 0, lastUsed: null },
  ];
}
```

**Sorting**: By task count (descending)

## Component Contracts

### OwnerCombobox Component

**Props**:

```javascript
{
  value: string[],           // Current owners
  onChange: (owners: string[]) => void,
  maxOwners: 5,
  placeholder: "Select or type owner..."
}
```

**Events**:

- `onSearch`: Triggers suggestion fetch
- `onSelect`: Adds owner from suggestions
- `onCreate`: Adds new owner to registry
- `onRemove`: Removes owner from task

### OwnerManager Component

**Props**:

```javascript
{
  isOpen: boolean,
  onClose: () => void
}
```

**Features**:

- List all owners with task counts
- Remove owner (with confirmation)
- Show owner statistics
- Search/filter owners

### BulkOwnerAssign Component

**Props**:

```javascript
{
  selectedTaskIds: string[],
  onAssign: (owner: string) => void,
  onCancel: () => void
}
```

**Features**:

- Select owner from registry
- Show number of tasks to update
- Confirm action
- Show results (success/failed counts)

## Data Persistence Contract

### localStorage Schema

**Key**: `workday-board@v1`

**Structure**:

```json
{
  "version": "1.1",
  "tasks": [...],
  "projects": [...],
  "ownerRegistry": {
    "owners": ["Alice", "Bob"],
    "statistics": {
      "Alice": { "taskCount": 5, "lastUsed": "...", "createdAt": "..." }
    }
  }
}
```

### Migration Contract

**From v1 to v1.1**:

1. Load existing data
2. Build ownerRegistry from tasks
3. Update version to "1.1"
4. Save back to localStorage

**Rollback**: Not needed (additive change only)

## Validation Contracts

### Owner Name Validation

**Input**: Raw string from user

**Rules**:

1. Trim whitespace
2. Length: 1-30 characters
3. Characters: `[a-zA-Z0-9\s\-\.']`
4. No leading/trailing spaces after trim

**Output**:

```javascript
{
  valid: boolean,
  name?: string,      // Sanitized name if valid
  error?: string      // Error message if invalid
}
```

### Task Owner Limit

**Rule**: Maximum 5 owners per task

**Check**: Before adding new owner

**Response**: Show error message, prevent addition

## Error Handling Contract

All store actions follow this pattern:

```javascript
try {
  // Action logic
  return { success: true, data: result };
} catch (error) {
  console.error(`Action failed: ${error.message}`);
  return { success: false, error: error.message };
}
```

## Testing Contract

Each action must have tests for:

1. Happy path (normal operation)
2. Validation failures
3. Edge cases (empty registry, max limits)
4. Persistence (survives refresh)
