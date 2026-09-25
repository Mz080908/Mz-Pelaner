import type { Tag, Project, Habit, NoteItem, Settings } from './types';
import { todayKey, addDaysKey } from './dates';
import { uid } from './utils';

export const SEED_TAGS: Tag[] = [
  { id: 'tag_work', name: 'work', color: '#6d8dff' },
  { id: 'tag_personal', name: 'personal', color: '#f0a390' },
  { id: 'tag_study', name: 'study', color: '#98d2c7' },
  { id: 'tag_fitness', name: 'fitness', color: '#b8a7ff' },
  { id: 'tag_finance', name: 'finance', color: '#f0c973' },
  { id: 'tag_ideas', name: 'ideas', color: '#88d1ff' },
  { id: 'tag_kar', name: 'کار', color: '#6d8dff' },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: '#7c8cff',
  lang: 'en',
  calendar: 'gregorian',
  hour12: false,
  notif: true,
  sound: true,
  pomoFocus: 25,
  pomoShort: 5,
  pomoLong: 15,
  weekStartsOn: 1,
  defaultPriority: 'normal',
  reduceMotion: false,
  highContrast: false,
  largeText: false,
};

export function seedProjects(now = todayKey()): Project[] {
  return [
    {
      id: uid('proj'),
      name: 'Website',
      icon: '✦',
      color: '#6d8dff',
      description: 'Personal website · landing, blog, case studies.',
      deadline: addDaysKey(now, 10),
    },
    {
      id: uid('proj'),
      name: 'Trading Journal',
      icon: '◎',
      color: '#d4a86a',
      description: 'Daily review · notes, mistakes, wins.',
      deadline: addDaysKey(now, 30),
    },
    {
      id: uid('proj'),
      name: 'Personal Brand',
      icon: '◈',
      color: '#b8a7ff',
      description: 'Content plan · visuals, voice, growth.',
      deadline: addDaysKey(now, 45),
    },
  ];
}

export function seedHabits(now = todayKey()): Habit[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const day = (offset: number, value: number): Record<string, number> => ({ [addDaysKey(now, offset)]: value });
  // merge history for demo streaks
  const hist = (pairs: [number, number][]): Record<string, number> => {
    const o: Record<string, number> = {};
    for (const [off, v] of pairs) o[addDaysKey(now, off)] = v;
    return o;
  };
  return [
    {
      id: uid('hab'),
      name: 'Read',
      icon: '📖',
      target: 1,
      history: hist([[-11, 1], [-10, 1], [-9, 1], [-8, 1], [-6, 1], [-5, 1], [-4, 1], [-3, 1], [-2, 1], [-1, 1], [0, 0]]),
      createdAt: addDaysKey(now, -40),
    },
    {
      id: uid('hab'),
      name: 'Exercise',
      icon: '🏃',
      target: 1,
      history: hist([[-6, 1], [-5, 1], [-4, 1], [-3, 1], [-2, 1], [-1, 1], [0, 0]]),
      createdAt: addDaysKey(now, -60),
    },
    {
      id: uid('hab'),
      name: 'Water',
      icon: '💧',
      target: 8,
      history: hist(Array.from({ length: 20 }, (_, i) => [-(20 - i), 1] as [number, number])),
      createdAt: addDaysKey(now, -90),
    },
    {
      id: uid('hab'),
      name: 'Journal',
      icon: '✎',
      target: 1,
      history: hist([[-2, 1], [-1, 1]]),
      createdAt: addDaysKey(now, -7),
    },
  ];
}

export function seedNotes(now = todayKey()): NoteItem[] {
  return [
    {
      id: uid('note'),
      title: 'Welcome to Mz Planer',
      body:
        'Type N to create a task, / to search, ⌘K for the command palette.\n\nTry smart parsing: "Meeting with Ali tomorrow at 6pm #work high".\n\nIn فارسی: "فردا ساعت ۶ جلسه با علی #کار مهم".',
      updatedAt: now,
    },
    {
      id: uid('note'),
      title: 'Focus rituals',
      body: 'Before focus: close extra tabs, set a single top task, start the timer. After focus: review what shipped.',
      updatedAt: now,
    },
  ];
}
