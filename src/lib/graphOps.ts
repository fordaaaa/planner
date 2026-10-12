import type { Edge } from '@xyflow/react';
import type { WorkflowNode } from './types';

const MAIN_STEP_HEIGHT = 160;

/** Ids of nodes with no edges at all (exempt when the canvas is a single node). */
export function computeOrphanIds(nodes: WorkflowNode[], edges: Edge[]): Set<string> {
  if (nodes.length < 2) return new Set();
  const linked = new Set<string>();
  for (const e of edges) {
    linked.add(e.source);
    linked.add(e.target);
  }
  return new Set(nodes.filter((n) => !linked.has(n.id)).map((n) => n.id));
}

function bottomMost(nodes: WorkflowNode[]): WorkflowNode | null {
  if (!nodes.length) return null;
  return nodes.reduce((acc, n) => (n.position.y > acc.position.y ? n : acc), nodes[0]);
}

export interface InsertPlan {
  /** Node to connect the new step after (null = free-floating). */
  anchorId: string | null;
  position: { x: number; y: number };
  /** Outgoing edge to remove so the new step splices into the chain. */
  removedEdgeId: string | null;
  successor: { id: string; label: string; className?: string } | null;
  /** True when branching off the side (subagent) rather than chaining. */
  branch: boolean;
}

/**
 * Decide where a new step goes. When the anchor already flows into a
 * successor, the step splices BETWEEN them (the old edge is removed and
 * re-added after the new node). Subagents always branch off the side.
 */
