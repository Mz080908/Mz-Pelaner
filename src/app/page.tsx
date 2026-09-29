'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';
import { todayKey, diffDays, headerDate } from '@/lib/dates';
import { useTabHiddenPause } from '@/lib/motion-hooks';
import {
  Sidebar, Header, TodayView, InboxView, ScheduledView, CalendarView,
  ProjectsView, HabitsView, TagsView, ArchiveView, NotesView, SettingsView, AnalyticsView,
} from '@/components/views';
import { AnalyticsBeacon } from '@/components/AnalyticsBeacon';
import { Onboarding } from '@/components/Onboarding';
import {
  TaskInspector, CommandPalette, NotificationCenter, Toast, QuickAdd,
  SearchOverlay, FocusModeOverlay,
} from '@/components/ui';
import { useEffect, useRef, useState } from 'react';

export default function Page() {
  const view = useAppStore((s) => s.view);
  const calDate = useAppStore((s) => s.calDate);
  const settings = useAppStore((s) => s.settings);
  const focusActive = useAppStore((s) => s.focusActive);
  const commandOpen = useAppStore((s) => s.commandOpen);
  const searchOpen = useAppStore((s) => s.searchOpen);
  const quickAddOpen = useAppStore((s) => s.quickAddOpen);
  const notifOpen = useAppStore((s) => s.notifOpen);
  const toast = useAppStore((s) => s.toast);
  const selectedTaskId = useAppStore((s) => s.selectedTaskId);
  const lang = settings.lang;
  const [mounted, setMounted] = useState(false);
  useTabHiddenPause();

  useEffect(() => {
    setMounted(true);
  }, []);

  // global keyboard shortcuts
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable;
      const st = useAppStore.getState();
      if (typing) {
        if (e.key === 'Escape') (el as HTMLElement).blur();
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        st.setSearchOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        st.setCommandOpen(!st.commandOpen);
        return;
      }
      if (e.key === ' ' && !st.focusActive) {
        e.preventDefault();
        st.setFocusActive(true);
        return;
      }
      if (e.key === 'Escape') {
        st.setCommandOpen(false);
        st.setSearchOpen(false);
        st.setQuickAddOpen(false);
        st.setNotifOpen(false);
        st.setFocusActive(false);
        st.setSelected(null);
        return;
      }
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        st.setQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted]);

  // click-to-schedule from the calendar day view — opens QuickAdd, which
  // picks up the preset date/time via window.__mzQuickPreset
  useEffect(() => {
    if (!mounted) return;
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ date?: string; time?: string }>).detail;
      if (!d?.date) return;
      (window as unknown as { __mzQuickPreset?: { date: string; time: string | null } }).__mzQuickPreset = { date: d.date, time: d.time ?? null };
      useAppStore.getState().setQuickAddOpen(true);
    };
    window.addEventListener('mz:quickadd', h);
    return () => window.removeEventListener('mz:quickadd', h);
  }, [mounted]);

  // reminder / overdue notification worker
  useEffect(() => {
    if (!mounted) return;
    const updateNotifs = () => {
      const st = useAppStore.getState();
      if (st.notifPaused) return;
      const now = Date.now();
      const today = todayKey();
      for (const t of st.tasks) {
        if (t.completed || t.archived) continue;
        if (t.reminderAt) {
          const when = new Date(t.reminderAt).getTime();
          if (when <= now && when > now - 120000) {
            const already = st.notifs.some((n) => n.taskId === t.id && n.kind === 'reminder');
            if (!already) {
              st.addNotif({ kind: 'reminder', title: tr(lang, 'reminderFired'), body: t.title, taskId: t.id });
              if (settings.notif && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try { new Notification(tr(lang, 'reminderFired'), { body: t.title, tag: t.id }); } catch { /* ignore */ }
              }
              st.setToast(`${tr(lang, 'reminderFired')} · ${t.title}`);
            }
          }
        }
        if (t.date && diffDays(t.date, today) < 0) {
          const already = st.notifs.some((n) => n.taskId === t.id && n.kind === 'overdue');
          if (!already) st.addNotif({ kind: 'overdue', title: tr(lang, 'overdue'), body: t.title, taskId: t.id });
        }
      }
    };
    updateNotifs();
    const id = setInterval(updateNotifs, 30000);
    return () => clearInterval(id);
  }, [mounted, lang, settings.notif]);

  // pomodoro tick — single interval keyed on running state
  const pomoRunning = useAppStore((s) => s.pomodoro.running);
  useEffect(() => {
    if (!mounted || !pomoRunning) return;
    const id = setInterval(() => useAppStore.getState().pomodoroTick(), 1000);
    return () => clearInterval(id);
  }, [mounted, pomoRunning]);

  // rAF parallax + edge-light: one handler, CSS vars, no React state per pixel
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!mounted || settings.reduceMotion) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const flush = () => {
      rafRef.current = null;
      const p = pendingRef.current;
      if (!p) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const ax = ((p.x - w / 2) / w) * 12;
      const ay = ((p.y - h / 2) / h) * 8;
      const rx = document.documentElement;
      rx.style.setProperty('--parallax-x', `${ax.toFixed(1)}px`);
      rx.style.setProperty('--parallax-y', `${ay.toFixed(1)}px`);
      // global edge-light center (cards override per-card via useCardTilt)
      const gx = (p.x / w) * 100;
      const gy = (p.y / h) * 100;
      rx.style.setProperty('--mz-mx', `${gx.toFixed(1)}%`);
      rx.style.setProperty('--mz-my', `${gy.toFixed(1)}%`);
    };
    const onMove = (e: MouseEvent) => {
      pendingRef.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(flush);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted, settings.reduceMotion]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center opacity-50 text-sm">
        <span className="glass rounded-full px-5 py-2">Mz Planer</span>
      </div>
    );
  }

  const { line1, line2 } = headerDate(calDate, lang, settings.calendar);

  return (
    <>
      {/* ambient aurora — 1–5px, very slow, paused when tab hidden */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        <motion.div data-ambient
          className="absolute rounded-full blur-[180px] gpu-accelerated"
          style={{ width: 540, height: 540, background: 'var(--mz-aurora-1)', left: 'calc(10% + var(--parallax-x, 0px))', top: 'calc(-20% + var(--parallax-y, 0px))' }}
          animate={settings.reduceMotion ? undefined : { scale: [1, 1.02, 1], opacity: [0.4, 0.55, 0.4] }}
          transition={{ duration: 16, ease: 'linear', repeat: Infinity }}
        />
        <motion.div data-ambient
          className="absolute rounded-full blur-[180px] gpu-accelerated"
          style={{ width: 480, height: 480, background: 'var(--mz-aurora-2)', right: 'calc(12% + var(--parallax-x, 0px))', bottom: 'calc(-15% + var(--parallax-y, 0px))' }}
          animate={settings.reduceMotion ? undefined : { scale: [1, 1.015, 1], opacity: [0.3, 0.45, 0.3] }}
          transition={{ duration: 20, ease: 'linear', repeat: Infinity, delay: 2 }}
        />
        <motion.div data-ambient
          className="absolute rounded-full blur-[200px] gpu-accelerated"
          style={{ width: 360, height: 360, background: 'var(--mz-aurora-3)', left: 'calc(55% + var(--parallax-x, 0px))', top: 'calc(65% + var(--parallax-y, 0px))' }}
          animate={settings.reduceMotion ? undefined : { scale: [1, 1.03, 1], opacity: [0.2, 0.32, 0.2] }}
          transition={{ duration: 24, ease: 'linear', repeat: Infinity, delay: 4 }}
        />
      </div>

      {/* main chrome — recedes as one during Focus Mode (opacity/scale only — no per-frame blur on a huge tree) */}
      <motion.div
        className={cn('flex flex-1 min-h-0', focusActive && 'pointer-events-none')}
        animate={focusActive ? { opacity: 0.1, scale: 0.988 } : { opacity: 1, scale: 1 }}
        transition={focusActive ? { duration: 0.42, ease: 'easeOut' } : { duration: 0.3, ease: 'easeOut' }}
        aria-hidden={focusActive}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 lg:ms-[260px]">
          <Header line1={line1} line2={line2} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto px-3 sm:px-5 lg:px-8 pb-6">
            <AnimatePresence mode="wait">
              <motion.div key={view}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 34, mass: 1 }}>
                {view === 'today' && <TodayView />}
                {view === 'inbox' && <InboxView />}
                {view === 'scheduled' && <ScheduledView />}
                {view === 'calendar' && <CalendarView />}
                {view === 'projects' && <ProjectsView />}
                {view === 'habits' && <HabitsView />}
                {view === 'tags' && <TagsView />}
                {view === 'archive' && <ArchiveView />}
                {view === 'notes' && <NotesView />}
                {view === 'settings' && <SettingsView />}
                {view === 'analytics' && <AnalyticsView />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <AnimatePresence>
          {selectedTaskId && <TaskInspector key={selectedTaskId} />}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>{commandOpen && <CommandPalette onClose={() => useAppStore.getState().setCommandOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{searchOpen && <SearchOverlay onClose={() => useAppStore.getState().setSearchOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{quickAddOpen && <QuickAdd onClose={() => useAppStore.getState().setQuickAddOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{notifOpen && <NotificationCenter onClose={() => useAppStore.getState().setNotifOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{focusActive && <FocusModeOverlay onExit={() => useAppStore.getState().setFocusActive(false)} />}</AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
      <Onboarding />
      <AnalyticsBeacon />
    </>
  );
}
