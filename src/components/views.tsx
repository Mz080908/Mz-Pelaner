'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useEffect, useRef } from 'react';
import { cn, stripNonDigits, normalizeDigits } from '@/lib/utils';
import { useAppStore } from '@/store';
import { tr, TKey } from '@/lib/i18n';
import {
  todayKey, addDaysKey, relDay, fmtTime, monthCells, weekKeys,
  weekdayShort, headerDate, gregLabel, jalaliLabel, g2j, groupOfTime, startOfWeekKey,
  effCalendar, jalaaliNavKey, jalaaliMonthCells,
} from '@/lib/dates';
import { springSoft, springSnappy, springGentle, tweenFast, tweenMed, modalSpring, cardSpring, pageSpring, microSpring, sheetVariants, backdropVariants, paletteVariants, staggerFast, focusVariants, useReducedMotionPref } from '@/lib/motion'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Btn, IconBtn, EmptyState, TagChip, Sheet, SheetHeader, TaskCard, ProgressRing, ConfirmDialog, PRIORITY_STYLE, Pomodoro } from './ui';
import type { Task, Project } from '@/lib/types';
import {
  Home, Inbox as InboxIcon, CalendarDays, FolderKanban, Target, Hash, Archive,
  FileText, Settings as SettingsIcon, Bell, BellOff, Sun, Moon, Globe, Plus, X,
  ChevronLeft, ChevronRight, Search, Sparkles, Layers, Check, Trash2,
  Filter, Zap, Flame, Download,
  Upload, RotateCcw, Eye, EyeOff, Clock, ListChecks,
  Menu, Focus, BarChart2,
} from 'lucide-react';

/* ================================================================== */
/* SIDEBAR                                                             */
/* ================================================================== */
const NAV: { key: string; icon: typeof Home; labelKey: TKey }[] = [
  { key: 'today', icon: Home, labelKey: 'today' },
  { key: 'inbox', icon: InboxIcon, labelKey: 'inbox' },
  { key: 'scheduled', icon: CalendarDays, labelKey: 'scheduled' },
  { key: 'calendar', icon: Layers, labelKey: 'calendar' },
  { key: 'projects', icon: FolderKanban, labelKey: 'projects' },
  { key: 'habits', icon: Target, labelKey: 'habits' },
  { key: 'tags', icon: Hash, labelKey: 'tags' },
  { key: 'archive', icon: Archive, labelKey: 'archive' },
  { key: 'notes', icon: FileText, labelKey: 'notes' },
  { key: 'analytics', icon: BarChart2, labelKey: 'analytics' },
];

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const lang = useAppStore((s) => s.settings.lang);
  const notifPaused = useAppStore((s) => s.notifPaused);
  const setDnd = useAppStore((s) => s.setDnd);
  const setFocusActive = useAppStore((s) => s.setFocusActive);
  const [open, setOpen] = useState(false);
  const go = (v: (typeof NAV)[number]['key'] | 'settings') => { setView(v as never); setOpen(false); };

  const counts = useMemo(() => {
    const now = todayKey();
    return {
      today: tasks.filter((t) => !t.completed && !t.archived && t.date === now).length,
      inbox: tasks.filter((t) => !t.completed && !t.archived && !t.date).length,
      scheduled: tasks.filter((t) => !t.completed && !t.archived && t.date && t.date > now).length,
      archive: tasks.filter((t) => t.archived).length,
    };
  }, [tasks]);

  const streaks = useMemo(() => habits.filter((h) => (h.history[todayKey()] ?? 0) > 0).length, [habits]);

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 shrink-0">
        <motion.div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, var(--mz-accent), color-mix(in srgb, var(--mz-accent) 58%, #9ad8cf))' }}
          whileHover={{ scale: 1.05, rotate: 6 }} transition={springSnappy}
        >
          <Sparkles size={18} />
        </motion.div>
        <div className="min-w-0 leading-tight flex-1">
          <p className="font-semibold text-[15px] tracking-tight truncate">Mz Planer</p>
          <p className="text-[11px] opacity-55 truncate">{tr(lang, 'storageWarn')}</p>
        </div>
        <button type="button" className="lg:hidden p-2 opacity-60" aria-label={tr(lang, 'close')} onClick={() => setOpen(false)}>
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label={tr(lang, 'menu')}>
        <p className="text-[10.5px] uppercase tracking-[0.16em] opacity-40 px-3 pt-1 pb-2">{tr(lang, 'menu')}</p>
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = view === item.key;
            const count = (counts as Record<string, number>)[item.key] ?? 0;
            return (
              <li key={item.key}>
                <button
                  type="button" onClick={() => go(item.key)}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl pressable transition-colors text-[14px]',
                    active ? 'glass text-mzink font-medium' : 'text-mzink/65 hover:text-mzink hover:bg-[color-mix(in_srgb,var(--mz-ink)_6%,transparent)]')}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon size={17} className="shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-start truncate">{tr(lang, item.labelKey)}</span>
                  {count > 0 && (
                    <motion.span key={count} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springSnappy}
                      className="text-[11px] font-semibold tabular-nums rounded-full px-2 py-0.5"
                      style={{ background: active ? 'color-mix(in srgb, var(--mz-accent) 16%, transparent)' : 'color-mix(in srgb, var(--mz-ink) 8%, transparent)', color: active ? 'var(--mz-accent)' : 'inherit' }}>
                      {count}
                    </motion.span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {streaks > 0 && (
          <p className="text-[11.5px] opacity-50 px-3 pt-3 flex items-center gap-1.5">
            <Flame size={12} className="text-[#d9a05b]" /> {streaks} / {habits.length} {tr(lang, 'habits').toLowerCase()}
          </p>
        )}
      </nav>

      <div className="p-2 pt-0 flex flex-col gap-0.5 border-t border-[var(--mz-edge)] mt-1">
        <button type="button" onClick={() => { setFocusActive(true); setOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl pressable text-[14px] text-mzink/65 hover:text-mzink hover:bg-[color-mix(in_srgb,var(--mz-ink)_6%,transparent)]">
          <Focus size={17} /> <span className="flex-1 text-start">{tr(lang, 'focusMode')}</span>
          <kbd className="text-[10px] border border-[var(--mz-edge)] rounded px-1.5 py-0.5 opacity-60">{tr(lang, 'space')}</kbd>
        </button>
        <div className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-[14px] text-mzink/65">
          <button type="button" onClick={() => setDnd(!notifPaused)} aria-pressed={notifPaused}
            className="flex items-center gap-3 flex-1 pressable" aria-label={tr(lang, 'dnd')}>
            {notifPaused ? <BellOff size={17} /> : <Bell size={17} />}
            <span className="flex-1 text-start">{tr(lang, 'dnd')}</span>
          </button>
          <button type="button" role="switch" aria-checked={notifPaused} aria-label={tr(lang, 'dnd')}
            onClick={() => setDnd(!notifPaused)}
            className={cn('relative w-10 h-6 rounded-full transition-colors shrink-0', notifPaused ? 'bg-[var(--mz-accent)]' : 'bg-black/15')}>
            <motion.span layout transition={springSnappy}
              className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow', notifPaused ? 'left-[18px]' : 'left-0.5')} />
          </button>
        </div>
        <button type="button" onClick={() => go('settings')}
          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl pressable text-[14px]',
            view === 'settings' ? 'glass font-medium text-mzink' : 'text-mzink/65 hover:text-mzink hover:bg-[color-mix(in_srgb,var(--mz-ink)_6%,transparent)]')}>
          <SettingsIcon size={17} /> <span className="flex-1 text-start">{tr(lang, 'settings')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <motion.aside
        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={springSoft}
        className="hidden lg:flex fixed inset-y-3 start-3 w-[248px] z-40 glass rounded-3xl overflow-hidden"
        aria-label={tr(lang, 'menu')}
      >
        {content}
      </motion.aside>

      <button type="button" onClick={() => setOpen(true)} aria-label={tr(lang, 'menu')}
        className="lg:hidden fixed top-3 start-3 z-40 glass w-11 h-11 rounded-2xl flex items-center justify-center pressable">
        <Menu size={18} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="lg:hidden fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tweenFast}
            style={{ background: 'color-mix(in srgb, var(--mz-bg) 55%, transparent)', backdropFilter: 'blur(6px)' }}
            onClick={() => setOpen(false)}>
            <motion.nav
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={springSoft}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong w-[272px] h-full m-2 rounded-3xl overflow-hidden"
              aria-label={tr(lang, 'menu')}
            >
              {content}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ================================================================== */
/* HEADER                                                              */
/* ================================================================== */
export function Header({ line1, line2 }: { line1: string; line2: string | null }) {
  const lang = useAppStore((s) => s.settings.lang);
  const theme = useAppStore((s) => s.settings.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const toggleLang = useAppStore((s) => s.toggleLang);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const setQuickAddOpen = useAppStore((s) => s.setQuickAddOpen);
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const setNotifOpen = useAppStore((s) => s.setNotifOpen);
  const setView = useAppStore((s) => s.setView);
  const notifs = useAppStore((s) => s.notifs);
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="sticky top-0 z-30 px-3 sm:px-5 pt-3 sm:pt-4 pb-2 ps-14 lg:ps-5"
    >
      <div className="glass rounded-3xl px-4 sm:px-6 py-3.5 flex items-center gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h1 className="text-[17px] sm:text-[22px] font-semibold tracking-tight leading-tight break-words min-w-0">{line1}</h1>
            {line2 && <span className="text-[12.5px] opacity-55 leading-tight">{line2}</span>}
          </div>
          <p className="text-[11.5px] opacity-45 tracking-wide mt-0.5">{tr(lang, 'hints')}</p>
        </div>

        <motion.button type="button" onClick={() => setSearchOpen(true)}
          layoutId="mz-search-pill"
          className="pressable hidden md:flex items-center gap-2 h-10 px-3.5 rounded-2xl text-[13.5px] text-mzink/55 hover:text-mzink transition-colors shrink-0 w-[240px] xl:w-[300px]"
          style={{ background: 'color-mix(in srgb, var(--mz-ink) 6%, transparent)' }}
          aria-label={tr(lang, 'search')}>
          <Search size={15} />
          <span className="flex-1 text-start truncate opacity-80">{tr(lang, 'searchPh')}</span>
          <kbd className="text-[10px] border border-[var(--mz-edge)] rounded px-1.5 py-0.5 opacity-70">/</kbd>
        </motion.button>

        <div className="flex items-center gap-1.5 shrink-0">
          <IconBtn onClick={() => setSearchOpen(true)} title={tr(lang, 'search')} className="md:hidden"><Search size={16} /></IconBtn>
          <IconBtn onClick={() => setCommandOpen(true)} title={tr(lang, 'cmdPalette')} className="hidden sm:inline-flex"><Layers size={16} /></IconBtn>
          <IconBtn onClick={() => setView('calendar')} title={tr(lang, 'calendar')}><CalendarDays size={16} /></IconBtn>
          <div className="relative">
            <IconBtn onClick={() => setNotifOpen(true)} title={tr(lang, 'notifCenter')}><Bell size={16} /></IconBtn>
            {unread > 0 && (
              <motion.span key={unread} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springSnappy}
                className="absolute -top-0.5 end-[-2px] min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: '#d97a72' }}>{unread}</motion.span>
            )}
          </div>
          <IconBtn onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={tr(lang, 'theme')}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }} transition={tweenFast}>
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              </motion.span>
            </AnimatePresence>
          </IconBtn>
          <IconBtn onClick={toggleLang} title={tr(lang, 'language')}><Globe size={16} /></IconBtn>
          <button type="button" onClick={() => setQuickAddOpen(true)}
            className="pressable h-10 px-4 rounded-2xl text-white text-[13.5px] font-medium inline-flex items-center gap-1.5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--mz-accent), color-mix(in srgb, var(--mz-accent) 62%, #9ad8cf))' }}
            aria-label={tr(lang, 'newTask')}>
            <Plus size={15} /> <span className="hidden sm:inline">{tr(lang, 'newTask')}</span>
            <kbd className="hidden lg:inline text-[10px] opacity-80 border border-white/30 rounded px-1">{tr(lang, 'nKey')}</kbd>
          </button>
        </div>
      </div>
    </motion.header>
  );
}

