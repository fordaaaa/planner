import { describe, expect, it } from 'vitest';
import { formatStepList, parseShellLine, resolveCatalogId, SHELL_HELP_LINES } from './shell';

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
    ).toEqual(['1. [start] First', '2. [agent] Second']);
    expect(formatStepList([])).toEqual(['(no steps yet)']);
  });
});
