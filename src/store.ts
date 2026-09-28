import { create } from 'zustand';
import type {
  Task, Project, Habit, CalEvent, NoteItem, AppNotif, Settings, DayStats,
  Tag, Priority, ViewKey, CalView,
} from './lib/types';
import { STORAGE_KEY, STORE_VERSION } from './lib/types';
import { todayKey, addDaysKey, diffDays } from './lib/dates';
import { uid } from './lib/utils';
import { tr } from './lib/i18n';
import { SEED_TAGS, seedProjects, seedHabits, seedNotes, DEFAULT_SETTINGS } from './lib/seed';
import { loadPersist, savePersist, mergeSettings } from './lib/storage';
import { parseQuickAdd } from './lib/parser';

/** In-window dedupe: don't POST identical reminder snapshots repeatedly. */
let lastRelayPayload = '';

/** Minimum seeds — must keep sample app non-empty per spec §38. */
function buildSeedTasks(now: string, projects: Project[]): Task[] {
  const website = projects[0]?.id ?? null;
  const journal = projects[1]?.id ?? projects[0]?.id ?? null;
  const brand = projects[2]?.id ?? null;
  const defaults = DEFAULT_SETTINGS;
  const base = (): Task => ({
    id: uid('task'), title: '', description: '', notes: '', allDay: false,
    priority: defaults.defaultPriority, tags: [], projectId: null,
    completed: false, completedAt: null, reminder: 'none', reminderAt: null,
    subtasks: [], repeat: 'none', repeatDays: [], archived: false,
    focus: false, order: 0, createdAt: now, updatedAt: now,
    date: now, time: null,
  });
  const t = (patch: Partial<Task> & { title: string; date: string | null; time?: string | null }): Task =>
    ({ ...base(), order: Math.random(), ...patch, time: patch.time ?? null } as Task);
  return [
    t({ title: 'Review daily priorities', date: now, time: '08:00', priority: 'high', completed: true, completedAt: now }),
    { ...t({ title: 'Workout', date: now, time: '08:30', tags: ['fitness'], priority: 'normal' }), subtasks: [{ id: uid(), title: 'Warm up · 10m', done: false }, { id: uid(), title: 'Strength · 30m', done: false }] },
    t({ title: 'Read 20 pages', date: now, time: '09:15', tags: ['personal'], priority: 'low' }),
    t({ title: 'Work on website', date: now, time: '13:00', projectId: website, priority: 'high', tags: ['work'], subtasks: [{ id: uid(), title: 'Build homepage', done: true }, { id: uid(), title: 'Add analytics', done: false }, { id: uid(), title: 'Deploy', done: false }] }),
    t({ title: 'Meeting with Ali', date: now, time: '15:00', tags: ['work'], priority: 'high', reminder: '10m' }),
    t({ title: 'Review trading journal', date: now, time: '16:00', projectId: journal, tags: ['finance'], priority: 'normal' }),
    t({ title: 'Plan tomorrow', date: now, time: '19:30', priority: 'normal', tags: ['personal'] }),
    t({ title: 'Read', date: now, priority: 'low', time: null, tags: ['personal'] }),
    t({ title: 'Invoices · send batch', date: addDaysKey(now, 1), time: '10:00', projectId: brand, priority: 'urgent', tags: ['work', 'finance'] }),
    t({ title: 'Ideas · capture backlog', date: null, tags: ['ideas'], priority: 'low' }),
    t({ title: 'Pay rent', date: addDaysKey(now, 2), time: '09:00', tags: ['finance'], priority: 'high', reminder: '1d' }),
    { ...t({ title: 'Launch website', date: addDaysKey(now, 6), time: '10:00', projectId: website, tags: ['work'], priority: 'urgent' }), subtasks: [{ id: uid(), title: 'Create design', done: true }, { id: uid(), title: 'Build homepage', done: true }, { id: uid(), title: 'Add analytics', done: false }, { id: uid(), title: 'Deploy', done: false }] },
    t({ title: 'Follow up · supplier invoices', date: addDaysKey(now, -1), time: '10:00', priority: 'high', tags: ['work'] }),
    t({ title: 'Buy groceries', date: addDaysKey(now, -2), time: '18:00', priority: 'low', completed: true, completedAt: addDaysKey(now, -2) }),
  ];
}

