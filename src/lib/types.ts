export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type ThemeMode = 'dark' | 'light' | 'system';
export type Lang = 'en' | 'fa';
export type CalendarMode = 'gregorian' | 'jalali' | 'dual';
export type ViewKey = 'today' | 'inbox' | 'scheduled' | 'calendar' | 'projects' | 'habits' | 'tags' | 'archive' | 'notes' | 'settings' | 'analytics';
export type CalView = 'day' | 'week' | 'month' | 'agenda';
export type RepeatKind = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom';
export type ReminderKind = 'none' | 'at' | '5m' | '10m' | '15m' | '30m' | '1h' | '1d' | 'custom';

export interface Subtask { id: string; title: string; done: boolean }
export interface Task {
  id: string; title: string; description: string; notes: string;
  date: string | null; time: string | null; allDay: boolean;
  priority: Priority; tags: string[]; projectId: string | null;
  completed: boolean; completedAt: string | null;
  reminder: ReminderKind; reminderAt: string | null;
  subtasks: Subtask[]; repeat: RepeatKind; repeatDays: number[];
  archived: boolean; order: number; focus: boolean;
  createdAt: string; updatedAt: string;
}
export interface Tag { id: string; name: string; color: string }
export interface Project { id: string; name: string; icon: string; color: string; description: string; deadline: string | null }
export interface Habit { id: string; name: string; icon: string; target: number; history: Record<string, number>; createdAt: string }
export interface CalEvent { id: string; title: string; date: string; time: string | null; endTime: string | null; allDay: boolean; color: string }
export interface NoteItem { id: string; title: string; body: string; updatedAt: string }
export interface AppNotif { id: string; kind: 'reminder' | 'overdue' | 'milestone' | 'system'; title: string; body: string; createdAt: string; read: boolean; taskId?: string }
export interface Settings {
  theme: ThemeMode; accent: string; lang: Lang; calendar: CalendarMode;
  hour12: boolean; notif: boolean; sound: boolean;
  pomoFocus: number; pomoShort: number; pomoLong: number;
  weekStartsOn: 0 | 1; defaultPriority: Priority;
  reduceMotion: boolean; highContrast: boolean; largeText: boolean;
}
export interface DayStats { date: string; completed: number; focusSec: number; energy: number | null }
export interface PersistShape {
  version: number; tasks: Task[]; projects: Project[]; habits: Habit[];
  events: CalEvent[]; notes: NoteItem[]; notifs: AppNotif[];
  settings: Settings; stats: Record<string, DayStats>; hiddenWidgets: string[];
}
export const STORAGE_KEY = 'mzplaner.v1';
export const STORE_VERSION = 1;
