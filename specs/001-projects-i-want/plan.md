# Implementation Plan: Projects Module

**Branch**: `001-projects-i-want` | **Date**: 2025-09-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-projects-i-want/spec.md`

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

Add a Projects module to enable users to organize tasks into separate project contexts. Each project acts as a top-level filter for the task board, with a permanent Default project and support for creating, deleting, and switching between projects. Implementation will extend the existing single-file React application with Zustand state management while maintaining all current board functionality.

## Technical Context

**Language/Version**: JavaScript/ES2022, React 18
**Primary Dependencies**: React 18, Zustand 4.x, Tailwind CSS 3.x, Framer Motion, date-fns
**Storage**: localStorage (workday-board@v1 for tasks, new key for projects)
**Testing**: Manual QA (no test runner configured)
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: single (single-file React application)
**Performance Goals**: Instant project switching (<100ms), smooth drag-and-drop maintained
**Constraints**: Single-file architecture (WorkdayTaskBoardApp.jsx), offline-capable, localStorage persistence
**Scale/Scope**: Unlimited projects, existing task limit applies per project

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Core Principles Compliance

- [x] **Kanban Flow Integrity**: Projects module preserves 8 canonical columns, drag-and-drop, and left-to-right flow
- [x] **Task Metadata Fidelity**: Project association added as new metadata field, existing fields preserved
- [x] **Focus Timer Accountability**: Timer behavior unchanged, cross-project timer tracking added
- [x] **Local Persistence**: New project data persisted to localStorage with migration path
- [x] **Seamless Productivity**: UI remains in single file, Tailwind styling, light/dark theme support

### Product Requirements

- [x] Eight columns maintained without changes
- [x] Task fields extended with projectId while keeping all existing fields
- [x] Priority scoring and buckets unchanged
- [x] Quick-add tokens preserved, project context auto-applied
- [x] View modes (board/backlog) work within project context
- [x] Dark mode toggle unaffected
- [x] Self-tests can be extended for project functionality

### Development Workflow

- [x] Node 18+ development with Vite
- [x] ESLint and Prettier compliance maintained
- [x] Manual QA approach for new project features
- [x] Documentation updates planned for CLAUDE.md

## Project Structure

### Documentation (this feature)

```
specs/001-projects-i-want/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Option 1: Single project (DEFAULT) - SELECTED
src/
├── WorkdayTaskBoardApp.jsx  # All implementation in single file
└── [no other files - single-file architecture]

tests/
└── [manual QA only - no test files]
```

**Structure Decision**: Option 1 (Single project) - Maintaining single-file architecture per constitution

## Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - All technical context is known from existing codebase
   - No external dependencies to research
   - Pattern: Extend existing Zustand store structure

2. **Generate and dispatch research agents**:

   ```
   Task: "Research Zustand store extension patterns for multi-tenant data"
   Task: "Research localStorage migration strategies for schema changes"
   Task: "Research React dropdown/selector component patterns (no new deps)"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

1. **Extract entities from feature spec** → `data-model.md`:
   - Project entity: id, name, color, createdAt, isDefault
   - Task extension: Add projectId field
   - Store extension: projects array, currentProjectId

2. **Generate API contracts** from functional requirements:
   - No external APIs (localStorage only)
   - Internal contracts for store actions
   - Output action signatures to `/contracts/`

3. **Generate contract tests** from contracts:
   - Manual test scenarios for each action
   - Project CRUD operations
   - Task-project association tests

4. **Extract test scenarios** from user stories:
   - Create project scenario
   - Switch project scenario
   - Delete project with tasks scenario
   - Bulk move tasks scenario

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add projects module context
   - Update recent changes section
   - Keep under 150 lines

**Output**: data-model.md, /contracts/\*, test scenarios, quickstart.md, CLAUDE.md update

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (data model, contracts, quickstart)
- Each store action → implementation task
- Each UI component → creation task
- Each user story → manual QA task

**Ordering Strategy**:

- Data model extensions first
- Store actions next
- UI components after store
- Manual QA tasks last

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No constitutional violations detected - section not needed_

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
- [x] Complexity deviations documented (none)

---

_Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`_