/* ================================================================== */
/* TASK GROUPS (time-of-day) with DnD                                  */
/* ================================================================== */
function TaskGroups({ list, showDate, onDropTask }: { list: Task[]; showDate?: boolean; onDropTask?: (id: string, group: string) => void }) {
  const lang = useAppStore((s) => s.settings.lang);
  const [over, setOver] = useState<string | null>(null);

  const groups = useMemo(() => {
    const g: Record<string, Task[]> = { morning: [], afternoon: [], evening: [], none: [] };
    const sorted = [...list].sort((a, b) => (a.time ?? 'zz').localeCompare(b.time ?? 'zz') || a.order - b.order);
    for (const t of sorted) g[groupOfTime(t.time)].push(t);
    return g;
  }, [list]);

  const labels: Record<string, TKey> = { morning: 'morning', afternoon: 'afternoon', evening: 'evening', none: 'noTime' };
  const icons: Record<string, React.ReactNode> = {
    morning: <Sun size={13} />, afternoon: <Zap size={13} />, evening: <Moon size={13} />, none: <Clock size={13} />,
  };

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(groups).map(([key, items]) => (
        <section key={key} aria-label={tr(lang, labels[key])}>
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <span className="opacity-55">{icons[key]}</span>
            <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.13em] opacity-65">{tr(lang, labels[key])}</h3>
            <span className="text-[11.5px] opacity-40 tabular-nums">{items.filter((i) => !i.completed).length}</span>
            <div className="flex-1 h-px bg-[var(--mz-edge)]" />
          </div>
          <ul
            className="flex flex-col gap-2.5 min-h-[52px] rounded-2xl transition-colors"
            data-drop-group={key}
            onDragOver={(e) => { if (onDropTask) { e.preventDefault(); setOver(key); } }}
            onDragLeave={() => setOver((o) => (o === key ? null : o))}
            onDrop={(e) => {
              if (!onDropTask) return;
              const id = e.dataTransfer.getData('text/mz-task');
              if (id) onDropTask(id, key);
              setOver(null);
            }}
            style={over === key ? { boxShadow: 'inset 0 0 0 1.5px var(--mz-accent)' } : undefined}
          >
            {items.length === 0 && (
              <li className={cn('rounded-2xl border border-dashed border-[var(--mz-edge)] px-4 py-5 text-[12.5px] transition-colors flex items-center justify-center min-h-[64px]', over === key ? 'text-[var(--mz-accent)] border-[var(--mz-accent)] bg-[color-mix(in_srgb,var(--mz-accent)_3%,transparent)]' : 'opacity-40')}>
                {over === key ? (
                  <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springSnappy}>
                    <Plus size={14} className="mr-1" /> {tr(lang, 'add')}
                  </motion.span>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    {icons[key]}
                    <span>{tr(lang, 'noTasksInGroup', { group: tr(lang, labels[key]) })}</span>
                  </div>
                )}
              </li>
            )}
            <AnimatePresence mode="popLayout">
              {items.map((t) => (
                <li key={t.id} draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/mz-task', t.id);
                    e.dataTransfer.effectAllowed = 'move';
                    // source becomes a subtle placeholder while dragging
                    e.currentTarget.style.opacity = '0.35';
                    e.currentTarget.style.transform = 'scale(0.985)';
                  }}
                  onDragEnd={(e) => { e.currentTarget.style.opacity = ''; e.currentTarget.style.transform = ''; }}
                  className="transition-opacity duration-200">
                  <TaskCard task={t} showDate={showDate} />
                </li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ================================================================== */
/* TODAY                                                               */
/* ================================================================== */
function WidgetShell({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  const hidden = useAppStore((s) => s.hiddenWidgets);
  const setHidden = useAppStore((s) => s.setHiddenWidget);
  const lang = useAppStore((s) => s.settings.lang);
  if (hidden.includes(id)) return null;
  return (
    <motion.div layout
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: springSoft } }}
      className={cn("glass rounded-3xl p-4 flex flex-col gap-2 min-h-[112px] relative group", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] uppercase tracking-[0.16em] opacity-50">{title}</span>
        <button type="button" onClick={() => setHidden(id, true)} aria-label={tr(lang, 'hideWidget')}
          className="opacity-0 group-hover:opacity-60 focus-visible:opacity-60 transition-opacity pressable"><EyeOff size={13} /></button>
      </div>
      {children}
    </motion.div>
  );
}

export function habitStreakOf(history: Record<string, number>): { current: number; best: number } {
  const days = Object.keys(history).filter((d) => (history[d] ?? 0) > 0).sort();
  if (days.length === 0) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = addDaysKey(days[i - 1], 1);
    if (days[i] === prev) { run += 1; best = Math.max(best, run); } else run = 1;
  }
  let current = 0;
  const now = new Date();
  for (let i = 0; i < 400; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    if ((history[k] ?? 0) > 0) current += 1;
    else if (i === 0) continue;
    else break;
  }
  return { current, best: Math.max(best, current) };
}

export function TodayView() {
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const stats = useAppStore((s) => s.stats);
  const lang = useAppStore((s) => s.settings.lang);
  const hidden = useAppStore((s) => s.hiddenWidgets);
  const setHidden = useAppStore((s) => s.setHiddenWidget);
  const setQuickAddOpen = useAppStore((s) => s.setQuickAddOpen);
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const moveTaskDate = useAppStore((s) => s.moveTaskDate);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    const h = () => setReviewOpen(true);
    window.addEventListener('mz:review', h);
    return () => window.removeEventListener('mz:review', h);
  }, []);

  const now = todayKey();
  const todayTasks = useMemo(() => tasks.filter((t) => !t.archived && t.date === now), [tasks, now]);
  const openCount = todayTasks.filter((t) => !t.completed).length;
  const doneCount = todayTasks.filter((t) => t.completed).length;
  const total = todayTasks.length;
  const pct = total ? doneCount / total : 0;

  const filtered = useMemo(() => todayTasks.filter((t) => {
    if (filter.priority !== 'all' && t.priority !== filter.priority) return false;
    if (filter.tag !== 'all' && !t.tags.includes(filter.tag)) return false;
    if (filter.completion === 'open' && t.completed) return false;
    if (filter.completion === 'done' && !t.completed) return false;
    return true;
  }), [todayTasks, filter]);

  const focusTasks = useMemo(
    () => tasks.filter((t) => t.focus && !t.completed && !t.archived).slice(0, 3),
    [tasks]
  );
  const dayStats = stats[now] ?? { date: now, completed: 0, focusSec: 0, energy: null };
  const bestHabit = useMemo(
    () => habits.map((h) => ({ h, ...habitStreakOf(h.history) })).sort((a, b) => b.current - a.current)[0],
    [habits]
  );
  const hour = new Date().getHours();
  const greet = hour < 12 ? tr(lang, 'morningGreet') : hour < 17 ? tr(lang, 'afternoonGreet') : tr(lang, 'eveningGreet');
  const activeFilter = filter.priority !== 'all' || filter.tag !== 'all' || filter.completion !== 'all';

  const onDropTask = (id: string, group: string) => {
    const map: Record<string, string | null> = { morning: '09:00', afternoon: '14:00', evening: '19:00', none: null };
    moveTaskDate(id, now, map[group] ?? null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="flex flex-col gap-6 pb-24 lg:pb-8 max-w-[1400px] mx-auto w-full">
      {/* Hero */}
      <section className="glass rounded-[28px] p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 md:gap-8">
        <ProgressRing value={pct} size={168} stroke={13} sub={tr(lang, 'completed')} />
        <div className="flex-1 min-w-0 text-center md:text-start">
          <p className="text-[11.5px] uppercase tracking-[0.2em] opacity-50 mb-1">{greet}</p>
          <h2 className="text-[30px] sm:text-[38px] font-semibold tracking-tight leading-none">{tr(lang, 'today')}</h2>
          <p className="text-[14.5px] opacity-60 mt-2">
            {openCount} {openCount === 1 ? tr(lang, 'taskRemaining') : tr(lang, 'tasksRemaining')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-4">
            <Btn variant="primary" size="sm" onClick={() => setQuickAddOpen(true)}><Plus size={14} /> {tr(lang, 'newTask')}</Btn>
            <Btn variant="glass" size="sm" onClick={() => setFilterOpen(true)}>
              {activeFilter && <span className="w-1.5 h-1.5 rounded-full bg-[var(--mz-accent)]" />}
              <Filter size={14} /> {tr(lang, 'filter')}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setReviewOpen(true)}>
              <Check size={14} /> {tr(lang, 'startReview')}
            </Btn>
          </div>
        </div>
        <div className="w-full md:w-[270px] shrink-0">
          <Pomodoro compact />
        </div>
      </section>

      {/* Widgets — single column on phones, 2-up from sm, 4-up from lg */}
      <motion.section aria-label={tr(lang, 'widgets')}
        variants={{ hidden: {}, show: { transition: { staggerChildren: staggerFast } } }}
        initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-min">
        <WidgetShell id="streak" title={tr(lang, 'habitStreak')}>
          {bestHabit ? (
            <>
              <div className="flex items-end gap-2">
                <motion.span key={bestHabit.current} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={springSnappy}
                  className="text-[30px] font-semibold tracking-tight leading-none tabular-nums">{bestHabit.current}</motion.span>
                <span className="text-[12.5px] opacity-60 pb-0.5">{tr(lang, 'dayStreak')}</span>
              </div>
              <p className="text-[13px] opacity-70 truncate">{bestHabit.h.icon} {bestHabit.h.name}</p>
            </>
          ) : <p className="text-[13px] opacity-50 mt-2">{tr(lang, 'habitsEmpty')}</p>}
        </WidgetShell>

        <WidgetShell id="tasks" title={tr(lang, 'tasksToday')}>
          <div className="flex items-end gap-1.5">
            <motion.span key={doneCount} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={springSnappy}
              className="text-[30px] font-semibold tracking-tight leading-none tabular-nums">{doneCount}</motion.span>
            <span className="text-[17px] opacity-45 pb-1">/ {total}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[color-mix(in_srgb,var(--mz-ink)_9%,transparent)] overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--mz-accent), #9ad8cf)' }}
              initial={{ width: 0 }} animate={{ width: `${Math.round(pct * 100)}%` }} transition={springSoft} />
          </div>
        </WidgetShell>

        <WidgetShell id="energy" title={tr(lang, 'dailyEnergy')}>
          <EnergyWidget />
        </WidgetShell>

        <WidgetShell id="focus" title={tr(lang, 'focusTime')}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90 shrink-0" aria-hidden="true">
              <circle cx="26" cy="26" r="21" fill="none" stroke="var(--mz-edge)" strokeWidth="6" />
              <motion.circle cx="26" cy="26" r="21" fill="none" stroke="var(--mz-accent)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 21 * Math.min(1, dayStats.focusSec / 7200)} ${2 * Math.PI * 21}`}
                transition={springSoft} />
            </svg>
            <div className="min-w-0">
              <p className="text-[22px] sm:text-[24px] font-semibold tracking-tight leading-none tabular-nums whitespace-nowrap">
                {Math.floor(dayStats.focusSec / 3600)}h {Math.floor((dayStats.focusSec % 3600) / 60)}m
              </p>
              <p className="text-[12px] opacity-55 mt-1">{doneCount} / {total} {tr(lang, 'ofTotal')}</p>
            </div>
          </div>
        </WidgetShell>

        {hidden.length > 0 && (
          <div className="col-span-full flex flex-wrap gap-2">
            {hidden.map((id) => (
              <button key={id} type="button" onClick={() => setHidden(id, false)}
                className="pressable text-[12px] opacity-55 hover:opacity-90 glass rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">
                <Eye size={12} /> {id}
              </button>
            ))}
          </div>
        )}
      </motion.section>

      {/* Focus top 3 */}
      <section aria-label={tr(lang, 'focusTop')} className="glass rounded-[28px] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.15em] opacity-65">{tr(lang, 'focusTop')}</h3>
          <span className="text-[11.5px] opacity-45">{focusTasks.length} / 3</span>
        </div>
        {focusTasks.length === 0 ? (
          <p className="text-[13.5px] opacity-55">{tr(lang, 'todayEmptySub')}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {focusTasks.map((t, i) => (
              <motion.li key={t.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={springSoft}
                className="flex items-center gap-3.5 rounded-2xl px-3.5 py-3 hover:bg-[color-mix(in_srgb,var(--mz-ink)_5%,transparent)] transition-colors">
                <span className="text-[13px] font-semibold tabular-nums opacity-40 w-6">{String(i + 1).padStart(2, '0')}</span>
                <button type="button" onClick={() => toggleTask(t.id)} aria-label={`complete ${t.title}`}
                  className="w-5 h-5 rounded-full border-2 border-[color-mix(in_srgb,var(--mz-ink)_30%,transparent)] pressable shrink-0" />
                <span className="flex-1 text-[14.5px] font-medium tracking-tight truncate">{t.title}</span>
                {t.time && <span className="text-[12.5px] opacity-55 tabular-nums">{fmtTime(t.time, true, lang)}</span>}
                <button type="button" onClick={() => updateTask(t.id, { focus: false })} aria-label={tr(lang, 'clearFocus')}
                  className="opacity-40 hover:opacity-90 pressable"><X size={14} /></button>
              </motion.li>
            ))}
          </ol>
        )}
      </section>

      {/* Groups */}
      {filtered.length === 0 ? (
        <EmptyState
          title={activeFilter ? tr(lang, 'noResults') : tr(lang, 'todayEmpty')}
          sub={activeFilter ? undefined : tr(lang, 'todayEmptySub')}
          action={!activeFilter && <Btn variant="glass" size="sm" onClick={() => setQuickAddOpen(true)}><Plus size={14} /> {tr(lang, 'newTask')}</Btn>}
        />
      ) : (
        <TaskGroups list={filtered} showDate={false} onDropTask={onDropTask} />
      )}

      {filterOpen && (
        <FilterSheet
          onClose={() => setFilterOpen(false)}
          onClear={() => setFilter({ priority: 'all', tag: 'all', completion: 'all' })}
        />
      )}
      {reviewOpen && <DailyReview onClose={() => setReviewOpen(false)} />}
    </motion.div>
  );
}

