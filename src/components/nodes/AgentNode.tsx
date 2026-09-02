import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowNode } from '../../lib/types';

const KIND_COLORS: Record<string, string> = {
  start: '#16a34a',
  agent: '#7c3aed',
  subagent: '#a78bfa',
  tool: '#d97706',
  decision: '#db2777',
  end: '#dc2626',
};

export default function AgentNode({ data, selected }: NodeProps<WorkflowNode>) {
  const color = KIND_COLORS[data.kind] ?? '#6366f1';

  return (
    <div
      className="agent-node"
      style={{
        borderColor: selected ? color : 'var(--node-border)',
        boxShadow: selected ? `var(--shadow), 0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)` : undefined,
      }}
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
