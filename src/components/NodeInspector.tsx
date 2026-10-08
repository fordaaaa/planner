import { useState } from 'react';
import { NODE_KINDS, type WorkflowNode, type WorkflowNodeData } from '../lib/types';
import { BLOCKS } from '../lib/blocks';

interface NodeInspectorProps {
  node: WorkflowNode | null;
  onChange: (id: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (id: string) => void;
}

export default function NodeInspector({ node, onChange, onDelete }: NodeInspectorProps) {
  const [copied, setCopied] = useState(false);
  if (!node) {
    return (
      <div className="inspector inspector-empty">
        <p>Select a node to edit its properties.</p>
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(node.data.description || node.data.label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  const handleApplyBlock = (blockId: string) => {
    const block = BLOCKS.find((b) => b.id === blockId);
    if (!block) return;
    onChange(node.id, { label: block.label, kind: block.kind, description: block.prompt });
  };

  return (
    <div className="inspector">
      <h3>Node properties</h3>

      <label>
        Label
        <input
          value={node.data.label}
          onChange={(e) => onChange(node.id, { label: e.target.value })}
        />
      </label>

      <label>
        Kind
        <select
          value={node.data.kind}
          onChange={(e) => onChange(node.id, { kind: e.target.value as WorkflowNodeData['kind'] })}
        >
          {NODE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>

      <label>
        Description
        <textarea
          rows={10}
          value={node.data.description}
          placeholder="Paste the agent prompt for this step…"
          onChange={(e) => onChange(node.id, { description: e.target.value })}
        />
      </label>

      <div className="inspector-row">
        <button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy prompt'}</button>
      </div>

      <label>
        Apply building block
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) handleApplyBlock(e.target.value);
          }}
        >
          <option value="">Replace with a block…</option>
          {BLOCKS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
      </label>

      <button className="danger" onClick={() => onDelete(node.id)}>
        Delete node
      </button>
    </div>
  );
}
