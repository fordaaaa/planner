import { useRef } from 'react';

interface ToolbarProps {
  onAddNode: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  onToggleVoice: () => void;
  voiceOpen: boolean;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="5" y="1" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 7a4 4 0 0 0 8 0M7 11v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1v8m0 0L4 6m3 3 3-3M2 11.5v.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 9V1m0 0L4 4m3-3 3 3M2 11.5v.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 3.5h9M5 3.5V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 6.5v4M8.5 6.5v4M3.5 3.5l.5 8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l.5-8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Toolbar({ onAddNode, onExport, onImport, onClear, onToggleVoice, voiceOpen }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <div className="toolbar-title">Planner</div>
      <div className="toolbar-actions">
        <div className="toolbar-group">
          <button onClick={onAddNode}>
            <PlusIcon />
            Add node
          </button>
          <button onClick={onToggleVoice} className={voiceOpen ? 'primary' : ''}>
            <MicIcon />
            Voice build
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button onClick={onExport}>
            <DownloadIcon />
            Export
          </button>
          <button onClick={() => fileInputRef.current?.click()}>
            <UploadIcon />
            Import
          </button>
        </div>

        <div className="toolbar-divider" />

        <button onClick={onClear} className="danger">
          <TrashIcon />
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
