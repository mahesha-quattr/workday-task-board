# Research: UI/UX Improvements

**Feature**: 004-lets-improve-our
**Date**: 2025-10-01
**Status**: Complete

## Research Questions

### 1. Token Help Display Pattern

**Decision**: Collapsible tooltip with "?" icon trigger
**Rationale**:
- Reduces visual clutter in default state (spec requirement FR-001)
- "?" icon is universally recognized for help
- Tooltip pattern allows rich content without modal overlay
- Auto-dismiss on typing maintains focus (spec edge case resolution)

**Alternatives Considered**:
- Modal dialog: Too heavy for reference documentation
- Accordion below input: Still clutters when collapsed
- Hover-only: Not mobile-friendly, requires discovery

**Implementation Approach**:
- React state hook for tooltip visibility
- Position tooltip adjacent to input field
- Click outside or Escape key to dismiss
- Auto-dismiss when input receives typing

---

### 2. Priority Color Scheme

**Decision**: Tailwind border/background accents with WCAG AA contrast
**Rationale**:
- P0/P1: `border-red-500 dark:border-red-400` (critical/urgent)
- P2: `border-yellow-500 dark:border-yellow-400` (important)
- P3: `border-gray-600 dark:border-gray-500` (normal)
- Maintains accessibility in both light and dark modes (spec FR-011)
- Consistent with existing Tailwind theme

**Alternatives Considered**:
- Background colors: Too visually aggressive, reduces card readability
- Badge-only colors: Less noticeable during scanning (violates FR-010)
- Custom color palette: Unnecessary complexity, Tailwind sufficient

**Implementation Approach**:
- `useMemo` hook for priority → class mapping
- Apply border classes to task card containers
- Test contrast ratios in both themes

---

### 3. Empty State Messages

**Decision**: Contextual messages per column with optional emoji
**Rationale**:
- Each column has unique purpose, generic "No tasks" unhelpful
- Encouraging tone improves user morale
- Emoji adds visual interest without clutter

**Messages Map**:
```javascript
{
  'Backlog': { text: 'Add your ideas here', emoji: '💡' },
  'Ready': { text: 'Tasks ready for work will appear here', emoji: '✅' },
  'In Progress': { text: 'Start working on a task', emoji: '🚀' },
  'Waiting on AI': { text: 'Delegate to AI agents', emoji: '🤖' },
  'Waiting on Others': { text: 'No blockers yet 👍', emoji: '' },
  'Blocked': { text: 'Nothing blocked right now', emoji: '🎉' },
  'In Review': { text: 'Ready for PR review', emoji: '👀' },
  'Done': { text: 'Ready to ship!', emoji: '🎯' }
}
```

**Alternatives Considered**:
- Generic "No tasks" for all: Violates spec FR-014 (contextual requirement)
- Actionable CTAs: Too prescriptive, users know workflow
- No empty states: Sparse UI violates spec FR-013

**Implementation Approach**:
- Simple component with column name prop
- Centered text with subtle opacity
- Conditional rendering when `tasks.length === 0`

---

### 4. Action Icon Design

**Decision**: Always-visible icon buttons with universal symbols
**Rationale**:
- Drag handle: `⋮⋮` (vertical dots, universal drag affordance)
- Move left: `←` Unicode arrow
- Move right: `→` Unicode arrow
- Timer: `▶` play symbol
- Menu: `⋯` horizontal ellipsis

**Alternatives Considered**:
- Icon library (Heroicons, Lucide): Adds dependency, overkill for 5 icons
- Text labels: Takes too much space
- Hover-only: Violates spec FR-023 (no hover requirement)

**Implementation Approach**:
- Unicode characters styled with Tailwind
- Always visible, hover for emphasis
- Touch-friendly sizing (min 44x44px tap targets)
- Group in flex container on task card

---

### 5. Autocomplete Implementation

