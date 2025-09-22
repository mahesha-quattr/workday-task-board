# Research: Owner Add-Edit-Remove Feature

**Date**: 2025-09-19
**Feature**: Task ownership management with multiple owners

## Architecture Research

### Decision: Extend existing task model with owners array

**Rationale**:

- Maintains single-file architecture requirement
- Simple array of strings aligns with existing patterns (e.g., tags array)
- No need for separate owner entity or complex relationships
- Easy to serialize/deserialize with localStorage

**Alternatives considered**:

- Separate owners collection with task references: Too complex for single-file constraint
- Single owner field: Doesn't meet multi-owner requirement
- Owner objects with metadata: Over-engineering for current needs

## UI/UX Research

### Decision: Inline owner management on task cards

**Rationale**:

- Consistent with existing inline editing patterns (title, tags)
- Immediate feedback without modal dialogs
- Maintains flow state during editing
- Similar to existing tag management UI

**Alternatives considered**:

- Modal dialog: Disrupts workflow, adds complexity
- Separate owner panel: Breaks single-file architecture
- Command palette: Over-complex for simple text entry

## State Management Research

### Decision: Add owners array to task model in Zustand store

**Rationale**:

- Follows existing pattern for arrays (tags, dependencies)
- Simple array operations (add, remove, filter)
- Automatic persistence via existing localStorage sync
- No breaking changes to storage format

**Alternatives considered**:

- Separate owner store: Unnecessary complexity
- Global owner registry: Over-engineering for MVP

## Filtering Research

### Decision: Add owner filter to existing filter system

**Rationale**:

- Extends current filtering logic (project, tags)
- Can use existing filter UI patterns
- Simple string matching on owner names
- Combine with existing filters using AND logic

**Alternatives considered**:

- Separate owner view: Breaks existing view modes
- Owner-based columns: Violates 8-column principle

## Quick-Add Token Research

### Decision: Support @owner syntax in quick-add

**Rationale**:

- Consistent with existing token patterns (#project, +tag)
- @ symbol commonly used for mentions/people
- Easy to parse with existing regex approach
- Backwards compatible (won't break existing inputs)

**Alternatives considered**:

- owner: prefix: Inconsistent with people-related convention
- !owner: Already used for priority
- No quick-add support: Misses productivity opportunity

## Migration Research

### Decision: Non-breaking additive change

**Rationale**:

- Add owners: [] to existing tasks on first load
- No version bump needed (backwards compatible)
- Existing tasks work without owners
- No data loss or conversion required

**Alternatives considered**:

- Version bump to v2: Unnecessary for additive change
- Batch migration: Not needed for simple array addition

## Performance Research

### Decision: Optimize for <100 tasks with <10 owners each

**Rationale**:

- Typical usage patterns from existing app
- Simple array operations are fast enough
- No indexing needed at this scale
- Can optimize later if needed

**Alternatives considered**:

- Index by owner: Premature optimization
- Virtualization: Not needed at current scale

## Validation Research

### Decision: Case-sensitive, trimmed, no empty strings

**Rationale**:

- Prevents accidental duplicates from spacing
- Case-sensitive allows "Bob" vs "bob" if intentional
- Empty strings would break filtering
- Consistent with existing tag validation

**Alternatives considered**:

- Case-insensitive: Could merge intended distinctions
- No validation: Would allow problematic data

## Summary

All technical decisions align with:

- Single-file architecture constraint
- Existing patterns in the codebase
- Non-breaking changes to storage
- Minimal complexity additions
- Constitution principles

No NEEDS CLARIFICATION items remain. Ready for Phase 1 design.
