import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowNode } from '../../lib/types';

const KIND_COLORS: Record<string, string> = {
  start: '#22c55e',
  agent: '#6366f1',
  tool: '#f59e0b',
  decision: '#ec4899',
  end: '#ef4444',
};

export default function AgentNode({ data, selected }: NodeProps<WorkflowNode>) {
  const color = KIND_COLORS[data.kind] ?? '#6366f1';

  return (
    <div
      className="agent-node"
      style={{ borderColor: selected ? color : 'var(--node-border)' }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="agent-node-badge" style={{ background: color }}>
        {data.kind}
      </div>
      <div className="agent-node-label">{data.label}</div>
      {data.description && <div className="agent-node-desc">{data.description}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
