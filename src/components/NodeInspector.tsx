import { NODE_KINDS, type WorkflowNode, type WorkflowNodeData } from '../lib/types';

interface NodeInspectorProps {
  node: WorkflowNode | null;
  onChange: (id: string, data: Partial<WorkflowNodeData>) => void;
  onDelete: (id: string) => void;
}

export default function NodeInspector({ node, onChange, onDelete }: NodeInspectorProps) {
  if (!node) {
    return (
      <div className="inspector inspector-empty">
        <p>Select a node to edit its properties.</p>
      </div>
    );
  }

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
          rows={6}
          value={node.data.description}
          onChange={(e) => onChange(node.id, { description: e.target.value })}
        />
      </label>

      <button className="danger" onClick={() => onDelete(node.id)}>
        Delete node
      </button>
    </div>
  );
}
