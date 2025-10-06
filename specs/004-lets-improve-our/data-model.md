# Data Model: UI/UX Improvements

**Feature**: 004-lets-improve-our
**Date**: 2025-10-01
**Status**: No schema changes required

## Overview

This feature introduces **zero new data entities** and **zero storage schema changes**. All improvements are purely presentational (UI/UX enhancements) using existing Zustand store data.

## Existing Entities (Unchanged)

### Task Entity
```javascript
{
  id: string,
  title: string,
  status: 'Backlog' | 'Ready' | 'In Progress' | 'Waiting on AI' | 'Waiting on Others' | 'Blocked' | 'In Review' | 'Done',
  priority: 'P0' | 'P1' | 'P2' | 'P3',
  project: string,
  owners: string[],
  tags: string[],
  dueDate: timestamp,
  createdAt: timestamp,
  notes: string,
  // ... other existing fields
}
```

**UI Changes**:
- `priority` field now drives color-coded visual styling (FR-006 through FR-012)
- `owners`, `project`, `tags` now have autocomplete in input (FR-029 through FR-031)

### Owner Registry (Existing)
```javascript
ownerRegistry: {
  owners: Set<string>,
  statistics: Map<string, OwnerStats>
}
```

**UI Changes**:
- Used for autocomplete suggestions when typing `@owner`

### Projects Collection (Existing)
Derived from tasks: `Set(tasks.map(t => t.project))`

**UI Changes**:
- Used for autocomplete suggestions when typing `#project`

### Tags Collection (Existing)
Derived from tasks: `Set(tasks.flatMap(t => t.tags))`

**UI Changes**:
- Used for autocomplete suggestions when typing `+tag`

## UI State (Ephemeral - Not Persisted)

### TokenHelp State
```javascript
const [showTokenHelp, setShowTokenHelp] = useState(false);
```
- Local React state, no Zustand
- Not persisted to localStorage
- Implements FR-001 through FR-005

### Autocomplete State
```javascript
const [autocomplete, setAutocomplete] = useState({
  visible: false,
  type: null, // '@' | '#' | '+' | null
  query: '',
  suggestions: [],
  selectedIndex: 0
});
```
- Local React state, no Zustand
- Not persisted to localStorage
- Implements FR-029 through FR-032, FR-036

### Input Focus State
```javascript
const [inputFocused, setInputFocused] = useState(false);
```
- Native browser focus state + React hook
- Implements FR-028

## Computed Values

### Priority Color Mapping
```javascript
const getPriorityColorClass = useMemo((priority) => {
  const colors = {
    'P0': 'border-red-500 dark:border-red-400',
    'P1': 'border-orange-500 dark:border-orange-400',
    'P2': 'border-yellow-500 dark:border-yellow-400',
    'P3': 'border-gray-600 dark:border-gray-500',
  };
  return colors[priority] || colors['P3'];
}, [priority]);
```
- Pure function, memoized for performance
- Implements FR-006 through FR-012

### Empty State Messages
```javascript
const getEmptyStateMessage = (columnName) => {
  const messages = {
    'Backlog': { text: 'Add your ideas here', emoji: '💡' },
    'Ready': { text: 'Tasks ready for work will appear here', emoji: '✅' },
    'In Progress': { text: 'Start working on a task', emoji: '🚀' },
    'Waiting on AI': { text: 'Delegate to AI agents', emoji: '🤖' },
    'Waiting on Others': { text: 'No blockers yet 👍', emoji: '' },
    'Blocked': { text: 'Nothing blocked right now', emoji: '🎉' },
    'In Review': { text: 'Ready for PR review', emoji: '👀' },
    'Done': { text: 'Ready to ship!', emoji: '🎯' }
  };
  return messages[columnName] || { text: 'No tasks', emoji: '' };
};
```
- Pure function, stateless
- Implements FR-013 through FR-019

### Token Parsing (Enhanced)
```javascript
const parseTokens = (inputText) => {
  // Existing regex-based parsing for #project, @owner, +tag, !priority, due:, etc.
  // Now also returns structured tokens for inline badge preview
  return {
    raw: inputText,
    tokens: [
      { type: 'text', value: 'Fix bug in ' },
      { type: 'project', value: 'alpha' },
      { type: 'text', value: ' for ' },
      { type: 'owner', value: 'AI' },
      // ...
    ]
  };
};
```
- Extended existing function, no new data structure
- Implements FR-027, FR-035

## Data Flow

### 1. Priority Visual Hierarchy
```
Task.priority → getPriorityColorClass() → Tailwind border classes → Task card rendering
```

### 2. Empty Column States
```
Column tasks.length === 0 → getEmptyStateMessage(columnName) → EmptyColumnState component
```

### 3. Autocomplete Suggestions
```
Input text → detect trigger (@/#/+) → extract query → filter store collections → render dropdown
```

### 4. Token Preview
```
Input text → parseTokens() → split into segments → render text + badges inline
```

### 5. Token Help Display
```
User clicks "?" → setShowTokenHelp(true) → render tooltip → user types → setShowTokenHelp(false)
```

## Validation Rules (Unchanged)

All existing validation rules remain:
- Owner names: max 30 chars, max 5 per task
- Project names: valid characters, no special chars
- Tags: alphanumeric + hyphens
- Priority: one of P0/P1/P2/P3

No new validation needed for this feature.

## Performance Constraints

- **Priority color lookup**: O(1) via memoized map
- **Autocomplete filtering**: O(n) where n = number of owners/projects/tags (typically <100)
- **Token parsing**: O(m) where m = input length (debounced to 50ms)
- **Empty state rendering**: O(1) simple text component

All operations meet <100ms constitutional requirement.

## Storage Impact

**localStorage**: Zero changes
- No new keys
- No schema migration
- Existing `workday-board@v1` and `workday-board@view-mode` unchanged

## Summary

This feature is a **pure presentation layer enhancement**. Zero data model changes, zero storage changes, zero API contracts. All improvements use existing Zustand store data and add ephemeral UI state only.