function nextOrder(tasks: Task[]): number {
  return (tasks.length ? Math.max(...tasks.map((t) => t.order)) : 0) + 1;
}

type FilterState = {
  priority: Priority | 'all';
  tag: string | 'all';
  project: string | 'all';
  completion: 'all' | 'open' | 'done';
  q: string;
};

export interface AppState {
  // navigation
  view: ViewKey;
  calView: CalView;
  calDate: string;
  selectedTaskId: string | null;
  focusTaskId: string | null;
  focusActive: boolean;

  // data
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  habits: Habit[];
  events: CalEvent[];
  notes: NoteItem[];
  notifs: AppNotif[];
  settings: Settings;
  stats: Record<string, DayStats>;
  hiddenWidgets: string[];
  filter: FilterState;

  // ephemeral
  toast: string | null;
  commandOpen: boolean;
  searchOpen: boolean;
  quickAddOpen: boolean;
  notifOpen: boolean;
  pomodoro: { mode: 'focus' | 'short' | 'long'; running: boolean; left: number };
  notifPaused: boolean;
  _hydrated: boolean;

  // actions
  hydrate: () => void;
  persist: () => void;
  setView: (v: ViewKey) => void;
  setCalView: (v: CalView) => void;
  setCalDate: (d: string) => void;
  setSelected: (id: string | null) => void;
  setFocusTask: (id: string | null) => void;
  setFocusActive: (on: boolean) => void;
  createTask: (raw: string) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  reorder: (ids: string[]) => void;
  moveTaskDate: (id: string, date: string | null, time?: string | null) => void;

  createProject: (name: string, icon?: string, color?: string) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  upsertTag: (name: string, color?: string) => Tag;
  updateTag: (id: string, patch: Partial<Tag>) => void;
  deleteTag: (idOrName: string) => void;

  createHabit: (name: string, icon?: string) => Habit;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  toggleHabitDay: (id: string, date?: string) => void;
  deleteHabit: (id: string) => void;

  createEvent: (title: string, date: string, time?: string | null) => CalEvent;
  updateEvent: (id: string, patch: Partial<CalEvent>) => void;
  deleteEvent: (id: string) => void;

  createNote: (title?: string) => NoteItem;
  updateNote: (id: string, patch: Partial<NoteItem>) => void;
  deleteNote: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setTheme: (t: Settings['theme']) => void;
  toggleLang: () => void;

