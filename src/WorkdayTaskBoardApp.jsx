import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { create } from 'zustand';
import {
  format,
  parseISO,
  isBefore,
  addDays,
  addHours,
  isToday,
  isTomorrow,
  differenceInHours,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Bot,
  Clock,
  Timer as TimerIcon,
  Pause,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Trash2,
  Play,
  Flame,
  AlertTriangle,
  GripVertical,
  Mic,
  MicOff,
  Kanban,
  List,
  Settings,
  Check,
  Users,
  Search,
  UserCheck,
  Sun,
  Moon,
} from 'lucide-react';
import clsx from 'clsx';
import logoLight from '/assets/light/flowtrackr-logo.png';
import logoDark from '/assets/dark/flowtrackr-logo.png';

/**
 * Workday Task Board — MVP Prototype (single-file)
 *
 * Patch 3: Focus timer UX
 * - ▶️ Play now starts a live timer chip on the card and auto-moves the task to In Progress.
 * - ⏸ Pause stops the timer, logs time, and (optionally) returns the card to Ready via a toggle.
 * - Inline time chip shows running elapsed or total logged time when paused.
 * - Added preferences: autoReturnOnStop (toggle in toolbar).
 * - Added pure helpers `computeElapsedSecs` and `formatDurationShort` + tests.
 * - DnD remains hit-tested via elementsFromPoint; backward/forward moves work.
 *
 * Quick-add tokens: !p0..p3, due:today|tomorrow|YYYY-MM-DD|HH:mm, @ai, @me,
 * +tag, effort:1..5, impact:0..5, urgency:0..5, expect:today|YYYY-MM-DD
 */

// ----- Types -----

/** @typedef {"backlog"|"ready"|"in_progress"|"waiting_ai"|"waiting_other"|"blocked"|"in_review"|"done"} Status */
/** @typedef {"self"|"ai"|"other"} OwnerType */
/** @typedef {"board"|"backlog"} ViewMode */

// ----- Constants -----

const STATUS_META = /** @type{Record<Status,{label:string, key:string, hint:string}>} */ ({
  backlog: { label: 'Backlog', key: '1', hint: 'Ideas and unsorted' },
  ready: { label: 'Ready', key: '2', hint: 'Triage done' },
  in_progress: { label: 'In Progress', key: '3', hint: 'Actively doing' },
  waiting_ai: { label: 'Waiting on AI', key: '4', hint: 'Delegated to agent' },
  waiting_other: { label: 'Waiting on Others', key: '5', hint: 'Blocked by a human' },
  blocked: { label: 'Blocked', key: '6', hint: 'Needs unblocking' },
  in_review: { label: 'In Review', key: '7', hint: 'PR/review/QA' },
  done: { label: 'Done', key: '8', hint: 'Completed' },
});

const STATUS_ORDER = /** @type{Status[]} */ (Object.keys(STATUS_META));

const PRIORITY_COLORS = {
  P0: 'bg-red-50 text-red-600 border-l-4 border-l-red-500',
  P1: 'bg-orange-50 text-orange-600 border-l-4 border-l-orange-500',
  P2: 'bg-amber-50 text-amber-600 border-l-4 border-l-amber-500',
  P3: 'bg-slate-50 text-slate-600 border-l-4 border-l-gray-400',
};

// ----- Helpers -----