/* ================================================================== */
/* DAILY REVIEW                                                        */
/* ================================================================== */
function DailyReview({ onClose }: { onClose: () => void }) {
  const tasks = useAppStore((s) => s.tasks);
  const stats = useAppStore((s) => s.stats);
  const lang = useAppStore((s) => s.settings.lang);
  const setDayEnergy = useAppStore((s) => s.setDayEnergy);
  const now = todayKey();
  const tomorrow = addDaysKey(now, 1);
  const todayTasks = tasks.filter((t) => !t.archived && t.date === now);
  const completed = todayTasks.filter((t) => t.completed);
  const postponed = tasks.filter((t) => !t.archived && !t.completed && t.date && t.date < now);
  const dayStats = stats[now] ?? { date: now, completed: 0, focusSec: 0, energy: null };
  const tomorrows = tasks.filter((t) => !t.archived && !t.completed && t.date === tomorrow).slice(0, 5);
  const habitsDone = useAppStore((s) => s.habits).filter((h) => (h.history[now] ?? 0) > 0).length;
  const habitTotal = useAppStore((s) => s.habits).length;
  const energyLevels = [tr(lang, 'veryLow'), tr(lang, 'lowLabel'), tr(lang, 'normalLabel'), tr(lang, 'highLabel'), tr(lang, 'veryHigh')];

  return (
    <Sheet onClose={onClose} wide labelledBy="review-title">
      <SheetHeader title={tr(lang, 'dailyReview')} onClose={onClose} />
      <div className="p-5 overflow-auto flex flex-col gap-5" id="review-title">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: tr(lang, 'completed'), value: `${completed.length} / ${todayTasks.length}` },
            { label: tr(lang, 'postponed'), value: String(postponed.length) },
            { label: tr(lang, 'focusTime'), value: `${Math.floor(dayStats.focusSec / 3600)}h ${Math.floor((dayStats.focusSec % 3600) / 60)}m` },
            { label: tr(lang, 'habits'), value: `${habitsDone} / ${habitTotal}` },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-3.5">
              <p className="text-[10.5px] uppercase tracking-[0.14em] opacity-50">{s.label}</p>
              <p className="text-[22px] font-semibold tabular-nums mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11.5px] uppercase tracking-[0.14em] opacity-55 mb-2">{tr(lang, 'energy')}</p>
          <div className="flex gap-2 flex-wrap">
            {energyLevels.map((label, i) => (
              <Chip key={label} active={dayStats.energy === i} onClick={() => setDayEnergy(now, i)}>{label}</Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11.5px] uppercase tracking-[0.14em] opacity-55 mb-2">{tr(lang, 'tomorrows')} · {relDay(tomorrow, lang)}</p>
          {tomorrows.length === 0 ? (
            <p className="text-[13.5px] opacity-55">{tr(lang, 'todayEmptySub')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {tomorrows.map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 text-[14px] py-1.5">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_STYLE[t.priority].dot)} />
                  <span className="truncate">{t.title}</span>
                  {t.time && <span className="text-[12px] opacity-55 tabular-nums">{fmtTime(t.time, true, lang)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>{tr(lang, 'skip')}</Btn>
          <Btn variant="primary" onClick={onClose}>{tr(lang, 'done')}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* FILTER SHEET                                                        */
/* ================================================================== */
function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn('pressable rounded-full px-3.5 py-1.5 text-[13px] border transition-colors',
        active ? 'border-[var(--mz-accent)] text-[var(--mz-accent)]' : 'border-[var(--mz-edge)] opacity-70 hover:opacity-100')}
      style={active ? { background: 'color-mix(in srgb, var(--mz-accent) 12%, transparent)' } : undefined}>
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11.5px] uppercase tracking-[0.14em] opacity-55">{label}</span>
      {children}
    </div>
  );
}

function FilterSheet({ onClose, onClear }: { onClose: () => void; onClear: () => void }) {
  const lang = useAppStore((s) => s.settings.lang);
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const tags = useAppStore((s) => s.tags);
  return (
    <Sheet onClose={onClose} labelledBy="filter-title">
      <SheetHeader title={tr(lang, 'filters')} onClose={onClose}
        right={<button type="button" className="text-[12.5px] opacity-60 hover:opacity-100 pressable px-2" onClick={onClear}>{tr(lang, 'clearAll')}</button>} />
      <div className="p-5 flex flex-col gap-5 overflow-auto" id="filter-title">
        <Field label={tr(lang, 'priority')}>
          <div className="flex flex-wrap gap-2">
            {(['all', 'urgent', 'high', 'normal', 'low'] as const).map((p) => (
              <Chip key={p} active={filter.priority === p} onClick={() => setFilter({ priority: p })}>
                {p === 'all' ? tr(lang, 'all') : tr(lang, PRIORITY_STYLE[p].key)}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label={tr(lang, 'tagsLabel')}>
          <div className="flex flex-wrap gap-2">
            <Chip active={filter.tag === 'all'} onClick={() => setFilter({ tag: 'all' })}>{tr(lang, 'all')}</Chip>
            {tags.map((t) => <Chip key={t.id} active={filter.tag === t.name} onClick={() => setFilter({ tag: t.name })}>#{t.name}</Chip>)}
          </div>
        </Field>
        <Field label={tr(lang, 'completion')}>
          <div className="flex flex-wrap gap-2">
            {(['all', 'open', 'done'] as const).map((c) => (
              <Chip key={c} active={filter.completion === c} onClick={() => setFilter({ completion: c })}>
                {c === 'all' ? tr(lang, 'all') : c === 'open' ? tr(lang, 'open') : tr(lang, 'doneOnly')}
              </Chip>
            ))}
          </div>
        </Field>
        <Btn variant="primary" onClick={onClose}>{tr(lang, 'apply')}</Btn>
      </div>
    </Sheet>
  );
}

/* ================================================================== */
/* INBOX                                                               */
/* ================================================================== */
export function InboxView() {
  const tasks = useAppStore((s) => s.tasks);
  const lang = useAppStore((s) => s.settings.lang);
  const createTask = useAppStore((s) => s.createTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const [value, setValue] = useState('');

  const list = useMemo(() => tasks.filter((t) => !t.archived && !t.date), [tasks]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    const task = createTask(v);
    updateTask(task.id, { date: null });
    setValue('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1000px] mx-auto w-full">
      <div>
        <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'inbox')}</h2>
        <p className="text-[14px] opacity-55">{list.filter((t) => !t.completed).length} {tr(lang, 'open')}</p>
      </div>

      <div className="glass rounded-3xl p-4 flex items-center gap-3">
        <Plus size={16} className="opacity-50 shrink-0" />
        <input value={value} onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder={tr(lang, 'whatsOnMind' as TKey) || tr(lang, 'inboxEmptySub')}
          className="flex-1 bg-transparent outline-none text-[15px] placeholder:opacity-45 min-w-0"
          aria-label={tr(lang, 'newTask')} />
        <Btn variant="primary" size="sm" onClick={submit} disabled={!value.trim()}>{tr(lang, 'add')}</Btn>
      </div>

      {list.length === 0 ? (
        <EmptyState title={tr(lang, 'inboxEmpty')} sub={tr(lang, 'inboxEmptySub')} icon={<InboxIcon size={22} />} />
      ) : (
        <ul className="flex flex-col gap-2.5" aria-label={tr(lang, 'inbox')}>
          <AnimatePresence mode="popLayout">
            {list.map((t) => (
              <li key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/mz-task', t.id)}>
                <TaskCard task={t} />
              </li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/* SCHEDULED                                                           */
/* ================================================================== */
export function ScheduledView() {
  const tasks = useAppStore((s) => s.tasks);
  const lang = useAppStore((s) => s.settings.lang);
  const now = todayKey();

  const { future, past } = useMemo(() => {
    const f = tasks.filter((t) => !t.archived && t.date && t.date >= now)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '99').localeCompare(b.time ?? '99'));
    const p = tasks.filter((t) => !t.archived && t.date && t.date < now)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    const map = new Map<string, Task[]>();
    for (const t of f) {
      const arr = map.get(t.date!) ?? [];
      arr.push(t);
      map.set(t.date!, arr);
    }
    return { future: [...map.entries()], past: p.slice(0, 24) };
  }, [tasks, now]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-6 pb-24 lg:pb-8 max-w-[1000px] mx-auto w-full">
      <div>
        <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'scheduled')}</h2>
        <p className="text-[14px] opacity-55">{future.reduce((n, [, arr]) => n + arr.filter((t) => !t.completed).length, 0)} {tr(lang, 'upcoming')}</p>
      </div>

      {future.length === 0 && past.length === 0 && (
        <EmptyState title={tr(lang, 'scheduledEmpty')} icon={<CalendarDays size={22} />} />
      )}

      {future.map(([date, items]) => (
        <section key={date} aria-label={relDay(date, lang)}>
          <div className="flex items-center gap-3 mb-2.5 px-1 flex-wrap">
            <span className={cn('text-[13px] font-semibold', date === now && 'text-[var(--mz-accent)]')}>{relDay(date, lang)}</span>
            <span className="text-[12px] opacity-50">{gregLabel(date, lang)}</span>
            <span className="text-[11.5px] opacity-35">{jalaliLabel(date)}</span>
            <div className="flex-1 h-px bg-[var(--mz-edge)] min-w-6" />
            <span className="text-[11.5px] opacity-45 tabular-nums">{items.length}</span>
          </div>
          <ul className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout">
              {items.map((t) => (
                <li key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/mz-task', t.id)}>
                  <TaskCard task={t} showDate={false} />
                </li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}

      {past.length > 0 && (
        <details className="glass rounded-3xl p-4">
          <summary className="cursor-pointer text-[13.5px] font-medium opacity-70 select-none">
            {tr(lang, 'overdue')} · {past.length}
          </summary>
          <ul className="flex flex-col gap-2.5 mt-3">
            <AnimatePresence mode="popLayout">
              {past.map((t) => <li key={t.id}><TaskCard task={t} showDate /></li>)}
            </AnimatePresence>
          </ul>
        </details>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/* CALENDAR                                                            */
/* ================================================================== */
export function CalendarView() {
  const calView = useAppStore((s) => s.calView);
  const setCalView = useAppStore((s) => s.setCalView);
  const calDate = useAppStore((s) => s.calDate);
  const setCalDate = useAppStore((s) => s.setCalDate);
  const tasks = useAppStore((s) => s.tasks);
  const events = useAppStore((s) => s.events);
  const settings = useAppStore((s) => s.settings);
  const lang = settings.lang;
  const createTask = useAppStore((s) => s.createTask);
  const moveTaskDate = useAppStore((s) => s.moveTaskDate);
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const setSelected = useAppStore((s) => s.setSelected);
  const [creating, setCreating] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);

  const tasksByDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.archived || !t.date) continue;
      const arr = m.get(t.date) ?? [];
      arr.push(t);
      m.set(t.date, arr);
    }
    return m;
  }, [tasks]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, typeof events>();
    for (const e of events) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [events]);

  const nav = (dir: -1 | 1) => {
    const ec = effCalendar(settings.calendar, lang);
    if (calView === 'month') {
      if (ec === 'jalali') {
        // Navigate true Jalali month → Gregorian first-day key
        setCalDate(jalaaliNavKey(calDate, dir));
        return;
      }
      const d = new Date(calDate + 'T12:00:00');
      d.setMonth(d.getMonth() + dir);
      setCalDate(todayKey(d));
    } else if (calView === 'week') setCalDate(addDaysKey(calDate, dir * 7));
    else setCalDate(addDaysKey(calDate, dir));
  };

  const commitNew = (date: string) => {
    const v = newTitle.trim();
    setCreating(null);
    setNewTitle('');
    if (!v) return;
    const t = createTask(v);
    useAppStore.getState().updateTask(t.id, { date });
  };

  const views: { key: typeof calView; label: TKey }[] = [
    { key: 'day', label: 'day' }, { key: 'week', label: 'week' }, { key: 'month', label: 'month' }, { key: 'agenda', label: 'agenda' },
  ];

  const ec = effCalendar(settings.calendar, lang);
  const jalaliMode = ec === 'jalali' || (ec === 'dual' && lang === 'fa');
  const days = calView === 'week'
    ? weekKeys(calDate, settings.weekStartsOn)
    : calView === 'month'
      ? (jalaliMode ? jalaaliMonthCells(calDate, settings.weekStartsOn) : monthCells(calDate, settings.weekStartsOn))
      : [calDate];
  const hdr = headerDate(calDate, lang, settings.calendar);
  // directional calendar navigation
  const [calDir, setCalDir] = useState<1 | -1>(1);
  const [prevCalView, setPrevCalView] = useState(calView);
  useEffect(() => {
    if (calView !== prevCalView) setCalDir(1);
    setPrevCalView(calView);
  }, [calView]); // eslint-disable-line react-hooks/exhaustive-deps
  const navCal = (dir: 1 | -1) => { setCalDir(dir); nav(dir); };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-[24px] sm:text-[27px] font-semibold tracking-tight leading-tight whitespace-pre-line">{hdr.line1}</h2>
          {hdr.line2 && <p className="text-[13px] opacity-55">{hdr.line2}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <IconBtn onClick={() => navCal(-1)} title="Previous"><ChevronLeft size={17} /></IconBtn>
          <Btn variant="glass" size="sm" onClick={() => { setCalDir(1); setCalDate(todayKey()); }}>{tr(lang, 'todayBtn')}</Btn>
          <IconBtn onClick={() => navCal(1)} title="Next"><ChevronRight size={17} /></IconBtn>
        </div>
        <div className="glass rounded-2xl p-1 flex items-center gap-0.5" role="tablist" aria-label={tr(lang, 'view')}>
          {views.map((v) => (
            <button key={v.key} type="button" role="tab" aria-selected={calView === v.key}
              onClick={() => setCalView(v.key)}
              className={cn('relative px-3 h-8 rounded-xl text-[13px] font-medium pressable',
                calView === v.key ? 'text-white' : 'opacity-65 hover:opacity-100')}>
              {calView === v.key && (
                <motion.span layoutId="calpill" className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--mz-accent)' }} transition={springSnappy} />
              )}
              <span className="relative">{tr(lang, v.label)}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" custom={calDir} initial={false}>
        <motion.div key={`${calView}-${calDate}`}
          custom={calDir}
          variants={{
            initial: (dir: number) => ({ opacity: 0, x: dir === 0 ? 0 : dir * 18 }),
            animate: { opacity: 1, x: 0, transition: pageSpring } as never,
            exit: (dir: number) => ({ opacity: 0, x: dir === 0 ? 0 : -dir * 18, transition: { duration: 0.16, ease: 'easeIn' as const } }),
          }}
          initial="initial" animate="animate" exit="exit"
          className="glass rounded-[28px] p-3 sm:p-4 overflow-hidden">

          {calView === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {weekKeys(startOfWeekKey(days[0], settings.weekStartsOn), settings.weekStartsOn).map((d) => (
                  <div key={d} className="text-center text-[11px] uppercase tracking-wider opacity-45 py-1">
                    {weekdayShort(new Date(d + 'T12:00:00').getDay(), lang)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day) => {
                  const inMonth = jalaliMode
                    ? (() => { const a = g2j(day); const b = g2j(calDate); return a.jy === b.jy && a.jm === b.jm; })()
                    : day.slice(0, 7) === calDate.slice(0, 7);
                  const isToday = day === todayKey();
                  const dayTasks = tasksByDay.get(day) ?? [];
                  const dayEvents = eventsByDay.get(day) ?? [];
                  const num = jalaliMode
                    ? String(g2j(day).jd)
                    : String(Number(day.slice(8)));
                  return (
                    <div key={day}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(day); }}
                      onDragLeave={() => setDragOver((d) => (d === day ? null : d))}
                      onDrop={(e) => {
                        const id = e.dataTransfer.getData('text/mz-task');
                        if (id) moveTaskDate(id, day);
                        setDragOver(null);
                      }}
                      onDoubleClick={() => setCreating(day)}
                      onClick={() => setCalDate(day)}
                      className={cn('min-h-[86px] sm:min-h-[104px] rounded-2xl p-1.5 sm:p-2 flex flex-col gap-1 cursor-pointer transition-colors',
                        inMonth ? 'bg-[color-mix(in_srgb,var(--mz-ink)_4%,transparent)]' : 'opacity-40',
                        isToday && 'ring-1 ring-[var(--mz-accent)]',
                        dragOver === day && 'ring-2 ring-[var(--mz-accent)] bg-[color-mix(in_srgb,var(--mz-accent)_8%,transparent)]')}>
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn('text-[12.5px] font-medium tabular-nums w-7 h-7 flex items-center justify-center rounded-full',
                          isToday ? 'text-white' : inMonth ? 'opacity-80' : 'opacity-50')}
                          style={isToday ? { background: 'var(--mz-accent)' } : undefined}>
                          {lang === 'fa' ? num.replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[+x]) : num}
                        </span>
                        <span className="flex gap-0.5">
                          {dayEvents.slice(0, 3).map((e) => (
                            <button key={e.id} type="button" aria-label={`${e.title} — delete`}
                              onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }}
                              className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
                          ))}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-h-0 overflow-hidden">
                        {dayTasks.slice(0, 3).map((t) => (
                          <button key={t.id} type="button"
                            onClick={(e) => { e.stopPropagation(); setSelected(t.id); }}
                            className={cn('text-[10.5px] text-start px-1.5 py-0.5 rounded-md truncate',
                              t.completed ? 'opacity-45 line-through' : 'hover:opacity-80')}
                            style={{
                              background: t.completed
                                ? 'transparent'
                                : `color-mix(in srgb, ${PRIORITY_STYLE[t.priority].hex} 14%, transparent)`,
                            }}>
                            {t.time && <span className="opacity-60 tabular-nums">{fmtTime(t.time, settings.hour12, lang).replace(/\s?[AP]M$/, '')} </span>}
                            {t.title}
                          </button>
                        ))}
                        {dayTasks.length > 3 && <span className="text-[10px] opacity-50 px-1.5">+{dayTasks.length - 3}</span>}
                      </div>
                      {creating === day && (
                        <input autoFocus value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitNew(day); if (e.key === 'Escape') { setCreating(null); setNewTitle(''); } }}
                          onBlur={() => commitNew(day)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="…"
                          className="w-full bg-transparent text-[11px] outline-none border-b border-[var(--mz-accent)]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {calView === 'week' && (
            <>
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {days.map((d) => (
                  <div key={d} className="text-center text-[11px] uppercase tracking-wider opacity-45 py-1">
                    {weekdayShort(new Date(d + 'T12:00:00').getDay(), lang)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day) => {
                  const isToday = day === todayKey();
                  const dayTasks = [...(tasksByDay.get(day) ?? [])].sort((a, b) => (a.time ?? 'zz').localeCompare(b.time ?? 'zz'));
                  return (
                    <div key={day}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(day); }}
                      onDragLeave={() => setDragOver((d) => (d === day ? null : d))}
                      onDrop={(e) => { const id = e.dataTransfer.getData('text/mz-task'); if (id) moveTaskDate(id, day); setDragOver(null); }}
                      onDoubleClick={() => setCreating(day)}
                      className={cn('rounded-2xl p-1.5 sm:p-2 min-h-[200px] flex flex-col gap-1.5 transition-colors',
                        isToday ? 'ring-1 ring-[var(--mz-accent)]' : 'bg-[color-mix(in_srgb,var(--mz-ink)_4%,transparent)]',
                        dragOver === day && 'ring-2 ring-[var(--mz-accent)]')}>
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[11.5px] opacity-60">{weekdayShort(new Date(day + 'T12:00:00').getDay(), lang)}</span>
                        <span className={cn('text-[13px] font-semibold tabular-nums w-6 h-6 flex items-center justify-center rounded-full',
                          isToday && 'text-white')}
                          style={isToday ? { background: 'var(--mz-accent)' } : undefined}>
                          {Number(day.slice(8))}
                        </span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        {dayTasks.map((t) => (
                          <motion.button key={t.id} layout type="button"
                            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            transition={springSoft}
                            onClick={() => setSelected(t.id)}
                            className="text-[11.5px] rounded-lg px-2 py-1.5 cursor-pointer leading-snug text-start truncate"
                            style={{ background: `color-mix(in srgb, ${PRIORITY_STYLE[t.priority].hex} 16%, transparent)` }}>
                            {t.time && <span className="opacity-65 tabular-nums">{fmtTime(t.time, settings.hour12, lang)} </span>}
                            <span className={cn(t.completed && 'line-through opacity-60')}>{t.title}</span>
                          </motion.button>
                        ))}
                      </AnimatePresence>
                      {creating === day && (
                        <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') commitNew(day); if (e.key === 'Escape') { setCreating(null); setNewTitle(''); } }}
                          onBlur={() => commitNew(day)} onClick={(e) => e.stopPropagation()} placeholder="…"
                          className="w-full bg-transparent text-[11.5px] outline-none border-b border-[var(--mz-accent)]" />
                      )}
                      <button type="button" onClick={() => setCreating(day)} aria-label={tr(lang, 'newTask')}
                        className="opacity-30 hover:opacity-90 transition-opacity mt-auto self-center">
                        <Plus size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {calView === 'day' && <DayView date={calDate} />}
          {calView === 'agenda' && <AgendaView />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function DayView({ date }: { date: string }) {
  const tasks = useAppStore((s) => s.tasks);
  const events = useAppStore((s) => s.events);
  const settings = useAppStore((s) => s.settings);
  const lang = settings.lang;
  const setSelected = useAppStore((s) => s.setSelected);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const dayTasks = tasks.filter((t) => !t.archived && t.date === date);
  const dayEvents = events.filter((e) => e.date === date);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div>
      <p className="text-[13px] opacity-55 mb-3 px-1">{gregLabel(date, lang)} · {jalaliLabel(date)}</p>
      <div className="flex flex-col">
        {hours.map((h) => {
          const hh = String(h).padStart(2, '0');
          const items = dayTasks.filter((t) => t.time && +t.time.split(':')[0] === h);
          const evs = dayEvents.filter((e) => e.time && +e.time.split(':')[0] === h);
          const allday = h === 0 ? dayTasks.filter((t) => !t.time) : [];
          return (
            <div key={h} className="flex gap-3 py-1 border-t border-[var(--mz-edge)]/50 min-h-[30px]">
              <span className="w-14 shrink-0 text-[11px] opacity-40 tabular-nums pt-1">{fmtTime(`${hh}:00`, settings.hour12, lang)}</span>
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {h === 0 && allday.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {allday.map((t) => (
                      <button key={t.id} type="button" onClick={() => setSelected(t.id)}
                        className="rounded-xl px-3 py-1.5 text-[13px] text-start"
                        style={{ background: `color-mix(in srgb, ${PRIORITY_STYLE[t.priority].hex} 15%, transparent)` }}>
                        <span className="text-[11px] opacity-60 me-1">{tr(lang, 'allDay')}</span>
                        <span className={cn(t.completed && 'line-through opacity-60')}>{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                {evs.map((e) => (
                  <div key={e.id} className="rounded-xl px-3 py-1.5 text-[12.5px]"
                    style={{ background: `color-mix(in srgb, ${e.color} 16%, transparent)`, color: e.color }}>
                    {e.title} {e.time && <span className="opacity-70">· {fmtTime(e.time, settings.hour12, lang)}</span>}
                  </div>
                ))}
                {items.map((t) => (
                  <button key={t.id} type="button" onClick={() => setSelected(t.id)}
                    className="text-start rounded-xl px-3 py-1.5 text-[13px] transition-opacity hover:opacity-80"
                    style={{ background: `color-mix(in srgb, ${PRIORITY_STYLE[t.priority].hex} 15%, transparent)` }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}
                      aria-label={t.title}
                      className={cn('w-4 h-4 rounded-full border me-2 inline-flex items-center justify-center align-middle text-white',
                        t.completed ? 'border-transparent' : 'border-[color-mix(in_srgb,var(--mz-ink)_35%,transparent)]')}
                      style={t.completed ? { background: 'var(--mz-accent)' } : undefined}>
                      {t.completed && <Check size={9} />}
                    </button>
                    <span className={cn(t.completed && 'line-through opacity-60')}>{t.title}</span>
                    <span className="opacity-65 tabular-nums text-[12px] ms-2">{fmtTime(t.time, settings.hour12, lang)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaView() {
  const tasks = useAppStore((s) => s.tasks);
  const lang = useAppStore((s) => s.settings.lang);
  const now = todayKey();
  const list = useMemo(() =>
    tasks.filter((t) => !t.archived && t.date && t.date >= now)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '99').localeCompare(b.time ?? '99'))
      .slice(0, 80), [tasks, now]);

  if (list.length === 0) return <EmptyState title={tr(lang, 'scheduledEmpty')} icon={<ListChecks size={22} />} />;

  const headers = list.map((t, i) => i === 0 || list[i - 1].date !== t.date);
  return (
    <div className="flex flex-col gap-1">
      {list.map((t, i) => {
        const showHeader = headers[i];
        return (
          <div key={t.id}>
            {showHeader && (
              <p className="text-[12.5px] font-semibold opacity-65 mt-3 mb-1.5 px-1">
                {relDay(t.date!, lang)} <span className="opacity-55 font-normal">· {gregLabel(t.date!, lang)}</span>
              </p>
            )}
            <AgendaRow task={t} />
          </div>
        );
      })}
    </div>
  );
}

function AgendaRow({ task }: { task: Task }) {
  const setSelected = useAppStore((s) => s.setSelected);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const settings = useAppStore((s) => s.settings);
  const lang = settings.lang;
  return (
    <div className="flex items-center gap-3 py-2 px-1 border-b border-[var(--mz-edge)]/50">
      <span className="w-16 text-[12px] opacity-55 tabular-nums shrink-0">{task.time ? fmtTime(task.time, settings.hour12, lang) : '—'}</span>
      <button type="button" onClick={() => toggleTask(task.id)} aria-label={task.title}
        className={cn('w-5 h-5 rounded-full border-2 pressable shrink-0 flex items-center justify-center text-white',
          task.completed ? 'border-transparent' : 'border-[color-mix(in_srgb,var(--mz-ink)_30%,transparent)]')}
        style={task.completed ? { background: 'linear-gradient(135deg, var(--mz-accent), #9ad8cf)' } : undefined}>
        {task.completed && <Check size={11} />}
      </button>
      <button type="button" onClick={() => setSelected(task.id)}
        className={cn('flex-1 text-start text-[14px] truncate min-w-0', task.completed && 'line-through opacity-55')}>
        {task.title}
      </button>
      <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_STYLE[task.priority].dot)}
        aria-label={tr(lang, PRIORITY_STYLE[task.priority].key)} />
    </div>
  );
}

/* ================================================================== */
/* PROJECTS                                                            */
/* ================================================================== */
export function ProjectsView() {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const lang = useAppStore((s) => s.settings.lang);
  const createProject = useAppStore((s) => s.createProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const open = projects.find((p) => p.id === openId) ?? null;

  const progressOf = (id: string) => {
    const list = tasks.filter((t) => t.projectId === id && !t.archived);
    const done = list.filter((t) => t.completed).length;
    return { total: list.length, done, pct: list.length ? done / list.length : 0 };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'projects')}</h2>
          <p className="text-[14px] opacity-55">{projects.length} {tr(lang, 'projects').toLowerCase()}</p>
        </div>
        <Btn variant="glass" size="sm" onClick={() => setCreating(true)}><Plus size={14} /> {tr(lang, 'addProject')}</Btn>
      </div>

      {projects.length === 0 ? (
        <EmptyState title={tr(lang, 'projectsEmpty')} icon={<FolderKanban size={22} />}
          action={<Btn variant="glass" size="sm" onClick={() => setCreating(true)}><Plus size={14} /> {tr(lang, 'addProject')}</Btn>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map((p) => {
            const { pct, total, done } = progressOf(p.id);
            return (
              <motion.button key={p.id} type="button" layout onClick={() => setOpenId(p.id)}
                whileHover={{ y: -3 }} transition={springSnappy}
                className="task-card glass rounded-3xl p-5 text-start flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl flex items-center justify-center text-[17px] shrink-0"
                      style={{ background: `color-mix(in srgb, ${p.color} 18%, transparent)`, color: p.color }}>
                      {p.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[15.5px] tracking-tight truncate">{p.name}</p>
                      <p className="text-[12px] opacity-55 truncate">{done} / {total} {tr(lang, 'ofTotal')}</p>
                    </div>
                  </div>
                  <span className="text-[19px] font-semibold tabular-nums" style={{ color: p.color }}>
                    {Math.round(pct * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[color-mix(in_srgb,var(--mz-ink)_8%,transparent)] overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: p.color }}
                    initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={springSoft} />
                </div>
                {p.description && <p className="text-[12.5px] opacity-55 line-clamp-2 leading-relaxed">{p.description}</p>}
                {p.deadline && <p className="text-[11.5px] opacity-45">{tr(lang, 'deadline')}: {gregLabel(p.deadline, lang)}</p>}
              </motion.button>
            );
          })}
        </div>
      )}

      {creating && (
        <Sheet onClose={() => { setCreating(false); setName(''); }}>
          <SheetHeader title={tr(lang, 'newProject')} onClose={() => { setCreating(false); setName(''); }} />
          <div className="p-5 flex flex-col gap-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr(lang, 'projectName')}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { createProject(name.trim()); setCreating(false); setName(''); } }}
              autoFocus className="glass rounded-2xl px-4 h-11 bg-transparent outline-none text-[15px]" aria-label={tr(lang, 'projectName')} />
            <Btn variant="primary" onClick={() => { if (name.trim()) { createProject(name.trim()); setCreating(false); setName(''); } }}>
              {tr(lang, 'create')}
            </Btn>
          </div>
        </Sheet>
      )}

      {open && (
        <ProjectDetail project={open} onClose={() => setOpenId(null)}
          onDelete={() => { deleteProject(open.id); setOpenId(null); }} />
      )}
    </motion.div>
  );
}

function ProjectDetail({ project, onClose, onDelete }: { project: Project; onClose: () => void; onDelete: () => void }) {
  const tasks = useAppStore((s) => s.tasks);
  const lang = useAppStore((s) => s.settings.lang);
  const createTask = useAppStore((s) => s.createTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const [confirm, setConfirm] = useState(false);
  const [title, setTitle] = useState('');
  const list = tasks.filter((t) => t.projectId === project.id && !t.archived);

  const add = () => {
    const v = title.trim();
    if (!v) return;
    const t = createTask(v);
    updateTask(t.id, { projectId: project.id });
    setTitle('');
  };

  return (
    <Sheet onClose={onClose} wide labelledBy="proj-title">
      <SheetHeader title={project.name} onClose={onClose}
        right={
          <button type="button" onClick={() => setConfirm(true)}
            className="text-[#d97a72] opacity-70 hover:opacity-100 pressable px-2" aria-label={tr(lang, 'deleteTask')}>
            <Trash2 size={15} />
          </button>
        } />
      <div className="p-5 flex flex-col gap-4 overflow-auto" id="proj-title">
        <p className="text-[13.5px] opacity-65 leading-relaxed">{project.description || tr(lang, 'description')}</p>
        <div className="flex gap-3 flex-wrap text-[12.5px]">
          <span className="glass rounded-full px-3 py-1" style={{ color: project.color }}>{project.icon} {project.name}</span>
          {project.deadline && <span className="glass rounded-full px-3 py-1">{tr(lang, 'deadline')}: {gregLabel(project.deadline, lang)}</span>}
          <span className="glass rounded-full px-3 py-1">
            {list.filter((t) => t.completed).length} / {list.length} {tr(lang, 'ofTotal')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder={tr(lang, 'newTask')}
            className="flex-1 glass rounded-2xl px-4 h-11 bg-transparent outline-none text-[14.5px] min-w-0" aria-label={tr(lang, 'newTask')} />
          <Btn variant="primary" size="sm" onClick={add}><Plus size={14} /> {tr(lang, 'add')}</Btn>
        </div>
        <ul className="flex flex-col gap-2.5">
          <AnimatePresence mode="popLayout">
            {list.map((t) => <li key={t.id}><TaskCard task={t} showDate /></li>)}
          </AnimatePresence>
        </ul>
        {list.length === 0 && <EmptyState title={tr(lang, 'todayEmpty')} sub={tr(lang, 'todayEmptySub')} />}
      </div>
      {confirm && (
        <ConfirmDialog title={tr(lang, 'confirmDelete')} body={tr(lang, 'deleteBody')}
          onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); onDelete(); }} />
      )}
    </Sheet>
  );
}

/* ================================================================== */
/* HABITS                                                              */
/* ================================================================== */
export function HabitsView() {
  const habits = useAppStore((s) => s.habits);
  const lang = useAppStore((s) => s.settings.lang);
  const toggleHabitDay = useAppStore((s) => s.toggleHabitDay);
  const createHabit = useAppStore((s) => s.createHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const now = todayKey();
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(now, i - 6)), [now]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'habits')}</h2>
          <p className="text-[14px] opacity-55">{habits.length} {tr(lang, 'habits').toLowerCase()}</p>
        </div>
        <Btn variant="glass" size="sm" onClick={() => setCreating(true)}><Plus size={14} /> {tr(lang, 'addHabit')}</Btn>
      </div>

      {habits.length === 0 ? (
        <EmptyState title={tr(lang, 'habitsEmpty')} icon={<Target size={22} />}
          action={<Btn variant="glass" size="sm" onClick={() => setCreating(true)}><Plus size={14} /> {tr(lang, 'addHabit')}</Btn>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {habits.map((h) => {
              const { current, best } = habitStreakOf(h.history);
              const doneToday = (h.history[now] ?? 0) > 0;
              return (
                <motion.div key={h.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }} transition={springSoft}
                  className="task-card glass rounded-3xl p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-2xl glass flex items-center justify-center text-[18px] shrink-0">{h.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[15.5px] tracking-tight truncate">{h.name}</p>
                        <p className="text-[12.5px] opacity-70 inline-flex items-center gap-1">
                          <Flame size={12} className="text-[#d9a05b]" />
                          <motion.span key={current} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={springSnappy}>
                            {current}
                          </motion.span> {tr(lang, 'dayStreak')}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setConfirmId(h.id)} aria-label={tr(lang, 'deleteTask')}
                      className="opacity-35 hover:opacity-100 pressable"><Trash2 size={14} /></button>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    {week.map((d) => {
                      const done = (h.history[d] ?? 0) > 0;
                      const isToday = d === now;
                      return (
                        <button key={d} type="button" onClick={() => toggleHabitDay(h.id, d)}
                          aria-label={`${h.name} ${relDay(d, lang)}`} aria-pressed={done}
                          className={cn('flex-1 aspect-square rounded-xl flex items-center justify-center text-[10.5px] pressable transition-colors border',
                            done ? 'text-white border-transparent' : 'border-[var(--mz-edge)] opacity-60 hover:opacity-100',
                            isToday && !done && 'ring-1 ring-[var(--mz-accent)]')}
                          style={done ? { background: 'linear-gradient(135deg, var(--mz-accent), #9ad8cf)' } : undefined}>
                          {Number(d.slice(8))}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[12px] opacity-55">{tr(lang, 'best')}: {best}</span>
                    <Btn size="sm" variant={doneToday ? 'glass' : 'primary'} onClick={() => toggleHabitDay(h.id)}>
                      {doneToday ? <><Check size={14} /> {tr(lang, 'done')}</> : <>{tr(lang, 'add')}</>}
                    </Btn>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {creating && (
        <Sheet onClose={() => { setCreating(false); setName(''); }}>
          <SheetHeader title={tr(lang, 'newHabit')} onClose={() => { setCreating(false); setName(''); }} />
          <div className="p-5 flex flex-col gap-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr(lang, 'habitName')} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { createHabit(name.trim()); setCreating(false); setName(''); } }}
              className="glass rounded-2xl px-4 h-11 bg-transparent outline-none text-[15px]" aria-label={tr(lang, 'habitName')} />
            <Btn variant="primary" onClick={() => { if (name.trim()) { createHabit(name.trim()); setCreating(false); setName(''); } }}>
              {tr(lang, 'create')}
            </Btn>
          </div>
        </Sheet>
      )}
      {confirmId && (
        <ConfirmDialog title={tr(lang, 'confirmDelete')} body={tr(lang, 'deleteBody')}
          onCancel={() => setConfirmId(null)} onConfirm={() => { if (confirmId) deleteHabit(confirmId); setConfirmId(null); }} />
      )}
    </motion.div>
  );
}

/* ================================================================== */
/* TAGS                                                                */
/* ================================================================== */
export function TagsView() {
  const tags = useAppStore((s) => s.tags);
  const tasks = useAppStore((s) => s.tasks);
  const lang = useAppStore((s) => s.settings.lang);
  const upsertTag = useAppStore((s) => s.upsertTag);
  const deleteTag = useAppStore((s) => s.deleteTag);
  const [selected, setSelectedTag] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const list = selected ? tasks.filter((t) => !t.archived && t.tags.includes(selected)) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1000px] mx-auto w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'tags')}</h2>
          <p className="text-[14px] opacity-55">{tags.length} {tr(lang, 'tags').toLowerCase()}</p>
        </div>
        <Btn variant="glass" size="sm" onClick={() => setCreating(true)}><Plus size={14} /> {tr(lang, 'addTag')}</Btn>
      </div>

      {tags.length === 0 ? (
        <EmptyState title={tr(lang, 'tagsEmpty')} icon={<Hash size={22} />} />
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {tags.map((t) => {
            const count = tasks.filter((x) => !x.archived && x.tags.includes(t.name)).length;
            return (
              <div key={t.id} className="inline-flex items-center gap-1.5">
                <TagChip name={t.name} color={t.color}
                  onClick={() => setSelectedTag(selected === t.name ? null : t.name)} />
                <span className="text-[11.5px] opacity-45 tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-[15px] font-semibold">#{selected}</h3>
              <button type="button" onClick={() => { deleteTag(selected); setSelectedTag(null); }}
                className="text-[12.5px] text-[#d97a72] opacity-70 hover:opacity-100 pressable">
                {tr(lang, 'deleteTag' as TKey) || tr(lang, 'deleteTask')}
              </button>
              <div className="flex-1 h-px bg-[var(--mz-edge)]" />
            </div>
            <ul className="flex flex-col gap-2.5">
              <AnimatePresence mode="popLayout">
                {list.map((t) => <li key={t.id}><TaskCard task={t} showDate /></li>)}
              </AnimatePresence>
            </ul>
            {list.length === 0 && <EmptyState title={tr(lang, 'todayEmpty')} sub={tr(lang, 'todayEmptySub')} />}
          </motion.section>
        )}
      </AnimatePresence>

      {creating && (
        <Sheet onClose={() => { setCreating(false); setName(''); }}>
          <SheetHeader title={tr(lang, 'newTag')} onClose={() => { setCreating(false); setName(''); }} />
          <div className="p-5 flex flex-col gap-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr(lang, 'tagName')} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { upsertTag(name.trim().replace(/^#/, '')); setCreating(false); setName(''); } }}
              className="glass rounded-2xl px-4 h-11 bg-transparent outline-none text-[15px]" aria-label={tr(lang, 'tagName')} />
            <Btn variant="primary" onClick={() => { if (name.trim()) { upsertTag(name.trim().replace(/^#/, '')); setCreating(false); setName(''); } }}>
              {tr(lang, 'create')}
            </Btn>
          </div>
        </Sheet>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/* ARCHIVE                                                             */
/* ================================================================== */
export function ArchiveView() {
  const tasks = useAppStore((s) => s.tasks);
  const lang = useAppStore((s) => s.settings.lang);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const [q, setQ] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const list = useMemo(
    () => tasks.filter((t) => t.archived && t.title.toLowerCase().includes(q.trim().toLowerCase())),
    [tasks, q]
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1000px] mx-auto w-full">
      <div>
        <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'archive')}</h2>
        <p className="text-[14px] opacity-55">{list.length} {tr(lang, 'archived').toLowerCase()}</p>
      </div>

      <div className="glass rounded-3xl px-4 h-11 flex items-center gap-3">
        <Search size={15} className="opacity-45" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr(lang, 'search')}
          className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:opacity-45 min-w-0" aria-label={tr(lang, 'search')} />
      </div>

      {list.length === 0 ? (
        <EmptyState title={tr(lang, 'archiveEmpty')} icon={<Archive size={22} />} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          <AnimatePresence mode="popLayout">
            {list.map((t) => (
              <motion.li key={t.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={springSoft}
                className="task-card glass rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_STYLE[t.priority].dot)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[14.5px] font-medium tracking-tight truncate', t.completed && 'line-through opacity-55')}>
                    {t.title}
                  </p>
                  {t.date && <p className="text-[11.5px] opacity-50">{gregLabel(t.date, lang)}</p>}
                </div>
                <button type="button" onClick={() => updateTask(t.id, { archived: false })}
                  className="pressable text-[12.5px] glass rounded-full px-3 py-1.5 hover:opacity-90">
                  {tr(lang, 'restore')}
                </button>
                <button type="button" onClick={() => setConfirmId(t.id)} aria-label={tr(lang, 'deleteForever')}
                  className="opacity-45 hover:opacity-100 text-[#d97a72] pressable"><Trash2 size={15} /></button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {confirmId && (
        <ConfirmDialog title={tr(lang, 'confirmDelete')} body={tr(lang, 'deleteBody')}
          onCancel={() => setConfirmId(null)} onConfirm={() => { if (confirmId) deleteTask(confirmId); setConfirmId(null); }} />
      )}
    </motion.div>
  );
}

/* ================================================================== */
/* NOTES                                                               */
/* ================================================================== */
export function NotesView() {
  const notes = useAppStore((s) => s.notes);
  const lang = useAppStore((s) => s.settings.lang);
  const createNote = useAppStore((s) => s.createNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // derive selection during render when it becomes invalid (no effect needed)
  const safeSelectedId = selectedId && notes.some((n) => n.id === selectedId) ? selectedId : (notes[0]?.id ?? null);
  const selected = notes.find((n) => n.id === safeSelectedId) ?? null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'notes')}</h2>
          <p className="text-[14px] opacity-55">{notes.length} {tr(lang, 'notes').toLowerCase()}</p>
        </div>
        <Btn variant="glass" size="sm" onClick={() => setSelectedId(createNote().id)}>
          <Plus size={14} /> {tr(lang, 'addNote')}
        </Btn>
      </div>

      {notes.length === 0 ? (
        <EmptyState title={tr(lang, 'notesEmpty')} icon={<FileText size={22} />}
          action={<Btn variant="glass" size="sm" onClick={() => setSelectedId(createNote().id)}>
            <Plus size={14} /> {tr(lang, 'addNote')}
          </Btn>} />
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-3 items-start">
          <ul className="flex flex-col gap-2 max-h-[60vh] overflow-auto pe-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => setSelectedId(n.id)}
                  className={cn('w-full text-start rounded-2xl px-4 py-3 pressable transition-colors',
                    selectedId === n.id ? 'glass' : 'hover:bg-[color-mix(in_srgb,var(--mz-ink)_5%,transparent)]')}>
                  <p className="text-[14px] font-medium tracking-tight truncate">{n.title || tr(lang, 'untitled')}</p>
                  <p className="text-[11.5px] opacity-50 truncate">{n.body || '—'}</p>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="glass rounded-3xl p-5 flex flex-col gap-3 min-h-[340px]">
              <div className="flex items-center gap-3">
                <input value={selected.title} onChange={(e) => updateNote(selected.id, { title: e.target.value })}
                  placeholder={tr(lang, 'untitled')}
                  className="flex-1 bg-transparent outline-none text-[18px] font-semibold tracking-tight placeholder:opacity-40 min-w-0"
                  aria-label={tr(lang, 'untitled')} />
                <button type="button" onClick={() => { deleteNote(selected.id); setSelectedId(null); }}
                  className="opacity-45 hover:opacity-100 text-[#d97a72] pressable" aria-label={tr(lang, 'deleteNote')}>
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea value={selected.body} onChange={(e) => updateNote(selected.id, { body: e.target.value })}
                placeholder="…" className="flex-1 min-h-[240px] bg-transparent outline-none text-[14.5px] leading-relaxed resize-none placeholder:opacity-35"
                aria-label={tr(lang, 'notesLabel')} />
              <p className="text-[11.5px] opacity-45">{relDay(selected.updatedAt, lang)}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/* SETTINGS                                                            */
/* ================================================================== */
function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-end" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>{o.label}</Chip>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative w-12 h-7 rounded-full transition-colors shrink-0 pressable',
        checked ? 'bg-[var(--mz-accent)]' : 'bg-black/15')}>
      <motion.span layout transition={springSnappy}
        className={cn('absolute top-1 w-5 h-5 rounded-full bg-white shadow', checked ? 'left-6' : 'left-1')} />
    </button>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[14.5px] font-medium tracking-tight">{label}</p>
        {hint && <p className="text-[12px] opacity-55 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl px-5 py-4 flex flex-col">
      <h3 className="text-[11.5px] uppercase tracking-[0.16em] opacity-55 mb-1">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsView() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const exportJSON = useAppStore((s) => s.exportJSON);
  const importJSON = useAppStore((s) => s.importJSON);
  const resetAll = useAppStore((s) => s.resetAll);
  const setToast = useAppStore((s) => s.setToast);
  const lang = settings.lang;
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    try {
      const data = exportJSON();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mz-planer-backup-${todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast(tr(lang, 'exported'));
    } catch {
      setToast(tr(lang, 'invalidFile'));
    }
  };

  const doImport = (text: string) => {
    const res = importJSON(text);
    if (!res.ok) setImportErr(res.error ?? tr(lang, 'invalidFile'));
    else {
      setImportOpen(false);
      setImportErr(null);
      setImportText('');
    }
  };

  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
  const notifPermission = notifSupported ? Notification.permission : 'unsupported';

  const askNotif = async () => {
    if (!notifSupported) {
      setToast(tr(lang, 'notifUnsupported'));
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setToast(res === 'granted' ? tr(lang, 'notifOn') : tr(lang, 'notifDenied'));
    } catch {
      setToast(tr(lang, 'notifDenied'));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-4 pb-24 lg:pb-8 max-w-3xl w-full mx-auto">
      <div>
        <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'settings')}</h2>
        <p className="text-[14px] opacity-55">{tr(lang, 'storageWarn')}</p>
      </div>

      <Section title={tr(lang, 'appearance')}>
        <Row label={tr(lang, 'theme')}>
          <Segmented value={settings.theme} label={tr(lang, 'theme')} onChange={(v) => updateSettings({ theme: v })}
            options={[
              { value: 'dark', label: tr(lang, 'dark') },
              { value: 'light', label: tr(lang, 'light') },
              { value: 'system', label: tr(lang, 'system') },
            ]} />
        </Row>
      </Section>

      <Section title={tr(lang, 'language')}>
        <Row label={tr(lang, 'language')}>
          <Segmented value={settings.lang} label={tr(lang, 'language')} onChange={(v) => updateSettings({ lang: v })}
            options={[{ value: 'en', label: 'English' }, { value: 'fa', label: 'فارسی' }]} />
        </Row>
        <Row label={tr(lang, 'calendarMode')} hint={tr(lang, 'calAutoNote')}>
          <Segmented value={settings.calendar} label={tr(lang, 'calendarMode')} onChange={(v) => updateSettings({ calendar: v })}
            options={[
              { value: 'gregorian', label: tr(lang, 'gregorian') },
              { value: 'jalali', label: tr(lang, 'jalali') },
              { value: 'dual', label: tr(lang, 'dual') },
            ]} />
        </Row>
        <Row label={lang === 'fa' ? tr(lang, 'calJalaliNow') : tr(lang, 'calGregNow')}>
          <span className="text-[13px] opacity-70 tabular-nums">
            {lang === 'fa' ? jalaliLabel(todayKey()) : gregLabel(todayKey(), lang)}
          </span>
        </Row>
        <Row label={tr(lang, 'timeFormat')}>
          <Segmented value={settings.hour12 ? 'h12' : 'h24'} label={tr(lang, 'timeFormat')}
            onChange={(v) => updateSettings({ hour12: v === 'h12' })}
            options={[{ value: 'h12', label: tr(lang, 'hour12') }, { value: 'h24', label: tr(lang, 'hour24') }]} />
        </Row>
        <Row label={tr(lang, 'weekStarts')}>
          <Segmented value={String(settings.weekStartsOn)} label={tr(lang, 'weekStarts')}
            onChange={(v) => updateSettings({ weekStartsOn: v === '1' ? 1 : 0 })}
            options={[{ value: '1', label: tr(lang, 'monday') }, { value: '0', label: tr(lang, 'sunday') }]} />
        </Row>
      </Section>

      <Section title={tr(lang, 'notifs')}>
        <Row label={tr(lang, 'browserNotif')}
          hint={notifPermission === 'denied' ? tr(lang, 'notifDenied') : notifPermission === 'unsupported' ? tr(lang, 'notifUnsupported') : undefined}>
          {notifPermission === 'granted'
            ? <Toggle checked={settings.notif} onChange={(v) => updateSettings({ notif: v })} label={tr(lang, 'browserNotif')} />
            : <Btn size="sm" variant="glass" onClick={askNotif}><Bell size={14} /> {tr(lang, 'notifAsk')}</Btn>}
        </Row>
        <Row label={tr(lang, 'sound')}>
          <Toggle checked={settings.sound} onChange={(v) => updateSettings({ sound: v })} label={tr(lang, 'sound')} />
        </Row>
      </Section>

      <Section title={tr(lang, 'productivity')}>
        <Row label={tr(lang, 'pomoDurations')} hint={`${settings.pomoFocus} / ${settings.pomoShort} · ${tr(lang, 'longBreak')} ${settings.pomoLong}`}>
          <div className="flex items-center gap-2">
            {([['pomoFocus', settings.pomoFocus], ['pomoShort', settings.pomoShort], ['pomoLong', settings.pomoLong]] as const).map(([k, v]) => (
              <input key={k} type="text" inputMode="numeric" pattern="[0-9]*" value={String(v)}
                onChange={(e) => {
                  const normalized = stripNonDigits(normalizeDigits(e.target.value));
                  const n = Math.max(1, Math.min(120, Number(normalized) || 1));
                  updateSettings({ [k]: n });
                }}
                className="w-16 h-9 rounded-xl glass bg-transparent outline-none text-center text-[13.5px] tabular-nums"
                aria-label={tr(lang, k === 'pomoFocus' ? 'focus' : k === 'pomoShort' ? 'shortBreak' : 'longBreak')} />
            ))}
          </div>
        </Row>
        <Row label={tr(lang, 'defaultPriority')}>
          <Segmented value={settings.defaultPriority} label={tr(lang, 'defaultPriority')}
            onChange={(v) => updateSettings({ defaultPriority: v })}
            options={(['urgent', 'high', 'normal', 'low'] as const).map((p) => ({ value: p, label: tr(lang, PRIORITY_STYLE[p].key) }))} />
        </Row>
      </Section>

      <Section title={tr(lang, 'data')}>
        <div className="flex flex-wrap gap-2 pt-2 pb-1">
          <Btn variant="glass" size="sm" onClick={doExport}><Download size={14} /> {tr(lang, 'exportData')}</Btn>
          <Btn variant="glass" size="sm" onClick={() => { setImportErr(null); setImportOpen(true); }}>
            <Upload size={14} /> {tr(lang, 'importData')}
          </Btn>
          <Btn variant="danger" size="sm" onClick={() => setResetOpen(true)}><RotateCcw size={14} /> {tr(lang, 'resetApp')}</Btn>
        </div>
      </Section>

      <Section title={tr(lang, 'accessibility')}>
        <Row label={tr(lang, 'reduceMotion')}>
          <Toggle checked={settings.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} label={tr(lang, 'reduceMotion')} />
        </Row>
        <Row label={tr(lang, 'highContrast')}>
          <Toggle checked={settings.highContrast} onChange={(v) => updateSettings({ highContrast: v })} label={tr(lang, 'highContrast')} />
        </Row>
        <Row label={tr(lang, 'largeText')}>
          <Toggle checked={settings.largeText} onChange={(v) => updateSettings({ largeText: v })} label={tr(lang, 'largeText')} />
        </Row>
      </Section>

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => doImport(String(reader.result ?? ''));
          reader.onerror = () => setImportErr(tr(lang, 'invalidFile'));
          reader.readAsText(f);
          e.target.value = '';
        }} />

      {importOpen && (
        <Sheet onClose={() => setImportOpen(false)} labelledBy="import-title">
          <SheetHeader title={tr(lang, 'importData')} onClose={() => setImportOpen(false)} />
          <div className="p-5 flex flex-col gap-4" id="import-title">
            <p className="text-[13.5px] opacity-70 leading-relaxed">{tr(lang, 'importBody')}</p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={7}
              placeholder='{"version": 1, ...}'
              className="glass rounded-2xl p-3.5 bg-transparent outline-none text-[13px] font-mono resize-none"
              aria-label={tr(lang, 'importData')} />
            {importErr && <p className="text-[13px] text-[#d97a72]">{importErr}</p>}
            <div className="flex gap-2 justify-end flex-wrap">
              <Btn variant="ghost" onClick={() => { setImportOpen(false); setImportErr(null); }}>{tr(lang, 'cancel')}</Btn>
              <Btn variant="glass" onClick={() => fileRef.current?.click()}><Upload size={14} /> {tr(lang, 'import')}</Btn>
              <Btn variant="primary" disabled={!importText.trim()} onClick={() => doImport(importText)}>
                {tr(lang, 'confirm')}
              </Btn>
            </div>
          </div>
        </Sheet>
      )}

      {resetOpen && (
        <ConfirmDialog title={tr(lang, 'resetApp')} body={tr(lang, 'deleteBody')}
          onCancel={() => setResetOpen(false)} onConfirm={() => { resetAll(); setResetOpen(false); }} />
      )}
    </motion.div>
  );
}

/* Bar chart with staggered spring rise — module scope (never create
 * components during render). */
function AnalyticsBarChart({ data, renderValue, color, now, lang }: {
  data: { key: string; done: number; planned: number; rate: number }[];
  renderValue: (d: { key: string; done: number; planned: number; rate: number }) => { fill: number; label: string };
  color: string; now: string; lang: 'en' | 'fa';
}) {
  return (
    <div className="flex items-end justify-between gap-1.5 h-[120px] pt-2">
      {data.map((d, i) => {
        const { fill, label } = renderValue(d);
        const isToday = d.key === now;
        return (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group/b" title={`${relDay(d.key, lang)} · ${label}`}>
            <motion.div
              className="w-full rounded-lg relative overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--mz-ink) 8%, transparent)', height: '100%' }}
              initial={false}
            >
              <motion.div
                className="absolute bottom-0 inset-x-0 rounded-lg"
                style={{ background: isToday ? 'linear-gradient(180deg, #9ad8cf, var(--mz-accent))' : color }}
                initial={{ height: '4%' }}
                animate={{ height: `${Math.max(4, fill * 96 + 4)}%` }}
                transition={{ delay: 0.04 * i, type: 'spring', stiffness: 300, damping: 30 }}
              />
              {d.done > 0 && (
                <span className="absolute inset-x-0 bottom-1 text-center text-[9px] font-semibold tabular-nums text-white/90 pointer-events-none">{d.done}</span>
              )}
            </motion.div>
            <span className={cn('text-[9px] leading-none tabular-nums', isToday ? 'text-[var(--mz-accent)] font-semibold' : 'opacity-40')}>
              {weekdayShort(new Date(d.key + 'T12:00:00').getDay(), lang)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsView() {
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const stats = useAppStore((s) => s.stats);
  const lang = useAppStore((s) => s.settings.lang);
  const now = todayKey();

  // ----- Per-day metrics over last 30 days -----
  const [days30] = useMemo(() => {
    const arr: { key: string; done: number; planned: number; rate: number; focusSec: number; energy: number | null; habits: number; habitsTotal: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = addDaysKey(now, -i);
      const dayTasks = tasks.filter((t) => !t.archived && t.date === key);
      const done = dayTasks.filter((t) => t.completed).length;
      const planned = dayTasks.length;
      const st = stats[key];
      const habitsDone = habits.filter((h) => (h.history[key] ?? 0) > 0).length;
      arr.push({
        key,
        done, planned,
        rate: planned ? done / planned : -1, // -1 = no tasks
        focusSec: st?.focusSec ?? 0,
        energy: st?.energy ?? null,
        habits: habitsDone, habitsTotal: habits.length,
      });
    }
    return [arr];
  }, [tasks, habits, stats, now]);

  const today = days30[days30.length - 1];
  const last7 = days30.slice(-7);
  const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const weekRates = last7.map((d) => d.rate).filter((r) => r >= 0);
  const monthRates = days30.map((d) => d.rate).filter((r) => r >= 0);

  const todayRate = today.rate >= 0 ? today.rate : null;
  const weekAvg = avg(weekRates);
  const monthAvg = avg(monthRates);
  const totalDone = tasks.filter((t) => t.completed && !t.archived).length;
  const totalFocus = days30.reduce((a, d) => a + d.focusSec, 0);
  const habitScore = (() => {
    const hs = last7.map((d) => (d.habitsTotal ? d.habits / d.habitsTotal : -1)).filter((v) => v >= 0);
    return hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : null;
  })();

  const bestDay = useMemo(() => {
    const withData = days30.filter((d) => d.planned > 0);
    if (!withData.length) return null;
    return withData.reduce((a, b) => (b.rate > a.rate || (b.rate === a.rate && b.done > a.done) ? b : a));
  }, [days30]);

  const streak = useMemo(() => {
    let run = 0;
    for (let i = 29; i >= 0; i--) {
      const day = days30[i];
      const good = (day.rate >= 0.5) || (day.habits > 0);
      if (good) run++;
      else if (day.key === now && day.planned === 0 && day.habits === 0) continue;
      else break;
    }
    return run;
  }, [days30, now]);

  // Composite grade (0–100): 45% completion avg, 25% habits, 20% focus consistency, 10% energy logging
  const comp = monthAvg ?? weekAvg ?? todayRate ?? 0;
  const hab = habitScore ?? 0;
  const focusDays = last7.filter((d) => d.focusSec > 0).length / 7;
  const energyDays = last7.filter((d) => d.energy != null).length / 7;
  const grade = Math.round(comp * 45 + hab * 25 + focusDays * 20 + energyDays * 10);

  const gradeMsg = grade >= 75 ? tr(lang, 'greatWork') : grade >= 40 ? tr(lang, 'keepGoing') : tr(lang, 'slowStart');

  const maxFocus = Math.max(1, ...days30.slice(-7).map((d) => d.focusSec));

  const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
  const mmOf = (sec: number) => `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;

  const gradeR = 64, gradeC = 2 * Math.PI * gradeR;
  const gradeDash = gradeC * (grade / 100);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}
      className="flex flex-col gap-5 pb-24 lg:pb-8 max-w-[1400px] mx-auto w-full">
      <div>
        <h2 className="text-[27px] font-semibold tracking-tight">{tr(lang, 'analytics')}</h2>
        <p className="text-[14px] opacity-55">{tr(lang, 'yourGrade')} · {gradeMsg}</p>
      </div>

      {/* Hero grade */}
      <section className="glass rounded-[28px] p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 md:gap-10 overflow-hidden relative">
        <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full blur-[120px] pointer-events-none gpu-accelerated" style={{ background: 'var(--mz-aurora-1)' }} aria-hidden="true" />
        <div className="relative" style={{ width: 160, height: 160 }}>
          <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="agrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--mz-accent)" />
                <stop offset="100%" stopColor="#9ad8cf" />
              </linearGradient>
            </defs>
            <circle cx={80} cy={80} r={gradeR} fill="none" stroke="var(--mz-edge)" strokeWidth={13} />
            <motion.circle cx={80} cy={80} r={gradeR} fill="none" stroke="url(#agrad)" strokeWidth={13} strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 6px 18px color-mix(in srgb, var(--mz-accent) 40%, transparent))' }}
              initial={{ strokeDasharray: `0 ${gradeC}` }}
              animate={{ strokeDasharray: `${gradeDash} ${Math.max(0.01, gradeC - gradeDash)}` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            />
            {/* 25/50/75 tick marks */}
            {[25, 50, 75].map((t) => {
              const ang = (t / 100) * 360 * (Math.PI / 180) - Math.PI / 2;
              return <circle key={t} cx={80 + (gradeR + 11) * Math.cos(ang)} cy={80 + (gradeR + 11) * Math.sin(ang)} r={1.6} fill="color-mix(in srgb, var(--mz-ink) 22%, transparent)" />;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span key={grade} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={microSpring}
              className="text-[44px] font-semibold tracking-tight tabular-nums leading-none">
              {lang === 'fa' ? String(grade).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]) : grade}
            </motion.span>
            <span className="text-[11px] uppercase tracking-[0.18em] opacity-50 mt-1">{tr(lang, 'yourGrade')}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 text-center md:text-start grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {[
            { label: tr(lang, 'todayRate'), value: pct(todayRate) },
            { label: tr(lang, 'weekAvg'), value: pct(weekAvg) },
            { label: tr(lang, 'monthAvg'), value: pct(monthAvg) },
            { label: tr(lang, 'streakDays'), value: lang === 'fa' ? String(streak).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]) : String(streak) },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springSoft, delay: 0.1 + i * 0.06 }}
              className="glass rounded-2xl p-3.5">
              <p className="text-[10.5px] uppercase tracking-[0.14em] opacity-50">{k.label}</p>
              <p className="text-[24px] font-semibold tabular-nums mt-1">{k.value}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: tr(lang, 'totalDone'), value: lang === 'fa' ? String(totalDone).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]) : String(totalDone), sub: tr(lang, 'last30days') },
          { label: tr(lang, 'bestDay'), value: bestDay ? relDay(bestDay.key, lang) : '—', sub: bestDay ? pct(bestDay.rate >= 0 ? bestDay.rate : null) : '' },
          { label: tr(lang, 'focusTotal'), value: mmOf(totalFocus), sub: tr(lang, 'last30days') },
          { label: tr(lang, 'habitsScore'), value: pct(habitScore), sub: tr(lang, 'last7days') },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springSoft, delay: 0.05 * i }}
            className="glass rounded-[22px] p-4">
            <p className="text-[10.5px] uppercase tracking-[0.14em] opacity-50">{k.label}</p>
            <p className="text-[22px] font-semibold tabular-nums mt-1 truncate">{k.value}</p>
            <p className="text-[11.5px] opacity-45 mt-0.5">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* 7-day completion chart */}
      <section className="glass rounded-[28px] p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.15em] opacity-65">{tr(lang, 'rateLabel')} · {tr(lang, 'last7days')}</h3>
          <span className="text-[11.5px] opacity-45">{tr(lang, 'doneVsPlanned')}</span>
        </div>
        <AnalyticsBarChart
          data={last7}
          color="color-mix(in srgb, var(--mz-accent) 62%, transparent)"
          now={now}
          lang={lang}
          renderValue={(d) => ({ fill: d.rate < 0 ? 0 : d.rate, label: d.rate < 0 ? tr(lang, 'noData') : `${d.done}/${d.planned}` })}
        />
        <div className="flex items-center gap-4 mt-3 text-[11px] opacity-55">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--mz-accent)' }} />{tr(lang, 'rateLabel')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--mz-ink)_20%,transparent)]" />{tr(lang, 'noData')}</span>
        </div>
      </section>

      {/* 30-day + habits + energy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="glass rounded-[28px] p-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.15em] opacity-65 mb-3">{tr(lang, 'last30days')}</h3>
          <div className="flex items-end gap-[3px] h-[110px]">
            {days30.map((d, i) => {
              const fill = d.rate < 0 ? 0 : d.rate;
              const isT = d.key === now;
              return (
                <motion.div key={d.key} className="flex-1 rounded-[3px] relative"
                  title={`${relDay(d.key, lang)} · ${d.rate < 0 ? tr(lang, 'noData') : `${d.done}/${d.planned}`}`}
                  style={{ background: fill === 0 && d.rate < 0 ? 'color-mix(in srgb, var(--mz-ink) 6%, transparent)' : `color-mix(in srgb, var(--mz-accent) ${18 + fill * 72}%, transparent)`, height: '100%' }}
                  initial={false}>
                  <motion.div className="absolute bottom-0 inset-x-0 rounded-[3px]"
                    style={{ background: isT ? '#9ad8cf' : `color-mix(in srgb, var(--mz-accent) ${30 + fill * 65}%, transparent)` }}
                    initial={{ height: '6%' }} animate={{ height: `${Math.max(6, fill * 94 + 6)}%` }}
                    transition={{ delay: 0.012 * i, type: 'spring', stiffness: 340, damping: 32 }} />
                </motion.div>
              );
            })}
          </div>
          <p className="text-[11px] opacity-45 mt-2">{tr(lang, 'monthAvg')}: {pct(monthAvg)} · {tr(lang, 'totalDone')}: {totalDone}</p>
        </section>

        <section className="glass rounded-[28px] p-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.15em] opacity-65 mb-3">{tr(lang, 'habitHeat')} · {tr(lang, 'last7days')}</h3>
          {habits.length === 0 ? (
            <p className="text-[13px] opacity-50 py-4">{tr(lang, 'habitsEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {habits.slice(0, 6).map((h, hi) => (
                <div key={h.id} className="flex items-center gap-2.5">
                  <span className="text-[15px] w-6 text-center shrink-0">{h.icon}</span>
                  <span className="text-[12.5px] font-medium truncate w-24 shrink-0">{h.name}</span>
                  <div className="flex gap-1 flex-1">
                    {last7.map((d, i) => {
                      const v = (h.history[d.key] ?? 0) > 0;
                      return (
                        <motion.span key={d.key} title={`${relDay(d.key, lang)} · ${h.name}`}
                          className="flex-1 h-6 rounded-md"
                          style={{
                            background: v ? `color-mix(in srgb, var(--mz-accent) ${55 + (i === 6 ? 25 : 0)}%, transparent)` : 'color-mix(in srgb, var(--mz-ink) 7%, transparent)',
                            boxShadow: v && i === 6 ? '0 2px 10px color-mix(in srgb, var(--mz-accent) 35%, transparent)' : undefined,
                          }}
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: hi * 0.05 + i * 0.03, type: 'spring', stiffness: 500, damping: 30 }} />
                      );
                    })}
                  </div>
                </div>
              ))}
              {habits.length > 6 && <p className="text-[11px] opacity-45">+{habits.length - 6}</p>}
            </div>
          )}
          {/* focus bars */}
          <div className="mt-4 pt-3 border-t border-[var(--mz-edge)]">
            <p className="text-[11px] uppercase tracking-[0.14em] opacity-45 mb-2">{tr(lang, 'focusTotal')} · 7d · {mmOf(last7.reduce((a, d) => a + d.focusSec, 0))}</p>
            <div className="flex items-end gap-1.5 h-[64px]">
              {last7.map((d, i) => (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${relDay(d.key, lang)} · ${mmOf(d.focusSec)}`}>
                  <div className="w-full rounded-md relative overflow-hidden" style={{ background: 'color-mix(in srgb, var(--mz-ink) 7%, transparent)', height: '100%' }}>
                    <motion.div className="absolute bottom-0 inset-x-0 rounded-md"
                      style={{ background: 'linear-gradient(180deg, #9ad8cf, var(--mz-accent))' }}
                      initial={{ height: '5%' }} animate={{ height: `${Math.max(5, (d.focusSec / maxFocus) * 95 + 5)}%` }}
                      transition={{ delay: 0.05 * i, type: 'spring', stiffness: 320, damping: 30 }} />
                  </div>
                  <span className="text-[8.5px] opacity-40 tabular-nums">{weekdayShort(new Date(d.key + 'T12:00:00').getDay(), lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

// ===================================================================
// Energy widget — SVG ring + glow + sparkline
// ===================================================================
function EnergyWidget() {
  const now = todayKey();
  const stats = useAppStore((s) => s.stats);
  const setDayEnergy = useAppStore((s) => s.setDayEnergy);
  const lang = useAppStore((s) => s.settings.lang);
  const dayStats = stats[now] ?? { date: now, completed: 0, focusSec: 0, energy: null };
  const energyLevels = [tr(lang, 'veryLow'), tr(lang, 'lowLabel'), tr(lang, 'normalLabel'), tr(lang, 'highLabel'), tr(lang, 'veryHigh')];
  const e = dayStats.energy; // 0..4 or null
  // Ring progress (for the dot ring: energy/4)
  const ringR = 28, c = 2 * Math.PI * ringR;
  const pctRing = e == null ? 0 : (e + 1) / 5;
  const dashRing = c * pctRing;
  // Sparkline last 7 days
  const w = 152, h = 34, pad = 6;
  const histPts: [string, number][] = [];
  for (let i = 6; i >= 0; i--) {
    const k = addDaysKey(now, -i);
    histPts.push([k, (stats[k]?.energy ?? -1) as number]);
  }
  // Filter zeros for spark but keep gaps
  const valid = histPts.map(([, v]) => v as number);
  const xStep = (w - 2 * pad) / 6;
  const yAt = (v: number) => h - pad - ((v + 0.5) / 5) * (h - 2 * pad);
  let areaD = '';
  {
    const pts: string[] = [];
    const validIdx: number[] = [];
    valid.forEach((v, i) => { if (v >= 0) validIdx.push(i); });
    validIdx.forEach((i) => pts.push(`${pad + i * xStep},${yAt(valid[i]).toFixed(1)}`));
    if (pts.length >= 2) {
      areaD = `M ${pts[0]} L ${pts.slice(1).join(' L ')} L ${pad + validIdx[validIdx.length - 1] * xStep},${h - pad} L ${pad + validIdx[0] * xStep},${h - pad} Z`;
    }
  }

  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <div className="flex items-center gap-3 flex-wrap">
        {/* ring grows to 88px on narrow viewports so the centered label can never
            overlap the stroke — SVG viewBox stays square, size is set via CSS */}
        <div className="relative shrink-0 w-[76px] h-[76px] sm:w-[88px] sm:h-[88px]">
          <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="egrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--mz-accent)" />
                <stop offset="100%" stopColor="#9ad8cf" />
              </linearGradient>
              <filter id="eglow"><feGaussianBlur stdDeviation="3" /></filter>
            </defs>
            <circle cx={44} cy={44} r={ringR} fill="none" stroke="var(--mz-edge)" strokeWidth={7} />
            {e != null && (
              <motion.circle cx={44} cy={44} r={ringR} fill="none" stroke="url(#egrad)" strokeWidth={7} strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 3px 8px color-mix(in srgb, var(--mz-accent) 35%, transparent))' }}
                initial={{ strokeDasharray: `0 ${c}` }}
                animate={{ strokeDasharray: `${dashRing} ${Math.max(0.01, c - dashRing)}` }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              />
            )}
            {/* 5 tick dots — kept outside the ring but inside the viewBox */}
            {[0, 1, 2, 3, 4].map((i) => {
              const ang = (-90 + i * 52 - 52) * (Math.PI / 180);
              const r2 = ringR + 12;
              return <circle key={i} cx={44 + r2 * Math.cos(ang)} cy={44 + r2 * Math.sin(ang)} r={i === e ? 3.5 : 2} fill={i <= (e ?? -1) ? 'var(--mz-accent)' : 'color-mix(in srgb, var(--mz-ink) 16%, transparent)'} opacity={i === e ? 1 : 0.9} />;
            })}
            {/* traveling glow dot */}
            {e != null && (
              <motion.circle r={2.8} fill="rgba(255,255,255,0.95)" style={{ filter: 'url(#eglow)' }}
                animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                transform={`translate(44 44)`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1">
            <span className="text-[9.5px] sm:text-[11px] uppercase tracking-[0.12em] opacity-45 leading-none whitespace-nowrap">{tr(lang, 'energy')}</span>
            <span className="text-[11.5px] sm:text-[13px] font-semibold leading-none mt-1 max-w-full truncate">{e == null ? '—' : energyLevels[e]}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-5 gap-1">
          {energyLevels.map((label, i) => {
            const active = e === i;
            return (
              <button key={label} type="button" aria-pressed={active} title={label} onClick={() => setDayEnergy(now, i)}
                className={cn('h-8 rounded-xl text-[10.5px] font-medium border pressable flex flex-col items-center justify-center gap-0.5',
                  active ? 'border-transparent text-white' : 'border-[var(--mz-edge)] opacity-70 hover:opacity-100')}
                style={active ? { background: 'linear-gradient(135deg, var(--mz-accent), #9ad8cf)' } : undefined}>
                <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-white' : 'bg-[color-mix(in_srgb,var(--mz-ink)_18%,transparent)]')} />
                <span className={cn('leading-none text-[9.5px]', active ? '' : 'opacity-65')}>{label.split(' ')[0].slice(0, 4)}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* sparkline */}
      <div className="rounded-xl bg-[color-mix(in_srgb,var(--mz-ink)_4%,transparent)] px-2 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-[0.14em] opacity-45">{tr(lang, 'energyTrend')} · 7d</span>
          {e != null && <span className="text-[10px] opacity-50 tabular-nums">{e + 1}/5</span>}
        </div>
        {(() => {
          const ptsValid = valid.filter((v) => v >= 0);
          if (ptsValid.length < 2) return <p className="text-[11px] opacity-40 py-1">{tr(lang, 'noData')}</p>;
          return (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full block" aria-hidden="true">
              {areaD && <path d={areaD} fill="color-mix(in srgb, var(--mz-accent) 10%, transparent)" />}
              {(() => {
                const d: string[] = [];
                let last: [number, number] | null = null;
                valid.forEach((v, i) => {
                  if (v < 0) { last = null; return; }
                  const x = pad + i * xStep, y = yAt(v);
                  if (!last) { d.push(`M ${x},${y.toFixed(1)}`); last = [x, y]; return; }
                  const mx = (last[0] + x) / 2;
                  d.push(`C ${mx.toFixed(1)},${last[1].toFixed(1)} ${mx.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`);
                  last = [x, y];
                });
                return <motion.path d={d.join(' ') || ''} fill="none" stroke="var(--mz-accent)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />;
              })()}
              {valid.map((v, i) => v < 0 ? null : (
                <motion.circle key={i} cx={pad + i * xStep} cy={yAt(v)} r={2.6} fill="var(--mz-accent)"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 + i * 0.07, type: 'spring', stiffness: 500, damping: 22 }} />
              ))}
            </svg>
          );
        })()}
      </div>
    </div>
  );
}
