import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearSketch, loadSketch, saveSketch, SKETCH_KEY } from './sketchStorage';

const PREF_KEY = 'planner.persist';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  });
});

describe('saveSketch', () => {
  it('persists the data URL when consent is remember', () => {
    store[PREF_KEY] = 'remember';
    expect(saveSketch(PNG)).toBe(true);
    expect(store[SKETCH_KEY]).toBe(PNG);
  });

  it('does not persist when consent is session', () => {
    store[PREF_KEY] = 'session';
    expect(saveSketch(PNG)).toBe(false);
    expect(store[SKETCH_KEY]).toBeUndefined();
  });

  it('does not persist when consent is unset (default session-only)', () => {
    expect(saveSketch(PNG)).toBe(false);
    expect(store[SKETCH_KEY]).toBeUndefined();
  });

  it('rejects malformed payloads even under remember', () => {
    store[PREF_KEY] = 'remember';
    expect(saveSketch('not-a-data-url')).toBe(false);
    expect(saveSketch('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(saveSketch('')).toBe(false);
    expect(store[SKETCH_KEY]).toBeUndefined();
  });
});

describe('loadSketch', () => {
  it('returns the saved sketch when consent is remember', () => {
    store[PREF_KEY] = 'remember';
    store[SKETCH_KEY] = PNG;
    expect(loadSketch()).toBe(PNG);
  });

  it('returns null and drops the saved sketch when consent is session', () => {
    store[PREF_KEY] = 'session';
    store[SKETCH_KEY] = PNG;
    expect(loadSketch()).toBeNull();
    expect(store[SKETCH_KEY]).toBeUndefined();
  });

  it('returns null when consent is unset', () => {
    store[SKETCH_KEY] = PNG;
    expect(loadSketch()).toBeNull();
  });

  it('returns null for malformed stored data', () => {
    store[PREF_KEY] = 'remember';
    store[SKETCH_KEY] = 'garbage';
    expect(loadSketch()).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    store[PREF_KEY] = 'remember';
    expect(loadSketch()).toBeNull();
  });
});

describe('clearSketch', () => {
  it('removes any saved sketch regardless of consent', () => {
    store[SKETCH_KEY] = PNG;
    clearSketch();
    expect(store[SKETCH_KEY]).toBeUndefined();
  });

  it('tolerates storage being unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    });
    expect(saveSketch(PNG)).toBe(false);
    expect(loadSketch()).toBeNull();
    expect(() => clearSketch()).not.toThrow();
  });
});
