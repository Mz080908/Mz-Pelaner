'use client';

// First-run onboarding: 4 short screens + a data choice. Dismissible with Esc,
// never blocks the app, and every path lands on a working workspace.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { tr } from '@/lib/i18n';
import { Btn, IconBtn } from './ui';
import { X, Timer, Flame, CalendarHeart, Sparkles, Play, Eraser } from 'lucide-react';

type SlideKey = 'obWelcome' | 'obFocus' | 'obEnergy' | 'obJalali' | 'obSmart';

const SLIDES: { key: SlideKey; sub: string; icon: typeof Timer }[] = [
  { key: 'obWelcome', sub: 'obWelcomeSub', icon: Sparkles },
  { key: 'obFocus', sub: 'obFocusSub', icon: Timer },
  { key: 'obEnergy', sub: 'obEnergySub', icon: Flame },
  { key: 'obJalali', sub: 'obJalaliSub', icon: CalendarHeart },
  { key: 'obSmart', sub: 'obSmartSub', icon: Sparkles },
];

export function Onboarding() {
  const lang = useAppStore((s) => s.settings.lang);
  const onboardedAt = useAppStore((s) => s.settings.onboardedAt);
  const hydrated = useAppStore((s) => s._hydrated);
  const complete = useAppStore((s) => s.completeOnboarding);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const dataStep = i === SLIDES.length;

  // only ever shown before the user finished onboarding
  useEffect(() => {
    if (hydrated && !onboardedAt) setOpen(true);
  }, [hydrated, onboardedAt]);

  const finish = (start: 'sample' | 'empty') => {
    complete(start);
    setOpen(false);
  };

  const skip = () => finish('sample');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); skip(); }
      if (e.key === 'ArrowRight' && !dataStep) setI((n) => Math.min(SLIDES.length, n + 1));
      if (e.key === 'ArrowLeft' && i > 0) setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, dataStep]);

  if (!open) return null;
  const cur = SLIDES[Math.min(i, SLIDES.length - 1)];
  const Icon = cur.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
        role="dialog" aria-modal="true" aria-label={tr(lang, cur.key)}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={skip} />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="relative w-full max-w-[440px] glass rounded-3xl p-6 flex flex-col gap-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center shrink-0 text-[var(--mz-accent)]">
              <Icon size={20} />
            </div>
            <button type="button" onClick={skip} aria-label={tr(lang, 'skip')}
              className="p-1.5 rounded-xl opacity-55 hover:opacity-100 pressable">
              <X size={16} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }} className="flex flex-col gap-2 min-h-[132px]">
              {dataStep ? (
                <>
                  <h2 className="text-[21px] font-semibold tracking-tight">{tr(lang, 'obData')}</h2>
                  <p className="text-[14px] opacity-60">{tr(lang, 'obDataSub')}</p>
                  <div className="flex flex-col gap-2.5 mt-3">
                    <button type="button" onClick={() => finish('sample')}
                      className="text-start glass rounded-2xl px-4 py-3.5 pressable flex items-center gap-3">
                      <Play size={17} className="text-[var(--mz-accent)] shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-medium">{tr(lang, 'obSampleT')}</span>
                        <span className="block text-[12.5px] opacity-60">{tr(lang, 'obSampleS')}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => finish('empty')}
                      className="text-start glass rounded-2xl px-4 py-3.5 pressable flex items-center gap-3">
                      <Eraser size={17} className="opacity-70 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-medium">{tr(lang, 'obEmptyT')}</span>
                        <span className="block text-[12.5px] opacity-60">{tr(lang, 'obEmptyS')}</span>
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-[21px] font-semibold tracking-tight">{tr(lang, cur.key)}</h2>
                  <p className="text-[14.5px] opacity-65 leading-relaxed">{tr(lang, cur.sub as never)}</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {!dataStep && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex gap-1.5" aria-hidden="true">
                {SLIDES.map((_, n) => (
                  <span key={n} className={'h-1.5 rounded-full transition-all ' + (n === i ? 'w-5 bg-[var(--mz-accent)]' : 'w-1.5 bg-[color-mix(in_srgb,var(--mz-ink)_18%,transparent)]')} />
                ))}
              </div>
              <div className="flex gap-2">
                {i > 0 && <Btn variant="ghost" size="sm" onClick={() => setI(i - 1)}>{tr(lang, 'obBack')}</Btn>}
                <Btn variant="primary" size="sm" onClick={() => setI(Math.min(SLIDES.length, i + 1))}>
                  {i === SLIDES.length - 1 ? tr(lang, 'obNext') : tr(lang, 'obNext')}
                </Btn>
              </div>
            </div>
          )}
          {dataStep && (
            <div className="flex justify-end">
              <Btn variant="ghost" size="sm" onClick={skip}>{tr(lang, 'obSkip')}</Btn>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
