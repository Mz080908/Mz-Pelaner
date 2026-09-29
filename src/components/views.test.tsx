// @vitest-environment jsdom
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InboxView, ScheduledView } from '@/components/views';
import { useAppStore } from '@/store';
import type { Task } from '@/lib/types';

// jsdom lacks browser APIs framer-motion / card tilt rely on
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false, media: q, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  if (!globalThis.ResizeObserver) globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never;
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {} unobserve() {} disconnect() {}
      takeRecords() { return []; }
      root = null; rootMargin = ''; thresholds: number[] = [];
    } as never;
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

/** Seed the store with a flat list of tasks (defaults filled in). */
function seed(patches: Partial<Task>[]) {
  useAppStore.setState({
    _hydrated: true,
    tasks: patches.map((p, i) => ({
      id: `t${i}`, title: `Task ${i}`, description: '', notes: '', allDay: false,
      priority: 'normal' as const, tags: [], projectId: null,
      completed: false, completedAt: null, reminder: 'none' as const, reminderAt: null,
      subtasks: [], repeat: 'none' as const, repeatDays: [], archived: false,
      focus: false, order: i, createdAt: '2026-09-28', updatedAt: '2026-09-28',
      date: '2026-09-28', time: null, dependencies: [],
      ...p,
    })) as Task[],
    projects: [], tags: [], habits: [], events: [], notes: [],
  });
}

beforeEach(() => {
  cleanup();
  useAppStore.setState({
    view: 'today', selectedTaskId: null,
    filter: { priority: 'all', tag: 'all', project: 'all', completion: 'all', q: '' },
  });
});

/**
 * Regression: TaskCard's `blockedBy` zustand selector used to return a fresh
 * array on every call, so React's useSyncExternalStore never got a cached
 * snapshot -> "Maximum update depth exceeded" -> Inbox/Scheduled never loaded.
 */
describe('InboxView', () => {
  it('renders (empty)', () => {
    seed([]);
    expect(() => render(<InboxView />)).not.toThrow();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('renders task cards without an update loop', () => {
    seed([{ title: 'Loose thought', date: null }]);
    expect(() => render(<InboxView />)).not.toThrow();
    expect(screen.getByText('Loose thought')).toBeInTheDocument();
  });

  it('tolerates legacy tasks persisted without dependencies', () => {
    seed([{ title: 'Legacy', date: null, dependencies: undefined } as never]);
    expect(() => render(<InboxView />)).not.toThrow();
  });
});

describe('ScheduledView', () => {
  it('renders (empty)', () => {
    seed([]);
    expect(() => render(<ScheduledView />)).not.toThrow();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('renders future-dated tasks grouped by day', () => {
    seed([{ title: 'Tomorrow job', date: '2099-01-02' }]);
    expect(() => render(<ScheduledView />)).not.toThrow();
    expect(screen.getByText('Tomorrow job')).toBeInTheDocument();
  });

  it('renders past-dated (overdue) tasks', () => {
    seed([{ title: 'Overdue job', date: '2020-01-01' }]);
    expect(() => render(<ScheduledView />)).not.toThrow();
    expect(screen.getByText('Overdue job')).toBeInTheDocument();
  });

  it('renders a task whose dependencies are still open (blocked)', () => {
    seed([
      { id: 'a', title: 'Prereq', date: null, dependencies: [] },
      { id: 'b', title: 'Blocked job', date: '2099-01-02', dependencies: ['a'] },
    ]);
    expect(() => render(<ScheduledView />)).not.toThrow();
    expect(screen.getByText('Blocked job')).toBeInTheDocument();
  });
});
