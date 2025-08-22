import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Trash2,
  Play,
  Flame,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import clsx from 'clsx';

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
 * Quick-add tokens: #project, !p0..p3, due:today|tomorrow|YYYY-MM-DD|HH:mm, @ai, @me,
 * +tag, effort:1..5, impact:0..5, urgency:0..5, expect:today|YYYY-MM-DD
 */

// ----- Types -----

/** @typedef {"backlog"|"ready"|"in_progress"|"waiting_ai"|"waiting_other"|"blocked"|"in_review"|"done"} Status */
/** @typedef {"self"|"ai"|"other"} OwnerType */

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

const PRIORITY_COLORS = {
  P0: 'bg-red-100 text-red-700 border-red-300',
  P1: 'bg-orange-100 text-orange-700 border-orange-300',
  P2: 'bg-amber-100 text-amber-700 border-amber-300',
  P3: 'bg-slate-100 text-slate-700 border-slate-300',
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
 *  id:string; title:string; description?:string; project?:string; status:Status;
 *  impact:number; urgency:number; effort:number; priorityBucket:"P0"|"P1"|"P2"|"P3";
 *  score:number; dueAt?:string|null; ownerType:OwnerType; ownerRef?:string; tags:string[];
 *  dependencies:string[]; createdAt:string; updatedAt:string; expectedBy?:string|null;
 *  timeLogSecs?:number; timerStartedAt?:string|null;
 * }} Task */

const STORAGE_KEY = 'workday-board@v1';

const seedTasks = () => {
  const now = new Date();
  return [
    {
      id: uid(),
      title: 'Fix login bug for Alpha',
      project: 'alpha',
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
      project: 'alpha',
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
      project: 'beta',
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
      project: 'gamma',
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
  return {
    id: partial.id ?? uid(),
    title: partial.title ?? 'Untitled',
    description: partial.description ?? '',
    project: partial.project ?? undefined,
    status: partial.status ?? 'backlog',
    impact,
    urgency,
    effort,
    score,
    priorityBucket: bucket,
    dueAt: partial.dueAt ?? null,
    ownerType: partial.ownerType ?? 'self',
    ownerRef: partial.ownerRef ?? undefined,
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
  // User prefs
  autoReturnOnStop: false,
  setAutoReturnOnStop(v) {
    set({ autoReturnOnStop: v });
  },

  // Drag state
  draggingId: /** @type{string|null} */ (null),
  dragHoverStatus: /** @type{Status|null} */ (null),

  init() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ tasks: parsed.tasks || [], autoReturnOnStop: parsed.autoReturnOnStop ?? false });
        return;
      }
    } catch (e) {
      /* ignore storage errors */
    }
    set({ tasks: seedTasks() });
  },
  persist() {
    try {
      const { tasks, autoReturnOnStop } = get();
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, autoReturnOnStop }));
    } catch (e) {
      /* ignore storage errors */
    }
  },
  addTask(partial) {
    const t = finalizeTask(partial);
    set((s) => ({ tasks: [...s.tasks, t] }));
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
  moveTask(id, status) {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
    get().persist();
  },
  setFilters(patch) {
    set((s) => ({ filters: { ...s.filters, ...patch } }));
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
  clearDrag() {
    set({ draggingId: null, dragHoverStatus: null });
  },
}));

// ----- Quick Add Parser -----

function parseQuickAdd(input) {
  // Tokenize by spaces but keep quoted phrases
  const tokens = input.match(/"[^"]+"|\S+/g) || [];
  let titleParts = [];
  let project,
    dueAt = null,
    ownerType = 'self',
    tags = [],
    impact = undefined,
    urgency = undefined,
    effort = undefined,
    priorityBucket = null,
    expectedBy = null;
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i].replaceAll('"', '');
    if (raw.startsWith('#')) {
      project = raw.slice(1);
      continue;
    }
    if (raw.startsWith('+')) {
      tags.push(raw.slice(1));
      continue;
    }
    if (/^!p[0-3]$/i.test(raw)) {
      priorityBucket = raw.toUpperCase().slice(1);
      continue;
    }
    if (raw === '@ai') {
      ownerType = 'ai';
      continue;
    }
    if (raw === '@me') {
      ownerType = 'self';
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
  const base = { title, project, dueAt, ownerType, tags, expectedBy };
  if (impact !== undefined) base.impact = impact;
  if (urgency !== undefined) base.urgency = urgency;
  if (effort !== undefined) base.effort = effort;
  if (priorityBucket) base.priorityBucket = priorityBucket;
  return base;
}

