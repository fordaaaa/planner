export type NodeKind = 'start' | 'agent' | 'subagent' | 'tool' | 'decision' | 'end';

export interface WorkflowNodeData {
  label: string;
  kind: NodeKind;
  description: string;
}

export interface WorkflowNode {
  id: string;
  type: 'agent';
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  className?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
