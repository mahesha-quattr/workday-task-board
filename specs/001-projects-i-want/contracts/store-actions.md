# Store Action Contracts: Projects Module

## Project Management Actions

### createProject

Creates a new project with auto-generated ID and color.

```typescript
function createProject(name: string): void

// Preconditions:
- name.length > 0 && name.length <= 15
- name.trim() !== ''
- !projects.some(p => p.name.toLowerCase() === name.toLowerCase())

// Postconditions:
- projects.length increases by 1
- new project has unique id starting with 'proj_'
- new project.isDefault === false
- new project.color is assigned from palette

// Side Effects:
- Triggers localStorage persistence
- Does NOT change currentProjectId
```

### deleteProject

Permanently deletes a project and all its tasks.

```typescript
function deleteProject(projectId: string): void

// Preconditions:
- projects.some(p => p.id === projectId)
- !projects.find(p => p.id === projectId)?.isDefault

// Postconditions:
- projects.length decreases by 1
- tasks filtered by projectId.length === 0
- if currentProjectId === projectId, switch to 'default'

// Side Effects:
- Triggers localStorage persistence
- May change currentProjectId
- Triggers confirmation dialog (UI concern)
```

### renameProject

Updates the name of an existing project.

```typescript
function renameProject(projectId: string, newName: string): void

// Preconditions:
- projects.some(p => p.id === projectId)
- !projects.find(p => p.id === projectId)?.isDefault
- newName.length > 0 && newName.length <= 15
- !projects.some(p => p.id !== projectId && p.name.toLowerCase() === newName.toLowerCase())

// Postconditions:
- project.name === newName
- all other project fields unchanged

// Side Effects:
- Triggers localStorage persistence
```

### switchProject

Changes the currently active project filter.

```typescript
function switchProject(projectId: string): void

// Preconditions:
- projects.some(p => p.id === projectId)

// Postconditions:
- currentProjectId === projectId
- getVisibleTasks() returns only tasks with matching projectId

// Side Effects:
- Triggers localStorage persistence
- May trigger UI scroll reset
```

### moveTasksToProject

Bulk moves tasks to a different project.

```typescript
function moveTasksToProject(taskIds: string[], targetProjectId: string): void

// Preconditions:
- taskIds.every(id => tasks.some(t => t.id === id))
- projects.some(p => p.id === targetProjectId)
- taskIds.length > 0

// Postconditions:
- all specified tasks have projectId === targetProjectId
- tasks maintain all other properties
- task.updatedAt refreshed for moved tasks

// Side Effects:
- Triggers localStorage persistence
- May affect task visibility in current view
```

## Modified Existing Actions

### addTask (modified)

Creates a new task in the current project.

```typescript
function addTask(taskData: Partial<Task>): void

// Modified behavior:
- Auto-assigns projectId: taskData.projectId || currentProjectId
- All other behavior unchanged

// Postconditions:
- newTask.projectId === currentProjectId (unless overridden)
```

### getVisibleTasks (new computed)

Returns tasks filtered by current project.

```typescript
function getVisibleTasks(): Task[]

// Preconditions:
- currentProjectId is valid

// Postconditions:
- returns tasks.filter(t => t.projectId === currentProjectId)
- maintains original task order
- returns empty array if no tasks match
```

## Validation Contracts

### validateProjectName

Checks if a project name is valid.

```typescript
function validateProjectName(name: string, excludeId?: string): ValidationResult

// Returns:
{
  valid: boolean,
  error?: 'empty' | 'too_long' | 'duplicate'
}

// Rules:
- Empty: name.trim().length === 0
- Too long: name.length > 15
- Duplicate: projects.some(p => p.id !== excludeId && p.name.toLowerCase() === name.toLowerCase())
```

### canDeleteProject

Checks if a project can be deleted.

```typescript
function canDeleteProject(projectId: string): boolean

// Returns:
- false if project.isDefault
- false if project not found
- true otherwise
```

## Event Contracts

### onProjectCreated

Fired after successful project creation.

```typescript
interface ProjectCreatedEvent {
  project: Project;
  timestamp: number;
}
```

### onProjectDeleted

Fired after successful project deletion.

```typescript
interface ProjectDeletedEvent {
  projectId: string;
  deletedTaskCount: number;
  timestamp: number;
}
```

### onProjectSwitched

Fired after project switch.

```typescript
interface ProjectSwitchedEvent {
  fromProjectId: string;
  toProjectId: string;
  timestamp: number;
}
```

## Error Handling

All actions should handle these error cases:

```typescript
enum ProjectError {
  PROJECT_NOT_FOUND = 'Project does not exist',
  DEFAULT_PROJECT_READONLY = 'Cannot modify default project',
  DUPLICATE_NAME = 'Project name already exists',
  INVALID_NAME = 'Project name invalid',
  NO_TASKS_SELECTED = 'No tasks selected for move',
}
```

## Test Scenarios

### Project Creation

1. Create project with valid name → success
2. Create project with duplicate name → error
3. Create project with 15 char name → success
4. Create project with 16 char name → error
5. Create project with empty name → error

### Project Deletion

1. Delete non-default project → success + tasks deleted
2. Delete default project → error
3. Delete current project → success + switch to default
4. Delete non-existent project → error

### Project Switching

1. Switch to existing project → tasks filtered
2. Switch to non-existent project → error
3. Switch from project with timer → timer continues

### Task Moving

1. Move single task → success
2. Move multiple tasks → success
3. Move to non-existent project → error
4. Move with empty task list → error