**Decision**: Filtered list dropdown with keyboard navigation
**Rationale**:
- Trigger on `@`, `#`, `+` character detection
- Filter existing owners/projects/tags by partial match
- Allow free-text entry if no matches (spec FR-036)
- Debounce suggestions to avoid performance hit

**Alternatives Considered**:
- Full-text search: Overkill for small datasets
- Pre-loaded dropdown: Clutters UI before trigger
- Modal selection: Breaks flow, too heavyweight

**Implementation Approach**:
- Parse input value for trigger characters
- Extract partial query after trigger
- Filter Zustand store collections (owners, projects, tags)
- Render dropdown below cursor position
- Arrow keys + Enter for selection
- Escape to dismiss
- Debounce filter to 100ms

---

### 6. Token Preview Badges

**Decision**: Inline badge rendering as tokens are recognized
**Rationale**:
- Parse input string on each keystroke
- Render recognized tokens as pills/badges inline
- Provides instant visual feedback (spec FR-027, FR-035)
- Similar to Slack's @mention rendering

**Alternatives Considered**:
- Preview on blur only: Loses real-time feedback benefit
- Separate preview area: Duplicates content, clutters UI
- No preview: Violates spec FR-027

**Implementation Approach**:
- Reuse existing token parsing logic from store
- Split input into text and token segments
- Render text as editable, tokens as styled badges
- contentEditable div OR controlled input with overlay badges
- Performance: debounce parsing to 50ms

---

### 7. Input Focus Enhancement

**Decision**: Expand with border highlight and subtle shadow
**Rationale**:
- Tailwind `focus:ring` and `focus:border` utilities
- Expand vertically if multi-token entry (auto-grow textarea)
- Clear visual feedback for active state (spec FR-028)

**Alternatives Considered**:
- Modal input: Overkill, breaks inline flow
- Static size: Misses opportunity for multi-line entries
- Color change only: Less noticeable

**Implementation Approach**:
- CSS transition on focus state
- `focus:ring-2 focus:ring-blue-500`
- `focus:border-blue-500`
- Auto-grow textarea if content exceeds single line

---

## Performance Considerations

### Memoization Strategy
- Priority color lookup: `useMemo(getPriorityColorClass, [priority])`
- Autocomplete filtering: `useMemo(filterSuggestions, [query, storeData])`
- Empty state components: `React.memo(EmptyColumnState)`
- Token parsing: debounce to 50ms max

### Rendering Optimizations
- Avoid re-rendering all task cards when one priority changes
- Use React.memo for TaskCard with shallow prop comparison
- Debounce autocomplete to 100ms (keystroke → filter)
- Throttle token preview parsing to 50ms

### Accessibility
- WCAG AA contrast for all priority colors
- Keyboard navigation for autocomplete (arrow keys, Enter, Escape)
- Focus trap in token help tooltip
- ARIA labels for icon-only buttons
- Screen reader announcements for autocomplete results

---

## Technical Constraints Summary

**No Schema Changes**: All improvements are UI-only, no localStorage mutations
**Single File**: All components defined inline in WorkdayTaskBoardApp.jsx
**Performance**: <100ms autocomplete, <50ms token parsing, 60fps drag-drop maintained
**Compatibility**: Works in Chrome, Firefox, Safari; GitHub Pages deployment
**Testing**: Chrome DevTools MCP for automated E2E validation
**Constitutional Compliance**: Passes all 5 constitutional checks

---

## Open Questions Resolved

1. ✅ Help tooltip behavior when typing → **Auto-dismiss**
2. ✅ Backlog empty state → **"Add your ideas here 💡"**
3. ✅ Done empty state → **"Ready to ship! 🎯"**
4. ✅ Icon library choice → **Unicode characters (no deps)**
5. ✅ Autocomplete debounce → **100ms**
6. ✅ Token preview debounce → **50ms**

---

## Next Steps

Proceed to Phase 1: Design & Contracts
- No API contracts needed (UI-only)
- No data model changes needed (no new entities)
- Create quickstart.md with acceptance test scenarios
- Update CLAUDE.md with new component patterns
