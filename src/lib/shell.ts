import type { WorkflowNode } from './types';

/** Step kinds the shell can append. Mirrors the canvas keyword language. */
export type ShellStepKind = 'start' | 'agent' | 'subagent' | 'tool' | 'decision' | 'question' | 'end';

export const SHELL_STEP_KINDS: ShellStepKind[] = [
  'start',
  'agent',
  'subagent',
  'tool',
  'decision',
  'question',
  'end',
];

/** `q` is shorthand for `question`. */
const ALIASES: Record<string, ShellStepKind> = { q: 'question' };

export type ShellAction =
  | { type: 'add-step'; kind: ShellStepKind; label: string }
  | { type: 'insert-block'; blockId: string }
  | { type: 'insert-template'; templateId: string }
  | { type: 'show-block'; blockId: string }
  | { type: 'mark-done'; nodeId: string; done: boolean; label: string }
  | { type: 'list-steps' }
  | { type: 'list-blocks' }
  | { type: 'list-templates' }
  | { type: 'help' }
  | { type: 'clear' }
  | { type: 'empty' }
  | { type: 'unknown'; input: string; hint?: string };

export interface ShellCatalogEntry {
  id: string;
  title: string;
}

/**
 * Resolve a free-text query to a catalogue id. Exact id wins, then exact
 * title, then a unique substring of id-or-title. Returns null when there
 * is no match or the match is ambiguous.
 */
export function resolveCatalogId(query: string, entries: ShellCatalogEntry[]): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const byId = entries.find((e) => e.id.toLowerCase() === q);
  if (byId) return byId.id;
  const byTitle = entries.find((e) => e.title.toLowerCase() === q);
  if (byTitle) return byTitle.id;
  const matches = entries.filter(
    (e) => e.id.toLowerCase().includes(q) || e.title.toLowerCase().includes(q),
  );
  return matches.length === 1 ? matches[0].id : null;
}

export interface ShellCatalogs {
  blocks: ShellCatalogEntry[];
  templates: ShellCatalogEntry[];
}

/** Steps in flow order (same ordering `ls` prints). */
export function flowOrderedNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return [...nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

/**
 * Resolve a `done`/`undone` target: 1-based flow number, exact id, or a
 * unique label substring. Returns null when ambiguous or missing.
 */
export function resolveStepRef(query: string, nodes: WorkflowNode[]): WorkflowNode | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const ordered = flowOrderedNodes(nodes);
  const byNumber = /^\d+$/.test(q) ? ordered[parseInt(q, 10) - 1] : undefined;
  if (byNumber) return byNumber;
  const byId = nodes.find((n) => n.id.toLowerCase() === q);
  if (byId) return byId;
  const matches = nodes.filter((n) => n.data.label.toLowerCase().includes(q));
  return matches.length === 1 ? matches[0] : null;
}

export function parseShellLine(
  line: string,
  catalogs: ShellCatalogs,
  nodes: WorkflowNode[] = [],
): ShellAction {
  const trimmed = line.trim();
  if (!trimmed) return { type: 'empty' };
  const space = trimmed.search(/\s/);
  const verb = (space === -1 ? trimmed : trimmed.slice(0, space)).toLowerCase();
  const arg = space === -1 ? '' : trimmed.slice(space + 1).trim();

  const stepKind: ShellStepKind | undefined =
    (SHELL_STEP_KINDS as string[]).includes(verb)
      ? (verb as ShellStepKind)
      : ALIASES[verb];
  if (stepKind) {
    return { type: 'add-step', kind: stepKind, label: arg || stepKind };
  }

  switch (verb) {
    case 'block':
      if (!arg) return { type: 'unknown', input: line, hint: 'usage: block <name> — try `ls blocks`' };
      {
        const id = resolveCatalogId(arg, catalogs.blocks);
        if (!id) return { type: 'unknown', input: line, hint: `no unique block matches "${arg}" — try \`ls blocks\`` };
        return { type: 'insert-block', blockId: id };
      }
    case 'template':
    case 'tpl':
      if (!arg) return { type: 'unknown', input: line, hint: 'usage: template <name> — try `ls templates`' };
      {
        const id = resolveCatalogId(arg, catalogs.templates);
        if (!id) {
          return { type: 'unknown', input: line, hint: `no unique template matches "${arg}" — try \`ls templates\`` };
        }
        return { type: 'insert-template', templateId: id };
      }
    case 'show':
      if (!arg) return { type: 'unknown', input: line, hint: 'usage: show <block> — try `ls blocks`' };
      {
        const id = resolveCatalogId(arg, catalogs.blocks);
        if (!id) return { type: 'unknown', input: line, hint: `no unique block matches "${arg}" — try \`ls blocks\`` };
        return { type: 'show-block', blockId: id };
      }
    case 'done':
    case 'undone': {
      if (!arg) return { type: 'unknown', input: line, hint: `usage: ${verb} <step number or name> — try \`ls\`` };
      const target = resolveStepRef(arg, nodes);
      if (!target) {
        return { type: 'unknown', input: line, hint: `no unique step matches "${arg}" — try \`ls\`` };
      }
      return { type: 'mark-done', nodeId: target.id, done: verb === 'done', label: target.data.label };
    }
    case 'ls':
    case 'list': {
      const what = arg.toLowerCase();
      if (!what || what.startsWith('step')) return { type: 'list-steps' };
      if (what.startsWith('block')) return { type: 'list-blocks' };
      if (what.startsWith('template') || what.startsWith('tpl')) return { type: 'list-templates' };
      return { type: 'unknown', input: line, hint: 'usage: ls [steps|blocks|templates]' };
    }
    case 'help':
    case '?':
      return { type: 'help' };
    case 'clear':
      return { type: 'clear' };
    default:
      return { type: 'unknown', input: line };
  }
}

export const SHELL_HELP_LINES: string[] = [
  'steps:  start|agent|tool|decision|question|subagent|end <label>   (q = question)',
  '        done|undone <step number or name>',
  'blocks: block <name>        insert a pre-filled prompt block',
  '        show <name>         print a block\'s full prompt here',
  '        template <name>     insert a whole workflow template',
  '        ls [steps|blocks|templates]',
  '        clear               wipe this terminal (canvas untouched)',
];

export function formatStepList(nodes: WorkflowNode[]): string[] {
  if (!nodes.length) return ['(no steps yet)'];
  return flowOrderedNodes(nodes).map(
    (n, i) => `${i + 1}. [${n.data.done === true ? 'x' : ' '}] [${n.data.kind}] ${n.data.label}`,
  );
}
