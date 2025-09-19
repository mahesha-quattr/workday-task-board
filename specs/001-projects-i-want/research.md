# Research Notes: Projects Module Implementation

## Zustand Store Extension Pattern

**Decision**: Extend existing store with projects slice using spread operator pattern
**Rationale**:

- Maintains single store instance as per current architecture
- Allows clean separation of concerns while keeping single-file constraint
- Zustand's immer middleware handles nested updates safely

**Alternatives Considered**:

- Separate store: Rejected - violates single-file architecture
- Context API: Rejected - would require refactoring existing Zustand usage
- Direct state mutation: Rejected - breaks React rendering

**Implementation Pattern**:

```javascript
// Extend existing store
const useTaskBoardStore = create(
  persist((set, get) => ({
    // Existing state...
    tasks: [],

    // New project state
    projects: [
      { id: 'default', name: 'Default', color: '#6B7280', isDefault: true, createdAt: Date.now() },
    ],
    currentProjectId: 'default',

    // New project actions
    createProject: (name) =>
      set((state) => ({
        projects: [
          ...state.projects,
          {
            id: `proj_${Date.now()}`,
            name,
            color: generateProjectColor(state.projects.length),
            isDefault: false,
            createdAt: Date.now(),
          },
        ],
      })),

    // Filter tasks by current project
    getVisibleTasks: () => {
      const state = get();
      return state.tasks.filter((t) => t.projectId === state.currentProjectId);
    },
  })),
);
```

## localStorage Migration Strategy

**Decision**: Version-based migration with backward compatibility
**Rationale**:

- Preserves existing user data
- Allows rollback if issues arise
- Clear upgrade path for future changes

**Alternatives Considered**:

- Clean slate: Rejected - would lose user data
- Parallel storage: Rejected - complexity without benefit
- No versioning: Rejected - makes future migrations harder

**Migration Approach**:

```javascript
// Check storage version and migrate if needed
const migrateStorage = () => {
  const stored = localStorage.getItem('workday-board@v1');
  if (stored) {
    const data = JSON.parse(stored);
    if (!data.state?.projects) {
      // Add default project and assign all tasks
      data.state.projects = [defaultProject];
      data.state.currentProjectId = 'default';
      data.state.tasks =
        data.state.tasks?.map((t) => ({
          ...t,
          projectId: t.projectId || 'default',
        })) || [];
      localStorage.setItem('workday-board@v1', JSON.stringify(data));
    }
  }
};
```

## React Dropdown Component Pattern

**Decision**: Inline dropdown using existing Tailwind classes and React state
**Rationale**:

- No new dependencies needed
- Consistent with existing UI patterns
- Accessible with ARIA attributes

**Alternatives Considered**:

- Headless UI: Rejected - new dependency
- React Select: Rejected - new dependency
- Native select: Rejected - limited styling options

**Component Pattern**:

```javascript
const ProjectSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const projects = useTaskBoardStore((state) => state.projects);
  const currentProjectId = useTaskBoardStore((state) => state.currentProjectId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentProject.color }} />
        <span>{currentProject.name}</span>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                selectProject(project.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Color Palette Generation

**Decision**: Predefined palette with deterministic selection
**Rationale**:

- Ensures good contrast in light/dark modes
- Avoids color collision for small project counts
- Professional appearance

**Alternatives Considered**:

- Random HSL: Rejected - unpredictable contrast
- User selection: Rejected - adds UI complexity
- Hash-based: Rejected - may produce poor colors

**Color Set**:

```javascript
const PROJECT_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

const generateProjectColor = (index) => PROJECT_COLORS[index % PROJECT_COLORS.length];
```

## Performance Optimization

**Decision**: Memoized task filtering with React.memo on task cards
**Rationale**:

- Project switching remains instant
- Prevents unnecessary re-renders
- Maintains drag-and-drop performance

**Alternatives Considered**:

- Virtual scrolling: Rejected - overkill for typical task counts
- Web Workers: Rejected - unnecessary complexity
- No optimization: Rejected - could impact UX with many tasks

## Key Technical Decisions Summary

1. **State Management**: Extend existing Zustand store with projects slice
2. **Data Migration**: Version-based with automatic upgrade on first load
3. **UI Components**: Inline React components using Tailwind
4. **Project Colors**: Predefined palette with modulo selection
5. **Task Filtering**: Computed property in store with memoization
6. **Project IDs**: Timestamp-based with prefix (`proj_${Date.now()}`)
7. **Default Project**: Hardcoded ID 'default' with isDefault flag
8. **Storage Keys**: Reuse existing `workday-board@v1` with extended schema

## Implementation Risks & Mitigations

**Risk**: Breaking existing task data
**Mitigation**: Backup prompt before migration, reversible changes

**Risk**: Performance degradation with many projects
**Mitigation**: Lazy loading project list, search/filter in selector

**Risk**: Complex UI in single file
**Mitigation**: Clear section comments, consistent patterns

## Dependencies Required

None - all functionality achievable with existing deps:

- React 18 (already present)
- Zustand (already present)
- Tailwind CSS (already present)
- date-fns (already present for timestamps)
