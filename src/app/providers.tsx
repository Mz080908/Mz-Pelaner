'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';

export function Providers({ children }: { children: ReactNode }) {
  const settings = useAppStore((s) => s.settings);
  const ready = useAppStore((s) => s._hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const lastTheme = useRef<string | null>(null);

  // hydrate from localStorage exactly once on the client (zustand = external store)
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // theme — coordinated via View Transitions API when available
  useEffect(() => {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = settings.theme === 'system' ? (sysDark ? 'dark' : 'light') : settings.theme;
    const root = document.documentElement;

    const apply = () => {
      root.dataset.theme = theme;
      root.lang = settings.lang;
      root.dir = settings.lang === 'fa' ? 'rtl' : 'ltr';
      root.dataset.motion = settings.reduceMotion ? 'reduced' : 'normal';
      root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
      root.dataset.text = settings.largeText ? 'large' : 'normal';
    };

    const reduced = root.dataset.motion === 'reduced';
    if (
      lastTheme.current !== null &&
      lastTheme.current !== theme &&
      !reduced &&
      'startViewTransition' in document &&
      typeof (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition === 'function'
    ) {
      // one compositor-level transition instead of animating every node
      (document as Document & { startViewTransition: (cb: () => void) => unknown }).startViewTransition(apply);
    } else {
      apply();
    }
    lastTheme.current = theme;
  }, [settings.theme, settings.lang, settings.reduceMotion, settings.highContrast, settings.largeText]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center opacity-40 text-sm">
        <span className="glass rounded-full px-5 py-2">Mz Planer · loading…</span>
      </div>
    );
  }
  return <>{children}</>;
}
