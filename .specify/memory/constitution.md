<!--
Sync Impact Report:
Version: 0.0.0 → 1.0.0
Changed: Initial constitution creation for Workday Task Board
Added Principles:
  - I. Single-File Architecture
  - II. State Management First
  - III. Performance & Responsiveness (NON-NEGOTIABLE)
  - IV. Code Quality Gates
  - V. Feature Preservation
Added Sections:
  - Development Workflow
  - Quality Standards
  - Governance
Templates Status:
  ✅ plan-template.md - Constitution Check section already generic, no changes needed
  ✅ spec-template.md - No constitution-specific references, no changes needed
  ✅ tasks-template.md - No constitution-specific references, no changes needed
  ✅ CLAUDE.md - Already contains project-specific guidance aligned with constitution
Follow-up TODOs: None
-->

# Workday Task Board Constitution

## Core Principles

### I. Single-File Architecture

The application MUST maintain its single-file MVP architecture in `src/WorkdayTaskBoardApp.jsx`. All business logic, state management, and UI components MUST reside in this single file unless a component extraction demonstrably improves readability AND does not compromise maintainability.

**Rationale**: The single-file architecture provides immediate comprehension of the entire application state and logic flow, eliminates import hell, and ensures any AI coding assistant can understand the full context in a single file read. This trade-off prioritizes development velocity and context clarity over traditional separation of concerns.

**Rules**:

- New features MUST be integrated into the existing file structure
- Component extraction requires explicit justification showing readability improvement
- State management MUST remain inline with Zustand store definition
- File size growth is acceptable; complexity growth requires refactoring within the same file

### II. State Management First

All state changes MUST flow through the Zustand store. Direct state mutations outside the store are PROHIBITED. localStorage persistence MUST be handled exclusively by store hydration and persistence middleware.

**Rationale**: Centralized state management ensures predictable data flow, enables time-travel debugging capabilities, and provides a single source of truth. The Zustand pattern with localStorage persistence guarantees state durability across sessions while maintaining performance.

**Rules**:

- New features MUST define store state and actions before UI implementation
- Store actions MUST be pure functions (no side effects except localStorage)
- localStorage keys MUST follow the pattern: `workday-board@{key-name}`
- Store schema changes require careful migration planning for existing user data

### III. Performance & Responsiveness (NON-NEGOTIABLE)

All user interactions MUST respond within 100ms. Operations that require longer processing MUST provide immediate visual feedback (loading states, optimistic updates). The application MUST remain usable on mid-range devices from 2020+.

**Rationale**: Task management tools are used continuously throughout the workday. Any perceived lag breaks flow state and reduces adoption. The 100ms threshold is based on human perception of instant response.

**Rules**:

- UI interactions MUST feel instant (<100ms)
- Drag-and-drop operations MUST maintain 60fps
- localStorage operations MUST be debounced/throttled for bulk changes
- Heavy computations (priority scoring, filtering) MUST be memoized
- Component re-renders MUST be minimized via proper dependency arrays

### IV. Code Quality Gates

All code MUST pass ESLint and Prettier checks before commit. Production builds MUST complete without errors. The application MUST be deployable to GitHub Pages at any commit on main/master branch.

**Rationale**: Automated quality gates prevent technical debt accumulation and ensure the main branch is always deployable. The CI/CD pipeline enforces these standards automatically.

**Rules**:

- `npm run lint` MUST pass with zero errors
- `npm run build` MUST complete successfully
- `npm run format:check` MUST pass before commits
- GitHub Actions CI MUST be green on all branches
- Breaking changes to localStorage schema MUST include migration code

### V. Feature Preservation

All existing features MUST be preserved during refactoring or new feature additions. The eight-column workflow, focus timer, quick-add tokens, drag-and-drop, and project module are core features that MUST NOT be degraded or removed.

**Rationale**: Users build muscle memory and workflows around existing features. Regression or removal breaks trust and productivity. New features MUST integrate harmoniously with existing functionality.

**Rules**:

- Existing column structure (8 columns) MUST be maintained
- Quick-add token parsing MUST remain functional and extend for new features
- Focus timer state transitions MUST be preserved
- Drag-and-drop hit detection MUST not regress
- localStorage data from previous versions MUST remain readable (migrations only)

## Development Workflow

### Feature Development

1. Features MUST start with a specification (use `/specify` command)
2. Complex features MUST have an implementation plan (use `/plan` command)
3. Implementation MUST be tracked via tasks (use `/tasks` command)
4. Features MUST be developed on feature branches named `###-feature-name`
5. Feature branches MUST be rebased or merged into main/master after validation

### Code Review Requirements

- All changes MUST pass automated CI checks
- Breaking changes MUST be documented with migration guides
- Performance-critical paths MUST be manually tested
- New features MUST include inline documentation explaining behavior
- Commit messages MUST follow Conventional Commits format (feat:, fix:, chore:, docs:, refactor:)

### Testing Strategy

- Manual QA is the primary testing method (no formal test runner currently)
- In-app self-tests MUST be updated for new features where applicable
- Playwright MCP tools SHOULD be used for E2E validation of critical paths
- localStorage state transitions MUST be manually validated
- Cross-browser testing SHOULD include Chrome, Firefox, Safari

## Quality Standards

### Code Style

- Prettier configuration MUST be respected (semicolons, single quotes, 100-char width)
- JSX components MUST use PascalCase naming
- React hooks MUST follow `useThing` naming pattern
- Zustand store keys MUST use camelCase
- Tailwind classes MUST remain inline (extract only when readability improves)

### Documentation

- CLAUDE.md MUST be updated for architectural changes
- README.md MUST reflect current feature set and deployment process
- Inline comments MUST explain "why" not "what"
- Complex algorithms (priority scoring, drag-and-drop) MUST have explanatory comments

### Performance Benchmarks

- Initial page load: <2s on 3G
- Task creation: <50ms
- Drag-and-drop response: 16ms (60fps)
- Owner autocomplete: <100ms
- localStorage read/write: <20ms

## Governance

### Amendment Process

This constitution can be amended when:

1. A fundamental architectural decision requires different constraints
2. New technology or patterns provide measurably better outcomes
3. User feedback indicates constitutional principles harm usability

Amendments MUST:

- Document the rationale for change
- Update the version number following semantic versioning
- Propagate changes to all dependent templates and documentation
- Be approved before implementation begins

### Versioning Policy

- **MAJOR** version increment: Backward incompatible governance changes, principle removals, or fundamental architectural shifts
- **MINOR** version increment: New principles added, existing principles materially expanded, new sections added
- **PATCH** version increment: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

- All pull requests MUST verify compliance with constitutional principles
- Complex features MUST include a constitution compliance section in their plan
- Any deviation from principles MUST be explicitly justified with cost-benefit analysis
- Use `CLAUDE.md` for runtime development guidance; this constitution defines project governance

**Version**: 1.0.0 | **Ratified**: 2025-10-01 | **Last Amended**: 2025-10-01
