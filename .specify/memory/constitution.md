# Workday Task Board Constitution

## Core Principles

### I. Single Source of Truth
All task data lives in localStorage with versioned schema (`workday-board@v1`). No backend dependencies, ensuring full offline capability and user data ownership. Every state change is immediately persisted.

### II. Intelligent Prioritization
Tasks are scored using a formula: `(2×impact + 1.5×urgency) − effort + due_boost`. Priority buckets (P0-P3) provide visual hierarchy. Due dates automatically boost priority as deadlines approach.

### III. Focus-First Workflow
Timer integration directly into task cards. Automatic status transitions (Ready → In Progress) when timer starts. Optional auto-return to Ready on pause. Elapsed time tracking for productivity insights.

### IV. Code Quality Gates (NON-NEGOTIABLE)
Before EVERY commit:
- Run `npm run format` to auto-fix formatting
- Run `npm run lint:fix` to fix linting issues
- Run `npm run build` to verify compilation
- Run `npm run format:check` to confirm formatting
GitHub Actions will FAIL if these checks aren't passing.

### V. Rapid Iteration Architecture
Single-file MVP (`WorkdayTaskBoardApp.jsx`) for fast development. All components, state, and logic in one place. Refactoring deferred until patterns stabilize. Direct Zustand store access, no prop drilling.

## Technical Standards

### Development Workflow
```bash
# Setup
npm install          # Install dependencies
npm run dev          # Start development server

# Pre-commit (MANDATORY)
npm run format       # Fix formatting
npm run lint:fix     # Fix linting
npm run build        # Verify build
npm run format:check # Confirm formatting

# Deployment
npm run deploy       # Deploy to GitHub Pages
```

### Code Style
- Prettier: Single quotes, semicolons, 100-char width, 2-space indent
- ESLint: React hooks rules, JSX a11y, no console in production
- Components: Functional with hooks, PascalCase naming
- State: Zustand for global, React hooks for local

### UI/UX Standards
- Tailwind CSS with dark mode (class-based toggle)
- Framer Motion for drag-and-drop and animations
- Responsive breakpoints: mobile (375px), tablet (768px), desktop (1024px+)
- Accessibility: ARIA labels, keyboard navigation, high contrast support

## Performance Requirements

### Metrics
- Initial load: < 3s on 3G
- Time to interactive: < 1s
- Bundle size: < 500KB gzipped
- Lighthouse score: > 90 Performance

### Optimization Rules
- Minimal re-renders via Zustand selectors
- Lazy load heavy components
- Debounce search/filter operations
- Batch localStorage writes

## Feature Requirements

### Core Features (Must Have)
1. Task CRUD with drag-and-drop
2. Eight-column status workflow
3. Quick-add with token parsing
4. Focus timer with status sync
5. Multi-select and bulk operations
6. Board and Backlog views
7. Dark/light theme toggle

### Token System
- `#project` - Assign to project
- `@me/@ai/@other` - Set owner
- `!p0-p3` - Set priority
- `+tag` - Add tags
- `due:today/tomorrow/YYYY-MM-DD` - Set due date
- `impact:0-5 urgency:0-5 effort:0-5` - Set scoring factors

## Quality Assurance

### Pre-Commit Checklist
- [ ] Formatting verified (`npm run format:check`)
- [ ] Linting passed (`npm run lint`)
- [ ] Build successful (`npm run build`)
- [ ] No console errors in browser
- [ ] Dark mode tested
- [ ] Mobile responsive tested

### CI/CD Pipeline
- GitHub Actions on every push
- Formatting check (will fail if incorrect)
- Linting check
- Build verification
- Auto-deploy to GitHub Pages on main branch

## Data Schema

### Task Object
```javascript
{
  id: string,              // UUID
  title: string,           // Required
  project: string,         // Optional
  status: Status,          // Eight predefined statuses
  ownerType: OwnerType,    // me|ai|other
  tags: string[],          // Optional
  dueAt: Date,            // Optional
  impact: 0-5,            // Default: 2
  urgency: 0-5,           // Default: 2
  effort: 0-5,            // Default: 2
  priorityBucket: string,  // P0-P3, calculated
  priorityScore: number,   // Calculated
  notes: string,          // Optional
  timerStartedAt: Date,   // Optional
  elapsedSecs: number,    // Default: 0
  createdAt: Date,        // Auto-set
  updatedAt: Date         // Auto-update
}
```

### localStorage Structure
```javascript
'workday-board@v1': {
  tasks: Task[],
  version: 1,
  lastUpdated: Date
}
```

## Governance

### Constitution Authority
This constitution supersedes all other documentation. Any deviation requires explicit justification and should be documented in commit messages.

### Amendment Process
1. Document proposed change in GitHub issue
2. Implement change with clear commit message
3. Update constitution.md accordingly
4. Update CHANGELOG.md if breaking change

### Review Requirements
- All PRs must verify constitution compliance
- Formatting MUST pass before merge
- Performance metrics maintained
- Accessibility standards upheld

**Version**: 1.0.0 | **Ratified**: 2025-09-18 | **Last Amended**: 2025-09-18