// selection helpers (pure)
function toggleId(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
function filterOutByIds(tasks, ids) {
  const set = new Set(ids);
  return tasks.filter((t) => !set.has(t.id));
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function scoreToBucket(score) {
  if (score >= 80) return 'P0';
  if (score >= 60) return 'P1';
  if (score >= 40) return 'P2';
  return 'P3';
}

function parseDueToken(parts) {
  // Accept due:today|tomorrow|YYYY-MM-DD|HH:mm or combinations like "tomorrow 16:00"
  if (!parts || parts.length === 0) return null;
  let d = new Date();
  if (parts[0] === 'today') {
    // keep today
  } else if (parts[0] === 'tomorrow') {
    d = addDays(d, 1);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
    d = parseISO(parts[0]);
  }
  // time part
  const timePart = parts.find((p) => /^\d{1,2}:\d{2}$/.test(p));
  if (timePart) {
    const [hh, mm] = timePart.split(':').map(Number);
    d.setHours(hh, mm, 0, 0);
  } else {
    // default 18:00 local
    d.setHours(18, 0, 0, 0);
  }
  return d.toISOString();
}

function humanDue(dueAt) {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  const base = format(d, 'EEE, MMM d HH:mm');
  return base + (isToday(d) ? ' · today' : isTomorrow(d) ? ' · tomorrow' : '');
}

function priorityScore({
  impact = 0,
  urgency = 0,
  effort = 0,
  dueAt = null,
  hasUnblockedDeps = false,
  meetingContext = false,
}) {
  let score = 2 * impact + 1.5 * urgency - effort;
  if (dueAt) {
    const now = new Date();
    const d = new Date(dueAt);
    const hrs = differenceInHours(d, now);
    if (hrs <= 24) score += 2;
    else if (hrs <= 72) score += 1;
  }
  if (hasUnblockedDeps) score += 1;
  if (meetingContext) score += 1;
  return clamp(Math.round(score * 10) / 10, 0, 100);
}

// Timer helpers (pure, testable)
function computeElapsedSecs(task, now = new Date()) {
  let base = task.timeLogSecs || 0;
  if (task.timerStartedAt) {
    const started = new Date(task.timerStartedAt);
    base += Math.max(0, Math.floor((now - started) / 1000));
  }
  return base;
}

function formatDurationShort(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m${sec ? ` ${sec}s` : ''}`;
  return `${sec}s`;
}

function getStatusFromPoint(x, y) {
  if (typeof document === 'undefined' || !document.elementsFromPoint) return null;
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    const anyEl = /** @type {any} */ (el);
    if (anyEl?.dataset?.col) return /** @type {Status} */ (anyEl.dataset.col);
  }
  return null;
}

// ----- Store -----

/** @typedef {{
 *  id:string; title:string; description?:string; projectId?:string; status:Status;
 *  impact:number; urgency:number; effort:number; priorityBucket:"P0"|"P1"|"P2"|"P3";
 *  score:number; dueAt?:string|null; ownerType:OwnerType; ownerRef?:string; owners:string[]; tags:string[];
 *  dependencies:string[]; createdAt:string; updatedAt:string; expectedBy?:string|null;
 *  timeLogSecs?:number; timerStartedAt?:string|null;
 * }} Task */

/** @typedef {{
 *  id:string; name:string; color:string; isDefault:boolean; createdAt:number;
 * }} Project */

const STORAGE_KEY = 'workday-board@v1';
const VIEW_MODE_KEY = 'workday-board@view-mode';
const STORAGE_VERSION = 2.1; // Version for migration tracking

// Project color palette
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

// Migration function for v1 to v2
function migrateStorageV1toV2(data) {
  // Add default project if missing
  if (!data.projects) {
    data.projects = [
      {
        id: 'default',
        name: 'Default',
        color: '#6B7280',
        isDefault: true,
        createdAt: Date.now(),
      },
    ];
  }

  // Set current project
  if (!data.currentProjectId) {
    data.currentProjectId = 'default';
  }

  // Add projectId to all tasks
  if (data.tasks) {
    data.tasks = data.tasks.map((task) => ({
      ...task,
      projectId: task.projectId || 'default',
    }));
  }

  data.version = STORAGE_VERSION;
  return data;
}

// Migration function to add owner registry
function migrateToV1_1(data) {
  // If already has ownerRegistry, no migration needed
  if (data.ownerRegistry) {
    return data;
  }

  // Build registry from existing tasks
  const registry = {
    owners: [],
    statistics: {},
  };

  const ownerSet = new Set();

  // Scan all tasks for owners
  if (data.tasks) {
    data.tasks.forEach((task) => {
      if (task.owners && Array.isArray(task.owners)) {
        task.owners.forEach((owner) => {
          if (owner && typeof owner === 'string') {
            ownerSet.add(owner);

            // Initialize statistics if not exists
            if (!registry.statistics[owner]) {
              registry.statistics[owner] = {
                taskCount: 0,
                lastUsed: task.updatedAt || task.createdAt || new Date().toISOString(),
                createdAt: task.createdAt || new Date().toISOString(),
              };
            }

            // Update task count
            registry.statistics[owner].taskCount++;

            // Update last used date
            const taskDate = task.updatedAt || task.createdAt || new Date().toISOString();
            if (new Date(taskDate) > new Date(registry.statistics[owner].lastUsed)) {
              registry.statistics[owner].lastUsed = taskDate;
            }
          }
        });
      }
    });
  }

  // Convert Set to sorted Array for storage
  registry.owners = Array.from(ownerSet).sort();

  // Add the registry to data
  data.ownerRegistry = registry;

  return data;
}

// Migration function to add status configuration (v2.1)
function migrateToV2_1(data) {
  // If already has statusConfig, no migration needed
  if (data.statusConfig) {
    return data;
  }

  // Initialize with the 8 default statuses from STATUS_META
  const now = new Date().toISOString();
  data.statusConfig = {
    statuses: [
      {
        id: 'backlog',
        label: 'Backlog',
        description: 'Ideas and unsorted',
        order: 0,
        isDefault: true,
        isCompletionState: false,
        keyboardShortcut: '1',
        createdAt: now,
        canDelete: true,
      },
      {
        id: 'ready',
        label: 'Ready',
        description: 'Triage done',
        order: 1,
        isDefault: false,
        isCompletionState: false,
        keyboardShortcut: '2',
        createdAt: now,
        canDelete: true,
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        description: 'Actively doing',
        order: 2,
        isDefault: false,
        isCompletionState: false,
        keyboardShortcut: '3',
        createdAt: now,
        canDelete: true,
      },
      {
        id: 'waiting_ai',
        label: 'Waiting on AI',
        description: 'Delegated to agent',
        order: 3,
        isDefault: false,
        isCompletionState: false,
        keyboardShortcut: '4',
        createdAt: now,
        canDelete: true,
      },
      {
        id: 'waiting_other',
        label: 'Waiting on Others',
        description: 'Blocked by a human',
        order: 4,
        isDefault: false,
        isCompletionState: false,
        keyboardShortcut: '5',
        createdAt: now,
        canDelete: true,
      },
      {
        id: 'blocked',
        label: 'Blocked',
        description: 'Needs unblocking',
        order: 5,
        isDefault: false,
        isCompletionState: false,
        keyboardShortcut: '6',
        createdAt: now,
        canDelete: true,
      },
      {
        id: 'in_review',
        label: 'In Review',
        description: 'PR/review/QA',
        order: 6,
        isDefault: false,
        isCompletionState: false,
        keyboardShortcut: '7',
        createdAt: now,
        canDelete: true,
      },
      {
        id: 'done',
        label: 'Done',
        description: 'Completed',
        order: 7,
        isDefault: false,
        isCompletionState: true,
        keyboardShortcut: '8',
        createdAt: now,
        canDelete: true,
      },
    ],
    version: 1,
  };

  return data;
}

// Owner name validation function
function validateOwnerName(name) {
  const trimmed = name ? name.trim() : '';
  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  if (trimmed.length > 30) {
    return { valid: false, error: 'Name too long (max 30 characters)' };
  }
  if (!/^[a-zA-Z0-9\s\-.']+$/.test(trimmed)) {
    return {
      valid: false,
      error:
        'Invalid characters (only letters, numbers, spaces, hyphen, period, apostrophe allowed)',
    };
  }
  return { valid: true, name: trimmed };
}

// Helper to generate project color
function generateProjectColor(index) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

const seedTasks = () => {
  const now = new Date();
  return [
    {
      id: uid(),
      projectId: 'default',
      title: 'Fix login bug for Alpha',
      status: 'in_progress',
      impact: 4,
      urgency: 5,
      effort: 2,
      dueAt: addHours(now, 20).toISOString(),
      ownerType: 'self',
      tags: ['bug', 'auth'],
      dependencies: [],
      expectedBy: null,
    },
    {
      id: uid(),
      title: 'Delegate test data generation to AI',
      status: 'waiting_ai',
      impact: 3,
      urgency: 3,
      effort: 1,
      dueAt: addHours(now, 36).toISOString(),
      ownerType: 'ai',
      tags: ['agent'],
      dependencies: [],
      expectedBy: addHours(now, 8).toISOString(),
    },
    {
      id: uid(),
      title: 'Prep for requirements call',
      status: 'ready',
      impact: 3,
      urgency: 4,
      effort: 1,
      dueAt: addHours(now, 4).toISOString(),
      ownerType: 'self',
      tags: ['meeting'],
      dependencies: [],
    },
    {
      id: uid(),
      title: 'Refactor payment webhook',
      status: 'blocked',
      impact: 4,
      urgency: 2,
      effort: 3,
      dueAt: null,
      ownerType: 'self',
      tags: ['tech-debt'],
      dependencies: [],
    },
  ].map((t) => finalizeTask(t));
};

function finalizeTask(partial) {
  const nowIso = new Date().toISOString();
  const impact = partial.impact ?? 2;
  const urgency = partial.urgency ?? 2;
  const effort = partial.effort ?? 2;
  const score = priorityScore({ impact, urgency, effort, dueAt: partial.dueAt });
  const bucket = scoreToBucket(score);

  // Initialize owners from ownerRef if needed (for migration)
  let owners = partial.owners ?? [];
  if (owners.length === 0 && partial.ownerRef) {
    owners = [partial.ownerRef];
  }

  return {
    id: partial.id ?? uid(),
    title: partial.title ?? 'Untitled',
    description: partial.description ?? '',
    projectId: partial.projectId ?? 'default',
    status: partial.status ?? 'backlog',
    impact,
    urgency,
    effort,
    score,
    priorityBucket: partial.priorityBucket ?? bucket,
    dueAt: partial.dueAt ?? null,
    ownerType: partial.ownerType ?? 'self',
    ownerRef: partial.ownerRef ?? undefined,
    owners,
    tags: partial.tags ?? [],
    dependencies: partial.dependencies ?? [],
    createdAt: partial.createdAt ?? nowIso,
    updatedAt: nowIso,
    expectedBy: partial.expectedBy ?? null,
    timeLogSecs: partial.timeLogSecs ?? 0,
    timerStartedAt: partial.timerStartedAt ?? null,
  };
}

const useStore = create((set, get) => ({
  // selection state
  selectedIds: /** @type{string[]} */ ([]),
  toggleSelected(id) {
    set((s) => ({ selectedIds: toggleId(s.selectedIds, id) }));
  },
  clearSelection() {
    set({ selectedIds: [] });
  },
  deleteSelected() {
    set((s) => ({ tasks: filterOutByIds(s.tasks, s.selectedIds), selectedIds: [] }));
    get().persist();
  },

  tasks: /** @type{Task[]} */ ([]),
  filters: { project: 'all', status: 'all', owner: 'all', q: '' },
  ownerFilter: /** @type{string|null} */ (null),

  // Projects state
  projects: /** @type{Project[]} */ ([
    { id: 'default', name: 'Default', color: '#6B7280', isDefault: true, createdAt: Date.now() },
  ]),
  currentProjectId: 'default',

  // Owner Registry state
  ownerRegistry: {
    owners: new Set(),
    statistics: new Map(),
  },

  // Status Configuration state
  statusConfig: {
    statuses: [],
    version: 1,
  },

  // User prefs
  autoReturnOnStop: false,
  setAutoReturnOnStop(v) {
    set({ autoReturnOnStop: v });
  },

  // Drag state
  draggingId: /** @type{string|null} */ (null),
  dragHoverStatus: /** @type{Status|null} */ (null),
  lastDragCheck: /** @type{number|null} */ (null),

  init() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        let parsed = JSON.parse(raw);

        // Migrate if needed
        if (!parsed.version || parsed.version < STORAGE_VERSION) {
          console.log('Migrating storage from v1 to v2');
          parsed = migrateStorageV1toV2(parsed);
        }

        // Migrate owner fields to owners array
        const migratedTasks = (parsed.tasks || []).map((task) => {
          if (!task.owners) {
            task.owners = task.ownerRef ? [task.ownerRef] : [];
          }
          return task;
        });

        // Apply owner registry migration
        parsed = migrateToV1_1({ ...parsed, tasks: migratedTasks });

        // Apply status config migration
        parsed = migrateToV2_1(parsed);

        // Convert stored owner registry to runtime format
        const ownerRegistry = {
          owners: new Set(parsed.ownerRegistry?.owners || []),
          statistics: new Map(Object.entries(parsed.ownerRegistry?.statistics || {})),
        };

        set({
          tasks: migratedTasks,
          autoReturnOnStop: parsed.autoReturnOnStop ?? false,
          projects: parsed.projects || [
            {
              id: 'default',
              name: 'Default',
              color: '#6B7280',
              isDefault: true,
              createdAt: Date.now(),
            },
          ],
          currentProjectId: parsed.currentProjectId || 'default',
          ownerRegistry: ownerRegistry,
          statusConfig: parsed.statusConfig || { statuses: [], version: 1 },
        });
        return;
      }
    } catch (e) {
      /* ignore storage errors */
      console.error('Storage error:', e);
    }
    // Initialize with default project and seed tasks
    const initialStatusConfig = migrateToV2_1({}).statusConfig;
    set({
      tasks: seedTasks(),
      projects: [
        {
          id: 'default',
          name: 'Default',
          color: '#6B7280',
          isDefault: true,
          createdAt: Date.now(),
        },
      ],
      currentProjectId: 'default',
      statusConfig: initialStatusConfig,
    });
  },
  cleanupStorage() {
    const { projects, tasks } = get();
    const projectIds = new Set(projects.map((p) => p.id));

    // Remove tasks that belong to non-existent projects
    const cleanedTasks = tasks.filter((t) => projectIds.has(t.projectId));

    if (cleanedTasks.length !== tasks.length) {
      set({ tasks: cleanedTasks });
      console.log(`[cleanup] Removed ${tasks.length - cleanedTasks.length} orphaned tasks`);
      return true; // Indicates cleanup was performed
    }
    return false;
  },

  persist() {
    try {
      // Run cleanup before persisting
      get().cleanupStorage();

      const { tasks, autoReturnOnStop, projects, currentProjectId, ownerRegistry, statusConfig } =
        get();

      // Convert ownerRegistry from runtime format to storage format
      const serializedRegistry = {
        owners: Array.from(ownerRegistry.owners),
        statistics: Object.fromEntries(ownerRegistry.statistics),
      };

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            tasks,
            autoReturnOnStop,
            projects,
            currentProjectId,
            ownerRegistry: serializedRegistry,
            statusConfig,
            version: STORAGE_VERSION,
          }),
        );
      }
    } catch (e) {
      /* ignore storage errors */
    }
  },
  addTask(partial) {
    const { currentProjectId } = get();
    // Use default status if no status provided
    const defaultStatus = get().getDefaultStatus();
    const status = partial.status || (defaultStatus ? defaultStatus.id : 'backlog');
    const t = finalizeTask({
      ...partial,
      status,
      projectId: partial.projectId || currentProjectId,
    });

    // Add owners to registry if they don't exist
    if (t.owners && Array.isArray(t.owners)) {
      t.owners.forEach((owner) => {
        if (owner && typeof owner === 'string') {
          get().addOwnerToRegistry(owner);
        }
      });
    }

    set((s) => ({ tasks: [...s.tasks, t] }));
    get().updateOwnerStatistics();
    get().persist();
    return t.id;
  },
  updateTask(id, patch) {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? finalizeTask({ ...t, ...patch, updatedAt: new Date().toISOString() }) : t,
      ),
    }));
    get().persist();
  },
  deleteTask(id) {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    get().persist();
  },

  // Owner management actions
  addOwnerToTask(taskId, ownerName) {
    const validation = validateOwnerName(ownerName);

    if (!validation.valid) {
      console.error(`Cannot add owner: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const sanitizedName = validation.name;

    // Add to registry if new
    get().addOwnerToRegistry(sanitizedName);

    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id === taskId) {
          // Check for duplicates
          if (t.owners.includes(sanitizedName)) return t;
          // Check max limit (5 owners per task)
          if (t.owners.length >= 5) {
            console.error('Task already has maximum 5 owners');
            return t;
          }
          return {
            ...t,
            owners: [...t.owners, sanitizedName],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      }),
    }));

    // Update owner statistics
    get().updateOwnerStatistics();
    get().persist();

    return { success: true };
  },

  removeOwnerFromTask(taskId, ownerName) {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            owners: t.owners.filter((o) => o !== ownerName),
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      }),
    }));

    // Update owner statistics after removal
    get().updateOwnerStatistics();
    get().persist();
  },

  transferTaskOwnership(taskId, newOwnerName) {
    const trimmed = newOwnerName?.trim();
    if (!trimmed || trimmed.length === 0 || trimmed.length > 50) return;

    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, owners: [trimmed], updatedAt: new Date().toISOString() };
        }
        return t;
      }),
    }));
    get().persist();
  },

  clearTaskOwners(taskId) {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, owners: [], updatedAt: new Date().toISOString() };
        }
        return t;
      }),
    }));
    get().persist();
  },

  // Owner Registry Actions
  initializeOwnerRegistry() {
    const { tasks, ownerRegistry } = get();

    // If already initialized and has data, skip
    if (ownerRegistry.owners.size > 0) {
      return;
    }

    const newOwners = new Set();
    const newStatistics = new Map();

    // Scan all tasks to build registry
    tasks.forEach((task) => {
      if (task.owners && Array.isArray(task.owners)) {
        task.owners.forEach((owner) => {
          if (owner && typeof owner === 'string') {
            newOwners.add(owner);

            // Get or initialize statistics
            const stats = newStatistics.get(owner) || {
              taskCount: 0,
              lastUsed: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };

            stats.taskCount++;

            // Update last used if task is more recent
            const taskDate = task.updatedAt || task.createdAt || new Date().toISOString();
            if (new Date(taskDate) > new Date(stats.lastUsed)) {
              stats.lastUsed = taskDate;
            }

            newStatistics.set(owner, stats);
          }
        });
      }
    });

    set({
      ownerRegistry: {
        owners: newOwners,
        statistics: newStatistics,
      },
    });

    get().persist();
  },

  addOwnerToRegistry(ownerName) {
    const validation = validateOwnerName(ownerName);

    if (!validation.valid) {
      console.error(`Invalid owner name: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const { ownerRegistry } = get();
    const sanitizedName = validation.name;

    // Check if owner already exists
    if (ownerRegistry.owners.has(sanitizedName)) {
      return { success: true, owner: sanitizedName, existed: true };
    }

    // Add to registry
    const newOwners = new Set(ownerRegistry.owners);
    newOwners.add(sanitizedName);

    // Initialize statistics for new owner
    const newStatistics = new Map(ownerRegistry.statistics);
    newStatistics.set(sanitizedName, {
      taskCount: 0,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    set({
      ownerRegistry: {
        owners: newOwners,
        statistics: newStatistics,
      },
    });

    // Persist the changes
    get().persist();

    return { success: true, owner: sanitizedName, existed: false };
  },

  removeOwnerFromRegistry(ownerName) {
    const { ownerRegistry, tasks } = get();

    // Check if owner exists
    if (!ownerRegistry.owners.has(ownerName)) {
      return { success: false, error: 'Owner not found in registry' };
    }

    // Count tasks that will be updated
    let tasksUpdated = 0;

    // Remove owner from all tasks
    const updatedTasks = tasks.map((task) => {
      if (task.owners && task.owners.includes(ownerName)) {
        tasksUpdated++;
        return {
          ...task,
          owners: task.owners.filter((owner) => owner !== ownerName),
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });

    // Remove from registry
    const newOwners = new Set(ownerRegistry.owners);
    newOwners.delete(ownerName);

    // Remove from statistics
    const newStatistics = new Map(ownerRegistry.statistics);
    newStatistics.delete(ownerName);

    // Update store
    set({
      tasks: updatedTasks,
      ownerRegistry: {
        owners: newOwners,
        statistics: newStatistics,
      },
    });

    // Persist the changes
    get().persist();

    return { success: true, tasksUpdated };
  },

  transferOwnerTasks(fromOwner, toOwner, removeFromOwner = false) {
    const { tasks, ownerRegistry } = get();

    // Validate inputs
    if (!fromOwner || !toOwner) {
      return { success: false, error: 'Both source and target owners are required' };
    }

    if (fromOwner === toOwner) {
      return { success: false, error: 'Cannot transfer to the same owner' };
    }

    // Check if source owner exists
    if (!ownerRegistry.owners.has(fromOwner)) {
      return { success: false, error: 'Source owner not found in registry' };
    }

    // Validate target owner name
    const validation = validateOwnerName(toOwner);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const sanitizedToOwner = validation.name;

    // Add target owner to registry if not exists
    if (!ownerRegistry.owners.has(sanitizedToOwner)) {
      get().addOwnerToRegistry(sanitizedToOwner);
    }

    // Transfer ownership in all tasks
    let tasksUpdated = 0;
    const updatedTasks = tasks.map((task) => {
      if (task.owners && task.owners.includes(fromOwner)) {
        tasksUpdated++;
        const newOwners = task.owners.filter((o) => o !== fromOwner);
        if (!newOwners.includes(sanitizedToOwner)) {
          newOwners.push(sanitizedToOwner);
        }
        return {
          ...task,
          owners: newOwners,
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });

    // Update store
    set({ tasks: updatedTasks });

    // Update statistics
    get().updateOwnerStatistics();

    // Remove from owner if requested
    if (removeFromOwner && tasksUpdated > 0) {
      get().removeOwnerFromRegistry(fromOwner);
    }

    // Persist the changes
    get().persist();

    return { success: true, tasksUpdated, fromOwner, toOwner: sanitizedToOwner };
  },

  updateOwnerStatistics() {
    const { tasks, ownerRegistry } = get();

    // Create new statistics map
    const newStatistics = new Map();

    // Scan all tasks and rebuild statistics
    tasks.forEach((task) => {
      if (task.owners && Array.isArray(task.owners)) {
        task.owners.forEach((owner) => {
          if (owner && typeof owner === 'string') {
            // Get existing stats or create new ones
            const existingStats = ownerRegistry.statistics.get(owner);
            const stats = newStatistics.get(owner) || {
              taskCount: 0,
              lastUsed: existingStats?.lastUsed || new Date().toISOString(),
              createdAt: existingStats?.createdAt || new Date().toISOString(),
            };

            stats.taskCount++;

            // Update last used based on task dates
            const taskDate = task.updatedAt || task.createdAt || new Date().toISOString();
            if (new Date(taskDate) > new Date(stats.lastUsed)) {
              stats.lastUsed = taskDate;
            }

            newStatistics.set(owner, stats);
          }
        });
      }
    });

    // Remove statistics for owners with no tasks
    const activeOwners = new Set(newStatistics.keys());
    const newOwners = new Set([...ownerRegistry.owners].filter((owner) => activeOwners.has(owner)));

    // Update the store
    set({
      ownerRegistry: {
        owners: newOwners,
        statistics: newStatistics,
      },
    });

    // Persist the changes
    get().persist();
  },

  unassignOwnerFromAllTasks(ownerName) {
    const { tasks } = get();

    let tasksUpdated = 0;
    const updatedTasks = tasks.map((task) => {
      if (task.owners && task.owners.includes(ownerName)) {
        tasksUpdated++;
        return {
          ...task,
          owners: task.owners.filter((owner) => owner !== ownerName),
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    });

    // Update tasks in store
    set({ tasks: updatedTasks });

    // Update owner statistics after unassigning
    get().updateOwnerStatistics();

    // Persist changes
    get().persist();

    return { tasksUpdated };
  },

  getOwnerSuggestions(partial = '') {
    const { ownerRegistry } = get();
    const searchTerm = partial.toLowerCase().trim();

    if (!searchTerm) {
      // Return all owners sorted by task count
      return Array.from(ownerRegistry.owners)
        .map((owner) => ({
          name: owner,
          taskCount: ownerRegistry.statistics.get(owner)?.taskCount || 0,
        }))
        .sort((a, b) => {
          // First by task count (descending)
          if (b.taskCount !== a.taskCount) {
            return b.taskCount - a.taskCount;
          }
          // Then alphabetically
          return a.name.localeCompare(b.name);
        });
    }

    // Filter by partial match and sort
    return Array.from(ownerRegistry.owners)
      .filter((owner) => owner.toLowerCase().includes(searchTerm))
      .map((owner) => ({
        name: owner,
        taskCount: ownerRegistry.statistics.get(owner)?.taskCount || 0,
      }))
      .sort((a, b) => {
        // First by task count (descending)
        if (b.taskCount !== a.taskCount) {
          return b.taskCount - a.taskCount;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
  },

  getAllOwnersWithStats() {
    const { ownerRegistry } = get();

    // Map all owners with their statistics
    const ownersWithStats = Array.from(ownerRegistry.owners).map((owner) => {
      const stats = ownerRegistry.statistics.get(owner) || {
        taskCount: 0,
        lastUsed: null,
        createdAt: new Date().toISOString(),
      };

      return {
        name: owner,
        taskCount: stats.taskCount,
        lastUsed: stats.lastUsed,
        createdAt: stats.createdAt,
      };
    });

    // Sort by task count (descending), then alphabetically
    return ownersWithStats.sort((a, b) => {
      if (b.taskCount !== a.taskCount) {
        return b.taskCount - a.taskCount;
      }
      return a.name.localeCompare(b.name);
    });
  },

  bulkAssignOwner(taskIds, ownerName) {
    const validation = validateOwnerName(ownerName);

    if (!validation.valid) {
      console.error(`Invalid owner name: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const { tasks } = get();
    const sanitizedName = validation.name;

    // Add owner to registry if new
    const addResult = get().addOwnerToRegistry(sanitizedName);
    if (!addResult.success) {
      return { success: false, error: addResult.error };
    }

    let tasksUpdated = 0;
    let tasksFailed = 0;
    const failedTaskIds = [];

    // Update each task
    const updatedTasks = tasks.map((task) => {
      if (taskIds.includes(task.id)) {
        // Check if task already has 5 owners
        const currentOwners = task.owners || [];
        if (currentOwners.length >= 5 && !currentOwners.includes(sanitizedName)) {
          tasksFailed++;
          failedTaskIds.push(task.id);
          return task;
        }

        // Add owner if not already present
        if (!currentOwners.includes(sanitizedName)) {
          tasksUpdated++;
          return {
            ...task,
            owners: [...currentOwners, sanitizedName],
            updatedAt: new Date().toISOString(),
          };
        }
      }
      return task;
    });

    // Update store
    set({ tasks: updatedTasks });

    // Update statistics
    get().updateOwnerStatistics();

    // Persist changes
    get().persist();

    return {
      success: true,
      tasksUpdated,
      tasksFailed,
      failedTaskIds,
    };
  },

  // Status Configuration methods
  getStatuses() {
    const { statusConfig } = get();
    return statusConfig.statuses.sort((a, b) => a.order - b.order);
  },

  getStatusById(statusId) {
    const { statusConfig } = get();
    return statusConfig.statuses.find((s) => s.id === statusId);
  },

  getDefaultStatus() {
    const { statusConfig } = get();
    return statusConfig.statuses.find((s) => s.isDefault);
  },

  getCompletionStatuses() {
    const { statusConfig } = get();
    return statusConfig.statuses.filter((s) => s.isCompletionState);
  },

  // Get status metadata in a map for easy lookup (like STATUS_META)
  getStatusMetaMap() {
    const statuses = get().getStatuses();
    const map = {};
    statuses.forEach((status) => {
      map[status.id] = {
        label: status.label,
        key: status.keyboardShortcut,
        hint: status.description,
      };
    });
    return map;
  },

  // Get ordered array of status IDs (like STATUS_ORDER)
  getStatusOrder() {
    return get()
      .getStatuses()
      .map((s) => s.id);
  },

  // Validation helpers for status management
  validateStatusLabel(label, excludeId = null) {
    const trimmed = label?.trim();

    if (!trimmed || trimmed.length === 0) {
      return { valid: false, error: 'Status label cannot be empty' };
    }

    if (trimmed.length > 30) {
      return { valid: false, error: 'Status label too long (max 30 characters)' };
    }

    // Check for duplicate labels (case-insensitive)
    const { statusConfig } = get();
    const duplicate = statusConfig.statuses.find(
      (s) => s.id !== excludeId && s.label.toLowerCase() === trimmed.toLowerCase(),
    );

    if (duplicate) {
      return { valid: false, error: `Status "${trimmed}" already exists` };
    }

    return { valid: true, label: trimmed };
  },

  canDeleteStatus(statusId) {
    const { statusConfig } = get();
    const status = statusConfig.statuses.find((s) => s.id === statusId);

    if (!status) {
      return { canDelete: false, reason: 'Status not found' };
    }

    // Must have at least 2 statuses
    if (statusConfig.statuses.length <= 2) {
      return { canDelete: false, reason: 'Must have at least 2 statuses' };
    }

    // Cannot delete the only default status
    const defaultStatuses = statusConfig.statuses.filter((s) => s.isDefault);
    if (status.isDefault && defaultStatuses.length === 1) {
      return {
        canDelete: false,
        reason: 'Cannot delete the only default status. Set another status as default first.',
      };
    }

    // Cannot delete the only completion status
    const completionStatuses = statusConfig.statuses.filter((s) => s.isCompletionState);
    if (status.isCompletionState && completionStatuses.length === 1) {
      return {
        canDelete: false,
        reason:
          'Cannot delete the only completion status. Mark another status as completion first.',
      };
    }

    return { canDelete: true };
  },

  getTasksForStatus(statusId) {
    const { tasks } = get();
    return tasks.filter((t) => t.status === statusId);
  },

  // CRUD operations for status management
  createStatus(label, description = '', flags = {}) {
    const validation = get().validateStatusLabel(label);
    if (!validation.valid) {
      console.error(`Cannot create status: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    const { statusConfig } = get();

    // Enforce max 15 statuses
    if (statusConfig.statuses.length >= 15) {
      const error = 'Maximum 15 statuses allowed';
      console.error(error);
      return { success: false, error };
    }

    // Create new status
    const newStatus = {
      id: uid(), // Generate unique ID
      label: validation.label,
      description: description.trim(),
      order: statusConfig.statuses.length, // Add at end
      isDefault: flags.isDefault === true,
      isCompletionState: flags.isCompletionState === true,
      keyboardShortcut: flags.keyboardShortcut || '',
      createdAt: new Date().toISOString(),
      canDelete: true,
    };

    // If setting as default, unset other defaults
    let updatedStatuses = [...statusConfig.statuses];
    if (newStatus.isDefault) {
      updatedStatuses = updatedStatuses.map((s) => ({ ...s, isDefault: false }));
    }

    // Add new status
    updatedStatuses.push(newStatus);

    set({
      statusConfig: {
        ...statusConfig,
        statuses: updatedStatuses,
      },
    });

    get().persist();

    return { success: true, statusId: newStatus.id };
  },

  updateStatus(statusId, updates) {
    const { statusConfig } = get();
    const status = statusConfig.statuses.find((s) => s.id === statusId);

    if (!status) {
      const error = 'Status not found';
      console.error(error);
      return { success: false, error };
    }

    // Validate label if being updated
    if (updates.label !== undefined) {
      const validation = get().validateStatusLabel(updates.label, statusId);
      if (!validation.valid) {
        console.error(`Cannot update status: ${validation.error}`);
        return { success: false, error: validation.error };
      }
      updates.label = validation.label;
    }

    // Trim description if provided
    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }

    // Update the status
    let updatedStatuses = statusConfig.statuses.map((s) => {
      if (s.id === statusId) {
        return { ...s, ...updates };
      }
      return s;
    });

    // If setting as default, unset other defaults
    if (updates.isDefault === true) {
      updatedStatuses = updatedStatuses.map((s) =>
        s.id === statusId ? s : { ...s, isDefault: false },
      );
    }

    set({
      statusConfig: {
        ...statusConfig,
        statuses: updatedStatuses,
      },
    });

    get().persist();

    return { success: true };
  },

  deleteStatus(statusId, migrateToId) {
    const deleteCheck = get().canDeleteStatus(statusId);
    if (!deleteCheck.canDelete) {
      console.error(`Cannot delete status: ${deleteCheck.reason}`);
      return { success: false, error: deleteCheck.reason };
    }

    const { statusConfig, tasks } = get();

    // Validate migration target
    const targetStatus = statusConfig.statuses.find((s) => s.id === migrateToId);
    if (!targetStatus) {
      const error = 'Invalid migration target status';
      console.error(error);
      return { success: false, error };
    }

    if (migrateToId === statusId) {
      const error = 'Cannot migrate tasks to the status being deleted';
      console.error(error);
      return { success: false, error };
    }

    // Get tasks that need to be migrated
    const tasksToMigrate = tasks.filter((t) => t.status === statusId);

    // Migrate all tasks to the new status
    const updatedTasks = tasks.map((t) =>
      t.status === statusId
        ? { ...t, status: migrateToId, updatedAt: new Date().toISOString() }
        : t,
    );

    // Remove the status and reorder
    const filteredStatuses = statusConfig.statuses.filter((s) => s.id !== statusId);
    const reorderedStatuses = filteredStatuses.map((s, index) => ({
      ...s,
      order: index,
    }));

    set({
      tasks: updatedTasks,
      statusConfig: {
        ...statusConfig,
        statuses: reorderedStatuses,
      },
    });

    get().persist();

    return { success: true, tasksMigrated: tasksToMigrate.length };
  },

  reorderStatuses(newOrder) {
    const { statusConfig } = get();

    // Validate that newOrder contains all status IDs
    const currentIds = new Set(statusConfig.statuses.map((s) => s.id));
    const newIds = new Set(newOrder);

    if (currentIds.size !== newIds.size || ![...currentIds].every((id) => newIds.has(id))) {
      const error = 'Invalid reorder: must include all current status IDs';
      console.error(error);
      return { success: false, error };
    }

    // Create new statuses array in the specified order
    const reorderedStatuses = newOrder.map((id, index) => {
      const status = statusConfig.statuses.find((s) => s.id === id);
      return { ...status, order: index };
    });

    set({
      statusConfig: {
        ...statusConfig,
        statuses: reorderedStatuses,
      },
    });

    get().persist();

    return { success: true };
  },

  restoreDefaultStatuses() {
    const { tasks } = get();

    // Get the 8 default statuses
    const defaultStatusConfig = migrateToV2_1({}).statusConfig;

    // Build a mapping of old status IDs to new default status IDs
    // Strategy: Map to closest matching default status by label similarity
    const { statusConfig } = get();
    const statusMapping = {};

    statusConfig.statuses.forEach((currentStatus) => {
      // Try to find exact match by ID first (for existing default statuses)
      const exactMatch = defaultStatusConfig.statuses.find((s) => s.id === currentStatus.id);
      if (exactMatch) {
        statusMapping[currentStatus.id] = exactMatch.id;
        return;
      }

      // Otherwise map to default status (backlog)
      statusMapping[currentStatus.id] = 'backlog';
    });

    // Migrate all tasks to default statuses
    const updatedTasks = tasks.map((t) => ({
      ...t,
      status: statusMapping[t.status] || 'backlog',
      updatedAt: new Date().toISOString(),
    }));

    // Count how many tasks were migrated
    const tasksMigrated = tasks.filter((t) => t.status !== statusMapping[t.status]).length;

    set({
      tasks: updatedTasks,
      statusConfig: defaultStatusConfig,
    });

    get().persist();

    return { success: true, tasksMigrated };
  },

  moveTask(id, status) {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
    get().persist();
  },
  reorderTask(id, status, fromIndex, toIndex) {
    set((s) => {
      const newTasks = [...s.tasks];

      // Get indices of all tasks in this status
      const statusTaskIndices = [];
      newTasks.forEach((task, idx) => {
        if (task.status === status) {
          statusTaskIndices.push(idx);
        }
      });

      // Get the actual array indices
      const fromArrayIndex = statusTaskIndices[fromIndex];
      const toArrayIndex = statusTaskIndices[toIndex];

      if (fromArrayIndex === undefined || toArrayIndex === undefined) return s;

      // Remove task from original position and insert at new position
      const [taskToMove] = newTasks.splice(fromArrayIndex, 1);

      // Recalculate target index after removal
      const adjustedToIndex = fromArrayIndex < toArrayIndex ? toArrayIndex - 1 : toArrayIndex;
      newTasks.splice(adjustedToIndex, 0, taskToMove);

      return { tasks: newTasks };
    });
    get().persist();
  },
  setTasksForStatus(status, reorderedTasks) {
    set((s) => {
      // Get all tasks not in this status
      // Combine reordered tasks with tasks from other statuses
      const newTasks = [];
      let statusTasksAdded = false;

      for (const task of s.tasks) {
        if (task.status === status) {
          if (!statusTasksAdded) {
            // Add all reordered tasks at once
            newTasks.push(...reorderedTasks);
            statusTasksAdded = true;
          }
          // Skip individual status tasks as we've added them all
        } else {
          newTasks.push(task);
        }
      }

      return { tasks: newTasks };
    });
    get().persist();
  },
  setAllTasks(reorderedTasks) {
    set({ tasks: reorderedTasks });
    get().persist();
  },
  setFilters(patch) {
    set((s) => ({ filters: { ...s.filters, ...patch } }));
  },
  setOwnerFilter(ownerName) {
    set({ ownerFilter: ownerName });
  },
  startTimer(id) {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              timerStartedAt: new Date().toISOString(),
              status: 'in_progress',
            }
          : t,
      ),
    }));
    get().persist();
  },
  stopTimer(id) {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const now = new Date();
        const started = t.timerStartedAt ? new Date(t.timerStartedAt) : null;
        const add = started ? Math.floor((now - started) / 1000) : 0;
        const newStatus = s.autoReturnOnStop && t.status === 'in_progress' ? 'ready' : t.status;
        return {
          ...t,
          timeLogSecs: (t.timeLogSecs || 0) + add,
          timerStartedAt: null,
          status: newStatus,
        };
      }),
    }));
    get().persist();
  },

  // Drag helpers
  setDraggingId(id) {
    set({ draggingId: id });
  },
  setDragHoverStatus(status) {
    set({ dragHoverStatus: status });
  },
  setLastDragCheck(timestamp) {
    set({ lastDragCheck: timestamp });
  },
  clearDrag() {
    set({ draggingId: null, dragHoverStatus: null, lastDragCheck: null });
  },

  // Project management actions
  createProject(name) {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 15) {
      return { error: 'Project name must be 1-15 characters' };
    }

    const { projects } = get();
    if (projects.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      return { error: 'Project name already exists' };
    }

    const newProject = {
      id: `proj_${Date.now()}`,
      name: trimmedName,
      color: generateProjectColor(projects.length),
      isDefault: false,
      createdAt: Date.now(),
    };

    set((s) => ({ projects: [...s.projects, newProject] }));
    get().persist();
    return { success: true, projectId: newProject.id };
  },

  deleteProject(projectId) {
    const { projects, tasks, currentProjectId } = get();
    const project = projects.find((p) => p.id === projectId);

    if (!project || project.isDefault) {
      return { error: 'Cannot delete this project' };
    }

    // Delete all tasks in this project
    const remainingTasks = tasks.filter((t) => t.projectId !== projectId);

    // Switch to default if deleting current project
    const newCurrentId = currentProjectId === projectId ? 'default' : currentProjectId;

    set({
      projects: projects.filter((p) => p.id !== projectId),
      tasks: remainingTasks,
      currentProjectId: newCurrentId,
    });
    get().persist();
    return { success: true };
  },

  renameProject(projectId, newName) {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName.length > 15) {
      return { error: 'Project name must be 1-15 characters' };
    }

    const { projects } = get();
    const project = projects.find((p) => p.id === projectId);

    if (!project || project.isDefault) {
      return { error: 'Cannot rename this project' };
    }

    if (
      projects.some((p) => p.id !== projectId && p.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      return { error: 'Project name already exists' };
    }

    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, name: trimmedName } : p)),
    }));
    get().persist();
    return { success: true };
  },

  reorderProjects(orderedProjectIds) {
    const { projects } = get();
    const reordered = orderedProjectIds
      .map((id) => projects.find((p) => p.id === id))
      .filter(Boolean);
    // Add any projects that weren't in the ordered list (shouldn't happen but safe)
    const missingProjects = projects.filter((p) => !orderedProjectIds.includes(p.id));
    set({ projects: [...reordered, ...missingProjects] });
    get().persist();
    return { success: true };
  },

  switchProject(projectId) {
    const { projects, currentProjectId } = get();

    // Early return if switching to the same project
    if (currentProjectId === projectId) {
      return { success: true };
    }

    if (!projects.some((p) => p.id === projectId)) {
      return { error: 'Project not found' };
    }

    set({ currentProjectId: projectId });
    get().persist();
    return { success: true };
  },

  moveTasksToProject(taskIds, targetProjectId) {
    const { projects } = get();
    if (!projects.some((p) => p.id === targetProjectId)) {
      return { error: 'Target project not found' };
    }

    if (!taskIds || taskIds.length === 0) {
      return { error: 'No tasks selected' };
    }

    set((s) => ({
      tasks: s.tasks.map((t) =>
        taskIds.includes(t.id)
          ? { ...t, projectId: targetProjectId, updatedAt: new Date().toISOString() }
          : t,
      ),
    }));
    get().persist();
    return { success: true, movedCount: taskIds.length };
  },

  // Get tasks filtered by current project
  getVisibleTasks() {
    const { tasks, currentProjectId } = get();
    return tasks.filter((t) => t.projectId === currentProjectId);
  },

  // Get task count for a project
  getProjectTaskCount(projectId) {
    const { tasks } = get();
    return tasks.filter((t) => t.projectId === projectId).length;
  },

  // Owner-related computed values
  getTasksByOwner(ownerName) {
    const { tasks } = get();
    return tasks.filter((t) => t.owners.includes(ownerName));
  },

  getUniqueOwners() {
    const { tasks } = get();
    const owners = new Set();
    tasks.forEach((t) => {
      t.owners.forEach((owner) => owners.add(owner));
    });
    return Array.from(owners).sort();
  },

  getUnownedTasks() {
    const { tasks } = get();
    return tasks.filter((t) => t.owners.length === 0);
  },

  // Check if timer is active in other projects
  hasActiveTimerInOtherProject() {
    const { tasks, currentProjectId } = get();
    return tasks.some((t) => t.projectId !== currentProjectId && t.timerStartedAt);
  },

  // Get project with active timer
  getProjectWithActiveTimer() {
    const { tasks, projects } = get();
    const taskWithTimer = tasks.find((t) => t.timerStartedAt);
    if (taskWithTimer) {
      return projects.find((p) => p.id === taskWithTimer.projectId);
    }
    return null;
  },

  // Clear all tasks in the current project
  clearCurrentProject() {
    const { tasks, currentProjectId } = get();
    const remainingTasks = tasks.filter((t) => t.projectId !== currentProjectId);
    set({ tasks: remainingTasks });
    get().persist();
    return { success: true, deletedCount: tasks.length - remainingTasks.length };
  },
}));

// ----- Project Components -----

function ProjectSelector() {
  const projects = useStore((s) => s.projects);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const switchProject = useStore((s) => s.switchProject);
  const hasActiveTimerInOther = useStore((s) => s.hasActiveTimerInOtherProject);
  const getProjectWithTimer = useStore((s) => s.getProjectWithActiveTimer);
  const getProjectTaskCount = useStore((s) => s.getProjectTaskCount);

  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K for project search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearchQuery('');
      }
      // Cmd/Ctrl + Shift + N for new project
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowManager(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0];
  const timerProject = getProjectWithTimer();

  const handleProjectSwitch = (projectId) => {
    switchProject(projectId);
    setIsOpen(false);
  };

  const handleTimerJump = () => {
    if (timerProject && timerProject.id !== currentProjectId) {
      switchProject(timerProject.id);
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-sm"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentProject.color }}
          />
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {currentProject.name}
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
          {hasActiveTimerInOther() && (
            <button
              className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleTimerJump();
              }}
              title={`Timer active in ${timerProject?.name}`}
              aria-label={`Timer active in ${timerProject?.name}`}
            />
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Mobile overlay backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="md:hidden fixed inset-0 bg-black/50 z-[90]"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute md:top-full top-0 md:mt-2 mt-0 w-full md:w-72 bg-white dark:bg-slate-800 md:rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[100] md:left-0 left-0 md:right-auto right-0 md:max-h-96 max-h-screen overflow-auto"
              >
                <div className="p-3">
                  <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <span>Projects</span>
                    <button
                      onClick={() => {
                        setShowManager(true);
                        setIsOpen(false);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Manage Projects"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  {projects.length > 10 && (
                    <div className="px-2 pb-2">
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                      />
                    </div>
                  )}
                  {projects
                    .filter(
                      (p) =>
                        !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((project) => {
                      const taskCount = getProjectTaskCount(project.id);
                      const isActive = project.id === currentProjectId;
                      return (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSwitch(project.id)}
                          className={clsx(
                            'w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                            isActive && 'bg-slate-100 dark:bg-slate-700',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                              <span
                                className={clsx(
                                  'font-medium',
                                  isActive && 'text-blue-600 dark:text-blue-400',
                                )}
                              >
                                {project.name}
                              </span>
                              {project.isDefault && (
                                <svg
                                  className="w-3 h-3 text-slate-400"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {showManager && <ProjectManager onClose={() => setShowManager(false)} />}
    </>
  );
}

function ProjectManager({ onClose }) {
  const projects = useStore((s) => s.projects);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const createProject = useStore((s) => s.createProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const renameProject = useStore((s) => s.renameProject);
  const reorderProjects = useStore((s) => s.reorderProjects);
  const getProjectTaskCount = useStore((s) => s.getProjectTaskCount);

  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleCreateProject = (e) => {
    e.preventDefault();
    const result = createProject(newProjectName);
    if (result.error) {
      setError(result.error);
    } else {
      setNewProjectName('');
      setError('');
    }
  };

  const handleRename = (projectId) => {
    const result = renameProject(projectId, editingName);
    if (result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
      setError('');
    }
  };

  const handleDelete = (projectId) => {
    const result = deleteProject(projectId);
    if (result.error) {
      setError(result.error);
    } else {
      setDeleteConfirmId(null);
      setError('');
    }
  };

  const handleDragStart = (e, project, index) => {
    setDraggedProject({ project, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedProject && draggedProject.index !== dropIndex) {
      const newProjects = [...projects];
      const [movedProject] = newProjects.splice(draggedProject.index, 1);
      newProjects.splice(dropIndex, 0, movedProject);
      reorderProjects(newProjects.map((p) => p.id));
    }
    setDraggedProject(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
    setDragOverIndex(null);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="button"
      tabIndex={0}
      aria-label="Close manager"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto relative z-[201]"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Manage Projects</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateProject} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="New project name"
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                maxLength={15}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {projects.map((project, index) => {
              const taskCount = getProjectTaskCount(project.id);
              const isEditing = editingId === project.id;
              const isDeleting = deleteConfirmId === project.id;

              // Calculate project statistics
              const tasks = useStore.getState().tasks.filter((t) => t.projectId === project.id);
              const completedCount = tasks.filter((t) => t.status === 'done').length;
              const completionRate =
                taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

              return (
                <motion.div
                  key={project.id}
                  draggable={!project.isDefault && !isEditing && !isDeleting}
                  onDragStart={(e) => handleDragStart(e, project, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-lg transition-colors relative group',
                    dragOverIndex === index
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-slate-50 dark:bg-gray-900/50',
                    !project.isDefault && 'cursor-move',
                  )}
                  animate={{
                    opacity: draggedProject?.project.id === project.id ? 0.5 : 1,
                  }}
                >
                  {!project.isDefault && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                        <path
                          d="M3 6h18M3 12h18M3 18h18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-1 ml-6">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(project.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded"
                        maxLength={15}
                      />
                    ) : (
                      <span className="font-medium">
                        {project.name}
                        {project.id === currentProjectId && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                            (current)
                          </span>
                        )}
                      </span>
                    )}
                    {project.isDefault && (
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {taskCount} tasks
                      </span>
                      {taskCount > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">{completionRate}% done</span>
                          <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {!project.isDefault && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(project.id);
                            setEditingName(project.name);
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded"
                          title="Rename"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        {isDeleting ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(project.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete {taskCount} tasks?
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-slate-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(project.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WorkflowSettingsModal({ onClose }) {
  const statuses = useStore((s) => s.getStatuses());
  const createStatus = useStore((s) => s.createStatus);
  const updateStatus = useStore((s) => s.updateStatus);
  const deleteStatus = useStore((s) => s.deleteStatus);
  const reorderStatuses = useStore((s) => s.reorderStatuses);
  const restoreDefaultStatuses = useStore((s) => s.restoreDefaultStatuses);
  const getTasksForStatus = useStore((s) => s.getTasksForStatus);
  const canDeleteStatus = useStore((s) => s.canDeleteStatus);

  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusDesc, setNewStatusDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingDesc, setEditingDesc] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [migrateToId, setMigrateToId] = useState('');
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [draggedStatus, setDraggedStatus] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleCreateStatus = (e) => {
    e.preventDefault();
    const result = createStatus(newStatusLabel, newStatusDesc);
    if (result.error) {
      setError(result.error);
    } else {
      setNewStatusLabel('');
      setNewStatusDesc('');
      setError('');
    }
  };

  const handleUpdate = (statusId) => {
    const result = updateStatus(statusId, {
      label: editingLabel,
      description: editingDesc,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
      setError('');
    }
  };

  const handleDelete = (statusId) => {
    if (!migrateToId) {
      setError('Please select a status to migrate tasks to');
      return;
    }
    const result = deleteStatus(statusId, migrateToId);
    if (result.error) {
      setError(result.error);
    } else {
      setDeleteConfirmId(null);
      setMigrateToId('');
      setError('');
    }
  };

  const handleRestoreDefaults = () => {
    const result = restoreDefaultStatuses();
    if (result.error) {
      setError(result.error);
    } else {
      setRestoreConfirm(false);
      setError('');
    }
  };

  const handleDragStart = (e, status, index) => {
    setDraggedStatus({ status, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedStatus && draggedStatus.index !== dropIndex) {
      const newStatuses = [...statuses];
      const [movedStatus] = newStatuses.splice(draggedStatus.index, 1);
      newStatuses.splice(dropIndex, 0, movedStatus);
      reorderStatuses(newStatuses.map((s) => s.id));
    }
    setDraggedStatus(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedStatus(null);
    setDragOverIndex(null);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="button"
      tabIndex={0}
      aria-label="Close workflow settings"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto relative z-[201]"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h2 className="text-lg font-semibold">Workflow Configuration</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Customize your workflow statuses
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          {/* Add New Status Form */}
          <form
            onSubmit={handleCreateStatus}
            className="mb-6 p-4 bg-slate-50 dark:bg-gray-900 rounded-lg"
          >
            <h3 className="font-medium mb-3">Add New Status</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                placeholder="Status name (e.g., 'In Design')"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                maxLength={30}
              />
              <input
                type="text"
                value={newStatusDesc}
                onChange={(e) => setNewStatusDesc(e.target.value)}
                placeholder="Description (e.g., 'Design work in progress')"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                maxLength={50}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {statuses.length} / 15 statuses
                </span>
                <button
                  type="submit"
                  disabled={statuses.length >= 15}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Status
                </button>
              </div>
            </div>
          </form>

          {/* Status List */}
          <div className="space-y-2 mb-6">
            <h3 className="font-medium mb-2">Current Statuses</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Drag to reorder • Click to edit
            </p>
            {statuses.map((status, index) => {
              const taskCount = getTasksForStatus(status.id).length;
              const isEditing = editingId === status.id;
              const isDeleting = deleteConfirmId === status.id;
              const deleteCheck = canDeleteStatus(status.id);

              return (
                <motion.div
                  key={status.id}
                  draggable={!isEditing && !isDeleting}
                  onDragStart={(e) => handleDragStart(e, status, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={clsx(
                    'p-3 rounded-lg border transition-all',
                    dragOverIndex === index && draggedStatus
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700',
                    isEditing && 'bg-blue-50 dark:bg-blue-900/20',
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        maxLength={30}
                      />
                      <input
                        type="text"
                        value={editingDesc}
                        onChange={(e) => setEditingDesc(e.target.value)}
                        placeholder="Description"
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        maxLength={50}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(status.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setError('');
                          }}
                          className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded text-sm hover:bg-gray-400 dark:hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        Delete &ldquo;{status.label}&rdquo;? ({taskCount} tasks)
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Move these tasks to:
                      </p>
                      <select
                        value={migrateToId}
                        onChange={(e) => setMigrateToId(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                      >
                        <option value="">Select status...</option>
                        {statuses
                          .filter((s) => s.id !== status.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(status.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Delete & Move
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmId(null);
                            setMigrateToId('');
                            setError('');
                          }}
                          className="px-3 py-1 bg-gray-300 dark:bg-gray-600 rounded text-sm hover:bg-gray-400 dark:hover:bg-slate-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{status.label}</span>
                            {status.isDefault && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                Default
                              </span>
                            )}
                            {status.isCompletionState && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                Completion
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {status.description}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {taskCount} task{taskCount !== 1 ? 's' : ''} • Key:{' '}
                            {status.keyboardShortcut || 'none'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingId(status.id);
                            setEditingLabel(status.label);
                            setEditingDesc(status.description);
                          }}
                          className="px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (!deleteCheck.canDelete) {
                              setError(deleteCheck.reason);
                            } else {
                              setDeleteConfirmId(status.id);
                              setMigrateToId('');
                            }
                          }}
                          disabled={!deleteCheck.canDelete}
                          className="px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title={deleteCheck.canDelete ? 'Delete status' : deleteCheck.reason}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Restore Defaults */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {restoreConfirm ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-400 mb-3">
                  This will reset to 8 default statuses. All tasks will be migrated. Continue?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRestoreDefaults}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Yes, Restore Defaults
                  </button>
                  <button
                    onClick={() => setRestoreConfirm(false)}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setRestoreConfirm(true)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Restore Default Statuses
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BulkAssignOwnerDialog({ taskIds, onClose, onSuccess }) {
  const bulkAssignOwner = useStore((s) => s.bulkAssignOwner);
  const getAllOwnersWithStats = useStore((s) => s.getAllOwnersWithStats);

  const [selectedOwner, setSelectedOwner] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [result, setResult] = useState(null);

  const owners = getAllOwnersWithStats();

  const handleAssign = () => {
    const ownerToAssign = isAddingNew ? newOwnerName.trim() : selectedOwner;
    if (!ownerToAssign) return;

    const result = bulkAssignOwner(taskIds, ownerToAssign);
    setResult(result);

    if (result.success) {
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-96 max-w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">Assign Owner to {taskIds.length} Tasks</h3>
        </div>

        <div className="p-4">
          {!result ? (
            <>
              <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Select an existing owner or add a new one to assign to the selected tasks.
                </p>

                <div className="space-y-3">
                  {!isAddingNew ? (
                    <>
                      <div>
                        <label
                          htmlFor="bulk-owner-select"
                          className="block text-sm font-medium mb-1"
                        >
                          Select existing owner:
                        </label>
                        <select
                          id="bulk-owner-select"
                          value={selectedOwner}
                          onChange={(e) => setSelectedOwner(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Choose an owner...</option>
                          {owners.map((owner) => (
                            <option key={owner.name} value={owner.name}>
                              {owner.name} ({owner.taskCount} tasks)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setIsAddingNew(true)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Or add a new owner
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="new-owner-name" className="block text-sm font-medium mb-1">
                          New owner name:
                        </label>
                        <input
                          id="new-owner-name"
                          type="text"
                          value={newOwnerName}
                          onChange={(e) => setNewOwnerName(e.target.value)}
                          maxLength={30}
                          placeholder="Enter owner name"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNew(false);
                            setNewOwnerName('');
                          }}
                          className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
                        >
                          Back to existing owners
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-3 text-sm">
                <p className="text-amber-800 dark:text-amber-200">
                  Note: Tasks that already have 5 owners will be skipped.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              {result.success ? (
                <>
                  <div className="text-green-600 dark:text-green-400 mb-2">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="font-medium">Owner assigned successfully!</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Updated {result.tasksUpdated} task{result.tasksUpdated !== 1 ? 's' : ''}
                    {result.tasksFailed > 0 && (
                      <span className="block text-amber-600 dark:text-amber-400 mt-1">
                        {result.tasksFailed} task{result.tasksFailed !== 1 ? 's' : ''} skipped (5
                        owner limit)
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-red-600 dark:text-red-400 mb-2">
                    <svg
                      className="w-12 h-12 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="font-medium">Assignment failed</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{result.error}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!isAddingNew ? !selectedOwner : !newOwnerName.trim()}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  (!isAddingNew ? !selectedOwner : !newOwnerName.trim())
                    ? 'bg-gray-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Assign Owner
              </button>
            </>
          ) : (
            <button
              onClick={result.success ? onSuccess : onClose}
              className="px-4 py-2 text-sm bg-gray-600 text-white hover:bg-slate-700 rounded transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkMoveDialog({ taskIds, onClose, onSuccess }) {
  const projects = useStore((s) => s.projects);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const moveTasksToProject = useStore((s) => s.moveTasksToProject);
  const getVisibleTasks = useStore((s) => s.getVisibleTasks);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [error, setError] = useState('');

  const tasks = getVisibleTasks();
  const selectedTasks = tasks.filter((t) => taskIds.includes(t.id));
  const availableProjects = projects.filter((p) => p.id !== currentProjectId);

  const handleMove = () => {
    if (!selectedProjectId) {
      setError('Please select a target project');
      return;
    }

    const result = moveTasksToProject(taskIds, selectedProjectId);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto relative z-[201]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Move Tasks to Project</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Moving{' '}
              <span className="font-semibold">
                {taskIds.length} task{taskIds.length > 1 ? 's' : ''}
              </span>{' '}
              from <span className="font-semibold">{currentProject?.name}</span>
            </p>

            {selectedTasks.length > 0 && (
              <div className="mb-4 p-2 bg-slate-50 dark:bg-gray-900/50 rounded max-h-32 overflow-y-auto">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Selected tasks:
                </div>
                {selectedTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="text-sm truncate">
                    • {task.title}
                  </div>
                ))}
                {selectedTasks.length > 5 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    ...and {selectedTasks.length - 5} more
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="target-project" className="block text-sm font-medium mb-2">
              Select Target Project
            </label>
            <select
              id="target-project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            >
              <option value="">Choose a project...</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Move Tasks
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ----- Error Boundary -----
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ hasError: true, error, info });
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || 'Unknown error');
      const stack = this.state.error?.stack || this.state.info?.componentStack || '';
      return (
        <div className="min-h-screen bg-rose-50 text-rose-900 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-rose-300 bg-white shadow p-4">
              <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
              <p className="mb-3 text-sm">An unexpected error occurred in the UI. Try reloading.</p>
              <div className="mb-3 p-3 rounded bg-rose-50 border border-rose-200 text-xs whitespace-pre-wrap break-words">
                {msg}
                {stack ? '\n\n' + stack : ''}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ----- Quick Add Parser -----

function parseQuickAdd(input) {
  // Tokenize by spaces but keep quoted phrases
  const tokens = input.match(/"[^"]+"|\S+/g) || [];
  let titleParts = [];
  let dueAt = null,
    ownerType = 'self',
    owners = [],
    tags = [],
    impact = undefined,
    urgency = undefined,
    effort = undefined,
    priorityBucket = null,
    expectedBy = null;
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i].replaceAll('"', '');
    if (raw.startsWith('+')) {
      tags.push(raw.slice(1));
      continue;
    }
    if (/^!p[0-3]$/i.test(raw)) {
      priorityBucket = raw.toUpperCase().slice(1);
      continue;
    }
    // Handle @owner tokens
    if (raw.startsWith('@')) {
      const ownerName = raw.slice(1);
      if (ownerName === 'ai') {
        ownerType = 'ai';
      } else if (ownerName === 'me') {
        ownerType = 'self';
      } else if (ownerName.length > 0) {
        // It's a specific owner name
        owners.push(ownerName);
      }
      continue;
    }
    if (raw.startsWith('impact:')) {
      impact = Number(raw.split(':')[1]) || undefined;
      continue;
    }
    if (raw.startsWith('urgency:')) {
      urgency = Number(raw.split(':')[1]) || undefined;
      continue;
    }
    if (raw.startsWith('effort:')) {
      effort = Number(raw.split(':')[1]) || undefined;
      continue;
    }
    if (raw.startsWith('due:')) {
      const rest = raw.slice(4);
      if (rest.includes('-')) dueAt = parseDueToken([rest]);
      else if (rest === 'today' || rest === 'tomorrow') dueAt = parseDueToken([rest]);
      else dueAt = null;
      continue;
    }
    // allow time token right after due:today/tomorrow pattern
    if (
      /^\d{1,2}:\d{2}$/.test(raw) &&
      dueAt === null &&
      tokens[i - 1] &&
      tokens[i - 1].startsWith('due:')
    ) {
      const last = tokens[i - 1].slice(4);
      dueAt = parseDueToken([last, raw]);
      continue;
    }
    if (raw.startsWith('expect:')) {
      // expected AI callback by time
      const rest = raw.split(':')[1];
      if (rest === 'today' || rest === 'tomorrow') expectedBy = parseDueToken([rest]);
      else if (/^\d{4}-\d{2}-\d{2}$/.test(rest)) expectedBy = parseISO(rest).toISOString();
      continue;
    }
    titleParts.push(raw);
  }
  const title = titleParts.join(' ').trim();
  const base = { title, dueAt, ownerType, tags, expectedBy };
  if (owners.length > 0) base.owners = owners;
  if (impact !== undefined) base.impact = impact;
  if (urgency !== undefined) base.urgency = urgency;
  if (effort !== undefined) base.effort = effort;
  if (priorityBucket) base.priorityBucket = priorityBucket;
  return base;
}

// ----- UI Components -----

function Badge({ children, className, variant = 'default' }) {
  const variants = {
    default: 'bg-slate-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant] || variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
}

const Column = React.memo(function Column({ status, tasks }) {
  const dragHoverStatus = useStore((s) => s.dragHoverStatus);
  const statusMeta = useStore((s) => s.getStatusMetaMap());
  const highlight = dragHoverStatus === status;
  const meta = statusMeta[status] || { label: status, hint: '' };

  return (
    <div
      data-col={status}
      className={clsx(
        'flex-1 min-w-[280px] max-w-[520px] rounded-lg p-3 border transition-all',
        'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        highlight && 'ring-2 ring-blue-400 border-blue-300 shadow-lg',
        !highlight && 'shadow-sm',
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{meta.label}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-500">{meta.hint}</span>
        <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2 min-h-24">
        {tasks.length === 0 ? (
          <EmptyColumnState columnName={meta.label} />
        ) : (
          tasks.map((t) => <TaskCard key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
});

// Owner display components
function OwnerBadge({ owner }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
      {owner}
    </span>
  );
}

function OwnersList({ owners }) {
  if (!owners || owners.length === 0) return null;

  const displayCount = 3;
  const visibleOwners = owners.slice(0, displayCount);
  const remainingCount = owners.length - displayCount;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleOwners.map((owner) => (
        <OwnerBadge key={owner} owner={owner} />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-slate-500 dark:text-slate-400">+{remainingCount} more</span>
      )}
    </div>
  );
}

// ===== NEW UI/UX IMPROVEMENT COMPONENTS (Feature 004) =====

// TokenHelpTooltip - Collapsible help for token syntax (FR-001 to FR-005)
function TokenHelpTooltip({ visible, onDismiss }) {
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onDismiss();
    };

    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 mt-2 w-96 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
      role="dialog"
      aria-label="Token syntax help"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Token Syntax</h3>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label="Close help"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
        <div>
          <strong className="text-slate-900 dark:text-slate-100">!p0..p3</strong> - Set priority
          <div className="text-xs text-slate-500 ml-2">Example: !p0 (highest), !p3 (lowest)</div>
        </div>

        <div>
          <strong className="text-slate-900 dark:text-slate-100">@owner</strong> - Assign owner
          <div className="text-xs text-slate-500 ml-2">Example: @ai, @me, @john</div>
        </div>

        <div>
          <strong className="text-slate-900 dark:text-slate-100">+tag</strong> - Add tag
          <div className="text-xs text-slate-500 ml-2">Example: +bug, +feature</div>
        </div>

        <div>
          <strong className="text-slate-900 dark:text-slate-100">due:</strong> - Set due date
          <div className="text-xs text-slate-500 ml-2">
            Example: due:today, due:tomorrow, due:2025-12-31, due:16:00
          </div>
        </div>

        <div>
          <strong className="text-slate-900 dark:text-slate-100">impact:0..5</strong> - Set impact
          <div className="text-xs text-slate-500 ml-2">Example: impact:5 (high impact)</div>
        </div>

        <div>
          <strong className="text-slate-900 dark:text-slate-100">urgency:0..5</strong> - Set urgency
          <div className="text-xs text-slate-500 ml-2">Example: urgency:4</div>
        </div>

        <div>
          <strong className="text-slate-900 dark:text-slate-100">effort:0..5</strong> - Set effort
          <div className="text-xs text-slate-500 ml-2">Example: effort:2 (low effort)</div>
        </div>

        <div>
          <strong className="text-slate-900 dark:text-slate-100">expect:</strong> - Expected
          completion
          <div className="text-xs text-slate-500 ml-2">
            Example: expect:today, expect:2025-12-31
          </div>
        </div>
      </div>
    </div>
  );
}

// getPriorityBorderClass - Returns Tailwind classes for priority color (FR-006 to FR-012)
function getPriorityBorderClass(priority) {
  const colors = {
    P0: 'border-l-red-500 dark:border-l-red-400 border-t-slate-200 dark:border-t-slate-700 border-r-slate-200 dark:border-r-slate-700 border-b-slate-200 dark:border-b-slate-700',
    P1: 'border-l-orange-500 dark:border-l-orange-400 border-t-slate-200 dark:border-t-slate-700 border-r-slate-200 dark:border-r-slate-700 border-b-slate-200 dark:border-b-slate-700',
    P2: 'border-l-yellow-500 dark:border-l-yellow-400 border-t-slate-200 dark:border-t-slate-700 border-r-slate-200 dark:border-r-slate-700 border-b-slate-200 dark:border-b-slate-700',
    P3: 'border-l-slate-300 dark:border-l-slate-600 border-t-slate-200 dark:border-t-slate-700 border-r-slate-200 dark:border-r-slate-700 border-b-slate-200 dark:border-b-slate-700',
  };
  return colors[priority] || colors.P3;
}

// EmptyColumnState - Contextual empty state messages (FR-013 to FR-019)
const EmptyColumnState = React.memo(({ columnName }) => {
  const messages = {
    Backlog: { text: 'Add your ideas here', emoji: '💡' },
    Ready: { text: 'Tasks ready for work will appear here', emoji: '✅' },
    'In Progress': { text: 'Start working on a task', emoji: '🚀' },
    'Waiting on AI': { text: 'Delegate to AI agents', emoji: '🤖' },
    'Waiting on Others': { text: 'No blockers yet 👍', emoji: '' },
    Blocked: { text: 'Nothing blocked right now', emoji: '🎉' },
    'In Review': { text: 'Ready for PR review', emoji: '👀' },
    Done: { text: 'Ready to ship!', emoji: '🎯' },
  };

  const message = messages[columnName] || { text: 'No tasks', emoji: '' };

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-4xl mb-3 p-3 rounded-full bg-slate-100 dark:bg-slate-700/50">
        {message.emoji}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message.text}</p>
    </div>
  );
});
EmptyColumnState.displayName = 'EmptyColumnState';

// ===== END NEW COMPONENTS =====

function TaskCard({ task }) {
  const move = useStore((s) => s.moveTask);
  const stopTimer = useStore((s) => s.stopTimer);
  const startTimer = useStore((s) => s.startTimer);
  const toggleSelected = useStore((s) => s.toggleSelected);
  const selectedIds = useStore((s) => s.selectedIds);
  const projects = useStore((s) => s.projects);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const [open, setOpen] = useState(false);
  const overdue = task.dueAt ? isBefore(new Date(task.dueAt), new Date()) : false;

  const taskProject = projects.find((p) => p.id === task.projectId);

  // Live ticker for running tasks
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!task.timerStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [task.timerStartedAt]);

  const elapsedSecs = computeElapsedSecs(task);
  const elapsedLabel = formatDurationShort(elapsedSecs);
  const isRunning = !!task.timerStartedAt;
  const isSelected = selectedIds.includes(task.id);

  return (
    <motion.div
      layout
      drag
      dragSnapToOrigin
      onDragStart={() => {
        useStore.getState().setDraggingId(task.id);
      }}
      onDrag={(e, info) => {
        // Throttle: only check every 100ms to avoid performance issues
        const now = Date.now();
        if (!useStore.getState().lastDragCheck || now - useStore.getState().lastDragCheck > 100) {
          const status = getStatusFromPoint(info.point.x, info.point.y);
          useStore.getState().setDragHoverStatus(status);
          useStore.getState().setLastDragCheck(now);
        }
      }}
      onDragEnd={(e, info) => {
        const status = getStatusFromPoint(info.point.x, info.point.y);
        if (status) move(task.id, status);
        useStore.getState().clearDrag();
      }}
      className={clsx(
        'cursor-grab active:cursor-grabbing rounded-lg border-l-4 border-t border-r border-b p-3 relative',
        'bg-white dark:bg-slate-800',
        'shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden',
        isSelected && 'ring-2 ring-blue-400 shadow-md',
        getPriorityBorderClass(task.priorityBucket),
      )}
    >
      <div className="group">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 cursor-pointer accent-blue-600 dark:accent-blue-400"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelected(task.id)}
            title="Select task"
          />
          <div className="flex-1 min-w-0">
            <button
              className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block w-full"
              title={task.title}
              onClick={() => setOpen(true)}
            >
              {task.title}
            </button>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge
                variant={
                  task.priorityBucket === 'P0'
                    ? 'danger'
                    : task.priorityBucket === 'P1'
                      ? 'warning'
                      : 'default'
                }
                className="text-xs"
              >
                {task.priorityBucket}
              </Badge>
              {taskProject && task.projectId !== currentProjectId && (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: taskProject.color }}
                  />
                  <span className="text-slate-600 dark:text-slate-400">{taskProject.name}</span>
                </div>
              )}
              {task.ownerType === 'ai' && (
                <Badge variant="primary" className="text-xs">
                  <Bot className="w-3 h-3 mr-0.5" />
                  AI
                </Badge>
              )}
              {(elapsedSecs > 0 || isRunning) && (
                <Badge variant={isRunning ? 'success' : 'default'} className="text-xs">
                  <TimerIcon className="w-3 h-3 mr-0.5" />
                  {elapsedLabel}
                  {isRunning && ' •'}
                </Badge>
              )}
            </div>
            {task.owners && task.owners.length > 0 && (
              <div className="mt-2">
                <OwnersList owners={task.owners} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              {task.project && (
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                  #{task.project}
                </span>
              )}
              {task.tags?.map((t) => (
                <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                  +{t}
                </span>
              ))}
              {task.dueAt && (
                <span
                  className={clsx(
                    'inline-flex items-center gap-0.5',
                    overdue
                      ? 'text-red-500 dark:text-red-400 font-medium'
                      : 'text-blue-500 dark:text-blue-400',
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {humanDue(task.dueAt)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="hidden group-hover:flex absolute bottom-2 right-2 items-center gap-0.5 bg-slate-700 dark:bg-slate-600 rounded-lg p-1">
          <button
            title="Move left"
            className="p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-600/30 transition-colors"
            onClick={() => {
              const order = useStore.getState().getStatusOrder();
              const idx = order.indexOf(task.status);
              if (idx > 0)
                useStore.getState().moveTask(task.id, /** @type{Status} */ (order[idx - 1]));
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {isRunning ? (
            <button
              title="Pause"
              onClick={() => stopTimer(task.id)}
              className="p-1 rounded text-orange-400 hover:text-orange-300 hover:bg-orange-600/30 transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              title="Start focus timer"
              onClick={() => startTimer(task.id)}
              className="p-1 rounded text-green-400 hover:text-green-300 hover:bg-green-600/30 transition-colors"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            title="Move right"
            onClick={() => {
              const order = useStore.getState().getStatusOrder();
              const idx = order.indexOf(task.status);
              if (idx < order.length - 1)
                useStore.getState().moveTask(task.id, /** @type{Status} */ (order[idx + 1]));
            }}
            className="p-1 rounded text-blue-400 hover:text-blue-300 hover:bg-blue-600/30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && <TaskDrawer task={task} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-28 text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min = 0, max = 5 }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
    />
  );
}

// Owner editing components

function OwnerCombobox({ onAdd, currentOwners = [], maxOwners = 5 }) {
  const getOwnerSuggestions = useStore((s) => s.getOwnerSuggestions);
  const [value, setValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Update suggestions with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const searchTerm = value.trim();
      if (searchTerm.length > 0) {
        const results = getOwnerSuggestions(searchTerm);
        // Filter out already assigned owners
        const filtered = results.filter((s) => !currentOwners.includes(s.name));
        setSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
        setShowSuggestions(filtered.length > 0);
      } else {
        // When input is empty, prepare all suggestions for when user focuses
        const results = getOwnerSuggestions('');
        const filtered = results.filter((s) => !currentOwners.includes(s.name));
        setSuggestions(filtered.slice(0, 8));
        // Don't auto-show, wait for user to focus the input
        // setShowSuggestions will be handled by onFocus
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, getOwnerSuggestions, currentOwners]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (ownerName = null) => {
    const nameToAdd = ownerName || value.trim();
    if (nameToAdd && !currentOwners.includes(nameToAdd)) {
      const result = onAdd(nameToAdd);
      if (result?.success !== false) {
        setValue('');
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSubmit(suggestions[selectedIndex].name);
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const isDisabled = currentOwners.length >= maxOwners;

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              // Show suggestions when focused, even if input is empty (to show existing owners)
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled ? `Maximum ${maxOwners} owners reached` : 'Type to search or add owner'
            }
            disabled={isDisabled}
            maxLength={30}
            className={`w-full px-3 py-1 text-sm rounded border ${
              isDisabled
                ? 'border-gray-200 dark:border-gray-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'
            }`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="owner-suggestions"
            aria-activedescendant={selectedIndex >= 0 ? `owner-option-${selectedIndex}` : undefined}
          />

          {/* Dropdown suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              id="owner-suggestions"
              className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-lg"
              role="listbox"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.name}
                  id={`owner-option-${index}`}
                  onClick={() => handleSubmit(suggestion.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSubmit(suggestion.name);
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  tabIndex={0}
                  className={`px-3 py-2 cursor-pointer flex justify-between items-center ${
                    index === selectedIndex
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <span className="text-sm text-slate-900 dark:text-slate-100">
                    {suggestion.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {suggestion.taskCount} {suggestion.taskCount === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              ))}
              {value.trim() &&
                !suggestions.find((s) => s.name.toLowerCase() === value.trim().toLowerCase()) && (
                  <div
                    onClick={() => handleSubmit()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(suggestions.length)}
                    tabIndex={0}
                    className={`px-3 py-2 cursor-pointer border-t border-gray-200 dark:border-gray-700 ${
                      selectedIndex === suggestions.length
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    role="option"
                    aria-selected={selectedIndex === suggestions.length}
                  >
                    <span className="text-sm text-slate-900 dark:text-slate-100">
                      Add &quot;<span className="font-medium">{value.trim()}</span>&quot; as new
                      owner
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isDisabled || !value.trim()}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            isDisabled || !value.trim()
              ? 'bg-gray-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          Add
        </button>
      </form>

      {currentOwners.length > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {currentOwners.length}/{maxOwners} owners assigned
        </div>
      )}
    </div>
  );
}

function OwnerEditor({ taskId, owners = [] }) {
  const addOwner = useStore((s) => s.addOwnerToTask);
  const removeOwner = useStore((s) => s.removeOwnerFromTask);
  const clearOwners = useStore((s) => s.clearTaskOwners);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {owners.map((owner) => (
          <div
            key={owner}
            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded"
          >
            <span className="text-sm">{owner}</span>
            <button
              onClick={() => removeOwner(taskId, owner)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
            >
              <X className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ))}
        {owners.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">No owners assigned</div>
        )}
      </div>

      <div className="space-y-2">
        <OwnerCombobox
          onAdd={(name) => addOwner(taskId, name)}
          currentOwners={owners}
          maxOwners={5}
        />
        {owners.length > 0 && (
          <button
            onClick={() => clearOwners(taskId)}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}

function OwnerManagerPanel({ isOpen, onClose }) {
  const getAllOwnersWithStats = useStore((s) => s.getAllOwnersWithStats);
  const removeOwnerFromRegistry = useStore((s) => s.removeOwnerFromRegistry);
  const transferOwnerTasks = useStore((s) => s.transferOwnerTasks);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [transferMode, setTransferMode] = useState(null);
  const [targetOwner, setTargetOwner] = useState('');
  const [removeAfterTransfer, setRemoveAfterTransfer] = useState(false);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setOwners(getAllOwnersWithStats());
    }
  }, [isOpen, getAllOwnersWithStats]);

  const filteredOwners = owners.filter((owner) =>
    owner.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleRemoveOwner = (ownerName) => {
    const result = removeOwnerFromRegistry(ownerName);
    if (result.success) {
      setOwners(getAllOwnersWithStats());
      setConfirmDelete(null);
    }
  };

  const handleTransferOwner = (fromOwner) => {
    if (!targetOwner.trim()) return;

    const result = transferOwnerTasks(fromOwner, targetOwner.trim(), removeAfterTransfer);
    if (result.success) {
      setOwners(getAllOwnersWithStats());
      setTransferMode(null);
      setTargetOwner('');
      setRemoveAfterTransfer(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-25"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close panel"
      />
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Owner Management</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search owners..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Total: {owners.length} owners
          </div>
        </div>

        {/* Owner List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredOwners.length === 0 && searchTerm && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              No owners found matching &quot;{searchTerm}&quot;
            </div>
          )}

          {filteredOwners.length === 0 && !searchTerm && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <div className="text-slate-500 dark:text-slate-400">No owners yet</div>
              <div className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Owners will appear here as you assign them to tasks
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredOwners.map((owner) => (
              <div key={owner.name} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{owner.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {owner.taskCount} {owner.taskCount === 1 ? 'task' : 'tasks'}
                      {owner.lastUsed && <span> • Last used {formatDate(owner.lastUsed)}</span>}
                    </div>
                  </div>

                  {transferMode === owner.name ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTransferMode(null);
                          setTargetOwner('');
                          setRemoveAfterTransfer(false);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="Cancel transfer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : confirmDelete === owner.name ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-600 dark:text-red-400 mr-2">Remove?</span>
                      <button
                        onClick={() => handleRemoveOwner(owner.name)}
                        className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="p-1 bg-gray-400 text-white rounded hover:bg-slate-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {owner.taskCount > 0 && (
                        <button
                          onClick={() => {
                            setTransferMode(owner.name);
                            setTargetOwner('');
                            setRemoveAfterTransfer(false);
                            setConfirmDelete(null);
                          }}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                          title={`Transfer ${owner.name}'s tasks to another owner`}
                        >
                          <UserCheck className="w-4 h-4 text-blue-500" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setConfirmDelete(owner.name);
                          setTransferMode(null);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                        title={`Remove ${owner.name} from all tasks`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                {transferMode === owner.name && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded space-y-2">
                    <div className="text-xs font-medium text-blue-800 dark:text-blue-200">
                      Transfer {owner.taskCount} task{owner.taskCount !== 1 ? 's' : ''} to:
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={targetOwner}
                        onChange={(e) => setTargetOwner(e.target.value)}
                        placeholder="Enter target owner name"
                        list="transfer-owner-suggestions"
                        className="w-full px-2 py-1 text-xs border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <datalist id="transfer-owner-suggestions">
                        {owners
                          .filter(
                            (o) =>
                              o.name !== owner.name &&
                              o.name.toLowerCase().includes(targetOwner.toLowerCase()),
                          )
                          .map((o) => (
                            <option key={o.name} value={o.name} />
                          ))}
                      </datalist>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={removeAfterTransfer}
                          onChange={(e) => setRemoveAfterTransfer(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-gray-700 dark:text-slate-300">
                          Remove {owner.name} after transfer
                        </span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTransferOwner(owner.name)}
                        disabled={!targetOwner.trim() || targetOwner.trim() === owner.name}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Transfer
                      </button>
                      <button
                        onClick={() => {
                          setTransferMode(null);
                          setTargetOwner('');
                          setRemoveAfterTransfer(false);
                        }}
                        className="px-3 py-1 text-xs bg-slate-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {owner.taskCount > 0 && confirmDelete === owner.name && (
                  <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200">
                    Warning: This will remove {owner.name} from {owner.taskCount} task
                    {owner.taskCount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskDrawer({ task, onClose }) {
  const update = useStore((s) => s.updateTask);
  const del = useStore((s) => s.deleteTask);
  const statusMeta = useStore((s) => s.getStatusMetaMap());
  const [local, setLocal] = useState(task);
  useEffect(() => setLocal(task), [task]);

  function save(patch) {
    update(task.id, patch);
  }

  const scoreMath = useMemo(() => {
    const s = priorityScore({
      impact: local.impact,
      urgency: local.urgency,
      effort: local.effort,
      dueAt: local.dueAt,
    });
    const b = scoreToBucket(s);
    return { s, b };
  }, [local.impact, local.urgency, local.effort, local.dueAt]);

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-[300]"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="fixed right-4 top-4 bottom-4 w-[420px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-xl dark:shadow-2xl p-4 overflow-y-auto z-[301]"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Task</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 space-y-2">
          <Field label="Title">
            <input
              value={local.title}
              onChange={(e) => setLocal({ ...local, title: e.target.value })}
              onBlur={() => save({ title: local.title })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </Field>
          <Field label="Status">
            <select
              value={local.status}
              onChange={(e) => {
                const v = /** @type{Status} */ (e.target.value);
                setLocal({ ...local, status: v });
                save({ status: v });
              }}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {Object.keys(statusMeta).map((k) => (
                <option key={k} value={k}>
                  {statusMeta[k].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Owners">
            <OwnerEditor taskId={task.id} owners={task.owners} />
          </Field>
          {local.ownerType === 'ai' && (
            <Field label="Expected by">
              <input
                type="datetime-local"
                value={
                  local.expectedBy ? new Date(local.expectedBy).toISOString().slice(0, 16) : ''
                }
                onChange={(e) => {
                  const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                  setLocal({ ...local, expectedBy: iso });
                  save({ expectedBy: iso });
                }}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </Field>
          )}
          <Field label="Due">
            <input
              type="datetime-local"
              value={local.dueAt ? new Date(local.dueAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                setLocal({ ...local, dueAt: iso });
                save({ dueAt: iso });
              }}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </Field>
          <Field label="Impact / Urgency / Effort">
            <div className="flex items-center gap-3">
              <NumberInput
                value={local.impact}
                onChange={(v) => {
                  setLocal({ ...local, impact: v });
                  save({ impact: v });
                }}
              />
              <NumberInput
                value={local.urgency}
                onChange={(v) => {
                  setLocal({ ...local, urgency: v });
                  save({ urgency: v });
                }}
              />
              <NumberInput
                value={local.effort}
                onChange={(v) => {
                  setLocal({ ...local, effort: v });
                  save({ effort: v });
                }}
              />
            </div>
          </Field>
          <Field label="Priority">
            <div className="flex items-center gap-2">
              <Badge className={PRIORITY_COLORS[scoreMath.b]}>{scoreMath.b}</Badge>
              <button
                onClick={() => {
                  const s = priorityScore({
                    impact: local.impact,
                    urgency: local.urgency,
                    effort: local.effort,
                    dueAt: local.dueAt,
                  });
                  const b = scoreToBucket(s);
                  setLocal({ ...local, priorityBucket: b });
                  save({ score: s, priorityBucket: b });
                }}
                className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors"
              >
                Rescore
              </button>
              <span className="text-xs text-slate-500">
                score = (2×impact + 1.5×urgency) − effort {local.dueAt ? ' + due boost' : ''}
              </span>
            </div>
          </Field>
          <Field label="Tags">
            <input
              value={local.tags?.join(' ') || ''}
              placeholder="+tag +another"
              onChange={(e) => {
                const arr = e.target.value
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((s) => s.replace(/^\+/, ''));
                setLocal({ ...local, tags: arr });
                save({ tags: arr });
              }}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={6}
              value={local.description || ''}
              onChange={(e) => setLocal({ ...local, description: e.target.value })}
              onBlur={() => save({ description: local.description })}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </Field>
          <div className="flex items-center justify-between pt-2">
            {task.status === 'waiting_ai' && (
              <button
                onClick={() =>
                  useStore
                    .getState()
                    .updateTask(task.id, { status: 'ready', ownerType: 'self', expectedBy: null })
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Bot className="w-4 h-4" /> Simulate AI Update
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => {
                del(task.id);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

const WipBanner = React.memo(function WipBanner() {
  const tasks = useStore((s) => s.tasks);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.projectId === currentProjectId),
    [tasks, currentProjectId],
  );
  const wip = visibleTasks.filter((t) => t.status === 'in_progress').length;
  if (wip <= 3) return null;
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 text-sm flex items-center gap-2">
      <Flame className="w-4 h-4" /> High WIP ({wip}). Consider moving some to Ready or Waiting.
    </div>
  );
});

function Toolbar({ viewMode, onChangeView }) {
  const addTask = useStore((s) => s.addTask);
  const setFilters = useStore((s) => s.setFilters);
  const filters = useStore((s) => s.filters);
  const ownerFilter = useStore((s) => s.ownerFilter);
  const setOwnerFilter = useStore((s) => s.setOwnerFilter);
  const getAllOwnersWithStats = useStore((s) => s.getAllOwnersWithStats);
  const selectedIds = useStore((s) => s.selectedIds);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const clearSelection = useStore((s) => s.clearSelection);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.owner-dropdown-container')) {
        setShowOwnerDropdown(false);
      }
    };
    if (showOwnerDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showOwnerDropdown]);

  // Dictation (Chrome Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speechErr, setSpeechErr] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const recRef = useRef(null);
  const discardNextRef = useRef(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechSupported(!!supported);
  }, []);

  const appendTranscript = (text) => {
    const t = (text || '').trim();
    if (!t) return;
    setInput((prev) => (prev ? prev + ' ' : '') + t);
    try {
      inputRef.current?.focus?.();
    } catch (e) {
      /* ignore */
    }
  };

  const stopDictation = (discard = false) => {
    discardNextRef.current = discard;
    try {
      recRef.current?.stop?.();
    } catch (e) {
      /* ignore */
    }
  };

  const startDictation = () => {
    setSpeechErr('');
    if (!speechSupported) {
      setSpeechErr('Speech recognition not supported in this browser.');
      return;
    }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      recRef.current = rec;
      rec.interimResults = true;
      rec.continuous = false;
      rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
      let finals = [];
      rec.onresult = (event) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) finals.push(res[0].transcript);
          else interimText += res[0].transcript;
        }
        setInterim(interimText);
      };
      rec.onerror = (e) => {
        setSpeechErr(e?.error ? String(e.error) : 'speech-error');
      };
      rec.onend = () => {
        setIsListening(false);
        const text = (finals.join(' ') || interim).trim();
        setInterim('');
        if (!discardNextRef.current) appendTranscript(text);
        discardNextRef.current = false;
      };
      setIsListening(true);
      setInterim('');
      rec.start();
    } catch (e) {
      setSpeechErr('Failed to start dictation');
      setIsListening(false);
    }
  };

  const onAdd = () => {
    const p = parseQuickAdd(input);
    const base = {
      title: p.title || 'Untitled',
      // Only set status for AI tasks, let addTask() handle default for others
      ...(p.ownerType === 'ai' && { status: 'waiting_ai' }),
      ownerType: p.ownerType,
      tags: p.tags,
      dueAt: p.dueAt,
      expectedBy: p.expectedBy,
      owners: p.owners || [], // Add owners from parsed data
    };
    if (p.impact !== undefined) base.impact = p.impact;
    if (p.urgency !== undefined) base.urgency = p.urgency;
    if (p.effort !== undefined) base.effort = p.effort;
    if (p.priorityBucket) base.priorityBucket = p.priorityBucket;
    addTask(base);
    setInput('');
  };

  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showAssignOwnerDialog, setShowAssignOwnerDialog] = useState(false);

  const onBulkDelete = () => {
    let ok = true;
    if (typeof window !== 'undefined' && window.confirm) {
      ok = window.confirm(`Delete ${selectedIds.length} selected task(s)? This cannot be undone.`);
    }
    if (ok) deleteSelected();
  };

  const onBulkMove = () => {
    setShowMoveDialog(true);
  };

  const onBulkAssignOwner = () => {
    setShowAssignOwnerDialog(true);
  };

  return (
    <div className="sticky top-0 z-10 mb-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-2xl">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-dismiss token help when user starts typing
                  if (showTokenHelp && e.target.value) {
                    setShowTokenHelp(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAdd();
                  }
                }}
                placeholder="Add a task... (type @ for assignment, # for project, ! for priority)"
                className="w-full px-4 pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              <Plus className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              {/* Help button */}
              <button
                type="button"
                onClick={() => setShowTokenHelp(!showTokenHelp)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Show token syntax help"
                aria-label="Help"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {/* Token help tooltip */}
              <TokenHelpTooltip visible={showTokenHelp} onDismiss={() => setShowTokenHelp(false)} />
            </div>
            {/* Mic toggle */}
            <button
              type="button"
              title={
                speechSupported
                  ? isListening
                    ? 'Stop dictation'
                    : 'Start dictation'
                  : 'Dictation not supported'
              }
              aria-label={
                speechSupported
                  ? isListening
                    ? 'Stop dictation'
                    : 'Start dictation'
                  : 'Dictation not supported'
              }
              onClick={() => {
                isListening ? stopDictation(false) : startDictation();
              }}
              disabled={!speechSupported}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                !speechSupported && 'opacity-50 cursor-not-allowed',
              )}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={onAdd}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              Add Task
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1">
              <button
                type="button"
                onClick={() => onChangeView('board')}
                aria-pressed={viewMode === 'board'}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors rounded-md',
                  viewMode === 'board'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
                )}
              >
                <Kanban className="w-4 h-4" /> Board
              </button>
              <button
                type="button"
                onClick={() => onChangeView('backlog')}
                aria-pressed={viewMode === 'backlog'}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors rounded-md',
                  viewMode === 'backlog'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
                )}
              >
                <List className="w-4 h-4" /> Backlog
              </button>
            </div>
            <div className="relative owner-dropdown-container">
              <button
                onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  ownerFilter
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                )}
                title={ownerFilter ? `Filtering by: ${ownerFilter}` : 'Filter by Owner'}
              >
                <Users className="w-5 h-5" />
              </button>
              {showOwnerDropdown && (
                <div className="absolute top-full mt-1 right-0 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      setOwnerFilter(null);
                      setShowOwnerDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                  >
                    All Owners
                  </button>
                  {getAllOwnersWithStats()
                    .sort((a, b) => b.taskCount - a.taskCount)
                    .map((owner) => (
                      <button
                        key={owner.name}
                        onClick={() => {
                          setOwnerFilter(owner.name);
                          setShowOwnerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex justify-between"
                      >
                        <span>{owner.name}</span>
                        <span className="text-slate-500">({owner.taskCount})</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <input
              value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value })}
              placeholder="Filter text"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-shadow"
            />
          </div>
        </div>
        {(isListening || speechErr) && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-900 px-3 py-2">
            <div className="text-sm flex-1 min-w-0">
              <span className="font-medium">{isListening ? 'Listening…' : 'Dictation'}</span>
              {interim && (
                <span className="ml-2 text-indigo-800 truncate inline-block max-w-full align-bottom">
                  {interim}
                </span>
              )}
              {speechErr && !isListening && <span className="ml-2 text-rose-700">{speechErr}</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isListening && (
                <>
                  <button
                    onClick={() => stopDictation(true)}
                    className="px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => stopDictation(false)}
                    className="px-2 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Use
                  </button>
                </>
              )}
              {!isListening && speechErr && (
                <button
                  onClick={() => startDictation()}
                  className="px-2 py-1.5 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
        {selectedIds.length > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-300 px-3 py-2">
            <div className="text-sm">{selectedIds.length} selected</div>
            <div className="flex items-center gap-2">
              <button
                onClick={onBulkAssignOwner}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                <Users className="w-4 h-4" />
                Assign Owner
              </button>
              <button
                onClick={onBulkMove}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
                Move to Project
              </button>
              <button
                onClick={onBulkDelete}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button onClick={clearSelection} className="text-sm underline">
                Clear
              </button>
            </div>
          </div>
        )}
        {showMoveDialog && (
          <BulkMoveDialog
            taskIds={selectedIds}
            onClose={() => setShowMoveDialog(false)}
            onSuccess={() => {
              setShowMoveDialog(false);
              clearSelection();
            }}
          />
        )}
        {showAssignOwnerDialog && (
          <BulkAssignOwnerDialog
            taskIds={selectedIds}
            onClose={() => setShowAssignOwnerDialog(false)}
            onSuccess={() => {
              setShowAssignOwnerDialog(false);
              clearSelection();
            }}
          />
        )}
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Tokens: !p0..p3 due:today|tomorrow|YYYY-MM-DD|HH:mm @ai @me +tag impact:0..5 urgency:0..5
          effort:0..5 expect:today|YYYY-MM-DD
        </div>
      </div>
    </div>
  );
}

function useFilteredTasks() {
  const tasks = useStore((s) => s.tasks);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const filters = useStore((s) => s.filters);
  const ownerFilter = useStore((s) => s.ownerFilter);
  const statusOrder = useStore((s) => s.getStatusOrder());

  // Memoize visible tasks to avoid recalculation
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => t.projectId === currentProjectId);
  }, [tasks, currentProjectId]);

  return useMemo(() => {
    return visibleTasks
      .filter((t) => {
        if (filters.project !== 'all' && (t.project || '') !== filters.project) return false;
        if (ownerFilter && !t.owners.includes(ownerFilter)) return false;
        if (
          filters.q &&
          !`${t.title} ${t.description || ''} ${t.tags.join(' ')}`
            .toLowerCase()
            .includes(filters.q.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by status lane then priority score desc then due date asc
        if (a.status !== b.status)
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        if (a.score !== b.score) return b.score - a.score;
        const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        return ad - bd;
      });
  }, [visibleTasks, filters, ownerFilter, statusOrder]);
}

function groupTasksByStatus(tasks, statusOrder = null) {
  // If no statusOrder provided, fall back to STATUS_ORDER constant
  const order = statusOrder || STATUS_ORDER;
  /** @type{Record<Status, Task[]>} */
  const grouped = order.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, /** @type{Record<Status, Task[]>} */ ({}));
  for (const t of tasks) {
    if (grouped[t.status]) {
      grouped[t.status].push(t);
    }
  }
  return grouped;
}

const Board = React.memo(function Board() {
  const filtered = useFilteredTasks();
  const currentProjectId = useStore((s) => s.currentProjectId);
  const projects = useStore((s) => s.projects);
  const statusOrder = useStore((s) => s.getStatusOrder());
  const grouped = useMemo(() => groupTasksByStatus(filtered, statusOrder), [filtered, statusOrder]);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const hasNoTasks = filtered.length === 0;

  if (hasNoTasks) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No tasks in {currentProject?.name || 'this project'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Get started by adding your first task using the quick-add bar above.
          </p>
          <div className="text-sm text-slate-500 dark:text-slate-500">
            <p className="mb-2">Quick tips:</p>
            <ul className="text-left inline-block">
              <li>
                • Use{' '}
                <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">!p0</code> for
                high priority
              </li>
              <li>
                • Use{' '}
                <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                  due:tomorrow
                </code>{' '}
                for deadlines
              </li>
              <li>
                • Use{' '}
                <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">@ai</code> to
                delegate to AI
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"
      style={{ position: 'relative', zIndex: 1 }}
    >
      {statusOrder.map((status) => (
        <Column key={status} status={status} tasks={grouped[status] || []} />
      ))}
    </div>
  );
});

function BacklogView() {
  const filtered = useFilteredTasks();
  const [collapsed, setCollapsed] = useState(() => new Set(['done']));
  const [draggingTask, setDraggingTask] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const updateTask = useStore((s) => s.updateTask);
  const statusOrder = useStore((s) => s.getStatusOrder());
  const statusMeta = useStore((s) => s.getStatusMetaMap());
  const grouped = useMemo(() => groupTasksByStatus(filtered, statusOrder), [filtered, statusOrder]);

  const handleDragStart = (e, task) => {
    setDraggingTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    if (draggingTask && dropTarget) {
      const targetStatus = dropTarget.status;
      // Update the task's status
      updateTask(draggingTask.id, { status: targetStatus });
    }
    setDraggingTask(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, status, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingTask) {
      setDropTarget({ status, index });
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
    }
  };

  const toggle = (status) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      {statusOrder.map((status) => (
        <div
          key={status}
          className="border-b border-slate-200 dark:border-slate-700 last:border-b-0"
        >
          <BacklogHeader
            statusLabel={statusMeta[status]?.label}
            statusHint={statusMeta[status]?.hint}
            count={grouped[status]?.length || 0}
            collapsed={collapsed.has(status)}
            onToggle={() => toggle(status)}
          />
          {!collapsed.has(status) && (
            <div
              className={clsx(
                'min-h-[40px] transition-colors rounded-lg bg-slate-50/40 dark:bg-slate-900/20 p-2',
                dropTarget?.status === status && draggingTask && 'bg-blue-50 dark:bg-blue-900/20',
              )}
              onDragOver={(e) => handleDragOver(e, status, 0)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                handleDragEnd();
              }}
            >
              {(grouped[status]?.length || 0) === 0 ? (
                <div
                  className={clsx(
                    'px-4 py-4 text-center text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/50',
                    dropTarget?.status === status &&
                      draggingTask &&
                      'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800',
                  )}
                >
                  {dropTarget?.status === status && draggingTask ? (
                    'Drop here'
                  ) : (
                    <EmptyColumnState columnName={statusMeta[status]?.label || status} />
                  )}
                </div>
              ) : (
                grouped[status].map((task) => (
                  <BacklogRow
                    key={task.id}
                    task={task}
                    status={status}
                    isDragging={draggingTask?.id === task.id}
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BacklogHeader({ statusLabel, statusHint, count, collapsed, onToggle }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/80 overflow-hidden transition-all sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={clsx(
              'w-4 h-4 transition-transform text-slate-500 dark:text-slate-400',
              collapsed ? '-rotate-90' : 'rotate-0',
            )}
          />
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {statusLabel}
          </span>
          <span className="text-xs text-slate-500">{statusHint}</span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400">
          {count} task{count === 1 ? '' : 's'}
        </span>
      </button>
    </div>
  );
}

function BacklogRow({ task, isDragging, onDragStart, onDragEnd }) {
  const toggleSelected = useStore((s) => s.toggleSelected);
  const selectedIds = useStore((s) => s.selectedIds);
  const startTimer = useStore((s) => s.startTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const moveTask = useStore((s) => s.moveTask);
  const statusOrder = useStore((s) => s.getStatusOrder());
  const statusMeta = useStore((s) => s.getStatusMetaMap());
  const [open, setOpen] = useState(false);
  const isSelected = selectedIds.includes(task.id);
  const isRunning = !!task.timerStartedAt;
  const elapsedSecs = computeElapsedSecs(task);
  const overdue = task.dueAt ? isBefore(new Date(task.dueAt), new Date()) : false;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(
        'mt-2 first:mt-0 px-4 py-3 rounded-lg bg-white dark:bg-slate-900 transition-all cursor-grab active:cursor-grabbing relative border border-slate-200 dark:border-slate-700 hover:shadow-md',
        isSelected &&
          'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm',
        isDragging && 'opacity-60 ring-2 ring-blue-300 dark:ring-blue-900/40',
      )}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            <input
              type="checkbox"
              className="mt-1 cursor-pointer accent-blue-600 dark:accent-blue-400"
              checked={isSelected}
              onChange={() => toggleSelected(task.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <button
                  className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate min-w-0 max-w-full"
                  title={task.title}
                  onClick={() => setOpen(true)}
                >
                  {task.title}
                </button>
                <Badge className={PRIORITY_COLORS[task.priorityBucket]}>
                  {task.priorityBucket}
                </Badge>
                {task.ownerType === 'ai' && (
                  <Badge variant="primary">
                    <Bot className="w-3.5 h-3.5 mr-1" /> AI
                  </Badge>
                )}
                {task.ownerType === 'other' && <Badge variant="default">Shared</Badge>}
                {task.status === 'blocked' && (
                  <Badge variant="danger">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Blocked
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                {task.project && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    #{task.project}
                  </span>
                )}
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
                {task.dueAt && (
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                      overdue && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {humanDue(task.dueAt)}
                  </span>
                )}
                {task.expectedBy && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Clock className="w-3 h-3" /> Expect {humanDue(task.expectedBy)}
                  </span>
                )}
                {(elapsedSecs > 0 || isRunning) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <TimerIcon className="w-3 h-3" /> {formatDurationShort(elapsedSecs)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Score {task.score}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={task.status}
            onChange={(e) => moveTask(task.id, /** @type{Status} */ (e.target.value))}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-shadow"
          >
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusMeta[status]?.label || status}
              </option>
            ))}
          </select>
          {isRunning ? (
            <button
              onClick={() => stopTimer(task.id)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Pause timer"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => startTimer(task.id)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Start focus timer"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && <TaskDrawer task={task} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ----- Tiny Self-Test Harness (non-blocking) -----
// Commented out since self-tests were modifying the actual store
/*
function runSelfTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      const r = fn();
      results.push({ name, ok: r === true });
    } catch {
      results.push({ name, ok: false });
    }
  };

  // Test: parseQuickAdd basics
  test('parseQuickAdd tokens', () => {
    const p = parseQuickAdd(
      'Fix login !p0 due:today 17:00 @ai +auth impact:4 urgency:5 effort:2 expect:today',
    );
    return (
      p.ownerType === 'ai' &&
      p.tags.includes('auth') &&
      !!p.dueAt &&
      !!p.expectedBy &&
      p.impact === 4 &&
      p.urgency === 5 &&
      p.effort === 2
    );
  });

  // Test: priority monotonicity
  test('priorityScore higher impact -> higher score', () => {
    const s1 = priorityScore({ impact: 1, urgency: 1, effort: 1 });
    const s2 = priorityScore({ impact: 5, urgency: 1, effort: 1 });
    return s2 > s1;
  });

  // Test: due parser includes time
  test('parseDueToken time picking', () => {
    const iso = parseDueToken(['tomorrow', '16:00']);
    const d = new Date(iso);
    return d.getHours() === 16; // local hour check
  });

  // Test: bucket boundaries
  test('scoreToBucket boundaries', () => {
    return (
      scoreToBucket(81) === 'P0' &&
      scoreToBucket(80) === 'P0' &&
      scoreToBucket(79) === 'P1' &&
      scoreToBucket(60) === 'P1' &&
      scoreToBucket(59) === 'P2' &&
      scoreToBucket(40) === 'P2' &&
      scoreToBucket(39) === 'P3'
    );
  });

  // Test: timer computations
  test('computeElapsedSecs adds running time', () => {
    const now = new Date();
    const t = {
      timeLogSecs: 30,
      timerStartedAt: new Date(now.getTime() - 90 * 1000).toISOString(),
    };
    const secs = computeElapsedSecs(t, now);
    return secs >= 119 && secs <= 121; // allow 1s jitter
  });
  test('formatDurationShort formatting', () => {
    return (
      formatDurationShort(3670) === '1h 1m' &&
      formatDurationShort(125) === '2m 5s' &&
      formatDurationShort(9) === '9s'
    );
  });

  // Test: selection helpers
  test('toggleId adds/removes id', () => {
    const a = toggleId([], 'x');
    const b = toggleId(a, 'y');
    const c = toggleId(b, 'x');
    return (
      a.includes('x') && b.includes('x') && b.includes('y') && !c.includes('x') && c.includes('y')
    );
  });
  test('filterOutByIds removes matching tasks', () => {
    const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const out = filterOutByIds(tasks, ['b', 'c']);
    return out.length === 1 && out[0].id === 'a';
  });

  // Project-specific tests
  test('Project: default project exists', () => {
    const store = useStore.getState();
    const defaultProject = store.projects.find((p) => p.isDefault === true);
    return defaultProject && defaultProject.id === 'default';
  });

  test('Project: createProject validates name', () => {
    const store = useStore.getState();
    // Test empty name
    const result1 = store.createProject('');
    // Test too long name (>15 chars)
    const result2 = store.createProject('ThisNameIsTooLongForAProject');
    // Test valid name
    const result3 = store.createProject('TestProject');
    return result1.error && result2.error && result3.success;
  });

  test('Project: cannot delete default project', () => {
    const store = useStore.getState();
    const result = store.deleteProject('default');
    return result.error === 'Cannot delete this project';
  });

  test('Project: tasks filtered by current project', () => {
    const store = useStore.getState();
    // Create a test project
    const projectResult = store.createProject('Test1');
    if (!projectResult.success) return false;

    // Add task to default project
    const originalProjectId = store.currentProjectId;
    store.addTask({ title: 'Default Task' });

    // Switch to test project and add task
    store.switchProject(projectResult.projectId);
    store.addTask({ title: 'Test Task' });

    // Check visible tasks only show test project tasks
    const visibleTasks = store.getVisibleTasks();
    const isCorrect = visibleTasks.every((t) => t.projectId === projectResult.projectId);

    // Cleanup
    store.deleteProject(projectResult.projectId);
    store.switchProject(originalProjectId);

    return isCorrect;
  });

  test('Project: reorderProjects changes order', () => {
    const store = useStore.getState();
    const initialProjects = [...store.projects];
    if (initialProjects.length < 2) {
      // Need at least 2 projects to test reordering
      store.createProject('ReorderTest');
    }

    const projectIds = store.projects.map((p) => p.id);
    const reversedIds = [...projectIds].reverse();
    store.reorderProjects(reversedIds);

    const newOrder = store.projects.map((p) => p.id);
    const isReordered = newOrder[0] === reversedIds[0];

    // Restore original order
    store.reorderProjects(projectIds);

    return isReordered;
  });

  test('Project: localStorage cleanup removes orphaned tasks', () => {
    const store = useStore.getState();

    // Add a task with non-existent project ID directly
    const orphanTask = {
      id: 'orphan-test',
      title: 'Orphan Task',
      projectId: 'non-existent-project',
      status: 'backlog',
    };

    store.tasks.push(orphanTask);
    const tasksBeforeCleanup = store.tasks.length;

    // Run cleanup
    const wasCleanupNeeded = store.cleanupStorage();
    const tasksAfterCleanup = store.tasks.length;

    return wasCleanupNeeded && tasksAfterCleanup < tasksBeforeCleanup;
  });

  // Owner Management Tests (T041-T045)

  // Test: Owner registry initialization
  test('Owner registry initialization', () => {
    const store = useStore.getState();
    return (
      store.ownerRegistry !== undefined &&
      store.ownerRegistry.owners instanceof Set &&
      store.ownerRegistry.statistics instanceof Map
    );
  });

  // Test: Owner validation rules
  test('Owner name validation', () => {
    const valid1 = validateOwnerName('Alice');
    const valid2 = validateOwnerName("John O'Brien-Smith");
    const invalid1 = validateOwnerName('');
    const invalid2 = validateOwnerName('   ');
    const invalid3 = validateOwnerName('a'.repeat(31)); // Too long
    const invalid4 = validateOwnerName('Alice@#$%'); // Invalid chars

    return (
      valid1.valid === true &&
      valid2.valid === true &&
      invalid1.valid === false &&
      invalid2.valid === false &&
      invalid3.valid === false &&
      invalid4.valid === false
    );
  });

  // Test: Add owner to registry
  test('Add owner to registry', () => {
    const store = useStore.getState();
    const initialCount = store.ownerRegistry.owners.size;

    const result = store.addOwnerToRegistry('TestOwner' + Date.now());
    const newCount = store.ownerRegistry.owners.size;

    return result.success === true && newCount === initialCount + 1;
  });

  // Test: Owner suggestions sorting
  test('Owner suggestions sorted by usage', () => {
    const store = useStore.getState();
    const suggestions = store.getOwnerSuggestions('');

    if (suggestions.length < 2) return true; // Skip if not enough data

    // Check that suggestions are sorted by task count (descending)
    for (let i = 1; i < suggestions.length; i++) {
      if (suggestions[i].taskCount > suggestions[i-1].taskCount) {
        return false;
      }
    }
    return true;
  });

  // Test: 5 owner limit enforcement
  test('5 owner limit per task', () => {
    const store = useStore.getState();

    // We test that the bulkAssignOwner function exists
    // which enforces the 5 owner limit
    return typeof store.bulkAssignOwner === 'function';
  });

  return results;
}
*/

// DISABLED: Self-tests were modifying the actual store and persisting test data
// const SELF_TEST_RESULTS = runSelfTests();

export default function WorkdayTaskBoardApp() {
  const persist = useStore((s) => s.persist);
  const init = useStore((s) => s.init);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const getProjectTaskCount = useStore((s) => s.getProjectTaskCount);
  const clearCurrentProject = useStore((s) => s.clearCurrentProject);
  useEffect(() => {
    init();
    // Initialize owner registry after loading from storage
    useStore.getState().initializeOwnerRegistry();
  }, [init]);
  useEffect(() => {
    const id = setInterval(() => persist(), 1000);
    return () => clearInterval(id);
  }, [persist]);

  const [showOwnerManager, setShowOwnerManager] = useState(false);
  const [showWorkflowSettings, setShowWorkflowSettings] = useState(false);

  // Theme toggle with persistence
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    // First check localStorage
    const stored = window.localStorage.getItem('theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    // Fall back to system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return 'board';
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    return stored === 'backlog' ? 'backlog' : 'board';
  });
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', dark);
      // Persist theme preference
      try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
      } catch (e) {
        /* ignore storage errors */
      }
    }
  }, [dark]);
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch (e) {
      /* ignore storage errors */
    }
  }, [viewMode]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-black">
        <div className="max-w-[1400px] mx-auto">
          <header className="relative z-30 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/70 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <img src={dark ? logoDark : logoLight} alt="FlowTrackr" className="h-20 w-auto" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Streamline your workflow with intelligent task management
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWorkflowSettings(true)}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Workflow Settings"
                >
                  <Kanban className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const count = getProjectTaskCount(currentProjectId);
                    if (count === 0) {
                      alert('No tasks to delete in this project.');
                      return;
                    }
                    if (
                      window.confirm(
                        `Delete all ${count} task(s) in this project? This cannot be undone.`,
                      )
                    ) {
                      clearCurrentProject();
                    }
                  }}
                  title="Delete all tasks in the current project"
                  className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Clear all tasks in current project"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowOwnerManager(true)}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Manage Owners"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                  onClick={() => setDark((v) => !v)}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <ProjectSelector />
              </div>
            </div>
          </header>

          <Toolbar viewMode={viewMode} onChangeView={setViewMode} />
          <main className="px-6 py-4">
            <WipBanner />
            {viewMode === 'board' ? <Board /> : <BacklogView />}

            <footer className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800"></footer>
          </main>
        </div>

        {showOwnerManager && (
          <OwnerManagerPanel isOpen={showOwnerManager} onClose={() => setShowOwnerManager(false)} />
        )}

        {showWorkflowSettings && (
          <WorkflowSettingsModal onClose={() => setShowWorkflowSettings(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}
