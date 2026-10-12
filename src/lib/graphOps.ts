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
