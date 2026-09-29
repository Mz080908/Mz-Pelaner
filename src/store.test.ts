// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store';
import { STORAGE_KEY } from '@/lib/types';

const base = (over: Record<string, unknown> = {}) => ({
  version: 1,
  tasks: [{ id: 't1', title: 'Mine', dependencies: [] }],
  projects: [{ id: 'p1', name: 'Proj', icon: '✦', color: '#fff', description: '', deadline: null }],
  habits: [{ id: 'h1', name: 'Read', icon: '📖', target: 1, history: {}, createdAt: '2026-09-01' }],
  events: [{ id: 'e1', title: 'Meet', date: '2026-09-30', time: '10:00', endTime: '11:00', allDay: false, color: '#6d8dff' }],
  notes: [{ id: 'n1', title: 'Note', body: '', updatedAt: '2026-09-01' }],
  notifs: [],
  settings: { theme: 'dark', lang: 'en' },
  stats: { '2026-09-29': { date: '2026-09-29', completed: 1, focusSec: 60, energy: 3 } },
  hiddenWidgets: [],
  tags: [{ id: 'tag1', name: 'work', color: '#6d8dff' }],
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
  useAppStore.setState({ _hydrated: false, me: null });
  useAppStore.getState().hydrate();
});

describe('backup & restore', () => {
  it('exports a complete, versioned JSON document', () => {
    const raw = useAppStore.getState().exportJSON();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.version).toBe(1);
    for (const k of ['tasks', 'projects', 'habits', 'events', 'notes', 'notifs', 'settings', 'stats', 'hiddenWidgets', 'tags']) {
      expect(k in parsed).toBe(true);
    }
  });

  it('replace import restores exactly what was exported', () => {
    const raw = useAppStore.getState().exportJSON();
    useAppStore.getState().resetAll();
    const res = useAppStore.getState().importJSON(raw, 'replace');
    expect(res.ok).toBe(true);
    const after = JSON.parse(useAppStore.getState().exportJSON()) as { tasks: { id: string }[] };
    expect(after.tasks.length).toBeGreaterThan(0);
  });

  it('merge import unions by id and keeps local rows', () => {
    const local = useAppStore.getState().exportJSON();
    const incoming = base({ tasks: [{ id: 't2', title: 'From backup', dependencies: [] }] });
    const res = useAppStore.getState().importJSON(JSON.stringify(incoming), 'merge');
    expect(res.ok).toBe(true);
    const ids = useAppStore.getState().tasks.map((t) => t.id);
    expect(ids).toContain('t2');
    // local tasks survive a merge
    expect(useAppStore.getState().tasks.length).toBeGreaterThan(1);
  });

  it('merge keeps local settings flags (backup date, onboarding)', () => {
    useAppStore.getState().markBackup();
    useAppStore.getState().completeOnboarding('sample');
    const before = useAppStore.getState().settings;
    useAppStore.getState().importJSON(JSON.stringify(base({ settings: { theme: 'light' } })), 'merge');
    const after = useAppStore.getState().settings;
    expect(after.theme).toBe('light');
    expect(after.lastBackupAt).toBe(before.lastBackupAt);
    expect(after.onboardedAt).toBe(before.onboardedAt);
  });

  it('rejects malformed and non-MzPlaner files', () => {
    expect(useAppStore.getState().importJSON('not json', 'replace').ok).toBe(false);
    expect(useAppStore.getState().importJSON('{"foo":1}', 'replace').ok).toBe(false);
    expect(useAppStore.getState().importJSON('[]', 'replace').ok).toBe(false);
  });

  it('marks the backup date and reports its age', () => {
    expect(useAppStore.getState().backupAgeDays()).toBeNull();
    useAppStore.getState().markBackup();
    expect(useAppStore.getState().backupAgeDays()).toBe(0);
  });
});

describe('sample data management', () => {
  it('detects untouched seed data', () => {
    expect(useAppStore.getState().isSampleData()).toBe(true);
  });

  it('creating a task marks the user as having real data', () => {
    useAppStore.getState().createTask('My first real task');
    expect(useAppStore.getState().settings.hasUserData).toBe(true);
    expect(useAppStore.getState().isSampleData()).toBe(false);
  });

  it('clearSampleData empties the workspace but keeps the flag', () => {
    useAppStore.getState().createTask('Keep me out of the way');
    useAppStore.getState().clearSampleData();
    const s = useAppStore.getState();
    expect(s.tasks).toHaveLength(0);
    expect(s.projects).toHaveLength(0);
    expect(s.habits).toHaveLength(0);
    expect(s.notes).toHaveLength(0);
    expect(s.settings.hasUserData).toBe(true);
  });
});

describe('onboarding', () => {
  it('sample start keeps the seed data', () => {
    useAppStore.getState().completeOnboarding('sample');
    expect(useAppStore.getState().settings.onboardedAt).not.toBeNull();
    expect(useAppStore.getState().tasks.length).toBeGreaterThan(0);
  });

  it('empty start wipes the demo content', () => {
    useAppStore.getState().completeOnboarding('empty');
    const s = useAppStore.getState();
    expect(s.settings.onboardedAt).not.toBeNull();
    expect(s.settings.hasUserData).toBe(true);
    expect(s.tasks).toHaveLength(0);
    expect(s.habits).toHaveLength(0);
  });
});

describe('persistence', () => {
  it('writes the snapshot to localStorage under the app key', () => {
    useAppStore.getState().createTask('Persisted task');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).tasks.some((t: { title: string }) => t.title === 'Persisted task')).toBe(true);
  });
});
