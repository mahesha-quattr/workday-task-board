# Quickstart: UI/UX Improvements Validation

**Feature**: 004-lets-improve-our
**Date**: 2025-10-01
**Purpose**: Acceptance testing for 5 UI/UX improvements (Chrome MCP + Manual)

## Prerequisites

1. Dev server running: `npm run dev`
2. Chrome browser with DevTools MCP tools available
3. Test data: Board with tasks at different priorities (P0, P1, P2, P3)
4. Multiple projects, owners, and tags in existing tasks

## Testing Modes

- **Automated (Chrome MCP)**: Scenarios 1, 2, 4, 5 can be automated using Chrome DevTools MCP
- **Manual**: All scenarios can be tested manually
- **Hybrid**: Recommended approach - automate repetitive checks, manually verify UX quality

## Test Scenario 1: Token Help Simplification

**Automation**: ✅ Chrome MCP compatible

### Setup

1. Navigate to http://localhost:5173
2. Locate the task input field at the top

### Chrome MCP Automation Script

```javascript
// Use mcp__chrome-devtools__take_snapshot to verify help icon exists
// Use mcp__chrome-devtools__click to trigger help display
// Use mcp__chrome-devtools__take_snapshot to verify tooltip appears
// Use mcp__chrome-devtools__type to start typing and verify auto-dismiss
```

### Acceptance Criteria

**AC1.1: Help text is hidden by default**

- [ ] Token syntax text is NOT visible below input field
- [ ] Input area appears clean without clutter
- [ ] Help icon ("?") is visible near input field

**AC1.2: Help tooltip displays on click**

