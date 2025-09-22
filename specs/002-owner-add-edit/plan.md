# Implementation Plan: Owner Add-Edit-Remove

**Branch**: `002-owner-add-edit` | **Date**: 2025-09-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-owner-add-edit/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
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

Implement task ownership management in the Kanban board allowing users to add multiple owners to tasks, remove owners, and transfer ownership. Tasks support multiple concurrent owners with free text names (no duplicates within same task). The feature includes filtering by owner and inline UI for managing owners on task cards.

## Technical Context

**Language/Version**: JavaScript ES6+ / React 18
**Primary Dependencies**: React, Zustand, Framer Motion, Tailwind CSS
**Storage**: localStorage (key: `workday-board@v1`)
**Testing**: Manual QA (no test runner configured)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: single (single-file React application)
**Performance Goals**: <100ms task updates, instant UI feedback
**Constraints**: Single-file architecture, offline-capable, localStorage persistence
**Scale/Scope**: Single user, ~100-500 tasks typical, 8 columns

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Kanban Flow Integrity**: No changes to 8 columns or flow mechanics
- [x] **Task Metadata Fidelity**: Extends task metadata with owners array
- [x] **Focus Timer Accountability**: No impact on timer functionality
- [x] **Local Persistence**: Owners stored in localStorage with tasks
- [x] **Seamless Productivity**: Inline UI maintains single-file architecture
- [x] **Quick-add Support**: Can extend to parse @owner tokens
- [x] **Priority System**: No changes to scoring or buckets
- [x] **View Modes**: Works in both board and backlog views

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
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Single-file architecture (all code in WorkdayTaskBoardApp.jsx)

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
   - Run `.specify/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Focus on single-file implementation strategy
- Group related changes for atomic commits

**Task Categories**:

1. **Data Model Tasks** (1-3 tasks)
   - Extend task model with owners array
   - Add migration logic for owner → owners
   - Add validation for owner operations

2. **Store Actions Tasks** (4-8 tasks)
   - Implement addOwnerToTask action
   - Implement removeOwnerFromTask action
   - Implement transferTaskOwnership action
   - Implement owner filtering logic
   - Add computed values (getTasksByOwner, etc.)

3. **UI Component Tasks** (5-7 tasks)
   - Create owner badge component
   - Add inline owner editor to task card
   - Implement owner display with overflow
   - Add owner filter to filter bar
   - Update task card layout

4. **Quick-Add Integration** (2-3 tasks)
   - Add @owner token parsing
   - Update parseQuickAdd function
   - Add tests for token parsing

5. **Testing & Validation** (3-5 tasks)
   - Manual QA checklist execution
   - Performance validation
   - Migration testing
   - Accessibility checks

**Ordering Strategy**:

- Data model first (foundation)
- Store actions next (business logic)
- UI components (user interaction)
- Integration features (quick-add)
- Testing throughout

**Estimated Output**: 18-26 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Post-Design Constitution Re-Check

_After Phase 1 design completion_

- [x] **Kanban Flow Integrity**: No changes to columns or transitions
- [x] **Task Metadata Fidelity**: Owners array added cleanly to task model
- [x] **Focus Timer Accountability**: No timer functionality affected
- [x] **Local Persistence**: Owners stored with existing localStorage pattern
- [x] **Seamless Productivity**: Single-file architecture maintained
- [x] **Quick-add Tokens**: @owner token follows existing patterns
- [x] **No Breaking Changes**: Migration preserves existing data

All constitution principles maintained. No violations requiring justification.

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

No violations - feature aligns with all constitutional requirements.

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
