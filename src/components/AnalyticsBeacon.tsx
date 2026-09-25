'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store';
import { track, trackPageview } from '@/lib/analytics';

export function AnalyticsBeacon() {
  const path = usePathname();

  // pageview on route change
  useEffect(() => {
    trackPageview();
  }, [path]);

  // Heartbeat + tab-hide flush is handled inside analytics.ts queue itself.
  // We only hook user actions from the store here.
  useEffect(() => {
    // subscribe to task mutations for lightweight funnel events
    let lastCreated = 0;
    const unsub = useAppStore.subscribe((s, prev) => {
      try {
        if (s.tasks.length > prev.tasks.length && s.tasks.length !== lastCreated) {
          lastCreated = s.tasks.length;
          track('task_create');
        }
        if (s.habits.length !== prev.habits.length) track('habit_mutate');
        if (s.notes.length !== prev.notes.length) track('note_mutate');
      } catch { /* never break store */ }
    });
    return () => unsub();
  }, []);

  return null;
}
