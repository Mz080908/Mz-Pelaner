'use client';

// Thin client for the optional cloud sync. Local-first never changes: every
// call is fire-and-forget from the store's point of view and failures only
// surface as a toast — the app keeps working fully offline.

import type { CloudSnapshot, Task, Project, Habit, CalEvent, NoteItem, Tag, Settings, DayStats } from './types';

export interface Me {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export async function fetchMe(): Promise<{ available: boolean; user: Me | null }> {
  try {
    const r = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!r.ok) return { available: false, user: null };
    const j = (await r.json()) as { available?: boolean; user?: Me | null };
    return { available: !!j.available, user: j.user ?? null };
  } catch {
    return { available: false, user: null };
  }
}

export function buildSnapshot(s: {
  tasks: Task[]; projects: Project[]; habits: Habit[]; events: CalEvent[];
  notes: NoteItem[]; tags: Tag[]; settings: Settings; stats: Record<string, DayStats>;
}): CloudSnapshot {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tasks: s.tasks, projects: s.projects, habits: s.habits, events: s.events,
    notes: s.notes, tags: s.tags, settings: s.settings, stats: s.stats,
  };
}

export async function pushSnapshot(snap: CloudSnapshot): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch('/api/sync', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snap),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: j.error ?? `http ${r.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network' };
  }
}

export async function pullSnapshot(): Promise<{ ok: boolean; snapshot: CloudSnapshot | null; error?: string }> {
  try {
    const r = await fetch('/api/sync', { cache: 'no-store' });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      return { ok: false, snapshot: null, error: j.error ?? `http ${r.status}` };
    }
    const j = (await r.json()) as { snapshot?: CloudSnapshot | null };
    return { ok: true, snapshot: j.snapshot ?? null };
  } catch (e) {
    return { ok: false, snapshot: null, error: e instanceof Error ? e.message : 'network' };
  }
}

export async function signOut(): Promise<void> {
  try { await fetch('/api/auth/signout', { method: 'POST' }); } catch { /* offline */ }
}
