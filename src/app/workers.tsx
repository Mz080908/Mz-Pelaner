'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store';

export function ThemeScript() {
  const { settings } = useAppStore();
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') root.dataset.theme = 'dark';
    else if (settings.theme === 'light') root.dataset.theme = 'light';
    else root.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.lang = settings.lang;
    root.dir = settings.lang === 'fa' ? 'rtl' : 'ltr';
    root.dataset.motion = settings.reduceMotion ? 'reduced' : 'normal';
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.text = settings.largeText ? 'large' : 'normal';
  }, [settings.theme, settings.lang, settings.reduceMotion, settings.highContrast, settings.largeText]);
  return null;
}

export function ReminderWorker() {
  const { settings, tasks, notifPaused } = useAppStore();
  useEffect(() => {
    if (!settings.notif || notifPaused) return;
    const has = typeof window !== 'undefined' && 'Notification' in window;
    if (!has) return;
    if (Notification.permission !== 'granted') return;
    const check = () => {
      const now = Date.now();
      for (const t of tasks) {
        if (t.completed || t.archived) continue;
        if (!t.reminderAt) continue;
        const when = new Date(t.reminderAt).getTime();
        if (when <= now && when > now - 60000) {
          try {
            new Notification(t.title, { body: `${t.date ?? ''} ${t.time ?? ''}`, tag: t.id });
          } catch {}
        }
      }
    };
    const id = setInterval(check, 30000);
    check();
    return () => clearInterval(id);
  }, [tasks, settings.notif, notifPaused]);
  return null;
}