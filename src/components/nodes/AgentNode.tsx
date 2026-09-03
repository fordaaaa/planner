import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowNode } from '../../lib/types';

const KIND_COLORS: Record<string, string> = {
  start: '#0f766e',
  agent: '#b1490f',
  subagent: '#d98a52',
  tool: '#4b6a8a',
  decision: '#8a4a6b',
  end: '#8f2d20',
};

interface AgentNodeProps extends NodeProps<WorkflowNode> {
  onAddChild?: (parentId: string) => void;
}

export default function AgentNode({ id, data, selected, onAddChild }: AgentNodeProps) {
  const color = KIND_COLORS[data.kind] ?? '#b1490f';

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
      {onAddChild && (
        <button
          type="button"
          className="agent-node-add-child nodrag"
          title="Add connected step"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(id);
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
