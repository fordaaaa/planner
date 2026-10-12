import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';
import type { WorkflowNode } from './types';
import { computeOrphanIds, planInsert, planLinkOrphans } from './graphOps';

function node(id: string, x: number, y: number, label = id): WorkflowNode {
  return {
    id,
    type: 'agent',
    position: { x, y },
    data: { label, kind: 'agent', description: '' },
  };
}

function edge(id: string, source: string, target: string, className?: string): Edge {
  return className ? { id, source, target, className } : { id, source, target };
}

let counter = 0;
const nextId = (p: string) => () => `${p}-${++counter}`;

describe('computeOrphanIds', () => {
  it('exempts a lone starter node', () => {
    expect(computeOrphanIds([node('a', 0, 0)], [])).toEqual(new Set());
  });

  it('flags nodes with no edges in either direction', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 160), node('c', 0, 320)];
    expect(computeOrphanIds(nodes, [edge('e1', 'a', 'b')])).toEqual(new Set(['c']));
  });
});

describe('planInsert', () => {
  it('appends below the anchor when it has no outgoing edge', () => {
    const plan = planInsert([node('a', 100, 100)], [], 'a', 'agent');
    expect(plan).toMatchObject({
      anchorId: 'a',
      position: { x: 100, y: 260 },
      removedEdgeId: null,
      successor: null,
      branch: false,
    });
  });

  it('splices between anchor and its topmost successor', () => {
    const nodes = [node('a', 100, 100, 'A'), node('b', 100, 420, 'B')];
    const plan = planInsert(nodes, [edge('e1', 'a', 'b', 'spawn-edge')], 'a', 'agent');
    expect(plan.position).toEqual({ x: 100, y: 260 });
    expect(plan.removedEdgeId).toBe('e1');
    expect(plan.successor).toMatchObject({ id: 'b', label: 'B', className: 'spawn-edge' });
  });

  it('branches subagents off the side without rewiring', () => {
    const nodes = [node('a', 100, 100), node('b', 100, 260)];
    const plan = planInsert(nodes, [edge('e1', 'a', 'b')], 'a', 'subagent');
    expect(plan.branch).toBe(true);
    expect(plan.removedEdgeId).toBeNull();
    expect(plan.position).toEqual({ x: 320, y: 190 });
  });

  it('free-floats when the canvas is empty', () => {
    expect(planInsert([], [], null, 'agent')).toMatchObject({
      anchorId: null,
      position: { x: 250, y: 50 },
    });
  });
});

describe('planLinkOrphans', () => {
  it('returns zero when everything is connected', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 160)];
    expect(planLinkOrphans(nodes, [edge('e1', 'a', 'b')], nextId('edge')).linked).toBe(0);
  });

  it('stacks orphans below the lowest connected node and chains them', () => {
    const nodes = [node('a', 300, 50), node('b', 300, 210), node('o1', 900, 40), node('o2', 80, 800)];
    const plan = planLinkOrphans(nodes, [edge('e1', 'a', 'b')], nextId('edge'));
    expect(plan.linked).toBe(2);
    const o1 = plan.nodes.find((n) => n.id === 'o1')!;
    const o2 = plan.nodes.find((n) => n.id === 'o2')!;
    expect(o1.position).toEqual({ x: 300, y: 370 });
    expect(o2.position).toEqual({ x: 300, y: 530 });
    expect(plan.edges.map((e) => `${e.source}->${e.target}`)).toContain('b->o1');
    expect(plan.edges.map((e) => `${e.source}->${e.target}`)).toContain('o1->o2');
  });

  it('chains a fully disconnected canvas in top-down order, keeping the first in place', () => {
    const nodes = [node('b', 0, 300), node('a', 0, 60)];
    const plan = planLinkOrphans(nodes, [], nextId('edge'));
    expect(plan.linked).toBe(2);
    expect(plan.nodes.find((n) => n.id === 'a')!.position).toEqual({ x: 0, y: 60 });
    expect(plan.nodes.find((n) => n.id === 'b')!.position).toEqual({ x: 0, y: 220 });
    expect(plan.edges).toHaveLength(1);
    expect(plan.edges[0]).toMatchObject({ source: 'a', target: 'b' });
  });
});
