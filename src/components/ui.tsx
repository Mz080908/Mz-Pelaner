'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, memo, useId } from 'react';
import { cn, uid, normalizeDigits, stripNonDigits } from '@/lib/utils';
import { tr, TKey } from '@/lib/i18n';
import type { Task, Priority, ReminderKind, RepeatKind, Project } from '@/lib/types'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { todayKey, fmtTime, relDay, diffDays, gregLabel, jalaliLabel, weekdayShort } from '@/lib/dates';
import { springSoft, springSnappy, springGentle, tweenFast, tweenMed, modalSpring, cardSpring, pageSpring, microSpring, sheetVariants, backdropVariants, paletteVariants, staggerFast, focusVariants, useReducedMotionPref } from '@/lib/motion'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { useCardTilt, useMediaQuery } from '@/lib/motion-hooks';
import { useAppStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import {
  Bell, Calendar, Check, Clock, Copy, Flag, Hash, ListChecks, Plus, RefreshCw, Search,
  Trash2, X, Archive, Sparkles, CircleDot, AlertTriangle, Timer, Play, Pause, RotateCcw, Folder, Zap, Command as CommandIcon,
} from 'lucide-react';

export const PRIORITY_STYLE: Record<Priority, { dot: string; text: string; ring: string; key: TKey; hex: string }> = {
  urgent: { dot: 'bg-[#d97a72]', text: 'text-[#d97a72]', ring: 'ring-[#d97a72]/30', key: 'urgent', hex: '#d97a72' },
  high: { dot: 'bg-[#d9a05b]', text: 'text-[#d9a05b]', ring: 'ring-[#d9a05b]/30', key: 'high', hex: '#d9a05b' },
  normal: { dot: 'bg-[#6d8dff]', text: 'text-[#6d8dff]', ring: 'ring-[#6d8dff]/30', key: 'normal', hex: '#6d8dff' },
  low: { dot: 'bg-[#9aa3c7]', text: 'text-[#9aa3c7]', ring: 'ring-[#9aa3c7]/30', key: 'low', hex: '#9aa3c7' },
};

/* ------------------------------------------------------------------ */
/* ProgressRing                                                        */
/* ------------------------------------------------------------------ */
export function ProgressRing({ value, size = 148, stroke = 12, label, sub }: { value: number; size?: number; stroke?: number; label?: string; sub?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = c * clamped;
  // SSR-safe unique ids for gradient refs (multiple rings share the DOM)
  const rawId = useId();
  const gid = rawId.replace(/:/g, '');
  const reduced = useReducedMotionPref();
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={`ringGrad-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--mz-accent)" />
            <stop offset="100%" stopColor="#9ad8cf" />
          </linearGradient>
          <radialGradient id={`ringGloss-${gid}`} cx="30%" cy="22%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="60%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mz-edge)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#ringGrad-${gid})`} strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${Math.max(0.01, c - dash)}` }}
          transition={reduced ? { duration: 0.001 } : cardSpring}
          style={{ filter: 'drop-shadow(0 4px 14px rgba(109,141,255,0.35))' }}
        />
        <circle cx={size / 2} cy={size / 2} r={r - stroke / 2} fill={`url(#ringGloss-${gid})`} />
        {/* subtle moving highlight — one slow sweep, paused when tab hidden */}
        {!reduced && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.55)" strokeWidth={stroke * 0.35} strokeLinecap="round"
            strokeDasharray={`1 ${c - 1}`}
            data-ambient="true"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 14, ease: 'linear', repeat: Infinity }}
            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(clamped * 100)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={microSpring}
          className="text-3xl font-semibold tracking-tight"
        >
          {label ?? `${Math.round(clamped * 100)}%`}
        </motion.span>
        {sub && <span className="text-[11px] uppercase tracking-[0.14em] opacity-55 mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Animated check — draw, then tiny elastic settle                     */
/* ------------------------------------------------------------------ */
export function CheckMark({ size = 13 }: { size?: number }) {
  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      initial={{ scale: 0.7 }} animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 700, damping: 18, mass: 0.5 }}
    >
      <motion.path
        d="M4 12.5 L9.5 18 L20 6.5"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.6 }}
      />
    </motion.svg>
  );
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */
export function Btn({
  children, onClick, variant = 'ghost', size = 'md', className, title, type = 'button', disabled, ariaLabel,
}: {
  children: React.ReactNode; onClick?: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'glass' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg';
  className?: string; title?: string; type?: 'button' | 'submit'; disabled?: boolean; ariaLabel?: string;
}) {
  const base = 'pressable inline-flex items-center justify-center gap-2 rounded-2xl font-medium select-none disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none';
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-[15px]' }[size];
  const variants = {
    primary: 'text-white shadow-lg',
    glass: 'glass text-mzink',
    ghost: 'text-mzink/70 hover:text-mzink hover:bg-[color-mix(in_srgb,var(--mz-ink)_7%,transparent)]',
    danger: 'text-[#d97a72] hover:bg-[#d97a72]/10',
  }[variant];
  const style = variant === 'primary' ? { background: 'linear-gradient(135deg, var(--mz-accent), color-mix(in srgb, var(--mz-accent) 62%, #9ad8cf))' } : undefined;
  return (
    <motion.button
      type={type} onClick={onClick} title={title} aria-label={ariaLabel} disabled={disabled} style={style}
      whileHover={{ y: variant === 'primary' ? -1.2 : -0.4, scale: variant === 'ghost' ? 1 : 1.005 }}
      whileTap={{ y: 1, scale: 0.98 }}
      transition={microSpring}
      data-variant={variant}
      className={cn(base, sizes, variants, className)}
    >
      {children}
    </motion.button>
  );
}

