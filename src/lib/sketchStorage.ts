import { getPersistPref } from './graphStorage';

export const SKETCH_KEY = 'planner.sketch.v1';

const DATA_URL_PREFIX = 'data:image/png;base64,';

/** Sketches save in this browser only when the user opted into remembering. */
export function isSketchDataUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(DATA_URL_PREFIX) && value.length > DATA_URL_PREFIX.length;
}

export function saveSketch(dataUrl: string): boolean {
  if (getPersistPref() !== 'remember') return false;
  if (!isSketchDataUrl(dataUrl)) return false;
  try {
    localStorage.setItem(SKETCH_KEY, dataUrl);
    return true;
  } catch {
    return false; // storage full or unavailable — sketch stays in memory only
  }
}

export function loadSketch(): string | null {
  const pref = getPersistPref();
  if (pref !== 'remember') {
    if (pref === 'session') clearSketch(); // honor the session-only choice by deleting the saved copy
    return null;
  }
  try {
    const raw = localStorage.getItem(SKETCH_KEY);
    return isSketchDataUrl(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function clearSketch(): void {
  try {
    localStorage.removeItem(SKETCH_KEY);
  } catch {
    // ignore — nothing we can do
  }
}