  addNotif: (n: Omit<AppNotif, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: () => void;
  dismissNotif: (id: string) => void;
  setToast: (msg: string | null) => void;

  setCommandOpen: (o: boolean) => void;
  setSearchOpen: (o: boolean) => void;
  setQuickAddOpen: (o: boolean) => void;
  setNotifOpen: (o: boolean) => void;

  pomodoroSet: (p: Partial<AppState['pomodoro']>) => void;
  pomodoroTick: () => void;

  setFilter: (patch: Partial<FilterState>) => void;
  setHiddenWidget: (id: string, hidden: boolean) => void;
  setDayEnergy: (date: string, level: number) => void;
  setDnd: (paused: boolean) => void;

  exportJSON: () => string;
  importJSON: (text: string) => { ok: boolean; error?: string };
  resetAll: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expandReminders(tasks: Task[], settings: Settings) {
  if (!settings.notif) return;
  const hasNotifAPI = typeof window !== 'undefined' && 'Notification' in window;
  if (!hasNotifAPI) return;
  // actual scheduling is done via the ReminderWorker hook; here we only guard.
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'today',
  calView: 'month',
  calDate: todayKey(),
  selectedTaskId: null,
  focusTaskId: null,
  focusActive: false,

  tasks: [],
  projects: [],
  tags: [],
  habits: [],
  events: [],
  notes: [],
  notifs: [],
  settings: { ...DEFAULT_SETTINGS },
  stats: {},
  hiddenWidgets: [],
  filter: { priority: 'all', tag: 'all', project: 'all', completion: 'all', q: '' },

  toast: null,
  commandOpen: false,
  searchOpen: false,
  quickAddOpen: false,
  notifOpen: false,
  pomodoro: { mode: 'focus', running: false, left: DEFAULT_SETTINGS.pomoFocus * 60 },
  notifPaused: false,
  _hydrated: false,

  hydrate() {
    if (get()._hydrated) return;
    const now = todayKey();
    const persisted = loadPersist();
    if (!persisted) {
      const projs = seedProjects(now);
      const tasks = buildSeedTasks(now, projs);
      set({
        tasks,
        projects: projs,
        tags: [...SEED_TAGS],
        habits: seedHabits(now),
        notes: seedNotes(now),
        events: [{ id: uid('evt'), title: 'Sprint review', date: addDaysKey(now, 1), time: '11:00', endTime: '12:00', allDay: false, color: '#6d8dff' }],
        notifs: [],
        settings: { ...DEFAULT_SETTINGS },
        stats: { [now]: { date: now, completed: tasks.filter((t) => t.completed).length, focusSec: 0, energy: null } },
        _hydrated: true,
      });
      get().persist();
      return;
    }
    // validate + merge
    const fallbackProjs = seedProjects(now);
    // one-time cleanup: drop duplicate reminder/overdue notifications from the
    // pre-fix worker that never passed taskId (same kind+title+body)
    const rawNotifs: AppNotif[] = Array.isArray(persisted.notifs) ? persisted.notifs : [];
    const seen = new Set<string>();
    const deduped = rawNotifs.filter((n) => {
      if (!n || typeof n !== 'object') return false;
      const key = `${n.kind}|${n.title}|${n.body}|${n.taskId ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    set({
      tasks: Array.isArray(persisted.tasks) ? persisted.tasks : buildSeedTasks(now, fallbackProjs),
      projects: Array.isArray(persisted.projects) ? persisted.projects : fallbackProjs,
      tags: (persisted as unknown as { tags?: Tag[] }).tags ?? SEED_TAGS,
      habits: Array.isArray(persisted.habits) ? persisted.habits : seedHabits(now),
      events: Array.isArray(persisted.events) ? persisted.events : [],
      notes: Array.isArray(persisted.notes) ? persisted.notes : seedNotes(now),
      notifs: deduped,
      settings: mergeSettings(persisted.settings as unknown as Settings),
      stats: (persisted.stats as Record<string, DayStats>) ?? {},
      hiddenWidgets: (persisted.hiddenWidgets as string[]) ?? [],
      pomodoro: { mode: 'focus', running: false, left: ((persisted.settings as unknown as Settings)?.pomoFocus ?? DEFAULT_SETTINGS.pomoFocus) * 60 },
      _hydrated: true,
    });
  },

  persist() {
    const s = get();
    const shape = {
      version: STORE_VERSION,
      tasks: s.tasks,
      projects: s.projects,
      habits: s.habits,
      events: s.events,
      notes: s.notes,
      notifs: s.notifs,
      settings: s.settings,
      stats: s.stats,
      hiddenWidgets: s.hiddenWidgets,
      tags: s.tags,
    } as unknown as { version: number; tasks: Task[]; projects: Project[]; habits: Habit[]; events: CalEvent[]; notes: NoteItem[]; notifs: AppNotif[]; settings: Settings; stats: Record<string, DayStats>; hiddenWidgets: string[]; tags: Tag[] };
    savePersist(shape as unknown as Parameters<typeof savePersist>[0]);
    // Auto-export pending reminders to the local relay (browser can't write
    // files — POST to same-origin /api/relay which persists to disk for the
    // external reminder bridge → Telegram).
    if (typeof window !== 'undefined') {
      const now = Date.now();
      const payload = JSON.stringify({
        sentAt: new Date().toISOString(),
        due: s.tasks
          .filter((t) => !t.completed && !t.archived && t.reminderAt)
          .map((t) => ({ id: t.id, title: t.title, reminderAt: t.reminderAt, priority: t.priority, date: t.date, time: t.time })),
        overdue: s.tasks
          .filter((t) => !t.completed && !t.archived && t.date && new Date(t.date + 'T23:59:59').getTime() < now)
          .map((t) => ({ id: t.id, title: t.title, date: t.date, priority: t.priority })),
        // compact state for cron digest scripts (morning brief / evening review)
        state: {
          tasks: s.tasks.filter((t) => !t.archived).map((t) => ({
            id: t.id, title: t.title, date: t.date, time: t.time,
            priority: t.priority, completed: t.completed, reminderAt: t.reminderAt,
            tags: t.tags, projectId: t.projectId,
          })),
          habits: s.habits.map((h) => ({ id: h.id, name: h.name, icon: h.icon, history: h.history })),
          stats: s.stats,
        },
      });
      if (payload !== lastRelayPayload) {
        lastRelayPayload = payload;
        try {
          void fetch('/api/relay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
        } catch { /* offline or closed — bridge keeps last snapshot */ }
      }
    }
  },

  setView(v) { set({ view: v }); },
  setCalView(v) { set({ calView: v }); },
  setCalDate(d) { set({ calDate: d }); },
  setSelected(id) { set({ selectedTaskId: id }); },
  setFocusTask(id) { set({ focusTaskId: id }); },
  setFocusActive(on) {
    set({ focusActive: on });
    if (on) set({ toast: tr(get().settings.lang, 'focusStarted') });
    setTimeout(() => set({ toast: null }), 2200);
  },

  createTask(raw) {
    const now = todayKey();
    const parsed = parseQuickAdd(raw, now);
    const title = parsed.title || raw || tr(get().settings.lang, 'untitled');
    const s = get().settings;
    // ensure tags exist
    for (const tn of parsed.tags) {
      if (!get().tags.some((t) => t.name === tn)) get().upsertTag(tn);
    }
    const task: Task = {
      id: uid('task'),
      title,
      description: '',
      notes: '',
      date: parsed.date,
      time: parsed.time,
      allDay: !parsed.time,
      priority: parsed.priority ?? s.defaultPriority,
      tags: parsed.tags,
      projectId: null,
      completed: false,
      completedAt: null,
      reminder: parsed.reminder !== 'none' ? 'at' : 'none',
      reminderAt: parsed.reminder !== 'none' && parsed.date ? `${parsed.date}T${parsed.time ?? '09:00'}:00` : null,
      subtasks: [],
      repeat: parsed.repeat,
      repeatDays: [],
      archived: false,
      focus: false,
      order: nextOrder(get().tasks),
      createdAt: now,
      updatedAt: now,
    };
    set((st) => ({ tasks: [task, ...st.tasks] }));
    get().persist();
    return task;
  },

  updateTask(id, patch) {
    set((st) => ({
      tasks: st.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: todayKey() } : t
      ),
    }));
    get().persist();
  },

  toggleTask(id) {
    const now = todayKey();
    let didComplete = false;
    set((st) => ({
      tasks: st.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = !t.completed;
        didComplete = next;
        return { ...t, completed: next, completedAt: next ? now : null, updatedAt: now };
      }),
    }));
    if (didComplete) {
      set({ toast: tr(get().settings.lang, 'taskDone') });
      setTimeout(() => set({ toast: null }), 2000);
      // handle recurring: spawn next occurrence
      const t = get().tasks.find((x) => x.id === id);
      if (t && t.repeat !== 'none') {
        const baseDate = t.date ?? now;
        let nextDate: string | null = null;
        if (t.repeat === 'daily') nextDate = addDaysKey(baseDate, 1);
        if (t.repeat === 'weekdays') {
          let n = 1;
          while (n <= 7) {
            const cand = addDaysKey(baseDate, n);
            const d = new Date(cand + 'T12:00:00');
            const dow = d.getDay();
            if (dow >= 1 && dow <= 5) { nextDate = cand; break; }
            n += 1;
          }
        }
        if (t.repeat === 'weekly') nextDate = addDaysKey(baseDate, 7);
        if (t.repeat === 'monthly') {
          const d = new Date(baseDate + 'T12:00:00'); d.setMonth(d.getMonth() + 1); nextDate = todayKey(d);
        }
        if (nextDate) {
          const clone: Task = { ...t, id: uid('task'), date: nextDate, completed: false, completedAt: null, order: nextOrder(get().tasks), createdAt: now, updatedAt: now };
          set((st) => ({ tasks: [clone, ...st.tasks] }));
        }
      }
      // stats
      set((st) => {
        const key = now;
        const prev = st.stats[key];
        return { stats: { ...st.stats, [key]: { date: key, completed: (prev?.completed ?? 0) + 1, focusSec: prev?.focusSec ?? 0, energy: prev?.energy ?? null } } };
      });
    } else {
      // decrement stats if toggled back
      set((st) => {
        const key = now;
        const prev = st.stats[key];
        if (!prev) return st as unknown as Partial<AppState>;
        return { stats: { ...st.stats, [key]: { ...prev, completed: Math.max(0, prev.completed - 1) } } } as Partial<AppState>;
      });
    }
    get().persist();
  },

  deleteTask(id) {
    const s = get().settings.lang;
    set((st) => ({ tasks: st.tasks.filter((t) => t.id !== id), selectedTaskId: st.selectedTaskId === id ? null : st.selectedTaskId }));
    set({ toast: tr(s, 'taskDeleted') });
    setTimeout(() => set({ toast: null }), 2000);
    get().persist();
  },

  duplicateTask(id) {
    const src = get().tasks.find((t) => t.id === id);
    if (!src) return;
    const clone: Task = { ...src, id: uid('task'), title: `${src.title} (copy)`, completed: false, completedAt: null, order: nextOrder(get().tasks), createdAt: todayKey(), updatedAt: todayKey() };
    set((st) => ({ tasks: [clone, ...st.tasks] }));
    get().persist();
  },

  reorder(ids) {
    const map = new Map(get().tasks.map((t) => [t.id, t]));
    const next: Task[] = [];
    for (const id of ids) {
      const t = map.get(id);
      if (t) { next.push({ ...t, order: next.length }); map.delete(id); }
    }
    for (const [, t] of map) next.push({ ...t, order: next.length });
    set({ tasks: next });
    get().persist();
  },

  moveTaskDate(id, date, time) {
    set((st) => ({
      tasks: st.tasks.map((t) => t.id === id ? { ...t, date, time: time !== undefined ? time : t.time, updatedAt: todayKey() } : t),
    }));
    const lang = get().settings.lang;
    const label = date ? (diffDays(date, todayKey()) === 0 ? tr(lang, 'today') : date) : tr(lang, 'inbox');
    set({ toast: tr(lang, 'movedTo', { when: label }) });
    setTimeout(() => set({ toast: null }), 2200);
    get().persist();
  },

  createProject(name, icon = '◒', color = '#6d8dff') {
    const p: Project = { id: uid('proj'), name: name || tr(get().settings.lang, 'untitled'), icon, color, description: '', deadline: null };
    set((st) => ({ projects: [...st.projects, p] }));
    get().persist();
    return p;
  },

  updateProject(id, patch) {
    set((st) => ({ projects: st.projects.map((p) => p.id === id ? { ...p, ...patch } : p) }));
    get().persist();
  },

  deleteProject(id) {
    set((st) => ({ projects: st.projects.filter((p) => p.id !== id), tasks: st.tasks.map((t) => t.projectId === id ? { ...t, projectId: null } : t) }));
    get().persist();
  },

  upsertTag(name, color) {
    const existing = get().tags.find((t) => t.name === name);
    if (existing) return existing;
    const tag: Tag = { id: uid('tag'), name, color: color ?? `hsl(${Math.floor(Math.random() * 360)} 55% 66%)` };
    set((st) => ({ tags: [...st.tags, tag] }));
    get().persist();
    return tag;
  },

  updateTag(id, patch) {
    set((st) => ({ tags: st.tags.map((t) => t.id === id ? { ...t, ...patch } : t) }));
    get().persist();
  },

  deleteTag(idOrName) {
    set((st) => ({
      tags: st.tags.filter((t) => t.id !== idOrName && t.name !== idOrName),
      tasks: st.tasks.map((t) => ({ ...t, tags: t.tags.filter((x) => x !== idOrName) })),
    }));
    get().persist();
  },

  createHabit(name, icon = '◍') {
    const h: Habit = { id: uid('hab'), name: name || tr(get().settings.lang, 'untitled'), icon, target: 1, history: {}, createdAt: todayKey() };
    set((st) => ({ habits: [...st.habits, h] }));
    get().persist();
    return h;
  },

  updateHabit(id, patch) {
    set((st) => ({ habits: st.habits.map((h) => h.id === id ? { ...h, ...patch } : h) }));
    get().persist();
  },

  toggleHabitDay(id, date) {
    const key = date ?? todayKey();
    set((st) => ({
      habits: st.habits.map((h) =>
        h.id !== id ? h : ({ ...h, history: { ...h.history, [key]: h.history[key] ? 0 : 1 } })
      ),
    }));
    get().persist();
  },

  deleteHabit(id) {
    set((st) => ({ habits: st.habits.filter((h) => h.id !== id) }));
    get().persist();
  },

  createEvent(title, date, time = '09:00') {
    const e: CalEvent = { id: uid('evt'), title: title || tr(get().settings.lang, 'untitled'), date, time, endTime: null, allDay: !time, color: '#6d8dff' };
    set((st) => ({ events: [...st.events, e] }));
    get().persist();
    return e;
  },

  updateEvent(id, patch) {
    set((st) => ({ events: st.events.map((e) => e.id === id ? { ...e, ...patch } : e) }));
    get().persist();
  },

  deleteEvent(id) {
    set((st) => ({ events: st.events.filter((e) => e.id !== id) }));
    get().persist();
  },

  createNote(title) {
    const now = todayKey();
    const n: NoteItem = { id: uid('note'), title: title || tr(get().settings.lang, 'untitled'), body: '', updatedAt: now };
    set((st) => ({ notes: [n, ...st.notes] }));
    get().persist();
    return n;
  },

  updateNote(id, patch) {
    set((st) => ({ notes: st.notes.map((n) => n.id === id ? { ...n, ...patch, updatedAt: todayKey() } : n) }));
    get().persist();
  },

  deleteNote(id) {
    set((st) => ({ notes: st.notes.filter((n) => n.id !== id) }));
    get().persist();
  },

  updateSettings(patch) {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    if (patch.pomoFocus !== undefined) {
      const left = patch.pomoFocus * 60;
      set((st) => ({ pomodoro: st.pomodoro.mode === 'focus' && !st.pomodoro.running ? { ...st.pomodoro, left } : st.pomodoro }));
    }
    get().persist();
  },

  setTheme(t) { get().updateSettings({ theme: t }); },
  toggleLang() {
    const lang = get().settings.lang === 'en' ? 'fa' : 'en';
    get().updateSettings({ lang });
    // also flip dir proactively (RootShell will mirror)
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  },

  addNotif(n) {
    const appN: AppNotif = { id: uid('notif'), createdAt: new Date().toISOString(), read: false, ...n };
    set((st) => ({ notifs: [appN, ...st.notifs].slice(0, 60) }));
    get().persist();
  },

  markAllRead() {
    set((st) => ({ notifs: st.notifs.map((n) => ({ ...n, read: true })) }));
    get().persist();
  },

  dismissNotif(id) {
    set((st) => ({ notifs: st.notifs.filter((n) => n.id !== id) }));
    get().persist();
  },

  setToast(msg) { set({ toast: msg }); if (msg) setTimeout(() => { if (get().toast === msg) set({ toast: null }); }, 2600); },

  setCommandOpen(o) { set({ commandOpen: o }); },
  setSearchOpen(o) { set({ searchOpen: o }); },
  setQuickAddOpen(o) { set({ quickAddOpen: o }); },
  setNotifOpen(o) { set({ notifOpen: o }); },

  pomodoroSet(p) { set((st) => ({ pomodoro: { ...st.pomodoro, ...p } })); },
  pomodoroTick() {
    const { running, left } = get().pomodoro;
    if (!running || left <= 0) return;
    if (left === 1) {
      const s = get().settings;
      const lang = s.lang;
      const mode = get().pomodoro.mode;
      const nextMode = mode === 'focus' ? 'short' : 'focus';
      const nextLeft = nextMode === 'focus' ? s.pomoFocus * 60 : s.pomoShort * 60;
      set({ pomodoro: { mode: nextMode as unknown as AppState['pomodoro']['mode'], running: false, left: nextLeft } });
      get().addNotif({ kind: 'system', title: tr(lang, mode === 'focus' ? 'focusTime' : 'reminder'), body: tr(lang, mode === 'focus' ? 'shortBreak' : 'focus') });
      // browser notification
      if (s.notif && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification(tr(lang, mode === 'focus' ? 'shortBreak' : 'focus')); } catch {}
      }
      if (!get().notifPaused && s.notif) set({ toast: tr(lang, mode === 'focus' ? 'shortBreak' : 'focus') });
      setTimeout(() => set({ toast: null }), 2200);
      get().persist();
      return;
    }
    const now = todayKey();
    set((st) => ({ pomodoro: { ...st.pomodoro, left: st.pomodoro.left - 1 } }));
    // track focus time
    if (get().pomodoro.mode === 'focus') {
      set((st) => {
        const prev = st.stats[now];
        return { stats: { ...st.stats, [now]: { date: now, completed: prev?.completed ?? 0, focusSec: (prev?.focusSec ?? 0) + 1, energy: prev?.energy ?? null } } };
      });
    }
  },

  setFilter(patch) { set((st) => ({ filter: { ...st.filter, ...patch } })); },
  setHiddenWidget(id, hidden) {
    set((st) => ({ hiddenWidgets: hidden ? [...st.hiddenWidgets, id].filter((v, i, a) => a.indexOf(v) === i) : st.hiddenWidgets.filter((x) => x !== id) }));
    get().persist();
  },
  setDayEnergy(date, level) {
    set((st) => {
      const prev = st.stats[date];
      return { stats: { ...st.stats, [date]: { date, completed: prev?.completed ?? 0, focusSec: prev?.focusSec ?? 0, energy: level } } };
    });
    get().persist();
  },

  setDnd(paused) { set({ notifPaused: paused }); },

  exportJSON() {
    const s = get();
    return JSON.stringify({ version: STORE_VERSION, tasks: s.tasks, projects: s.projects, habits: s.habits, events: s.events, notes: s.notes, notifs: s.notifs, settings: s.settings, stats: s.stats, hiddenWidgets: s.hiddenWidgets, tags: s.tags }, null, 2);
  },

  importJSON(text) {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return { ok: false, error: tr(get().settings.lang, 'invalidFile') }; }
    const p = parsed as Record<string, unknown>;
    if (!p || !Array.isArray(p.tasks)) return { ok: false, error: tr(get().settings.lang, 'invalidFile') };
    // validate shallowly
    try {
      set({
        tasks: p.tasks as Task[],
        projects: (p.projects as Project[]) ?? [],
        habits: (p.habits as Habit[]) ?? [],
        events: (p.events as CalEvent[]) ?? [],
        notes: (p.notes as NoteItem[]) ?? [],
        notifs: (p.notifs as AppNotif[]) ?? [],
        settings: mergeSettings(p.settings as unknown as Settings),
        stats: (p.stats as Record<string, DayStats>) ?? {},
        hiddenWidgets: (p.hiddenWidgets as string[]) ?? [],
        tags: (p.tags as Tag[]) ?? SEED_TAGS,
      });
      get().persist();
      get().setToast(tr(get().settings.lang, 'imported'));
      return { ok: true };
    } catch {
      return { ok: false, error: tr(get().settings.lang, 'invalidFile') };
    }
  },

  resetAll() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    const now = todayKey();
    const projs = seedProjects(now);
    set({
      tasks: buildSeedTasks(now, projs),
      projects: projs,
      tags: [...SEED_TAGS],
      habits: seedHabits(now),
      notes: seedNotes(now),
      events: [{ id: uid('evt'), title: 'Sprint review', date: addDaysKey(now, 1), time: '11:00', endTime: '12:00', allDay: false, color: '#6d8dff' }],
      notifs: [],
      settings: { ...DEFAULT_SETTINGS },
      stats: { [now]: { date: now, completed: 0, focusSec: 0, energy: null } },
      hiddenWidgets: [],
      filter: { priority: 'all', tag: 'all', project: 'all', completion: 'all', q: '' },
      pomodoro: { mode: 'focus', running: false, left: DEFAULT_SETTINGS.pomoFocus * 60 },
    });
    get().persist();
  },
}));
