import type { Edge, Node } from '@xyflow/react';

export type NodeKind = 'start' | 'agent' | 'tool' | 'decision' | 'end';

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  kind: NodeKind;
  description: string;
}

export type WorkflowNode = Node<WorkflowNodeData>;

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: Edge[];
}

export const NODE_KINDS: NodeKind[] = ['start', 'agent', 'tool', 'decision', 'end'];
