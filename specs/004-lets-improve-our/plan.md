# Implementation Plan: UI/UX Improvements for Task Management

**Branch**: `004-lets-improve-our` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-lets-improve-our/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

This feature implements 5 UI/UX improvements to enhance usability and reduce cognitive load: (1) collapsible token help to reduce visual clutter, (2) color-coded priority indicators for instant visual scanning, (3) contextual empty state messages for all columns, (4) always-visible action icons with universal symbols, and (5) real-time autocomplete and token preview in the quick-add input. All improvements are purely presentational changes to the existing single-file React application with no new data entities or state schema changes required.

## Technical Context

**Language/Version**: JavaScript (React 18)
**Primary Dependencies**: React 18, Zustand (state), Framer Motion (animations), Tailwind CSS, date-fns
**Storage**: localStorage (existing `workday-board@v1` schema - no changes needed)
**Testing**: Manual QA, Chrome DevTools MCP for E2E automation, in-app self-tests
**Target Platform**: Modern browsers (Chrome, Firefox, Safari), GitHub Pages deployment
**Project Type**: Single-file SPA (src/WorkdayTaskBoardApp.jsx)
**Performance Goals**: <100ms UI response, 60fps drag-and-drop, <50ms autocomplete
**Constraints**: Single-file architecture (constitutional), no localStorage schema changes, preserve all 8 columns and existing features
**Scale/Scope**: UI-only changes to ~5900 LOC single file, 5 improvement areas, 36 functional requirements

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Single-File Architecture ✅ PASS

- **Status**: COMPLIANT
- **Assessment**: All UI improvements will be implemented within existing `src/WorkdayTaskBoardApp.jsx`
- **Justification**: No new files needed - adding components (TokenHelp, PriorityBadge, EmptyState, ActionIcons, AutocompleteInput) inline with existing structure

### II. State Management First ✅ PASS

- **Status**: COMPLIANT
- **Assessment**: No new Zustand state required - only UI state (tooltip visibility, autocomplete state) via React hooks
- **Justification**: Token help visibility, autocomplete suggestions are ephemeral UI state not persistence-worthy

### III. Performance & Responsiveness ⚠️ REQUIRES ATTENTION

- **Status**: COMPLIANT (with implementation care)
- **Assessment**: Must ensure <100ms response for autocomplete, memoize priority color calculations
- **Requirements**:
  - Autocomplete debouncing for @/#/+ triggers
  - useMemo for priority color lookups
  - React.memo for repeated empty state components
  - Token parsing must remain <50ms

### IV. Code Quality Gates ✅ PASS

- **Status**: COMPLIANT
- **Assessment**: Standard ESLint/Prettier/build checks apply
- **Actions**: Verify `npm run lint && npm run build` before commit

### V. Feature Preservation ✅ PASS

- **Status**: COMPLIANT
- **Assessment**: All 8 columns preserved, all existing features (timer, drag-drop, quick-add tokens) enhanced not replaced
- **Verification**: Existing token parsing must extend, not replace. Empty states replace "No tasks" text only.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
src/
└── WorkdayTaskBoardApp.jsx   # Single-file app (~5900 LOC)
    ├── [New Components - inline]
    │   ├── TokenHelpTooltip      # Collapsible help display
    │   ├── PriorityBadge          # Color-coded priority indicator
    │   ├── EmptyColumnState       # Contextual empty messages
    │   ├── TaskActionIcons        # Always-visible action icons
    │   └── AutocompleteInput      # Token preview + suggestions
    ├── [Existing Components - to enhance]
    │   ├── TaskCard               # Add priority colors, action icons
    │   ├── Column                 # Add empty states
    │   ├── QuickAddInput          # Add autocomplete, preview
    │   └── BacklogView            # Add priority colors, action icons
    └── [Zustand Store - unchanged]

public/
├── index.html
└── [other static assets]

# No tests/ directory - manual QA + Playwright E2E
```

**Structure Decision**: Single-file SPA architecture as per constitutional requirement I. All new components will be defined inline within `src/WorkdayTaskBoardApp.jsx` above or below existing component definitions. No new files, no external modules. This maintains the "entire app in one read" benefit while adding ~500-800 LOC for the 5 UI improvements.

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/README.md (N/A note), quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:
Given this is a UI-only feature with no API contracts:

- Generate tasks from component designs in research.md and data-model.md
- Each UI component → component creation task
- Each enhancement area → integration task
- Quickstart scenarios → manual validation tasks

**Component Tasks** (5 new components):

1. Create TokenHelpTooltip component (FR-001 to FR-005)
2. Create PriorityBadge component with color mapping (FR-006 to FR-012)
3. Create EmptyColumnState component with message map (FR-013 to FR-019)
4. Create TaskActionIcons component (FR-020 to FR-026)
5. Create AutocompleteInput component with token preview (FR-027 to FR-036)

**Enhancement Tasks** (existing components): 6. Enhance TaskCard with priority colors and action icons 7. Enhance Column with empty state rendering 8. Enhance QuickAddInput with autocomplete and preview 9. Enhance BacklogView with priority colors and action icons

**Integration Tasks**: 10. Integrate TokenHelpTooltip into main app header 11. Test priority colors across all views (board + backlog) 12. Test empty states in all 8 columns 13. Test autocomplete with all trigger types (@/#/+) 14. Test Enter key submission

**Performance Tasks**: 15. Add memoization for priority color lookups 16. Add debouncing for autocomplete (100ms) 17. Add debouncing for token parsing (50ms) 18. Verify 60fps drag-drop maintained

**Validation Tasks** (using Chrome MCP tools): 19. Automated E2E tests via Chrome DevTools MCP (token help, autocomplete, priority colors) 20. Execute quickstart.md acceptance tests manually 21. Accessibility audit (keyboard nav, screen reader, contrast) via Chrome MCP 22. Performance profiling via Chrome DevTools MCP (<100ms response, <50ms parsing) 23. Cross-browser manual testing (Firefox, Safari)

**Ordering Strategy**:

- Component creation first (parallel)
- Enhancement tasks after components exist (parallel within group)
- Integration tasks after enhancements (sequential)
- Performance optimization throughout
- Validation at end

**Estimated Output**: ~23-26 numbered, ordered tasks in tasks.md (includes Chrome MCP automation)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Complexity Tracking

_No violations - all constitutional checks passed_

This feature requires zero complexity deviations:

- Single-file architecture maintained
- No new Zustand state (UI state only)
- Performance requirements met through memoization and debouncing
- All existing features preserved and enhanced

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - 32 tasks created
- [x] Phase 4: Implementation complete (15/32 tasks - core features functional)
- [ ] Phase 5: Validation passed (pending testing)

**Gate Status**:

- [x] Initial Constitution Check: PASS (all 5 principles compliant)
- [x] Post-Design Constitution Check: PASS (re-verified after Phase 1)
- [x] All NEEDS CLARIFICATION resolved (research.md complete)
- [x] Complexity deviations documented (none required)

**Artifacts Generated**:

- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/README.md (Phase 1 - N/A for UI-only feature)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)
- [x] tasks.md (Phase 3) - 32 implementation tasks

---

_Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`_
