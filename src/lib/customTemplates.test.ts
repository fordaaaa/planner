import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  captureCustomTemplate,
  deleteCustomTemplate,
  isValidCustomTemplate,
  listCustomTemplates,
  saveCustomTemplate,
} from './customTemplates';
import type { WorkflowGraph } from './types';

const GRAPH: WorkflowGraph = {
  nodes: [
    {
      id: 'a',
      type: 'agent',
      position: { x: 300, y: 50 },
      data: { label: 'Start here', kind: 'start', description: '' },
    },
    {
      id: 'b',
      type: 'agent',
      position: { x: 300, y: 210 },
      data: { label: 'Build it', kind: 'agent', description: 'Do the thing.' },
    },
    {
      id: 'c',
      type: 'agent',
      position: { x: 560, y: 300 },
      data: { label: 'Check it', kind: 'subagent', description: '' },
    },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b' },
    { id: 'e2', source: 'b', target: 'c', className: 'spawn-edge' },
    { id: 'ghost', source: 'a', target: 'missing' },
  ],
};

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

describe('captureCustomTemplate', () => {
  it('normalizes positions to an origin and splits spawn edges', () => {
    const t = captureCustomTemplate('My flow', GRAPH, 't1');
    expect(t.steps.map((s) => [s.dx, s.dy])).toEqual([
      [0, 0],
      [0, 160],
      [260, 250],
    ]);
    expect(t.edges).toEqual([[0, 1]]);
    expect(t.spawnEdges).toEqual([[1, 2]]);
    expect(t.steps[1]).toMatchObject({ kind: 'agent', label: 'Build it', description: 'Do the thing.' });
  });
});

describe('isValidCustomTemplate', () => {
  it('rejects junk and out-of-range edge indexes', () => {
    expect(isValidCustomTemplate(null)).toBe(false);
    expect(isValidCustomTemplate({})).toBe(false);
    const t = captureCustomTemplate('OK', GRAPH, 't1');
    expect(isValidCustomTemplate(t)).toBe(true);
    expect(isValidCustomTemplate({ ...t, steps: [] })).toBe(false);
    expect(isValidCustomTemplate({ ...t, edges: [[0, 9]] })).toBe(false);
  });
});

describe('custom template storage', () => {
  it('saves, lists newest-first, and deletes', () => {
    expect(listCustomTemplates()).toEqual([]);
    saveCustomTemplate(captureCustomTemplate('First', GRAPH, 't1'));
    saveCustomTemplate(captureCustomTemplate('Second', GRAPH, 't2'));
    expect(listCustomTemplates().map((t) => t.id)).toEqual(['t2', 't1']);
    expect(deleteCustomTemplate('t2').map((t) => t.id)).toEqual(['t1']);
    expect(listCustomTemplates().map((t) => t.id)).toEqual(['t1']);
  });

  it('ignores malformed stored entries', () => {
    store['planner.templates.v1'] = JSON.stringify([{ nope: true }]);
    expect(listCustomTemplates()).toEqual([]);
  });
});
