# CONSTITUTION.md

## Project Overview

**Workday Task Board** is a single-page React application that provides an intelligent Kanban-style task management system with focus tracking, priority scoring, and AI delegation capabilities.

## Core Requirements

### Functional Requirements

1. **Task Management**
   - Create, read, update, and delete tasks
   - Drag-and-drop between status columns
   - Quick-add with token parsing (#project, @owner, !priority, +tags, due:date)
   - Bulk operations (multi-select and delete)

2. **Status Workflow**
   - Eight status columns: Backlog, Ready, In Progress, Waiting on AI, Waiting on Others, Blocked, In Review, Done
   - Visual board view (Kanban) and list view (Backlog)
   - Drag-and-drop reordering within and between columns

3. **Priority System**
   - Score-based prioritization (impact, urgency, effort factors)
   - Priority buckets (P0-P3) with visual indicators
   - Automatic due date boost for time-sensitive tasks

4. **Focus Timer**
   - Start/pause timer on individual tasks
   - Automatic status transitions (Ready → In Progress)
   - Optional auto-return to Ready on pause
   - Elapsed time tracking and display

5. **Data Persistence**
   - Local storage with versioned schema (`workday-board@v1`)
   - Automatic save on all changes
   - No backend required

### Non-Functional Requirements

1. **Performance**
   - Instant UI responses (< 100ms for user actions)
   - Smooth animations using Framer Motion
   - Efficient re-renders with Zustand state management

2. **Accessibility**
   - Keyboard navigation support
   - ARIA labels and roles
   - High contrast mode support via dark theme

3. **Browser Support**
   - Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
   - Responsive design (mobile, tablet, desktop)
   - Progressive enhancement

## Technical Standards

### Code Quality

1. **Formatting** (CRITICAL - Prevents CI/CD failures)
   ```bash
   # Before EVERY commit, run:
   npm run format        # Auto-fix formatting
   npm run format:check  # Verify formatting
   npm run lint         # Check for linting issues
   npm run lint:fix     # Auto-fix linting issues
   ```

   **⚠️ GitHub Actions will FAIL if formatting is incorrect!**

   Pre-commit checklist:
   - [ ] Run `npm run format` to fix formatting
   - [ ] Run `npm run lint:fix` to fix linting issues
   - [ ] Run `npm run build` to verify build succeeds
   - [ ] Run `npm run format:check` to confirm formatting

2. **Code Style**
   - Prettier configuration (see `.prettierrc.json`)
   - ESLint rules (see `.eslintrc.cjs`)
   - Single quotes, semicolons, 100-char line width
   - 2-space indentation

3. **Component Guidelines**
   - Functional components with hooks
   - PascalCase for components
   - camelCase for functions and variables
   - Descriptive naming (prefer clarity over brevity)

### Architecture Decisions

1. **Single-File MVP Approach**
   - All logic in `src/WorkdayTaskBoardApp.jsx` (intentional for rapid iteration)
   - Inline Zustand store definition
   - Embedded styles using Tailwind classes

2. **State Management**
   - Zustand for global state (tasks, filters, UI state)
   - React local state for component-specific UI
   - No prop drilling - direct store access

3. **Styling**
   - Tailwind CSS with dark mode support (class-based)
   - Inline styles only when dynamic
   - Consistent spacing scale (4px base)

4. **Dependencies**
   - Minimal external dependencies
   - Core: React, Zustand, Framer Motion, Tailwind
   - Utilities: date-fns, clsx, lucide-react
   - Build: Vite, PostCSS

## Development Workflow

### Setup
```bash
npm install          # Install dependencies
npm run dev          # Start development server
```

### Testing
```bash
npm run build        # Verify production build
npm run preview      # Preview production build
npm run format:check # Verify formatting
npm run lint         # Check code quality
```

### Deployment
```bash
npm run deploy       # Deploy to GitHub Pages
```

## Quality Gates

### Pre-Commit
- [ ] All tests passing (when implemented)
- [ ] No console errors or warnings
- [ ] Formatting verified (`npm run format:check`)
- [ ] Lint checks passing (`npm run lint`)
- [ ] Build successful (`npm run build`)

### Pre-Merge
- [ ] GitHub Actions CI passing
- [ ] Code review completed
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated

## Maintenance

### Regular Tasks
- Weekly: Review and triage bugs
- Monthly: Update dependencies (security patches)
- Quarterly: Performance audit
- As needed: Feature additions based on user feedback

### Breaking Changes
- Must bump version in `package.json`
- Update CHANGELOG.md with migration guide
- Consider localStorage migration for schema changes

## Security Considerations

1. **Data Storage**
   - All data stored locally (no server transmission)
   - No PII/sensitive data in localStorage
   - XSS protection via React's default escaping

2. **Dependencies**
   - Regular updates for security patches
   - npm audit on CI pipeline
   - No unnecessary permissions requested

## Performance Targets

- Initial load: < 3s on 3G connection
- Time to interactive: < 1s
- Lighthouse score: > 90 for Performance
- Bundle size: < 500KB gzipped

## Future Considerations

- [ ] TypeScript migration for better type safety
- [ ] Component extraction for reusability
- [ ] Unit and integration tests
- [ ] Backend sync capability
- [ ] Collaborative features
- [ ] Mobile app (React Native)

---

*This constitution serves as the source of truth for project standards and requirements. Any deviations should be documented and justified.*