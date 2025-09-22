# Data Model: Projects Module

## Entity Definitions

### Project

Represents a distinct work context that groups related tasks.

```typescript
interface Project {
  id: string; // Unique identifier (e.g., 'default', 'proj_1234567890')
  name: string; // Display name (max 15 characters)
  color: string; // Hex color for visual identification
  isDefault: boolean; // Whether this is the undeletable default project
  createdAt: number; // Unix timestamp of creation
  taskCount?: number; // Computed: number of tasks in project (for display)
}
```

**Validation Rules**:

- `name`: Required, 1-15 characters, unique across projects
- `color`: Valid hex color string (#RRGGBB format)
- `isDefault`: Only one project can have true
- `id`: Immutable once created

**State Transitions**:

- Created → Active (default state)
- Active → Deleted (except default project)

### Task (Extended)

Existing task entity with added project association.

```typescript
interface Task {
  // Existing fields
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  priorityBucket: string;
  owner: 'self' | 'ai' | 'other';
  tags: string[];
  dependencies: string[];
  dueDate: string | null;
  expectedDate: string | null;
  timerActive: boolean;
  timerStartedAt: number | null;
  timeLogSecs: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  impact: number;
  urgency: number;
  effort: number;

  // New field
  projectId: string; // Reference to Project.id (defaults to 'default')
}
```

**Validation Rules**:

- `projectId`: Must reference existing Project.id
- Migration: Existing tasks without projectId get 'default'

## Store State Shape

```typescript
interface TaskBoardState {
  // Existing state
  tasks: Task[];
  viewMode: 'board' | 'backlog';
  darkMode: boolean;
  returnToReadyOnPause: boolean;

  // New project state
  projects: Project[];
  currentProjectId: string;

  // Existing actions...

  // New project actions
  createProject: (name: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, newName: string) => void;
  switchProject: (projectId: string) => void;
  moveTasksToProject: (taskIds: string[], targetProjectId: string) => void;

  // Modified actions
  getVisibleTasks: () => Task[]; // Filters by currentProjectId
  addTask: (task: Partial<Task>) => void; // Auto-assigns currentProjectId
}
```

## Relationships

```mermaid
graph TD
  Project ||--o{ Task : contains
  Project {
    string id PK
    string name
    string color
    boolean isDefault
    number createdAt
  }
  Task {
    string id PK
    string projectId FK
    string title
    string status
    ... other_fields
  }
```

## Data Constraints

### Referential Integrity

- Deleting a project deletes all associated tasks (CASCADE)
- Tasks must always have a valid projectId
- Default project cannot be deleted (PROTECT)

### Uniqueness Constraints

- Project.name must be unique (case-insensitive)
- Project.id must be unique
- Task.id must be unique (existing constraint)

### Business Rules

1. **Default Project**: System maintains exactly one default project
2. **Project Limit**: No hard limit on project count
3. **Task Assignment**: New tasks inherit currentProjectId
4. **Bulk Operations**: Multiple tasks can be moved atomically
5. **Name Validation**: Project names trimmed, no leading/trailing spaces

## Storage Schema

localStorage key: `workday-board@v1`

```javascript
{
  state: {
    // Existing fields
    tasks: Task[],
    viewMode: string,
    darkMode: boolean,
    returnToReadyOnPause: boolean,

    // New fields
    projects: Project[],
    currentProjectId: string
  },
  version: 2  // Incremented for migration tracking
}
```

## Migration Strategy

### From v1 to v2

```javascript
function migrateV1toV2(data) {
  // Add default project if missing
  if (!data.state.projects) {
    data.state.projects = [
      {
        id: 'default',
        name: 'Default',
        color: '#6B7280',
        isDefault: true,
        createdAt: Date.now(),
      },
    ];
  }

  // Set current project
  if (!data.state.currentProjectId) {
    data.state.currentProjectId = 'default';
  }

  // Add projectId to all tasks
  if (data.state.tasks) {
    data.state.tasks = data.state.tasks.map((task) => ({
      ...task,
      projectId: task.projectId || 'default',
    }));
  }

  data.version = 2;
  return data;
}
```

## Computed Properties

### Project.taskCount

```javascript
const getTaskCount = (projectId) => tasks.filter((t) => t.projectId === projectId).length;
```

### Active Timer in Other Project

```javascript
const hasActiveTimerInOtherProject = () =>
  tasks.some((t) => t.projectId !== currentProjectId && t.timerActive);
```

### Recent Projects (for quick access)

```javascript
const getRecentProjects = (limit = 5) =>
  projects
    .filter((p) => !p.isDefault)
    .sort((a, b) => {
      const lastTaskA = Math.max(
        ...tasks.filter((t) => t.projectId === a.id).map((t) => t.updatedAt || 0),
      );
      const lastTaskB = Math.max(
        ...tasks.filter((t) => t.projectId === b.id).map((t) => t.updatedAt || 0),
      );
      return lastTaskB - lastTaskA;
    })
    .slice(0, limit);
```
