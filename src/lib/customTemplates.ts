import type { WorkflowGraph } from './types';
import type { NodeKind } from './types';

const TEMPLATES_KEY = 'planner.templates.v1';

/** One captured step: content plus position relative to the capture origin. */
export interface CustomTemplateStep {
  kind: NodeKind;
  label: string;
  description: string;
  dx: number;
  dy: number;
}

export interface CustomTemplate {
  id: string;
  title: string;
  createdAt: number;
  steps: CustomTemplateStep[];
  /** Index pairs into steps for normal edges. */
  edges: Array<[number, number]>;
  /** Index pairs into steps for spawn (dashed) edges. */
  spawnEdges: Array<[number, number]>;
}

/** Capture the whole canvas as a reusable template, normalizing to an origin. */
export function captureCustomTemplate(title: string, graph: WorkflowGraph, id: string): CustomTemplate {
  const minX = Math.min(...graph.nodes.map((n) => n.position.x));
  const minY = Math.min(...graph.nodes.map((n) => n.position.y));
  const steps: CustomTemplateStep[] = graph.nodes.map((n) => ({
    kind: n.data.kind,
    label: n.data.label,
    description: n.data.description,
    dx: n.position.x - minX,
    dy: n.position.y - minY,
  }));
  const indexById = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const edges: Array<[number, number]> = [];
  const spawnEdges: Array<[number, number]> = [];
  for (const e of graph.edges) {
    const from = indexById.get(e.source);
    const to = indexById.get(e.target);
    if (from === undefined || to === undefined) continue;
    (e.className === 'spawn-edge' ? spawnEdges : edges).push([from, to]);
  }
  return { id, title: title.trim(), createdAt: Date.now(), steps, edges, spawnEdges };
}

export function isValidCustomTemplate(data: unknown): data is CustomTemplate {
  if (typeof data !== 'object' || data === null) return false;
  const t = data as Record<string, unknown>;
  if (typeof t.id !== 'string' || !t.id) return false;
  if (typeof t.title !== 'string' || !t.title.trim()) return false;
  if (!Array.isArray(t.steps) || t.steps.length === 0) return false;
  const stepCount: number = t.steps.length;
  const pairs = (v: unknown): v is Array<[number, number]> =>
    Array.isArray(v) &&
    v.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every((i) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < stepCount),
    );
  if (!pairs(t.edges) || !pairs(t.spawnEdges)) return false;
  return (t.steps as unknown[]).every((s) => {
    if (typeof s !== 'object' || s === null) return false;
    const step = s as Record<string, unknown>;
    return (
      typeof step.kind === 'string' &&
      typeof step.label === 'string' &&
      typeof step.description === 'string' &&
      typeof step.dx === 'number' &&
      typeof step.dy === 'number'
    );
  });
}

function readAll(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCustomTemplate);
  } catch {
    return [];
  }
}

function writeAll(templates: CustomTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // storage unavailable — templates just won't persist
  }
}

export function listCustomTemplates(): CustomTemplate[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveCustomTemplate(template: CustomTemplate): CustomTemplate[] {
  const rest = readAll().filter((t) => t.id !== template.id);
  const next = [template, ...rest];
  writeAll(next);
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteCustomTemplate(id: string): CustomTemplate[] {
  const next = readAll().filter((t) => t.id !== id);
  writeAll(next);
  return next.sort((a, b) => b.createdAt - a.createdAt);
}