// ----- UI Components -----

function Badge({ children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs',
        className,
      )}
    >
      {children}
    </span>
  );
}

function Column({ status, tasks }) {
  const dragHoverStatus = useStore((s) => s.dragHoverStatus);
  const highlight = dragHoverStatus === status;
  return (
    <div
      data-col={status}
      className={clsx(
        'flex-1 min-w-[280px] max-w-[520px] rounded-2xl p-3 border shadow-sm transition-colors',
        'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700',
        highlight && 'ring-2 ring-indigo-400 border-indigo-300',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <GripVertical className="w-4 h-4 text-slate-400" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {STATUS_META[status].label}
        </h3>
        <span className="text-xs text-slate-500">{STATUS_META[status].hint}</span>
      </div>
      <div className="space-y-2 min-h-24">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }) {
  const move = useStore((s) => s.moveTask);
  const stopTimer = useStore((s) => s.stopTimer);
  const startTimer = useStore((s) => s.startTimer);
  const toggleSelected = useStore((s) => s.toggleSelected);
  const selectedIds = useStore((s) => s.selectedIds);
  const [open, setOpen] = useState(false);
  const overdue = task.dueAt ? isBefore(new Date(task.dueAt), new Date()) : false;

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
        const status = getStatusFromPoint(info.point.x, info.point.y);
        useStore.getState().setDragHoverStatus(status);
      }}
      onDragEnd={(e, info) => {
        const status = getStatusFromPoint(info.point.x, info.point.y);
        if (status) move(task.id, status);
        useStore.getState().clearDrag();
      }}
      className={clsx(
        'cursor-grab active:cursor-grabbing rounded-xl border p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden',
        isSelected && 'ring-2 ring-rose-400',
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelected(task.id)}
          title="Select task"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              className="text-left font-medium hover:underline truncate min-w-0 max-w-full"
              title={task.title}
              onClick={() => setOpen(true)}
            >
              {task.title}
            </button>
            <Badge className={PRIORITY_COLORS[task.priorityBucket]}>{task.priorityBucket}</Badge>
            {task.ownerType === 'ai' && (
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300">
                <Bot className="w-3.5 h-3.5 mr-1" />
                AI
              </Badge>
            )}
            {task.status === 'blocked' && (
              <Badge className="bg-pink-100 text-pink-700 border-pink-300">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Blocked
              </Badge>
            )}
            {/* Time chip */}
            <Badge className="bg-slate-100 text-slate-700 border-slate-300">
              <TimerIcon className="w-3.5 h-3.5 mr-1" />
              {elapsedLabel}
              {isRunning ? ' • running' : ''}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            {task.project && (
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                #{task.project}
              </span>
            )}
            {task.tags?.map((t) => (
              <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                +{t}
              </span>
            ))}
            {task.dueAt && (
              <span
                className={clsx(
                  'inline-flex items-center gap-1',
                  overdue ? 'text-red-700' : 'text-slate-600',
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                {humanDue(task.dueAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            title="Move left"
            onClick={() => {
              const order = /** @type{Status[]} */ (Object.keys(STATUS_META));
              const idx = order.indexOf(task.status);
              if (idx > 0)
                useStore.getState().moveTask(task.id, /** @type{Status} */ (order[idx - 1]));
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {isRunning ? (
            <button
              title="Pause"
              onClick={() => stopTimer(task.id)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button
              title="Start focus timer"
              onClick={() => startTimer(task.id)}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            title="Move right"
            onClick={() => {
              const order = /** @type{Status[]} */ (Object.keys(STATUS_META));
              const idx = order.indexOf(task.status);
              if (idx < order.length - 1)
                useStore.getState().moveTask(task.id, /** @type{Status} */ (order[idx + 1]));
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
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
      <div className="w-28 text-xs text-slate-500 uppercase tracking-wide">{label}</div>
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
      className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
    />
  );
}

function TaskDrawer({ task, onClose }) {
  const update = useStore((s) => s.updateTask);
  const del = useStore((s) => s.deleteTask);
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="fixed right-4 top-4 bottom-4 w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 overflow-y-auto z-50"
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
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </Field>
        <Field label="Project">
          <input
            value={local.project || ''}
            placeholder="#project"
            onChange={(e) => setLocal({ ...local, project: e.target.value })}
            onBlur={() => save({ project: local.project })}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            {Object.keys(STATUS_META).map((k) => (
              <option key={k} value={k}>
                {STATUS_META[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select
            value={local.ownerType}
            onChange={(e) => {
              const v = /** @type{OwnerType} */ (e.target.value);
              setLocal({ ...local, ownerType: v });
              save({ ownerType: v });
            }}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="self">Me</option>
            <option value="ai">AI Agent</option>
            <option value="other">Other</option>
          </select>
        </Field>
        {local.ownerType === 'ai' && (
          <Field label="Expected by">
            <input
              type="datetime-local"
              value={local.expectedBy ? new Date(local.expectedBy).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                setLocal({ ...local, expectedBy: iso });
                save({ expectedBy: iso });
              }}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
              className="px-2 py-1 text-sm rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
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
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </Field>
        <Field label="Notes">
          <textarea
            rows={6}
            value={local.description || ''}
            onChange={(e) => setLocal({ ...local, description: e.target.value })}
            onBlur={() => save({ description: local.description })}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
  );
}

function WipBanner() {
  const tasks = useStore((s) => s.tasks);
  const wip = tasks.filter((t) => t.status === 'in_progress').length;
  if (wip <= 3) return null;
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-3 py-2 text-sm flex items-center gap-2">
      <Flame className="w-4 h-4" /> High WIP ({wip}). Consider moving some to Ready or Waiting.
    </div>
  );
}

function Toolbar() {
  const addTask = useStore((s) => s.addTask);
  const setFilters = useStore((s) => s.setFilters);
  const filters = useStore((s) => s.filters);
  const autoReturnOnStop = useStore((s) => s.autoReturnOnStop);
  const setAutoReturnOnStop = useStore((s) => s.setAutoReturnOnStop);
  const selectedIds = useStore((s) => s.selectedIds);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const clearSelection = useStore((s) => s.clearSelection);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    useStore.getState().init();
  }, []);

  const onAdd = () => {
    const p = parseQuickAdd(input);
    const base = {
      title: p.title || 'Untitled',
      project: p.project,
      status: p.ownerType === 'ai' ? 'waiting_ai' : 'ready',
      ownerType: p.ownerType,
      tags: p.tags,
      dueAt: p.dueAt,
      expectedBy: p.expectedBy,
    };
    if (p.impact !== undefined) base.impact = p.impact;
    if (p.urgency !== undefined) base.urgency = p.urgency;
    if (p.effort !== undefined) base.effort = p.effort;
    addTask(base);
    setInput('');
  };

  const onBulkDelete = () => {
    let ok = true;
    if (typeof window !== 'undefined' && window.confirm) {
      ok = window.confirm(`Delete ${selectedIds.length} selected task(s)? This cannot be undone.`);
    }
    if (ok) deleteSelected();
  };

  return (
    <div className="sticky top-0 z-10 -mx-1 mb-3 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAdd();
                }
              }}
              placeholder='Quick add: "Ship PR #alpha !p1 due:today 17:00 @me +ui"'
              className="w-full px-3 pl-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <Plus className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
          </div>
          <button
            onClick={onAdd}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Add
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filters.project}
            onChange={(e) => setFilters({ project: e.target.value })}
            className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">All projects</option>
            <option value="alpha">alpha</option>
            <option value="beta">beta</option>
            <option value="gamma">gamma</option>
          </select>
          <select
            value={filters.owner}
            onChange={(e) => setFilters({ owner: e.target.value })}
            className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">Any owner</option>
            <option value="self">Me</option>
            <option value="ai">AI</option>
            <option value="other">Other</option>
          </select>
          <input
            value={filters.q}
            onChange={(e) => setFilters({ q: e.target.value })}
            placeholder="Filter text"
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
          {/* Pref: auto return */}
          <label className="ml-2 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={autoReturnOnStop}
              onChange={(e) => setAutoReturnOnStop(e.target.checked)}
            />
            Return to Ready on pause
          </label>
        </div>
      </div>
      {selectedIds.length > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 text-rose-900 px-3 py-2">
          <div className="text-sm">{selectedIds.length} selected</div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete selected
            </button>
            <button onClick={clearSelection} className="text-sm underline">
              Clear
            </button>
          </div>
        </div>
      )}
      <div className="mt-2 text-xs text-slate-500">
        Tokens: #project !p0..p3 due:today|tomorrow|YYYY-MM-DD|HH:mm @ai @me +tag impact:0..5
        urgency:0..5 effort:0..5 expect:today|YYYY-MM-DD
      </div>
    </div>
  );
}

function Board() {
  const tasks = useStore((s) => s.tasks);
  const filters = useStore((s) => s.filters);

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => {
        if (filters.project !== 'all' && (t.project || '') !== filters.project) return false;
        if (filters.owner !== 'all' && t.ownerType !== filters.owner) return false;
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
          return (
            Object.keys(STATUS_META).indexOf(a.status) - Object.keys(STATUS_META).indexOf(b.status)
          );
        if (a.score !== b.score) return b.score - a.score;
        const ad = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
        const bd = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
        return ad - bd;
      });
  }, [tasks, filters]);

  const grouped = useMemo(() => {
    /** @type{Record<Status, Task[]>} */
    const g = {
      backlog: [],
      ready: [],
      in_progress: [],
      waiting_ai: [],
      waiting_other: [],
      blocked: [],
      in_review: [],
      done: [],
    };
    for (const t of filtered) g[t.status].push(t);
    return g;
  }, [filtered]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {
        /** @type{Status[]} */ (Object.keys(STATUS_META)).map((s) => (
          <Column key={s} status={/** @type{Status} */ (s)} tasks={grouped[s]} />
        ))
      }
    </div>
  );
}

// ----- Tiny Self-Test Harness (non-blocking) -----
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
      'Fix login #alpha !p0 due:today 17:00 @ai +auth impact:4 urgency:5 effort:2 expect:today',
    );
    return (
      p.project === 'alpha' &&
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

  return results;
}

const SELF_TEST_RESULTS = runSelfTests();

function SelfTestResults() {
  const ok = SELF_TEST_RESULTS.filter((r) => r.ok).length;
  const total = SELF_TEST_RESULTS.length;
  return (
    <div className={clsx('mt-6 text-xs', ok === total ? 'text-slate-500' : 'text-rose-600')}>
      Self-tests: {ok}/{total} passed.
    </div>
  );
}

export default function WorkdayTaskBoardApp() {
  const persist = useStore((s) => s.persist);
  const init = useStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  useEffect(() => {
    const id = setInterval(() => persist(), 1000);
    return () => clearInterval(id);
  }, [persist]);

  // Theme toggle (simple)
  const [dark, setDark] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">Workday Task Board</h1>
            <p className="text-sm text-slate-500">
              Keyboard-first board for tasks, meetings, bugs, and AI handoffs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((v) => !v)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {dark ? 'Light' : 'Dark'} mode
            </button>
          </div>
        </div>

        <Toolbar />
        <WipBanner />
        <Board />

        <SelfTestResults />
        <div className="mt-2 text-xs text-slate-500">
          Drag to any column (left or right). Time chips show running focus time; toggle
          &quot;Return to Ready on pause&quot; in the toolbar.
        </div>
      </div>
    </div>
  );
}
