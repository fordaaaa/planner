import { describe, expect, it } from 'vitest';
import { formatStepList, parseShellLine, resolveCatalogId, resolveStepRef, SHELL_HELP_LINES } from './shell';

const CATALOGS = {
  blocks: [
    { id: 'prd', title: 'PRD — Problem Framer' },
    { id: 'plan', title: 'Plan — Implementation Blueprint' },
    { id: 'question', title: 'Questions — Clarify First' },
  ],
  templates: [{ id: 'feature-loop', title: 'ECC feature loop' }],
};

describe('parseShellLine', () => {
  it('parses step keywords with labels', () => {
    expect(parseShellLine('agent build the api', CATALOGS)).toEqual({
      type: 'add-step',
      kind: 'agent',
      label: 'build the api',
    });
    expect(parseShellLine('  QUESTION   which provider?  ', CATALOGS)).toEqual({
      type: 'add-step',
      kind: 'question',
      label: 'which provider?',
    });
  });

  it('supports the q alias and defaults unlabeled steps to their kind', () => {
    expect(parseShellLine('q scope', CATALOGS)).toEqual({ type: 'add-step', kind: 'question', label: 'scope' });
    expect(parseShellLine('end', CATALOGS)).toEqual({ type: 'add-step', kind: 'end', label: 'end' });
  });

  it('resolves blocks and templates by id, title, or unique substring', () => {
    expect(parseShellLine('block prd', CATALOGS)).toEqual({ type: 'insert-block', blockId: 'prd' });
    expect(parseShellLine('block clarify', CATALOGS)).toEqual({ type: 'insert-block', blockId: 'question' });
    expect(parseShellLine('template feature', CATALOGS)).toEqual({
      type: 'insert-template',
      templateId: 'feature-loop',
    });
  });

  it('shows a block prompt without touching the canvas', () => {
    expect(parseShellLine('show plan', CATALOGS)).toEqual({ type: 'show-block', blockId: 'plan' });
    const missing = parseShellLine('show', CATALOGS);
    expect(missing.type).toBe('unknown');
  });

  it('rejects ambiguous or missing names with a hint', () => {
    const amb = parseShellLine('block p', CATALOGS);
    expect(amb.type).toBe('unknown');
    const missing = parseShellLine('block nope', CATALOGS);
    expect(missing.type).toBe('unknown');
    if (missing.type === 'unknown') expect(missing.hint).toContain('ls blocks');
  });

  it('handles help, clear, ls, empty, and unknown input', () => {
    expect(parseShellLine('help', CATALOGS)).toEqual({ type: 'help' });
    expect(parseShellLine('clear', CATALOGS)).toEqual({ type: 'clear' });
    expect(parseShellLine('ls', CATALOGS)).toEqual({ type: 'list-steps' });
    expect(parseShellLine('ls templates', CATALOGS)).toEqual({ type: 'list-templates' });
    expect(parseShellLine('   ', CATALOGS)).toEqual({ type: 'empty' });
    expect(parseShellLine('frobnicate', CATALOGS)).toEqual({ type: 'unknown', input: 'frobnicate' });
  });

  it('resolves catalogue ids exactly before falling back to substrings', () => {
    const entries = [
      { id: 'plan', title: 'Plan' },
      { id: 'planner-x', title: 'Planner X' },
    ];
    expect(resolveCatalogId('plan', entries)).toBe('plan');
    expect(resolveCatalogId('PLANNER', entries)).toBe('planner-x');
    expect(resolveCatalogId('zzz', entries)).toBeNull();
  });
});

describe('shell helpers', () => {
  it('exposes help text and formats the step list in flow order', () => {
    expect(SHELL_HELP_LINES.length).toBeGreaterThan(0);
    expect(
      formatStepList([
        {
          id: 'b',
          type: 'agent',
          position: { x: 0, y: 200 },
          data: { label: 'Second', kind: 'agent', description: '' },
        },
        {
          id: 'a',
          type: 'agent',
          position: { x: 0, y: 50 },
          data: { label: 'First', kind: 'start', description: '' },
        },
      ]),
    ).toEqual(['1. [ ] [start] First', '2. [ ] [agent] Second']);
    expect(formatStepList([])).toEqual(['(no steps yet)']);
  });

  it('marks done steps in the list', () => {
    expect(
      formatStepList([
        {
          id: 'a',
          type: 'agent',
          position: { x: 0, y: 0 },
          data: { label: 'Shipped', kind: 'end', description: '', done: true },
        },
      ]),
    ).toEqual(['1. [x] [end] Shipped']);
  });
});

describe('done and undone', () => {
  const NODES = [
    {
      id: 'a',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: { label: 'Write PRD', kind: 'start', description: '' },
    },
    {
      id: 'b',
      type: 'agent',
      position: { x: 0, y: 160 },
      data: { label: 'Build it', kind: 'agent', description: '' },
    },
  ] as const;

  it('resolves steps by number, id, or unique label', () => {
    const nodes = [...NODES] as unknown as Parameters<typeof resolveStepRef>[1];
    expect(resolveStepRef('1', nodes)?.id).toBe('a');
    expect(resolveStepRef('b', nodes)?.id).toBe('b');
    expect(resolveStepRef('build', nodes)?.id).toBe('b');
    expect(resolveStepRef('zzz', nodes)).toBeNull();
    expect(resolveStepRef('', nodes)).toBeNull();
  });

  it('parses done and undone with usage hints', () => {
    const nodes = [...NODES] as unknown as Parameters<typeof parseShellLine>[2];
    expect(parseShellLine('done 2', CATALOGS, nodes)).toEqual({
      type: 'mark-done',
      nodeId: 'b',
      done: true,
      label: 'Build it',
    });
    expect(parseShellLine('undone prd', CATALOGS, nodes)).toEqual({
      type: 'mark-done',
      nodeId: 'a',
      done: false,
      label: 'Write PRD',
    });
    expect(parseShellLine('done', CATALOGS, nodes).type).toBe('unknown');
    expect(parseShellLine('done zzz', CATALOGS, nodes).type).toBe('unknown');
  });
});