export function IconBtn({ children, onClick, title, active, className, ariaLabel }: {
  children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; title?: string; active?: boolean; className?: string; ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button" onClick={onClick} title={title} aria-label={ariaLabel ?? title}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      transition={microSpring}
      className={cn('pressable h-9 w-9 shrink-0 rounded-xl inline-flex items-center justify-center text-[14px]',
        active ? 'glass text-mzink' : 'text-mzink/60 hover:text-mzink hover:bg-[color-mix(in_srgb,var(--mz-ink)_7%,transparent)]', className)}
    >
      {children}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Modal / Sheet base                                                  */
/* ------------------------------------------------------------------ */
export function Sheet({ children, onClose, wide, side = 'center', labelledBy, panelLayoutId }: {
  children: React.ReactNode; onClose: () => void; wide?: boolean;
  side?: 'center' | 'right' | 'bottom'; labelledBy?: string; panelLayoutId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    // delay to avoid instant close from the opening click
    const id = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', onDown); };
  }, [onClose]);
  const pos = side === 'right'
    ? 'items-stretch justify-end'
    : side === 'bottom'
      ? 'items-end justify-center'
      : 'items-center justify-center';
  const panelInitial = side === 'bottom'
    ? { opacity: 0, y: 48, scale: 1 }
    : { opacity: 0, y: 16, scale: 0.97 };
  const panelExit = side === 'bottom'
    ? { opacity: 0, y: 40, scale: 1, transition: { type: 'spring' as const, stiffness: 420, damping: 40 } }
    : { opacity: 0, y: 10, scale: 0.98, transition: { type: 'spring' as const, stiffness: 460, damping: 40 } };
  return (
    <motion.div
      className={cn('fixed inset-0 z-50 flex p-3 sm:p-6', pos)}
      variants={backdropVariants}
      initial="initial" animate="animate" exit="exit"
      style={{ background: 'color-mix(in srgb, var(--mz-bg) 55%, transparent)', backdropFilter: 'blur(6px)' }}
      role="dialog" aria-modal="true" aria-labelledby={labelledBy}
    >
      <motion.div
        ref={ref}
        layoutId={panelLayoutId}
        initial={panelInitial}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={panelExit}
        transition={modalSpring}
        className={cn('glass-strong rounded-3xl w-full overflow-hidden flex flex-col max-h-[86vh]',
          wide ? 'max-w-2xl' : 'max-w-lg',
          side === 'right' && 'h-full max-h-none sm:max-w-md',
          side === 'bottom' && 'max-w-2xl sm:rounded-b-none')}
      >
        {/* content appears just after the container begins expanding */}
        <motion.div
          className="flex flex-col min-h-0 flex-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.18 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function SheetHeader({ title, onClose, right }: { title: string; onClose?: () => void; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--mz-edge)] shrink-0">
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      <div className="flex items-center gap-1">
        {right}
        {onClose && <IconBtn onClick={onClose} title="Close"><X size={16} /></IconBtn>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog                                                      */
/* ------------------------------------------------------------------ */
export function ConfirmDialog({ title, body, onConfirm, onCancel }: {
  title: string; body?: string; onConfirm: () => void; onCancel: () => void;
}) {
  const lang = useAppStore((s) => s.settings.lang);
  return (
    <Sheet onClose={onCancel}>
      <div className="p-6 flex flex-col gap-2">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {body && <p className="text-sm opacity-70 leading-relaxed">{body}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Btn onClick={onCancel}>{tr(lang, 'cancel')}</Btn>
          <Btn variant="danger" onClick={onConfirm}>{tr(lang, 'confirm')}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */
export function EmptyState({ title, sub, icon, action }: { title: string; sub?: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springSoft, delay: 0.05 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3"
    >
      <motion.div
        className="w-16 h-16 rounded-3xl glass flex items-center justify-center text-mzink/50"
        animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon ?? <Sparkles size={24} />}
      </motion.div>
      <p className="text-lg font-medium tracking-tight">{title}</p>
      {sub && <p className="text-sm opacity-60 max-w-xs leading-relaxed">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Tag chip                                                            */
/* ------------------------------------------------------------------ */
export function TagChip({ name, color, onClick, onRemove, small }: {
  name: string; color?: string; onClick?: () => void; onRemove?: () => void; small?: boolean;
}) {
  const c = color ?? 'var(--mz-accent)';
  return (
    <span
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 rounded-full border font-medium',
        small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
        onClick && 'cursor-pointer pressable')}
      style={{
        color: c,
        background: `color-mix(in srgb, ${c} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${c} 32%, transparent)`,
      }}
    >
      <Hash size={small ? 9 : 10} />
      {name}
      {onRemove && (
        <button type="button" aria-label={`remove ${name}`} onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-60 hover:opacity-100 -ms-0.5">
          <X size={11} />
        </button>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* TaskCard                                                            */
/* ------------------------------------------------------------------ */
export const TaskCard = memo(function TaskCard({
  task, onSelect, showDate, dragging, compact,
}: {
  task: Task; onSelect?: (id: string) => void; showDate?: boolean; dragging?: boolean; compact?: boolean;
}) {
  const { settings, selectedTaskId, projects, tags, toggleTask, setSelected, setFocusTask, focusTaskId, lang } = useAppStore(useShallow((s) => ({
    settings: s.settings, selectedTaskId: s.selectedTaskId, projects: s.projects,
    tags: s.tags, toggleTask: s.toggleTask, setSelected: s.setSelected, setFocusTask: s.setFocusTask,
    focusTaskId: s.focusTaskId, lang: s.settings.lang,
  })));

  const selected = selectedTaskId === task.id;
  /** Rank among active focus tasks (1-based) — null when this task isn't a focus task. */
  const focusRank = useAppStore((s) => {
    if (!task.focus || task.completed) return null;
    const i = s.tasks.findIndex((t) => t.id === task.id && t.focus && !t.completed);
    return i >= 0 ? i + 1 : null;
  });
  const currentFocus = focusTaskId === task.id;
  const project = projects.find((p) => p.id === task.projectId);
  const overdue = !task.completed && task.date && diffDays(task.date, todayKey()) < 0;
  const subDone = task.subtasks.filter((s) => s.done).length;
  const now = todayKey();
  // pointer-tracked tilt + edge light: motion values, zero React re-renders
  const { attachTilt, rx: tiltX, ry: tiltY } = useCardTilt(!dragging);

  return (
    <motion.div
      layout
      ref={attachTilt}
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: task.completed ? 0.62 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { type: 'spring', stiffness: 520, damping: 40 } }}
      transition={cardSpring}
      whileHover={{ y: -2, transition: cardSpring }}
      // MotionValue-driven subtle tilt: no React state per pixel
      style={{ rotateX: tiltX, rotateY: tiltY }}
      whileTap={{ y: 1, scale: 0.995 }}
      whileDrag={{ scale: 1.03, opacity: 1, transition: microSpring }}
      drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12} dragSnapToOrigin
      onClick={() => onSelect ? onSelect(task.id) : setSelected(task.id)}
      onContextMenu={(e) => { e.preventDefault(); setFocusTask(task.id); }}
      data-task-id={task.id}
      className={cn(
        'task-card glass rounded-2xl px-4 py-3 flex items-start gap-3 cursor-pointer group relative',
        selected && 'ring-2 ring-[var(--mz-accent)]/50',
        !selected && currentFocus && 'ring-1 ring-[var(--mz-accent)]/40',
        dragging && 'opacity-60 rotate-1 scale-[1.02]',
        compact && 'py-2.5',
      )}
      role="listitem"
      aria-label={task.title}
    >
      {/* checkbox — circle expands • fill appears • check draws • elastic settle */}
      <motion.button
        type="button"
        aria-label={task.completed ? `${task.title} — mark open` : `${task.title} — complete`}
        aria-pressed={task.completed}
        onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
        whileTap={{ scale: 0.8 }}
        transition={microSpring}
        className={cn('relative mt-0.5 shrink-0 rounded-full border-2 w-[21px] h-[21px] flex items-center justify-center',
          task.completed ? 'border-transparent text-white' : 'border-[color-mix(in_srgb,var(--mz-ink)_35%,transparent)] hover:border-[var(--mz-accent)]')}
      >
        <AnimatePresence>
          {task.completed && (
            <motion.span
              key="fill"
              className="absolute rounded-full"
              style={{ inset: -2, background: 'linear-gradient(135deg, var(--mz-accent), #9ad8cf)' }}
              initial={{ scale: 0.4, opacity: 0.4 }}
              animate={{ scale: [0.4, 1], opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 640, damping: 19, mass: 0.55 }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {task.completed && (
            <motion.span key="check" className="relative z-10 leading-none">
              <CheckMark size={12} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[14.5px] leading-snug font-medium tracking-tight transition-all', task.completed && 'line-through opacity-55')}>
            {task.title}
          </span>
          {task.focus && focusRank && <span className="text-[10px] uppercase tracking-[0.12em] rounded-full px-1.5 py-px" style={{ background: 'color-mix(in srgb, var(--mz-accent) 18%, transparent)', color: 'var(--mz-accent)' }}>#{String(focusRank).padStart(2, '0')}</span>}
        </div>
        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-[12px] opacity-75">
          {task.time && (
            <span className="inline-flex items-center gap-1"><Clock size={11} />{fmtTime(task.time, settings.hour12, lang)}</span>
          )}
          {showDate && task.date && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-[#d97a72] opacity-100')}>
              <Calendar size={11} />
              {overdue ? `${tr(lang, 'overdue')} · ${relDay(task.date, lang, now)}` : relDay(task.date, lang, now)}
            </span>
          )}
          {project && (
            <span className="inline-flex items-center gap-1" style={{ color: project.color }}>
              <Folder size={11} />{project.name}
            </span>
          )}
          {task.reminder !== 'none' && <Bell size={11} className="opacity-80" aria-label={tr(lang, 'reminder')} />}
          {task.repeat !== 'none' && <RefreshCw size={11} className="opacity-80" aria-label={tr(lang, 'repeat')} />}
          {task.subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1"><ListChecks size={11} />{subDone}/{task.subtasks.length}</span>
          )}
          {task.subtasks.length > 0 && (
            <span className="w-10 h-1 rounded-full bg-[color-mix(in srgb,var(--mz-ink)_10%,transparent)] overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${(subDone / task.subtasks.length) * 100}%`, background: 'var(--mz-accent)' }} />
            </span>
          )}
          {task.tags.map((tn) => {
            const tag = tags.find((t) => t.name === tn);
            return <TagChip key={tn} name={tn} color={tag?.color} small />;
          })}
        </div>
      </div>

      {/* priority flag */}
      <div className={cn('shrink-0 mt-1 flex items-center gap-1.5', task.priority === 'normal' && 'opacity-45')}>
        <span className={cn('w-[7px] h-[7px] rounded-full', PRIORITY_STYLE[task.priority].dot)} aria-label={tr(lang, PRIORITY_STYLE[task.priority].key)} />
        {task.priority !== 'low' && task.priority !== 'normal' && (
          <span className={cn('text-[11px] font-medium', PRIORITY_STYLE[task.priority].text)}>{tr(lang, PRIORITY_STYLE[task.priority].key)}</span>
        )}
      </div>
    </motion.div>
  );
});

/* ------------------------------------------------------------------ */
/* Pomodoro                                                            */
/* ------------------------------------------------------------------ */
export function Pomodoro({ compact }: { compact?: boolean }) {
  const { pomodoro, pomodoroSet, settings, lang, notif, updateSettings } = useAppStore(useShallow((s) => ({
    pomodoro: s.pomodoro, pomodoroSet: s.pomodoroSet, settings: s.settings, lang: s.settings.lang,
    notif: s.settings.notif, updateSettings: s.updateSettings,
  })));

  const total = pomodoro.mode === 'focus' ? settings.pomoFocus * 60 : pomodoro.mode === 'short' ? settings.pomoShort * 60 : settings.pomoLong * 60;
  const ratio = total > 0 ? pomodoro.left / total : 0;
  const mm = Math.floor(pomodoro.left / 60);
  const ss = pomodoro.left % 60;
  const modeLabel = { focus: tr(lang, 'focus'), short: tr(lang, 'shortBreak'), long: tr(lang, 'longBreak') }[pomodoro.mode];
  const [customMin, setCustomMin] = useState<string>('');

  /** Apply a custom duration to the active mode — presets stay, user's value wins. */
  const applyCustom = (raw: string) => {
    const n = Math.max(1, Math.min(180, Number(raw) || 0));
    if (!n) return;
    const key = pomodoro.mode === 'focus' ? 'pomoFocus' : pomodoro.mode === 'short' ? 'pomoShort' : 'pomoLong';
    updateSettings({ [key]: n });
    pomodoroSet({ running: false, left: n * 60 });
    setCustomMin('');
    useAppStore.getState().setToast(`${modeLabel}: ${n} ${tr(lang, 'pomoCustom')}`);
  };

  const requestNotif = async () => {
    if (!('Notification' in window)) return;
    try {
      const res = await Notification.requestPermission();
      if (res === 'granted') useAppStore.getState().setToast(tr(lang, 'notifOn'));
      else useAppStore.getState().setToast(tr(lang, 'notifDenied'));
    } catch { useAppStore.getState().setToast(tr(lang, 'notifDenied')); }
  };

  return (
    <div className={cn('glass rounded-3xl p-5 flex flex-col gap-4', compact && 'p-4')}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.16em] opacity-55">{modeLabel}</span>
        <Timer size={14} className="opacity-55" />
      </div>
      <div className="flex items-center justify-center">
        <ProgressRing value={ratio} size={compact ? 120 : 148} stroke={10}
          label={`${mm}:${String(ss).padStart(2, '0')}`} sub={modeLabel} />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Btn variant="glass" size="sm" onClick={() => pomodoroSet({ running: !pomodoro.running })}>
          {pomodoro.running ? <><Pause size={14} /> {tr(lang, 'pause')}</> : <><Play size={14} /> {tr(lang, 'start')}</>}
        </Btn>
        <Btn variant="ghost" size="sm" onClick={() => pomodoroSet({ running: false, left: total })}>
          <RotateCcw size={14} /> {tr(lang, 'reset')}
        </Btn>
      </div>
      <div className="flex items-center justify-between text-[12px] opacity-70">
        {(['focus', 'short', 'long'] as const).map((m) => (
          <button key={m} type="button" onClick={() => pomodoroSet({ mode: m, running: false, left: (m === 'focus' ? settings.pomoFocus : m === 'short' ? settings.pomoShort : settings.pomoLong) * 60 })}
            className={cn('pressable px-2.5 py-1 rounded-full', pomodoro.mode === m && 'glass text-mzink opacity-100')}>
            {{ focus: tr(lang, 'focus'), short: tr(lang, 'shortBreak'), long: tr(lang, 'longBreak') }[m]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric" pattern="[0-9]*" aria-label={tr(lang, 'pomoCustom')}
          value={customMin} onChange={(e) => { const v = stripNonDigits(normalizeDigits(e.target.value)).slice(0, 3); setCustomMin(v); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCustom(customMin); } }}
          placeholder={tr(lang, 'pomoCustomPlaceholder')}
          className="flex-1 min-w-0 glass rounded-xl h-9 px-3 bg-transparent outline-none text-[13.5px] tabular-nums placeholder:opacity-45"
        />
        <Btn size="sm" variant="glass" onClick={() => applyCustom(customMin)} disabled={!customMin || Number(customMin) < 1 || Number(customMin) > 180}>
          {tr(lang, 'apply')}
        </Btn>
      </div>
      <p className="text-[11px] opacity-45 -mt-1">{tr(lang, 'pomoCustom')} · {modeLabel}</p>
      {('Notification' in window) && Notification.permission !== 'granted' && (
        <Btn size="sm" variant="glass" onClick={requestNotif}><Bell size={13} /> {tr(lang, 'notifAsk')}</Btn>
      )}
      {notif && 'Notification' in window && Notification.permission === 'denied' && (
        <p className="text-[11.5px] leading-relaxed opacity-70 flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{tr(lang, 'notifDenied')}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */
export function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={modalSpring}
      className="glass-strong fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] rounded-full px-5 py-2.5 flex items-center gap-2 text-sm shadow-2xl"
      role="status" aria-live="polite"
    >
      {/* breathing status dot */}
      <motion.span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--mz-accent)' }}
        animate={{ opacity: [1, 0.45, 1], scale: [1, 0.82, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {message}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* QuickAdd (N) — smart parse preview                                  */
/* ------------------------------------------------------------------ */
export function QuickAdd({ onClose }: { onClose: () => void }) {
  const { settings, createTask, tags, projects } = useAppStore(useShallow((s) => ({ settings: s.settings, createTask: s.createTask, tags: s.tags, projects: s.projects })));
  const lang = settings.lang;
  const [value, setValue] = useState('');
  const [extra, setExtra] = useState<{ date: string | null; time: string | null; priority: Priority; projectId: string | null }>({ date: null, time: null, priority: settings.defaultPriority, projectId: null });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const parsed = useMemo(() => {
    if (!value.trim()) return null;
    try { return parseQuickAddLive(value); } catch { return null; }
  }, [value]);

  const submit = () => {
    if (!value.trim()) return;
    const task = createTask(value.trim());
    if (extra.date !== null || extra.time !== null || extra.projectId) {
      useAppStore.getState().updateTask(task.id, {
        date: extra.date ?? task.date,
        time: extra.time ?? task.time,
        priority: extra.priority,
        projectId: extra.projectId,
      });
    }
    onClose();
  };

  return (
    <Sheet onClose={onClose} labelledBy="quickadd-title">
      <div className="p-5 flex flex-col gap-4" id="quickadd-title">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl glass flex items-center justify-center shrink-0"><Plus size={16} /></div>
          <input
            ref={inputRef} data-quick-add value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder={lang === 'fa' ? 'فردا ساعت ۶ جلسه با علی #کار مهم' : 'Meeting with Ali tomorrow at 6pm #work high'}
            className="flex-1 bg-transparent outline-none text-[16px] placeholder:opacity-45"
            aria-label={tr(lang, 'newTask')}
          />
        </div>

        {parsed && (
          <motion.div
            layout
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={modalSpring}
            className="glass rounded-2xl p-4 flex flex-wrap gap-2 text-[12.5px] items-center">
            <span className="opacity-55 w-full mb-0.5">{tr(lang, 'newTask')}</span>
            <motion.span layout className="font-medium">{parsed.title}</motion.span>
            <AnimatePresence mode="popLayout">
              {parsed.date && (
                <motion.span key={`d-${parsed.date}`} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={microSpring}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: 'color-mix(in srgb, var(--mz-accent) 15%, transparent)', color: 'var(--mz-accent)' }}><Calendar size={11} />{relDay(parsed.date, lang)}</motion.span>
              )}
              {parsed.time && (
                <motion.span key={`t-${parsed.time}`} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={microSpring}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-white/10"><Clock size={11} />{fmtTime(parsed.time, settings.hour12, lang)}</motion.span>
              )}
              {parsed.priority && (
                <motion.span key={`p-${parsed.priority}`} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={microSpring}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: 'color-mix(in srgb, currentColor 12%, transparent)' }}><Flag size={11} className={PRIORITY_STYLE[parsed.priority].text} /><span className={PRIORITY_STYLE[parsed.priority].text}>{tr(lang, PRIORITY_STYLE[parsed.priority].key)}</span></motion.span>
              )}
              {parsed.tags.map((t) => (
                <motion.span key={`tag-${t}`} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={microSpring}>
                  <TagChip name={t} color={tags.find((x) => x.name === t)?.color} small />
                </motion.span>
              ))}
              {parsed.repeat !== 'none' && (
                <motion.span key={`r-${parsed.repeat}`} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={microSpring}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-white/10"><RefreshCw size={11} />{{ none: '', daily: tr(lang, 'everyDay'), weekdays: tr(lang, 'everyWeekday'), weekly: tr(lang, 'everyWeek'), monthly: tr(lang, 'everyMonth'), custom: tr(lang, 'customDays') }[parsed.repeat]}</motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <label className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-[13px] cursor-pointer pressable">
            <Calendar size={13} className="opacity-60" />
            <input type="date" value={extra.date ?? ''} onChange={(e) => setExtra((x) => ({ ...x, date: e.target.value || null }))}
              className="bg-transparent outline-none w-[120px] text-[12.5px]" aria-label={tr(lang, 'dueDate')} />
          </label>
          <label className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-[13px] cursor-pointer pressable">
            <Clock size={13} className="opacity-60" />
            <input type="time" value={extra.time ?? ''} onChange={(e) => setExtra((x) => ({ ...x, time: e.target.value || null }))}
              className="bg-transparent outline-none w-[86px] text-[12.5px]" aria-label={tr(lang, 'dueTime')} />
          </label>
          <select value={extra.priority} onChange={(e) => setExtra((x) => ({ ...x, priority: e.target.value as Priority }))}
            className="glass rounded-xl px-3 py-2 text-[13px] bg-transparent outline-none cursor-pointer" aria-label={tr(lang, 'priority')}>
            {(['urgent', 'high', 'normal', 'low'] as const).map((p) => <option key={p} value={p} className="bg-[var(--mz-bg)] text-mzink">{tr(lang, PRIORITY_STYLE[p].key)}</option>)}
          </select>
          <select value={extra.projectId ?? ''} onChange={(e) => setExtra((x) => ({ ...x, projectId: e.target.value || null }))}
            className="glass rounded-xl px-3 py-2 text-[13px] bg-transparent outline-none cursor-pointer" aria-label={tr(lang, 'project')}>
            <option value="" className="bg-[var(--mz-bg)] text-mzink">{tr(lang, 'noProject')}</option>
            {projects.map((p) => <option key={p.id} value={p.id} className="bg-[var(--mz-bg)] text-mzink">{p.name}</option>)}
          </select>
          <div className="flex-1" />
          <Btn variant="ghost" size="sm" onClick={onClose}>{tr(lang, 'cancel')}</Btn>
          <Btn variant="primary" size="sm" onClick={submit}>{tr(lang, 'newTask')}</Btn>
        </div>
      </div>
    </Sheet>
  );
}

// local import kept at bottom to avoid circular init issues in some bundlers
import { parseQuickAdd as parseQuickAddLive } from '@/lib/parser';

/* ------------------------------------------------------------------ */
/* Search (/)                                                          */
/* ------------------------------------------------------------------ */
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const {
    tasks, projects, tags, notes, habits, setSelected, setView, lang,
  } = useAppStore(useShallow((s) => ({
    tasks: s.tasks, projects: s.projects, tags: s.tags, notes: s.notes, habits: s.habits,
    setSelected: s.setSelected, setView: s.setView, lang: s.settings.lang,
  })));
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const out: { id: string; label: string; sub?: string; kind: string; run: () => void }[] = [];
    for (const t of tasks) if (t.title.toLowerCase().includes(query)) out.push({ id: t.id, label: t.title, sub: t.date ? relDay(t.date, lang) : tr(lang, 'inbox'), kind: tr(lang, 'tasks'), run: () => { setSelected(t.id); onClose(); } });
    for (const p of projects) if (p.name.toLowerCase().includes(query)) out.push({ id: p.id, label: p.name, sub: tr(lang, 'projects'), kind: tr(lang, 'projects'), run: () => { setView('projects' as never); onClose(); } });
    for (const n of notes) if (n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query)) out.push({ id: n.id, label: n.title, sub: tr(lang, 'notes'), kind: tr(lang, 'notes'), run: () => { setView('notes' as never); onClose(); } });
    for (const h of habits) if (h.name.toLowerCase().includes(query)) out.push({ id: h.id, label: h.name, sub: tr(lang, 'habits'), kind: tr(lang, 'habits'), run: () => { setView('habits' as never); onClose(); } });
    for (const t of tags) if (t.name.toLowerCase().includes(query)) out.push({ id: t.id, label: `#${t.name}`, sub: tr(lang, 'tags'), kind: tr(lang, 'tags'), run: () => { setView('tags' as never); onClose(); } });
    return out.slice(0, 12);
  }, [q, tasks, projects, notes, habits, tags, lang, setSelected, setView, onClose]);

  return (
    <Sheet onClose={onClose} labelledBy="search-title" panelLayoutId="mz-search-pill">
      <div className="p-5 flex flex-col gap-3" id="search-title">
        <div className="flex items-center gap-3">
          <Search size={16} className="opacity-55" />
          <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter' && results[idx]) { e.preventDefault(); results[idx].run(); }
            }}
            placeholder={tr(lang, 'searchPh')}
            className="flex-1 bg-transparent outline-none text-[16px] placeholder:opacity-45"
            aria-label={tr(lang, 'search')} />
        </div>
        <div className="max-h-[46vh] overflow-auto -mx-1 px-1">
          {q && results.length === 0 && <p className="text-sm opacity-60 py-4 text-center">{tr(lang, 'searchNo', { q })}</p>}
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: staggerFast } } }}>
          {results.map((r, i) => (
            <motion.button key={r.kind + r.id} type="button" onClick={r.run} onMouseEnter={() => setIdx(i)}
              variants={{ hidden: { opacity: 0, y: 5 }, show: { opacity: 1, y: 0, transition: microSpring } }}
              className={cn('relative w-full text-start rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 pressable', i === idx ? '' : 'hover:bg-white/5')}>
              {i === idx && (
                <motion.span layoutId="mz-search-sel" className="absolute inset-0 rounded-xl glass"
                  transition={microSpring} aria-hidden="true" />
              )}
              <span className="relative text-sm font-medium truncate">{r.label}</span>
              <span className="relative text-[11px] opacity-55 shrink-0">{r.sub}</span>
            </motion.button>
          ))}
          </motion.div>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Command palette (⌘K)                                                */
/* ------------------------------------------------------------------ */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const store = useAppStore((s) => s);
  const lang = store.settings.lang;
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const actions = useMemo(() => {
    const list: { id: string; label: string; hint?: string; run: () => void }[] = [
      { id: 'new', label: tr(lang, 'createTask'), hint: tr(lang, 'nKey'), run: () => { onClose(); setTimeout(() => document.querySelector('[data-quick-add]')?.dispatchEvent(new Event('focus')), 60); store.setSearchOpen(true); store.setCommandOpen(false); } },
      { id: 'today', label: tr(lang, 'goToToday'), hint: tr(lang, 'tKey'), run: () => { store.setView('today'); store.setCalDate(todayKey()); onClose(); } },
      { id: 'cal', label: tr(lang, 'openCalendar'), run: () => { store.setView('calendar'); onClose(); } },
      { id: 'inbox', label: tr(lang, 'openInbox'), run: () => { store.setView('inbox'); onClose(); } },
      { id: 'theme', label: tr(lang, 'toggleTheme'), run: () => { store.updateSettings({ theme: store.settings.theme === 'dark' ? 'light' : 'dark' }); onClose(); } },
      { id: 'lang', label: tr(lang, 'toggleLang'), run: () => { store.toggleLang(); onClose(); } },
      { id: 'settings', label: tr(lang, 'openSettings'), hint: tr(lang, 'cmdComma'), run: () => { store.setView('settings'); onClose(); } },
      { id: 'focus', label: tr(lang, 'focusMode'), hint: tr(lang, 'space'), run: () => { store.setFocusActive(true); onClose(); } },
      { id: 'habits', label: tr(lang, 'habits'), run: () => { store.setView('habits'); onClose(); } },
      { id: 'projects', label: tr(lang, 'projects'), run: () => { store.setView('projects'); onClose(); } },
      { id: 'archive', label: tr(lang, 'archive'), run: () => { store.setView('archive'); onClose(); } },
      { id: 'notes', label: tr(lang, 'notes'), run: () => { store.setView('notes'); onClose(); } },
      { id: 'review', label: tr(lang, 'startReview'), run: () => { store.setView('today'); onClose(); window.dispatchEvent(new CustomEvent('mz:review')); } },
    ];
    return list.filter((a) => a.label.toLowerCase().includes(q.trim().toLowerCase()));
  }, [q, lang]);

  return (
    <Sheet onClose={onClose} labelledBy="cmd-title">
      <div className="p-5 flex flex-col gap-3" id="cmd-title">
        <div className="flex items-center gap-3">
          <CommandIcon size={16} className="opacity-55" />
          <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(actions.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter' && actions[idx]) { e.preventDefault(); actions[idx].run(); }
            }}
            placeholder={tr(lang, 'cmdPalette')} className="flex-1 bg-transparent outline-none text-[16px] placeholder:opacity-45"
            aria-label={tr(lang, 'cmdPalette')} />
          <kbd className="text-[10px] opacity-50 border border-[var(--mz-edge)] rounded-md px-1.5 py-0.5">{tr(lang, 'esc')}</kbd>
        </div>
        <div className="max-h-[52vh] overflow-auto -mx-1 px-1">
          <p className="text-[11px] uppercase tracking-[0.14em] opacity-45 px-3 pb-1.5">{tr(lang, 'actions')}</p>
          {actions.map((a, i) => (
            <button key={a.id} type="button" onClick={a.run} onMouseEnter={() => setIdx(i)}
              className={cn('relative w-full text-start rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 pressable', i === idx ? '' : 'hover:bg-white/5')}>
              {/* only the selection indicator moves — list never re-animates */}
              {i === idx && (
                <motion.span layoutId="mz-cmd-sel" className="absolute inset-0 rounded-xl glass"
                  transition={microSpring} aria-hidden="true" />
              )}
              <span className="relative text-sm font-medium">{a.label}</span>
              {a.hint && <kbd className="relative text-[10px] opacity-55 border border-[var(--mz-edge)] rounded-md px-1.5 py-0.5">{a.hint}</kbd>}
            </button>
          ))}
          {actions.length === 0 && <p className="text-sm opacity-60 py-4 text-center">{tr(lang, 'noResults')}</p>}
        </div>
        <p className="text-[11px] opacity-45 border-t border-[var(--mz-edge)] pt-2.5">{tr(lang, 'hints')}</p>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Notification center                                                 */
/* ------------------------------------------------------------------ */
export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const { notifs, lang, markAllRead, dismissNotif, setSelected } = useAppStore(useShallow((s) => ({ notifs: s.notifs, lang: s.settings.lang, markAllRead: s.markAllRead, dismissNotif: s.dismissNotif, setSelected: s.setSelected })));
  const iconFor = (kind: string) => kind === 'reminder' ? <Bell size={14} /> : kind === 'overdue' ? <AlertTriangle size={14} /> : kind === 'milestone' ? <Sparkles size={14} /> : <CircleDot size={14} />;
  const colorFor = (kind: string) => kind === 'overdue' ? '#d97a72' : kind === 'milestone' ? '#9ad8cf' : 'var(--mz-accent)';
  return (
    <Sheet onClose={onClose} side="right" labelledBy="notif-title">
      <SheetHeader title={tr(lang, 'notifCenter')} onClose={onClose}
        right={<button type="button" onClick={markAllRead} className="text-[12px] opacity-60 hover:opacity-100 pressable px-2">{tr(lang, 'markAllRead')}</button>} />
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-2.5">
        {notifs.length === 0 && <EmptyState title={tr(lang, 'noNotifs')} icon={<Bell size={22} />} />}
        <AnimatePresence initial={false}>
          {notifs.map((n) => (
            <motion.div key={n.id} layout
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24, height: 0 }}
              transition={springSoft}
              className="glass rounded-2xl p-3.5 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${colorFor(n.kind)} 16%, transparent)`, color: colorFor(n.kind) }}>
                {iconFor(n.kind)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-medium leading-snug">{n.title}</p>
                <p className="text-[12.5px] opacity-70 leading-snug truncate">{n.body}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {n.taskId && <button type="button" className="text-[11px] opacity-55 hover:opacity-100" onClick={() => { setSelected(n.taskId!); onClose(); }}>{tr(lang, 'details')}</button>}
                <button type="button" aria-label="dismiss" className="opacity-40 hover:opacity-90" onClick={() => dismissNotif(n.id)}><X size={13} /></button>
              </div>
              {!n.read && <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: colorFor(n.kind) }} />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Focus mode overlay                                                  */
/* ------------------------------------------------------------------ */
export function FocusModeOverlay({ onExit }: { onExit: () => void }) {
  const { focusTaskId, tasks, lang, settings, toggleTask, pomodoro, pomodoroSet, updateSettings } = useAppStore(useShallow((s) => ({
    focusTaskId: s.focusTaskId, tasks: s.tasks, lang: s.settings.lang, settings: s.settings,
    toggleTask: s.toggleTask, pomodoro: s.pomodoro, pomodoroSet: s.pomodoroSet, updateSettings: s.updateSettings,
  })));

  const focusTasks = tasks.filter((t) => t.focus && !t.completed);
  const task = tasks.find((t) => t.id === focusTaskId) ?? focusTasks[0] ?? tasks.find((t) => !t.completed && t.date === todayKey()) ?? null;
  const total = (pomodoro.mode === 'focus' ? settings.pomoFocus : pomodoro.mode === 'short' ? settings.pomoShort : settings.pomoLong) * 60;
  const mm = Math.floor(pomodoro.left / 60);
  const ss = pomodoro.left % 60;
  const modeKey = pomodoro.mode === 'focus' ? 'pomoFocus' : pomodoro.mode === 'short' ? 'pomoShort' : 'pomoLong';

  /** Change the active mode's duration without leaving focus mode. */
  const setDuration = (mins: number) => {
    updateSettings({ [modeKey]: mins });
    pomodoroSet({ running: false, left: mins * 60 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); onExit(); }
      if (e.key === 'Enter' && task) { e.preventDefault(); toggleTask(task.id); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onExit, task]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tweenMed}
      className="fixed inset-0 z-[70] flex items-center justify-center p-6"
      style={{ background: 'color-mix(in srgb, var(--mz-bg) 82%, black)', backdropFilter: 'blur(22px)' }}
      role="dialog" aria-modal="true" aria-label={tr(lang, 'focusMode')}
    >
      <motion.div
        className="absolute w-[520px] h-[520px] rounded-full blur-[140px] pointer-events-none gpu-accelerated"
        style={{ background: 'var(--mz-aurora-1)' }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={springGentle}
        className="relative w-full max-w-xl flex flex-col items-center text-center gap-7"
        layout>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="text-[11px] uppercase tracking-[0.3em] opacity-55">{tr(lang, 'focusMode')}</motion.span>
        {task ? (
          <motion.div className="contents" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: springGentle } }}
              className="text-3xl md:text-[40px] font-semibold tracking-tight leading-tight">{task.title}</motion.h1>
            <motion.div
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              className="flex items-center gap-3 text-sm opacity-70">
              {task.time && <span className="inline-flex items-center gap-1.5"><Clock size={14} />{fmtTime(task.time, settings.hour12, lang)}</span>}
              {task.date && <span className="inline-flex items-center gap-1.5"><Calendar size={14} />{relDay(task.date, lang)}</span>}
            </motion.div>
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.94 }, show: { opacity: 1, scale: 1, transition: modalSpring } }}>
              <ProgressRing value={total ? pomodoro.left / total : 0} size={210} stroke={12}
                label={`${mm}:${String(ss).padStart(2, '0')}`} sub={{ focus: tr(lang, 'focus'), short: tr(lang, 'shortBreak'), long: tr(lang, 'longBreak') }[pomodoro.mode]} />
            </motion.div>
            {!pomodoro.running && (
              <motion.div
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: springSoft } }}
                className="flex items-center gap-2 flex-wrap justify-center text-[12px] opacity-70"
              >
                <span className="text-[11px] uppercase tracking-[0.16em] opacity-55">{tr(lang, 'pomoDurations')}</span>
                {([15, 20, 25, 30, 45, 50, 60] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    className={cn('pressable px-2.5 py-1 rounded-full text-[12px]',
                      settings[modeKey as keyof typeof settings] === m ? 'glass text-mzink opacity-100' : 'opacity-55 hover:opacity-90')
                    }
                  >
                    {m}′
                  </button>
                ))}
              </motion.div>
            )}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: springSoft } }}
              className="flex items-center gap-2.5 flex-wrap justify-center">
              <Btn variant="primary" onClick={() => pomodoroSet({ running: !pomodoro.running })}>
                {pomodoro.running ? <><Pause size={15} /> {tr(lang, 'pause')}</> : <><Play size={15} /> {tr(lang, 'start')}</>}
              </Btn>
              <Btn variant="glass" onClick={() => pomodoroSet({ running: false, left: total })}><RotateCcw size={15} /> {tr(lang, 'reset')}</Btn>
              <Btn variant="glass" onClick={() => toggleTask(task.id)}><Check size={15} /> {tr(lang, 'done')}</Btn>
            </motion.div>
          </motion.div>
        ) : (
          <p className="text-lg opacity-70">{tr(lang, 'todayEmpty')}</p>
        )}
        <button type="button" onClick={onExit}
          className="text-[12.5px] opacity-55 hover:opacity-90 pressable rounded-full px-4 py-2 glass mt-2">
          {tr(lang, 'exitFocus')}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* TaskInspector — right side sheet (desktop) / bottom sheet (mobile)  */
/* ------------------------------------------------------------------ */
export function TaskInspector() {
  const selectedId = useAppStore((s) => s.selectedTaskId);
  const task = useAppStore((s) => (s.selectedTaskId ? s.tasks.find((t) => t.id === s.selectedTaskId) : undefined)) ?? null;
  const projects = useAppStore((s) => s.projects);
  const tags = useAppStore((s) => s.tags);
  const settings = useAppStore((s) => s.settings);
  const lang = settings.lang;
  const updateTask = useAppStore((s) => s.updateTask);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const duplicateTask = useAppStore((s) => s.duplicateTask);
  const upsertTag = useAppStore((s) => s.upsertTag);
  const setToast = useAppStore((s) => s.setToast);
  const [confirmDel, setConfirmDel] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [tagInput, setTagInput] = useState('');
  // hooks must run unconditionally — before any early return
  const isMobileSheet = useMediaQuery('(max-width: 639px)');
  const reduced = useReducedMotionPref();

  if (!task || !selectedId) return null;
  const t = task;

  const patch = (p: Partial<Task>) => updateTask(t.id, p);

  const addSubtask = () => {
    const v = newSub.trim();
    if (!v) return;
    patch({ subtasks: [...t.subtasks, { id: uid('sub'), title: v, done: false }] });
    setNewSub('');
  };

  const addTag = (raw: string) => {
    const name = raw.trim().replace(/^#/, '');
    if (!name) return;
    upsertTag(name);
    if (!t.tags.includes(name)) patch({ tags: [...t.tags, name] });
    setTagInput('');
  };

  const setReminder = (kind: ReminderKind) => {
    if (kind === 'none') { patch({ reminder: 'none', reminderAt: null }); return; }
    if (kind === 'custom') {
      patch({ reminder: 'custom', reminderAt: t.reminderAt ?? `${t.date ?? todayKey()}T${t.time ?? '09:00'}:00` });
      setToast(tr(lang, 'reminderFor', { when: t.reminderAt ?? `${t.date ?? todayKey()} ${t.time ?? '09:00'}` }));
      return;
    }
    if (!t.date) { patch({ reminder: kind }); return; }
    const base = new Date(`${t.date}T${t.time ?? '09:00'}:00`);
    const mins: Record<string, number> = { at: 0, '5m': 5, '10m': 10, '15m': 15, '30m': 30, '1h': 60, '1d': 1440 };
    base.setMinutes(base.getMinutes() - (mins[kind] ?? 0));
    patch({ reminder: kind, reminderAt: base.toISOString() });
    setToast(tr(lang, 'reminderFor', { when: `${t.date} ${t.time ?? '09:00'}` }));
  };

  const reminderOptions: { value: ReminderKind; label: string }[] = [
    { value: 'none', label: tr(lang, 'noReminder') },
    { value: 'at', label: tr(lang, 'atTime') },
    { value: '5m', label: tr(lang, 'min5') },
    { value: '10m', label: tr(lang, 'min10') },
    { value: '15m', label: tr(lang, 'min15') },
    { value: '30m', label: tr(lang, 'min30') },
    { value: '1h', label: tr(lang, 'hour1') },
    { value: '1d', label: tr(lang, 'day1') },
    { value: 'custom', label: tr(lang, 'date') },
  ];

  const repeatOptions: { value: RepeatKind; label: string }[] = [
    { value: 'none', label: tr(lang, 'never') },
    { value: 'daily', label: tr(lang, 'everyDay') },
    { value: 'weekdays', label: tr(lang, 'everyWeekday') },
    { value: 'weekly', label: tr(lang, 'everyWeek') },
    { value: 'monthly', label: tr(lang, 'everyMonth') },
    { value: 'custom', label: tr(lang, 'customDays') },
  ];

  const subDone = t.subtasks.filter((s) => s.done).length;

  return (
    <motion.aside
      initial={isMobileSheet ? { opacity: 0, y: 56 } : { opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={isMobileSheet ? { opacity: 0, y: 48 } : { opacity: 0, x: 28 }}
      transition={modalSpring}
      className={cn(
        'fixed z-40 flex flex-col',
        isMobileSheet
          ? 'inset-x-0 bottom-0 h-[82vh] p-2 pb-0'
          : 'inset-y-0 end-0 w-full sm:w-[420px] p-3',
      )}
      role="complementary" aria-label={tr(lang, 'details')}
    >
      <div className={cn('glass-strong flex-1 flex flex-col overflow-hidden min-h-0',
        isMobileSheet ? 'rounded-t-3xl rounded-b-none' : 'rounded-3xl')}>
        {/* drag handle for mobile sheet */}
        {isMobileSheet && (
          <div className="pt-2.5 pb-1 flex justify-center shrink-0" aria-hidden="true">
            <span className="w-10 h-1 rounded-full bg-[color-mix(in_srgb,var(--mz-ink)_22%,transparent)]" />
          </div>
        )}
        {/* header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--mz-edge)] shrink-0">
          <motion.button type="button" onClick={() => toggleTask(t.id)} aria-pressed={t.completed}
            aria-label={t.completed ? 'mark open' : 'complete'}
            whileTap={{ scale: 0.82 }} transition={microSpring}
            className={cn('relative w-6 h-6 rounded-full border-2 flex items-center justify-center text-white shrink-0',
              t.completed ? 'border-transparent' : 'border-[color-mix(in_srgb,var(--mz-ink)_35%,transparent)] hover:border-[var(--mz-accent)]')}>
            <AnimatePresence>
              {t.completed && (
                <motion.span key="ifill" className="absolute rounded-full"
                  style={{ inset: -2, background: 'linear-gradient(135deg, var(--mz-accent), #9ad8cf)' }}
                  initial={{ scale: 0.4, opacity: 0.4 }} animate={{ scale: [0.4, 1], opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 640, damping: 19, mass: 0.55 }} />
              )}
            </AnimatePresence>
            <AnimatePresence>{t.completed && <motion.span key="icheck" className="relative z-10 leading-none"><CheckMark size={13} /></motion.span>}</AnimatePresence>
          </motion.button>
          <h2 className={cn('flex-1 text-[15px] font-semibold tracking-tight truncate', t.completed && 'line-through opacity-60')}>
            {t.title}
          </h2>
          <IconBtn onClick={() => useAppStore.getState().setSelected(null)} title={tr(lang, 'close')}><X size={16} /></IconBtn>
        </div>

        <motion.div
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.06, duration: 0.18 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {/* title */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'name')}</span>
            <input value={t.title} onChange={(e) => patch({ title: e.target.value })}
              className="glass rounded-xl px-3 h-10 bg-transparent outline-none text-[14.5px]" aria-label={tr(lang, 'name')} />
          </label>

          {/* date / time */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'dueDate')}</span>
              <input type="date" value={t.date ?? ''} onChange={(e) => patch({ date: e.target.value || null })}
                className="glass rounded-xl px-3 h-10 bg-transparent outline-none text-[13.5px]" aria-label={tr(lang, 'dueDate')} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'dueTime')}</span>
              <input type="time" value={t.time ?? ''} onChange={(e) => patch({ time: e.target.value || null, allDay: !e.target.value })}
                className="glass rounded-xl px-3 h-10 bg-transparent outline-none text-[13.5px]" aria-label={tr(lang, 'dueTime')} />
            </label>
          </div>
          {t.date && (
            <p className="text-[12px] -mt-2 opacity-55">
              {relDay(t.date, lang)} · {gregLabel(t.date, lang)} · {jalaliLabel(t.date)}
            </p>
          )}

          {/* priority */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'priority')}</span>
            <div className="flex gap-1.5 flex-wrap">
              {(['urgent', 'high', 'normal', 'low'] as const).map((p) => (
                <button key={p} type="button" onClick={() => patch({ priority: p })} aria-pressed={t.priority === p}
                  className={cn('pressable rounded-full px-3 py-1.5 text-[12.5px] border flex items-center gap-1.5 transition-colors',
                    t.priority === p ? 'border-transparent' : 'border-[var(--mz-edge)] opacity-65 hover:opacity-100')}
                  style={t.priority === p ? {
                    background: `color-mix(in srgb, ${PRIORITY_STYLE[p].hex} 16%, transparent)`,
                    color: PRIORITY_STYLE[p].hex,
                    borderColor: `color-mix(in srgb, ${PRIORITY_STYLE[p].hex} 45%, transparent)`,
                  } : undefined}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_STYLE[p].dot)} />
                  {tr(lang, PRIORITY_STYLE[p].key)}
                </button>
              ))}
            </div>
          </div>

          {/* reminder */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55 flex items-center gap-1.5"><Bell size={11} /> {tr(lang, 'reminder')}</span>
            <select value={t.reminder} onChange={(e) => setReminder(e.target.value as ReminderKind)}
              className="glass rounded-xl px-3 h-10 bg-transparent outline-none text-[13.5px] cursor-pointer"
              aria-label={tr(lang, 'reminder')}>
              {reminderOptions.map((o) => <option key={o.value} value={o.value} className="bg-[var(--mz-bg)] text-mzink">{o.label}</option>)}
            </select>
            {t.reminder === 'custom' && (
              <input type="datetime-local"
                value={t.reminderAt ? t.reminderAt.slice(0, 16) : ''}
                onChange={(e) => patch({ reminderAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="glass rounded-xl px-3 h-10 bg-transparent outline-none text-[13px]" aria-label={tr(lang, 'reminder')} />
            )}
            {t.reminder !== 'none' && !t.date && (
              <span className="text-[11.5px] opacity-60">{tr(lang, 'dueDate')} …</span>
            )}
          </label>

          {/* repeat */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55 flex items-center gap-1.5"><RefreshCw size={11} /> {tr(lang, 'repeat')}</span>
            <select value={t.repeat} onChange={(e) => patch({ repeat: e.target.value as RepeatKind })}
              className="glass rounded-xl px-3 h-10 bg-transparent outline-none text-[13.5px] cursor-pointer"
              aria-label={tr(lang, 'repeat')}>
              {repeatOptions.map((o) => <option key={o.value} value={o.value} className="bg-[var(--mz-bg)] text-mzink">{o.label}</option>)}
            </select>
            {t.repeat === 'custom' && (
              <div className="flex gap-1 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                  const on = t.repeatDays.includes(d);
                  return (
                    <button key={d} type="button" aria-pressed={on}
                      onClick={() => patch({ repeatDays: on ? t.repeatDays.filter((x) => x !== d) : [...t.repeatDays, d] })}
                      className={cn('pressable w-8 h-8 rounded-full text-[11.5px] border transition-colors',
                        on ? 'border-transparent text-white' : 'border-[var(--mz-edge)] opacity-65')}
                      style={on ? { background: 'var(--mz-accent)' } : undefined}>
                      {weekdayShort(d, lang)}
                    </button>
                  );
                })}
              </div>
            )}
          </label>

          {/* project */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'project')}</span>
            <select value={t.projectId ?? ''} onChange={(e) => patch({ projectId: e.target.value || null })}
              className="glass rounded-xl px-3 h-10 bg-transparent outline-none text-[13.5px] cursor-pointer"
              aria-label={tr(lang, 'project')}>
              <option value="" className="bg-[var(--mz-bg)] text-mzink">{tr(lang, 'noProject')}</option>
              {projects.map((p) => <option key={p.id} value={p.id} className="bg-[var(--mz-bg)] text-mzink">{p.name}</option>)}
            </select>
          </label>

          {/* tags */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'tagsLabel')}</span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {t.tags.map((tn) => (
                <TagChip key={tn} name={tn} color={tags.find((x) => x.name === tn)?.color} small
                  onRemove={() => patch({ tags: t.tags.filter((x) => x !== tn) })} />
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                placeholder="+ #" className="glass rounded-full px-2.5 h-6 w-16 bg-transparent outline-none text-[12px]"
                aria-label={tr(lang, 'tagsLabel')} />
            </div>
          </div>

          {/* subtasks */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55 flex items-center gap-1.5">
              <ListChecks size={11} /> {tr(lang, 'subtasks')}
              {t.subtasks.length > 0 && <span className="opacity-70 normal-case tracking-normal">· {subDone}/{t.subtasks.length}</span>}
            </span>
            {t.subtasks.length > 0 && (
              <div className="h-1 rounded-full bg-[color-mix(in_srgb,var(--mz-ink)_9%,transparent)] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--mz-accent), #9ad8cf)' }}
                  animate={{ width: `${(subDone / t.subtasks.length) * 100}%` }} transition={springSoft} />
              </div>
            )}
            <ul className="flex flex-col gap-1">
              <AnimatePresence initial={false}>
                {t.subtasks.map((s) => (
                  <motion.li key={s.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                    transition={springSoft} className="flex items-center gap-2.5 glass rounded-xl px-3 py-2">
                    <button type="button" aria-pressed={s.done} aria-label={s.title}
                      onClick={() => patch({ subtasks: t.subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}
                      className={cn('w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center text-white pressable',
                        s.done ? 'border-transparent' : 'border-[color-mix(in_srgb,var(--mz-ink)_35%,transparent)]')}
                      style={s.done ? { background: 'var(--mz-accent)' } : undefined}>
                      {s.done && <CheckMark size={9} />}
                    </button>
                    <span className={cn('flex-1 text-[13.5px] truncate', s.done && 'line-through opacity-55')}>{s.title}</span>
                    <button type="button" aria-label="remove"
                      onClick={() => patch({ subtasks: t.subtasks.filter((x) => x.id !== s.id) })}
                      className="opacity-35 hover:opacity-100 pressable"><X size={13} /></button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="flex items-center gap-2">
              <input value={newSub} onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                placeholder={tr(lang, 'addSubtask')}
                className="flex-1 glass rounded-xl px-3 h-9 bg-transparent outline-none text-[13.5px] min-w-0"
                aria-label={tr(lang, 'addSubtask')} />
              <Btn size="sm" variant="glass" onClick={addSubtask} disabled={!newSub.trim()}><Plus size={13} /></Btn>
            </div>
          </div>

          {/* description */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'description')}</span>
            <textarea value={t.description} onChange={(e) => patch({ description: e.target.value })} rows={3}
              className="glass rounded-xl px-3 py-2 bg-transparent outline-none text-[13.5px] resize-none"
              aria-label={tr(lang, 'description')} />
          </label>

          {/* notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.14em] opacity-55">{tr(lang, 'notesLabel')}</span>
            <textarea value={t.notes} onChange={(e) => patch({ notes: e.target.value })} rows={3}
              className="glass rounded-xl px-3 py-2 bg-transparent outline-none text-[13.5px] resize-none"
              aria-label={tr(lang, 'notesLabel')} />
          </label>

          {/* pomodoro */}
          <Pomodoro compact />

          {/* meta */}
          <div className="text-[11.5px] opacity-45 flex flex-col gap-0.5 border-t border-[var(--mz-edge)] pt-3">
            <span>{tr(lang, 'created')}: {gregLabel(t.createdAt, lang)}</span>
            <span>{tr(lang, 'updated')}: {gregLabel(t.updatedAt, lang)}</span>
          </div>

          {/* actions */}
          <div className="flex flex-wrap gap-2 pb-2">
            <Btn size="sm" variant="glass" onClick={() => { patch({ focus: !t.focus }); }}>
              <Zap size={13} /> {t.focus ? tr(lang, 'clearFocus') : tr(lang, 'setFocus')}
            </Btn>
            <Btn size="sm" variant="glass" onClick={() => duplicateTask(t.id)}><Copy size={13} /> {tr(lang, 'duplicate')}</Btn>
            <Btn size="sm" variant="glass" onClick={() => { patch({ archived: !t.archived }); useAppStore.getState().setSelected(null); }}>
              <Archive size={13} /> {t.archived ? tr(lang, 'restore') : tr(lang, 'archiveTask')}
            </Btn>
            <Btn size="sm" variant="danger" onClick={() => setConfirmDel(true)}><Trash2 size={13} /> {tr(lang, 'deleteTask')}</Btn>
          </div>
        </motion.div>
      </div>

      {confirmDel && (
        <ConfirmDialog title={tr(lang, 'confirmDelete')} body={tr(lang, 'deleteBody')}
          onCancel={() => setConfirmDel(false)}
          onConfirm={() => { setConfirmDel(false); deleteTask(t.id); }} />
      )}
    </motion.aside>
  );
}