- [ ] Click the "?" help icon
- [ ] Comprehensive token documentation appears (all syntax: #, @, !, +, due:, etc.)
- [ ] Documentation is readable and well-formatted
- [ ] Tooltip does not cover the input field

**AC1.3: Help dismisses properly**

- [ ] Click outside tooltip → tooltip disappears
- [ ] Click "?" again → tooltip appears
- [ ] Press Escape key → tooltip disappears
- [ ] Start typing in input → tooltip auto-dismisses

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Test Scenario 2: Priority Visual Hierarchy

**Automation**: ✅ Chrome MCP compatible

### Setup

1. Create 4 tasks with different priorities:
   - Task 1: `Critical bug !p0`
   - Task 2: `Urgent feature !p1`
   - Task 3: `Important update !p2`
   - Task 4: `Normal task !p3`
2. Distribute across different columns

### Chrome MCP Automation Script

```javascript
// Use mcp__chrome-devtools__take_snapshot to capture task cards
// Use mcp__chrome-devtools__evaluate_script to verify border color classes
// Verify computed styles match expected priority colors
```

### Acceptance Criteria

**AC2.1: P0/P1 tasks have red/orange accent**

- [ ] P0 task has red border (visible and distinct)
- [ ] P1 task has orange border (visible and distinct)
- [ ] Accents are immediately noticeable when scanning board

**AC2.2: P2 tasks have yellow accent**

- [ ] P2 task has yellow border
- [ ] Color is distinct from P0/P1 and P3

**AC2.3: P3 tasks have default/gray styling**

- [ ] P3 task has gray border
- [ ] Appears less urgent than P0/P1/P2

**AC2.4: Colors work in light and dark mode**

- [ ] Switch to light mode (☀️ button)
- [ ] All priority colors maintain sufficient contrast
- [ ] Switch to dark mode
- [ ] All priority colors maintain sufficient contrast
- [ ] No visual confusion between modes

**AC2.5: Priority colors in both views**

- [ ] Board view shows priority colors
- [ ] Switch to Backlog view
- [ ] Backlog view shows same priority colors
- [ ] Colors are consistent across views

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Test Scenario 3: Empty Column States

**Automation**: ⚠️ Manual recommended (visual UX quality check)

### Setup

1. Clear all tasks from specific columns (move them to other columns)
2. Test each of the 8 columns empty

### Chrome MCP Automation Script (Optional)

```javascript
// Use mcp__chrome-devtools__take_snapshot to verify empty state messages
// Use mcp__chrome-devtools__evaluate_script to check message text content
// Manual visual inspection still recommended for UX quality
```

### Acceptance Criteria

**AC3.1: All empty columns show messages**

- [ ] Empty column does NOT show just "No tasks"
- [ ] Contextual message appears for each column

**AC3.2: Backlog empty state**

- [ ] Message: "Add your ideas here" (or similar encouraging text)
- [ ] Emoji: 💡 (or appropriate visual)

**AC3.3: Ready empty state**

- [ ] Message relates to triaged tasks being ready

**AC3.4: In Progress empty state**

- [ ] Message encourages starting work

**AC3.5: Waiting on AI empty state**

- [ ] Message relates to AI delegation

**AC3.6: Waiting on Others empty state**

- [ ] Message indicates positive state (no blockers) 👍

**AC3.7: Blocked empty state**

- [ ] Message celebrates no blocks

**AC3.8: In Review empty state**

- [ ] Message references PR/review context 👀

**AC3.9: Done empty state**

- [ ] Message celebrates completion readiness ("Ready to ship!" 🎯 or similar)

**AC3.10: Messages are concise**

- [ ] All messages fit within column width
- [ ] No text overflow or truncation

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Test Scenario 4: Task Action Discoverability

**Automation**: ✅ Chrome MCP compatible

### Setup

1. View board with multiple task cards visible
2. Do NOT hover over any cards initially

### Chrome MCP Automation Script

```javascript
// Use mcp__chrome-devtools__take_snapshot to verify icons are visible
// Use mcp__chrome-devtools__evaluate_script to check icon presence without hover
// Verify drag handle, arrows, play icon, and menu icon are rendered
```

### Acceptance Criteria

**AC4.1: Drag handle always visible**

- [ ] Each task card shows drag handle icon (⋮⋮)
- [ ] Icon is visible WITHOUT hovering
- [ ] Icon position is consistent across all cards

**AC4.2: Move icons use arrows**

- [ ] Move left button shows ← arrow icon
- [ ] Move right button shows → arrow icon
- [ ] Icons are clear and recognizable

**AC4.3: Timer icon uses play symbol**

- [ ] Focus timer button shows ▶ icon
- [ ] Icon clearly indicates playable action

**AC4.4: Quick action menu visible**

- [ ] Each card shows ⋯ (ellipsis) menu icon
- [ ] Icon is visible WITHOUT hovering
- [ ] Clicking opens action menu (if implemented)

**AC4.5: Icons work on touch devices**

- [ ] Resize browser to mobile width (375px)
- [ ] All icon buttons remain tappable
- [ ] Icons are at least 44x44px (comfortable tap targets)
- [ ] No accidental clicks when dragging

**AC4.6: Hover provides emphasis**

- [ ] Hover over action icons
- [ ] Icons show subtle highlight or opacity change
- [ ] Maintains usability for non-hover users

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Test Scenario 5: Quick Add Experience

**Automation**: ✅ Chrome MCP compatible

### Setup

1. Focus on the main task input field
2. Prepare to type with autocomplete triggers

### Chrome MCP Automation Script

```javascript
// Use mcp__chrome-devtools__click on input field to focus
// Use mcp__chrome-devtools__type to enter "@", verify autocomplete appears
// Use mcp__chrome-devtools__type to enter token patterns
// Use mcp__chrome-devtools__take_snapshot to verify badge rendering
// Use mcp__chrome-devtools__press_key "Enter" to test submission
```

### Acceptance Criteria

**AC5.1: Input expands on focus**

- [ ] Click input field
- [ ] Field expands or highlights (border glow, shadow, or size increase)
- [ ] Clearly indicates active state
- [ ] Returns to normal when blurred

**AC5.2: Owner autocomplete (@)**

- [ ] Type `@` in input
- [ ] Autocomplete dropdown appears
- [ ] Shows existing owners from the system
- [ ] Type partial name (e.g., `@al`)
- [ ] List filters to matching owners
- [ ] Arrow keys navigate suggestions
- [ ] Enter key selects highlighted suggestion
- [ ] Escape key dismisses dropdown
- [ ] Typing free text (no match) is allowed

**AC5.3: Project autocomplete (#)**

- [ ] Type `#` in input
- [ ] Autocomplete dropdown appears
- [ ] Shows existing projects
- [ ] Type partial name (e.g., `#alp`)
- [ ] List filters to matching projects
- [ ] Selection and navigation work same as owner autocomplete

**AC5.4: Tag autocomplete (+)**

- [ ] Type `+` in input
- [ ] Autocomplete dropdown appears
- [ ] Shows existing tags
- [ ] Type partial name (e.g., `+bu`)
- [ ] List filters to matching tags
- [ ] Selection and navigation work same as owner autocomplete

**AC5.5: Token preview badges appear**

- [ ] Type `Fix bug #alpha @AI +urgent`
- [ ] As you type, recognized tokens render as badges/pills
- [ ] `#alpha` shows as project badge
- [ ] `@AI` shows as owner badge
- [ ] `+urgent` shows as tag badge
- [ ] Badges appear in REAL-TIME (as you type, not after submission)
- [ ] Badge styling differentiates token types

**AC5.6: Enter key submits task**

- [ ] Type task: `New task #beta !p1`
- [ ] Press Enter key (do NOT click "Add Task" button)
- [ ] Task is created and added to board
- [ ] Input clears
- [ ] Works equivalently to clicking "Add Task"

**AC5.7: Autocomplete performance**

- [ ] Type quickly: `@@@###+++`
- [ ] Autocomplete appears within 100ms
- [ ] No lag or stuttering
- [ ] UI remains responsive

**AC5.8: Token parsing performance**

- [ ] Type long input with many tokens: `Task #p1 #p2 @user1 @user2 +tag1 +tag2 due:tomorrow`
- [ ] Token badges render within 50ms
- [ ] No visual delay or flicker

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Cross-Feature Integration Tests

### Integration 1: Autocomplete + Token Preview

- [ ] Type `@al` → autocomplete shows `alpha`
- [ ] Select with Enter → `@alpha` becomes badge
- [ ] Badge appears inline with continuing text
- [ ] Continue typing more tokens
- [ ] All badges update in real-time

### Integration 2: Priority Colors + Action Icons

- [ ] High priority task (P0) shows red border
- [ ] Same task shows all action icons (drag, move, timer)
- [ ] Icons are visible and usable on colored background
- [ ] No visual conflict between priority color and icons

### Integration 3: Empty States + Priority View

- [ ] Filter to show only P0 tasks
- [ ] All columns become empty except those with P0 tasks
- [ ] Empty columns show contextual messages
- [ ] Messages remain visible and readable

### Integration 4: Token Help + Autocomplete

- [ ] Open token help tooltip
- [ ] Start typing `@` in input
- [ ] Token help auto-dismisses
- [ ] Autocomplete appears
- [ ] Focus remains on input

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Performance Validation

**Automation**: ✅ Chrome MCP via performance APIs

### Chrome MCP Performance Script

```javascript
// Use mcp__chrome-devtools__performance_start_trace with reload=false, autoStop=false
// Interact with features (autocomplete, token preview, priority rendering)
// Use mcp__chrome-devtools__performance_stop_trace
// Analyze trace for frame drops and timing metrics
```

### Render Performance

- [ ] Open Chrome DevTools → Performance tab (or use MCP)
- [ ] Record while interacting with all 5 features
- [ ] Verify no frame drops during:
  - Token preview updates (<50ms)
  - Autocomplete filtering (<100ms)
  - Priority color rendering (<100ms)
- [ ] Drag-and-drop maintains 60fps (16ms frames)

### Memory Performance

- [ ] Open Chrome DevTools → Memory tab
- [ ] Interact with features for 2 minutes
- [ ] Take heap snapshot
- [ ] Verify no memory leaks (stable baseline)

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Accessibility Validation

### Keyboard Navigation

- [ ] Tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Help icon is keyboard accessible
- [ ] Autocomplete navigable with arrows
- [ ] Enter key works for selection and submission
- [ ] Escape key dismisses tooltips and dropdowns

### Screen Reader

- [ ] Enable VoiceOver (Mac) or NVDA (Windows)
- [ ] Action icons have descriptive ARIA labels
- [ ] Autocomplete announces result count
- [ ] Empty states are readable
- [ ] Token preview badges are announced

### Color Contrast

- [ ] Use browser extension (e.g., axe DevTools)
- [ ] Verify all priority colors meet WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Test in both light and dark modes

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Edge Cases

### Edge 1: No autocomplete data

- [ ] Empty board (no owners/projects/tags)
- [ ] Type `@`, `#`, `+`
- [ ] Autocomplete shows empty state or allows free text
- [ ] Free text entry works normally

### Edge 2: Long token strings

- [ ] Type input with 10+ tokens
- [ ] Token preview renders without overflow
- [ ] Autocomplete still performs well
- [ ] Enter key submission works

### Edge 3: Rapid toggling

- [ ] Click help icon 10 times rapidly
- [ ] Tooltip toggles without errors
- [ ] No visual glitches

### Edge 4: Column resizing

- [ ] Resize browser window from wide to narrow
- [ ] Empty state messages remain readable
- [ ] Priority colors remain visible
- [ ] Action icons remain accessible

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Build & Deploy Validation

### Build Process

```bash
npm run lint
npm run format:check
npm run build
```

- [ ] Lint passes with zero errors
- [ ] Format check passes
- [ ] Build completes successfully
- [ ] No console errors in production build

### GitHub Pages Deployment

- [ ] Deploy to gh-pages branch: `npm run deploy`
- [ ] Navigate to live URL
- [ ] All 5 features work in production
- [ ] No console errors
- [ ] Performance is acceptable on 3G simulation

**Result**: ☐ PASS | ☐ FAIL
**Notes**: ****\_\_\_****

---

## Summary Checklist

- [ ] Scenario 1: Token Help - PASS
- [ ] Scenario 2: Priority Colors - PASS
- [ ] Scenario 3: Empty States - PASS
- [ ] Scenario 4: Action Icons - PASS
- [ ] Scenario 5: Quick Add - PASS
- [ ] Integration Tests - PASS
- [ ] Performance - PASS
- [ ] Accessibility - PASS
- [ ] Edge Cases - PASS
- [ ] Build & Deploy - PASS

**Overall Result**: ☐ PASS | ☐ FAIL

**Tester**: ****\_\_\_****
**Date**: ****\_\_\_****
**Browser/Version**: ****\_\_\_****
**Issues Found**: ****\_\_\_****
