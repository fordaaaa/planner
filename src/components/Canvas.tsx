import { useMemo, type ReactNode } from 'react';
import {
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type NodeProps,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { WorkflowNode } from '../lib/types';
import AgentNode from './nodes/AgentNode';

interface CanvasProps {
  nodes: WorkflowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<WorkflowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: (node: WorkflowNode | null) => void;
  onAddChild: (parentId: string) => void;
  children?: ReactNode;
}

export default function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onAddChild,
  children,
}: CanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      agent: (props: NodeProps<WorkflowNode>) => <AgentNode {...props} onAddChild={onAddChild} />,
    }),
    [onAddChild],
  );

  return (
    <div className="canvas-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick(node)}
        onPaneClick={() => onNodeClick(null)}
        fitView
      >
        <Controls />
        <MiniMap
          pannable
          zoomable
          style={{ background: 'var(--code-bg)', border: '1px solid var(--border)' }}
          maskColor="var(--accent-bg)"
          nodeColor="var(--accent-border)"
          nodeStrokeColor="var(--border)"
        />
      </ReactFlow>
      {children}
    </div>
  );
}
