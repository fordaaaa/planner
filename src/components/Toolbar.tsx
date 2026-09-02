import { useRef } from 'react';

interface ToolbarProps {
  onAddNode: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  onToggleVoice: () => void;
  voiceOpen: boolean;
}

export default function Toolbar({ onAddNode, onExport, onImport, onClear, onToggleVoice, voiceOpen }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <div className="toolbar-title">Planner</div>
      <div className="toolbar-actions">
        <button onClick={onAddNode}>+ Add node</button>
        <button onClick={onToggleVoice} className={voiceOpen ? 'active' : ''}>
          🎤 Voice build
        </button>
        <button onClick={onExport}>Export JSON</button>
        <button onClick={() => fileInputRef.current?.click()}>Import JSON</button>
        <button onClick={onClear} className="danger">
          Clear
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
