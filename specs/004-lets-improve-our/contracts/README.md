# API Contracts

**Feature**: 004-lets-improve-our (UI/UX Improvements)
**Status**: N/A - No API contracts

## Why This Directory is Empty

This feature implements **pure UI/UX improvements** with zero backend or API changes:

1. **No new endpoints**: All improvements are client-side rendering enhancements
2. **No data mutations**: Uses existing Zustand store actions, no new API calls
3. **No external integrations**: Autocomplete, token parsing, and priority colors are all local operations
4. **No schema changes**: localStorage structure remains unchanged

## Component Contracts (UI)

While there are no API contracts, the UI components have informal contracts:

### TokenHelpTooltip
```typescript
interface TokenHelpTooltipProps {
  visible: boolean;
  onDismiss: () => void;
}
```

### PriorityBadge
```typescript
interface PriorityBadgeProps {
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  className?: string;
}
```

### EmptyColumnState
```typescript
interface EmptyColumnStateProps {
  columnName: string;
}
```

### AutocompleteInput
```typescript
interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  suggestions: {
    owners: string[];
    projects: string[];
    tags: string[];
  };
}
```

### TaskActionIcons
```typescript
interface TaskActionIconsProps {
  taskId: string;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onStartTimer: () => void;
  showMoveLeft: boolean;
  showMoveRight: boolean;
}
```

## Testing Strategy

Since there are no API contracts, testing focuses on:

1. **Visual regression**: Screenshot comparison for priority colors and empty states (Chrome MCP)
2. **Interaction testing**: Chrome DevTools MCP for autocomplete, token preview, help tooltip automation
3. **Accessibility testing**: ARIA labels, keyboard navigation, contrast ratios (Chrome MCP + manual)
4. **Performance testing**: Render time, autocomplete latency, token parsing speed (Chrome MCP Performance API)

See `quickstart.md` for detailed acceptance test scenarios with Chrome MCP automation scripts.
