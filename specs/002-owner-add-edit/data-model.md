# Data Model: Owner Add-Edit-Remove

**Date**: 2025-09-19

## Entity Updates

### Task (Extended)

Existing task entity extended with owners field:

```javascript
{
  id: string,              // existing
  title: string,           // existing
  description: string,     // existing
  status: string,          // existing
  priority: number,        // existing
  priorityBucket: string,  // existing
  tags: string[],          // existing
  dependencies: string[],  // existing
  project: string,         // existing
  owner: string,           // existing (deprecated, migrate to owners[0])
  owners: string[],        // NEW: array of owner names
  dueDate: Date | null,    // existing
  expectedDate: Date | null, // existing
  timeLogSecs: number,     // existing
  focusTimerActive: boolean, // existing
  createdAt: Date,         // existing
  updatedAt: Date,         // existing
}
```

## Field Specifications

### owners: string[]

**Type**: Array of strings
**Default**: [] (empty array)
**Constraints**:

- Each owner name must be non-empty after trimming
- No duplicate names within the same task (case-sensitive)
- Maximum reasonable limit: 20 owners per task
- Each owner name max length: 50 characters

**Operations**:

- Add owner: Append to array if not duplicate
- Remove owner: Filter out from array
- Transfer ownership: Clear array, add new owner
- Has owner: Check if name exists in array

## State Transitions

### Adding Owner

```
Given: task.owners = ["Alice"]
Action: addOwner("Bob")
Result: task.owners = ["Alice", "Bob"]
```

### Removing Owner

```
Given: task.owners = ["Alice", "Bob"]
Action: removeOwner("Alice")
Result: task.owners = ["Bob"]
```

### Transfer Ownership

```
Given: task.owners = ["Alice", "Bob"]
Action: transferOwnership("Carol")
Result: task.owners = ["Carol"]
```

## Migration Strategy

### v1 → v1.1 (Non-breaking)

```javascript
// On load, for each task:
if (!task.owners) {
  task.owners = task.owner ? [task.owner] : [];
}
// Keep task.owner for backwards compatibility
// Gradually phase out in future version
```

## Validation Rules

1. **Owner Name Validation**
   - Trim whitespace before saving
   - Reject empty strings
   - Reject if already exists in task.owners
   - Max 50 characters

2. **Array Validation**
   - Max 20 owners per task
   - Maintain order of addition
   - Preserve array during all operations

3. **Display Rules**
   - Show first 3 owners on card
   - "+N more" for additional
   - Full list in edit mode

## Storage Format

localStorage key: `workday-board@v1`

```json
{
  "tasks": [
    {
      "id": "task-123",
      "title": "Implement feature",
      "owners": ["Alice", "Bob"],
      "owner": "Alice" // deprecated, kept for compatibility
      // ... other fields
    }
  ]
}
```

## Query Patterns

### Filter by Owner

```javascript
tasks.filter((task) => task.owners.includes(ownerName));
```

### Tasks Without Owners

```javascript
tasks.filter((task) => task.owners.length === 0);
```

### Multi-Owner Tasks

```javascript
tasks.filter((task) => task.owners.length > 1);
```

## Performance Considerations

- Array operations are O(n) where n = owners per task
- Typical case: 0-3 owners per task
- No indexing required at current scale
- Filter operations scan all tasks (acceptable for <500 tasks)