export function planInsert(
  nodes: WorkflowNode[],
  edges: Edge[],
  anchorId: string | null,
  kind: string,
): InsertPlan {
  const anchor = (anchorId ? nodes.find((n) => n.id === anchorId) : null) ?? bottomMost(nodes);
  if (!anchor) {
    return { anchorId: null, position: { x: 250, y: 50 }, removedEdgeId: null, successor: null, branch: false };
  }
  if (kind === 'subagent') {
    return {
      anchorId: anchor.id,
      position: { x: anchor.position.x + 220, y: anchor.position.y + 90 },
      removedEdgeId: null,
      successor: null,
      branch: true,
    };
  }
  const outgoing = edges.filter((e) => e.source === anchor.id);
  if (!outgoing.length) {
    return {
      anchorId: anchor.id,
      position: { x: anchor.position.x, y: anchor.position.y + MAIN_STEP_HEIGHT },
      removedEdgeId: null,
      successor: null,
      branch: false,
    };
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const targets = outgoing
    .map((edge) => ({ edge, node: byId.get(edge.target) }))
    .filter((t): t is { edge: Edge; node: WorkflowNode } => Boolean(t.node))
    .sort((a, b) => a.node.position.y - b.node.position.y);
  const first = targets[0];
  return {
    anchorId: anchor.id,
    position: { x: anchor.position.x, y: (anchor.position.y + first.node.position.y) / 2 },
    removedEdgeId: first.edge.id,
    successor: { id: first.node.id, label: first.node.data.label, className: first.edge.className },
    branch: false,
  };
}

export interface LinkPlan {
  nodes: WorkflowNode[];
  edges: Edge[];
  linked: number;
}

/**
 * Chain every orphaned node into the flow in top-down order, stacking them
 * below the lowest connected node (or below the topmost orphan when nothing
 * is connected). Positions are tidied into a clean column.
 */
export function planLinkOrphans(
  nodes: WorkflowNode[],
  edges: Edge[],
  nextId: () => string,
): LinkPlan {
  const orphanIds = computeOrphanIds(nodes, edges);
  const orphans = nodes
    .filter((n) => orphanIds.has(n.id))
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  if (!orphans.length) return { nodes, edges, linked: 0 };

  const connected = nodes.filter((n) => !orphanIds.has(n.id));
  const updated: WorkflowNode[] = nodes.map((n) => ({ ...n }));
  const byId = new Map(updated.map((n) => [n.id, n]));
  const newEdges = [...edges];

  let cursor: { x: number; y: number; id: string | null };
  if (connected.length) {
    const anchor = bottomMost(connected)!;
    cursor = { x: anchor.position.x, y: anchor.position.y, id: anchor.id };
  } else {
    const first = byId.get(orphans[0].id)!;
    cursor = { x: first.position.x, y: first.position.y, id: null };
  }

  orphans.forEach((orphan, i) => {
    const target = byId.get(orphan.id)!;
    if (connected.length || i > 0) {
      cursor.y += MAIN_STEP_HEIGHT;
      target.position = { x: cursor.x, y: cursor.y };
    } else {
      cursor.y = target.position.y;
    }
    if (cursor.id) {
      newEdges.push({ id: nextId(), source: cursor.id, target: orphan.id });
    }
    cursor.id = orphan.id;
  });

  return { nodes: updated, edges: newEdges, linked: orphans.length };
}

const LAYOUT_MAIN_X = 300;
const LAYOUT_TOP_Y = 50;
const LAYOUT_BRANCH_DX = 260;
const LAYOUT_SIBLING_DX = 220;
const LAYOUT_FORK_DY = 90;

/**
 * Tidy the canvas without touching edges: main-chain steps stack vertically
 * in flow order, subagents fan out right of their parent, leftovers stack
 * below. Pure — returns new nodes, input untouched. Cycle-safe.
 */
export function planAutoLayout(nodes: WorkflowNode[], edges: Edge[]): WorkflowNode[] {
  if (nodes.length < 2) return nodes;

  const incoming = new Map<string, Edge[]>();
  const outgoing = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e);
  }
  const byYX = (a: WorkflowNode, b: WorkflowNode) =>
    a.position.y - b.position.y || a.position.x - b.position.x;

  const sources = nodes.filter((n) => !(incoming.get(n.id) ?? []).length).sort(byYX);
  const seeds = sources.length ? sources : [[...nodes].sort(byYX)[0]];

  // Longest-path depth from sources; visited-guard makes cycles terminate.
  const depth = new Map<string, number>();
  const stack: Array<[string, number]> = seeds.map((s) => [s.id, 0]);
  while (stack.length) {
    const [id, d] = stack.pop()!;
    if (d <= (depth.get(id) ?? -1)) continue;
    depth.set(id, d);
    for (const e of outgoing.get(id) ?? []) stack.push([e.target, d + 1]);
  }

  const placed = new Map<string, { x: number; y: number }>();
  const maxDepth = Math.max(0, ...depth.values());

  // Main (non-subagent) steps first, depth by depth.
  for (let d = 0; d <= maxDepth; d++) {
    const group = nodes
      .filter((n) => depth.get(n.id) === d && n.data.kind !== 'subagent')
      .sort(byYX);
    group.forEach((n, i) => {
      placed.set(n.id, { x: LAYOUT_MAIN_X + i * LAYOUT_SIBLING_DX, y: LAYOUT_TOP_Y + d * MAIN_STEP_HEIGHT });
    });
    // Subagents hang off their already-placed parent.
    const subs = nodes.filter((n) => depth.get(n.id) === d && n.data.kind === 'subagent');
    const siblings = new Map<string, number>();
    for (const n of subs) {
      const parentId = (incoming.get(n.id) ?? [])[0]?.source;
      const parent = parentId ? placed.get(parentId) : undefined;
      if (!parent) continue;
      const idx = siblings.get(parentId!) ?? 0;
      siblings.set(parentId!, idx + 1);
      placed.set(n.id, { x: parent.x + LAYOUT_BRANCH_DX + idx * LAYOUT_SIBLING_DX, y: parent.y + LAYOUT_FORK_DY });
    }
  }

  // Anything unreachable (disconnected cycles and friends) stacks below.
  const leftovers = nodes.filter((n) => !placed.has(n.id)).sort(byYX);
  let tailY = LAYOUT_TOP_Y + maxDepth * MAIN_STEP_HEIGHT;
  for (const n of leftovers) {
    tailY += MAIN_STEP_HEIGHT;
    placed.set(n.id, { x: LAYOUT_MAIN_X, y: tailY });
  }

  return nodes.map((n) => {
    const p = placed.get(n.id);
    return p ? { ...n, position: { ...p } } : n;
  });
}
