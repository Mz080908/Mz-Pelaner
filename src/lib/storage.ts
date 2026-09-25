import type { PersistShape } from './types';
import { STORAGE_KEY, STORE_VERSION } from './types';
import type { Settings } from './types';
import { DEFAULT_SETTINGS } from './seed';

export function loadPersist(): PersistShape | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistShape;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== STORE_VERSION) return null;
    if (!Array.isArray(parsed.tasks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePersist(shape: PersistShape): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  } catch {
    // storage full — silently ignore (quota covers thousands of items)
  }
}

export function mergeSettings(p: Settings | undefined): Settings {
  if (!p) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...p };
}

export function safeParseJSON(text: string): PersistShape | null {
  try {
    const v = JSON.parse(text) as PersistShape;
    if (!v || typeof v !== 'object') return null;
    if (!Array.isArray(v.tasks)) return null;
    if (typeof v.version !== 'number') return null;
    return v;
  } catch {
    return null;
  }
}
