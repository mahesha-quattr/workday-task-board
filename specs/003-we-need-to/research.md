# Research: Enhanced Owner Management System

**Date**: 2025-09-19
**Feature**: Centralized owner registry with persistent storage and improved UX

## Problem Analysis

### Current Issues (from 002-owner-add-edit implementation)

1. **No Central Registry**: Owners are only stored on individual tasks, no system-wide registry
2. **No Persistence**: Owner assignments lost on page refresh (discovered during testing)
3. **No Selection UI**: Must manually type owner names each time (prone to typos)
4. **No Autocomplete**: No suggestions when typing partial names
5. **No Statistics**: Cannot see owner workload or task assignments
6. **Inconsistent Entry**: Same owner entered differently (Bob, bob, Bobby)

## Architecture Research

### Decision: Extend Zustand Store with Owner Registry

**Rationale**:

- Maintains single-file architecture requirement
- Leverages existing state management pattern
- Automatic persistence via existing localStorage sync
- Reactive updates across all components

**Alternatives considered**:

- Separate owner context: Adds complexity to single-file constraint
- IndexedDB storage: Overkill for ~100 owners
- Session storage: Doesn't persist across sessions

### Decision: Owner Registry Data Structure

**Chosen approach**:

```javascript
ownerRegistry: {
  owners: Set<string>,        // Unique owner names
  statistics: Map<string, {    // Owner -> stats
    taskCount: number,
    lastUsed: Date
  }>
}
```

**Rationale**:

- Set ensures uniqueness automatically
- Map provides O(1) lookup for statistics
- Minimal memory footprint
- Easy to serialize to localStorage

**Alternatives considered**:

- Array of owner objects: Requires manual deduplication
- Normalized database structure: Over-engineering for current scale

## UI/UX Research

### Decision: Combobox Pattern for Owner Selection

**Rationale**:

- Industry standard for autocomplete + free text entry
- Accessible (ARIA compliant)
- Works with keyboard navigation
- Allows new owner entry inline

**Alternatives considered**:

- Modal with owner list: Disrupts workflow
- Tags-style input: Confusing for non-technical users
- Separate owner panel: Breaks single-file architecture

### Decision: Owner Management in Settings Panel

**Rationale**:

- Consistent with existing app patterns
- Non-intrusive (collapsible section)
- Central location users expect
- Can show statistics and allow bulk operations

**Alternatives considered**:

- Dedicated owner page: Requires routing
- Floating panel: Clutters main interface
- Header dropdown: Limited space for statistics

## State Management Research

### Decision: Owner Registry Actions in Store

**Required actions**:

```javascript
// Registry management
initializeOwnerRegistry();
addOwnerToRegistry(name);
removeOwnerFromRegistry(name);
updateOwnerStatistics(name);
getOwnerSuggestions(partial);

// Bulk operations
bulkAssignOwner(taskIds, ownerName);
unassignOwnerFromAllTasks(ownerName);

// Persistence
syncOwnerRegistryToStorage();
loadOwnerRegistryFromStorage();
```

**Rationale**:

- Clear separation of concerns
- Testable individual actions
- Follows existing store patterns
- Supports undo/redo if needed later

## Persistence Research

### Decision: Extend localStorage Schema

**Current schema** (v1):

```javascript
{
  tasks: [...],
  projects: [...],
  version: "1"
}
```

**New schema** (v1.1):

```javascript
{
  tasks: [...],
  projects: [...],
  ownerRegistry: {
    owners: [...],  // Array for JSON serialization
    statistics: {...}
  },
  version: "1.1"
}
```

**Migration strategy**:

1. On load, check for ownerRegistry
2. If missing, scan all tasks to build registry
3. Save updated schema
4. Mark as migrated

**Rationale**:

- Non-breaking change (additive)
- Automatic migration on first load
- Preserves existing data
- No version conflicts

## Performance Research

### Decision: Lazy Loading + Caching Strategy

**Approach**:

- Build registry on first access
- Cache suggestions for 100ms (debounce)
- Update statistics async after task changes
- Limit autocomplete to top 10 matches

**Performance targets**:

- Registry build: <50ms for 500 tasks
- Autocomplete response: <10ms
- Statistics update: <20ms

**Rationale**:

- Most operations are read-heavy
- Updates happen infrequently
- 100 owners × 5 owners/task = manageable scale

## Validation Research

### Decision: Owner Name Validation Rules

**Rules**:

1. Trim whitespace
2. Max 30 characters
3. Case-sensitive storage (display can normalize)
4. No special characters except: - . ' space
5. Cannot be empty

**Rationale**:

- Prevents most typos
- Allows international names
- Display-friendly length
- Compatible with @owner tokens

## Accessibility Research

### Decision: ARIA Patterns for Owner UI

**Implementation**:

- role="combobox" for owner input
- aria-autocomplete="list"
- aria-expanded for dropdown state
- role="option" for suggestions
- Keyboard navigation (arrows, enter, escape)

**Rationale**:

- WCAG 2.1 AA compliant
- Works with screen readers
- Keyboard-only users supported
- Consistent with React patterns

## Testing Strategy

### Decision: Playwright MCP + Self-Tests

**Test coverage**:

1. Registry persistence across refreshes
2. Autocomplete functionality
3. Bulk operations
4. Owner statistics accuracy
5. Migration from v1 to v1.1

**Rationale**:

- Playwright tests user-facing behavior
- Self-tests validate internal state
- No external test framework needed
- Runs in existing dev environment

## Summary

All technical decisions align with:

- Single-file architecture constraint
- Existing patterns in the codebase
- Constitutional principles
- Performance requirements
- Accessibility standards

No NEEDS CLARIFICATION items remain. Ready for Phase 1 design.
