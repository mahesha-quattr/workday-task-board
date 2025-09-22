# Data Model: Enhanced Owner Management System

**Date**: 2025-09-19

## Entity Updates

### OwnerRegistry (New)

Central registry of all owners in the system:

```javascript
{
  owners: string[],           // Array of unique owner names (for JSON serialization)
  statistics: {               // Owner usage statistics
    [ownerName: string]: {
      taskCount: number,      // Number of tasks assigned
      lastUsed: Date,         // Last assignment/update time
      createdAt: Date         // First time owner was added
    }
  },
  version: string            // Schema version for migrations
}
```

### Task (Updated)

Existing task entity with enhanced owner support:

```javascript
{
  id: string,                // existing
  title: string,             // existing
  // ... other existing fields
  owners: string[],          // existing (but now properly persisted)
  ownerType: string,         // existing
  // ... rest of existing fields
}
```

### Store State (Extended)

Zustand store extensions:

```javascript
{
  // Existing state
  tasks: Task[],
  projects: Project[],

  // New state
  ownerRegistry: {
    owners: Set<string>,     // Runtime: unique owner names
    statistics: Map<string, OwnerStats>  // Runtime: owner statistics
  },

  // New computed values
  getOwnerSuggestions: (partial: string) => string[],
  getOwnerStatistics: (owner: string) => OwnerStats,
  getAllOwnersWithStats: () => Array<{name: string, stats: OwnerStats}>,

  // New actions
  initializeOwnerRegistry: () => void,
  addOwnerToRegistry: (name: string) => void,
  removeOwnerFromRegistry: (name: string) => void,
  updateOwnerStatistics: () => void,
  bulkAssignOwner: (taskIds: string[], owner: string) => void,
  unassignOwnerFromAllTasks: (owner: string) => void
}
```

## Field Specifications

### Owner Name

**Type**: string
**Constraints**:

- Min length: 1 character (after trim)
- Max length: 30 characters
- Allowed characters: letters, numbers, spaces, hyphen, period, apostrophe
- Case-sensitive storage (UI may normalize display)
- Must be unique within registry

**Validation**:

```javascript
function validateOwnerName(name) {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Name cannot be empty' };
  if (trimmed.length > 30) return { valid: false, error: 'Name too long (max 30)' };
  if (!/^[a-zA-Z0-9\s\-.']+$/.test(trimmed)) return { valid: false, error: 'Invalid characters' };
  return { valid: true, name: trimmed };
}
```

### Task Owners Array

**Type**: string[]
**Constraints**:

- Maximum 5 owners per task
- Each owner must exist in registry
- No duplicates within same task
- Empty array allowed (unassigned task)

## State Transitions

### Adding Owner to Registry

```
Given: ownerRegistry.owners = ["Alice", "Bob"]
Action: addOwnerToRegistry("Carol")
Result: ownerRegistry.owners = ["Alice", "Bob", "Carol"]
        statistics["Carol"] = { taskCount: 0, lastUsed: now, createdAt: now }
```

### Removing Owner from Registry

```
Given: ownerRegistry.owners = ["Alice", "Bob"]
       tasks with Bob assigned = [task1, task2]
Action: removeOwnerFromRegistry("Bob")
Result: ownerRegistry.owners = ["Alice"]
        task1.owners removes "Bob"
        task2.owners removes "Bob"
        statistics removes "Bob" entry
```

### Bulk Assign Owner

```
Given: selected tasks = [task1, task2, task3]
Action: bulkAssignOwner(["task1", "task2", "task3"], "Alice")
Result: task1.owners includes "Alice" (if < 5 owners)
        task2.owners includes "Alice" (if < 5 owners)
        task3.owners includes "Alice" (if < 5 owners)
        statistics["Alice"].taskCount updated
```

## Storage Schema

### localStorage Structure (v1.1)

```json
{
  "version": "1.1",
  "tasks": [
    {
      "id": "task-123",
      "title": "Example task",
      "owners": ["Alice", "Bob"],
      // ... other task fields
    }
  ],
  "projects": [...],
  "ownerRegistry": {
    "owners": ["Alice", "Bob", "Carol"],
    "statistics": {
      "Alice": {
        "taskCount": 5,
        "lastUsed": "2025-09-19T10:00:00Z",
        "createdAt": "2025-09-01T10:00:00Z"
      },
      "Bob": {
        "taskCount": 3,
        "lastUsed": "2025-09-18T15:00:00Z",
        "createdAt": "2025-09-01T10:00:00Z"
      }
    }
  }
}
```

## Migration Strategy

### v1 → v1.1 Migration

```javascript
function migrateToV1_1(data) {
  if (data.version === '1.1') return data;

  // Build registry from existing tasks
  const registry = {
    owners: [],
    statistics: {},
  };

  const ownerSet = new Set();

  // Scan all tasks for owners
  data.tasks?.forEach((task) => {
    task.owners?.forEach((owner) => {
      ownerSet.add(owner);
      if (!registry.statistics[owner]) {
        registry.statistics[owner] = {
          taskCount: 0,
          lastUsed: task.updatedAt || new Date().toISOString(),
          createdAt: task.createdAt || new Date().toISOString(),
        };
      }
      registry.statistics[owner].taskCount++;
    });
  });

  registry.owners = Array.from(ownerSet).sort();

  return {
    ...data,
    version: '1.1',
    ownerRegistry: registry,
  };
}
```

## Validation Rules

### On Load

1. Validate schema version
2. Run migration if needed
3. Verify owner registry integrity
4. Remove orphaned owners (no tasks)
5. Rebuild statistics if corrupted

### On Save

1. Convert Set to Array for JSON
2. Update statistics before save
3. Validate all owners in tasks exist in registry
4. Ensure max 5 owners per task

### Runtime

1. Validate owner name on input
2. Check owner limit before adding
3. Update statistics on every change
4. Maintain registry consistency

## Query Patterns

### Get Owner Suggestions

```javascript
getOwnerSuggestions(partial) {
  const lower = partial.toLowerCase();
  return Array.from(this.ownerRegistry.owners)
    .filter(owner => owner.toLowerCase().includes(lower))
    .sort((a, b) => {
      const aStats = this.ownerRegistry.statistics.get(a);
      const bStats = this.ownerRegistry.statistics.get(b);
      return (bStats?.taskCount || 0) - (aStats?.taskCount || 0);
    })
    .slice(0, 10);
}
```

### Get Owners with Task Counts

```javascript
getAllOwnersWithStats() {
  return Array.from(this.ownerRegistry.owners).map(owner => ({
    name: owner,
    taskCount: this.ownerRegistry.statistics.get(owner)?.taskCount || 0,
    lastUsed: this.ownerRegistry.statistics.get(owner)?.lastUsed || null
  })).sort((a, b) => b.taskCount - a.taskCount);
}
```

## Performance Considerations

- Registry rebuild: O(n × m) where n = tasks, m = avg owners/task
- Autocomplete: O(k) where k = registry size (<100 expected)
- Statistics update: O(1) per operation
- Bulk assign: O(n) where n = selected tasks
- Storage overhead: ~20 bytes per owner + statistics
