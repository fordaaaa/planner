import { useRef } from 'react';

interface ToolbarProps {
  onAddNode: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  onToggleVoice: () => void;
  voiceOpen: boolean;
  shellOpen?: boolean;
  onToggleShell?: () => void;
  pmActive?: boolean;
  onTogglePm?: () => void;
  blocksOpen?: boolean;
  onToggleBlocks?: () => void;
  onExportMarkdown?: () => void;
  onExportPrompt?: () => void;
  onCopyChain?: () => void;
  persistOn?: boolean;
  onTogglePersist?: () => void;
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

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 4.5 5.5 7l-3 2.5M7 10.5h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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

function BoardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 1.5v11M9.5 1.5v11" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function BlocksIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="8" width="4.5" height="4.5" rx="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.5 4.5v-2a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 1.5h5l2 2v9h-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8.5 1.5v2h2M5.5 7h3M5.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 1.5h6v11l-3-2.2-3 2.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function MarkdownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10v7H2zM4 5.5v3l1.5-1.5L7 8.5v-3M9 5.5v3h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Toolbar({ onAddNode, onExport, onImport, onClear, onToggleVoice, voiceOpen, shellOpen, onToggleShell, pmActive, onTogglePm, blocksOpen, onToggleBlocks, onExportMarkdown, onExportPrompt, onCopyChain, persistOn, onTogglePersist }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="toolbar">
      <div className="toolbar-actions">
        <div className="toolbar-group">
          <button onClick={onAddNode} title="Add a blank step after the selection">
            <PlusIcon />
            <span className="btn-label">Add node</span>
          </button>
          <button
            onClick={onToggleVoice}
            className={voiceOpen ? 'primary' : ''}
            aria-pressed={voiceOpen}
            title="Build the workflow from voice or typed commands"
          >
            <MicIcon />
            <span className="btn-label">Voice build</span>
          </button>
          <button
            onClick={onToggleShell}
            className={shellOpen ? 'primary' : ''}
            aria-pressed={shellOpen}
            title="Build the workflow from a command shell"
          >
            <TerminalIcon />
            <span className="btn-label">Shell</span>
          </button>
          <button
            onClick={onTogglePm}
            className={pmActive ? 'primary' : ''}
            aria-pressed={pmActive}
            title="Open project boards"
          >
            <BoardIcon />
            <span className="btn-label">Projects</span>
          </button>
          <button
            onClick={onToggleBlocks}
            className={blocksOpen ? 'primary' : ''}
            aria-pressed={blocksOpen}
            title="Show or hide the building-blocks panel"
          >
            <BlocksIcon />
            <span className="btn-label">Blocks</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button onClick={onExport} title="Download workflow as JSON">
            <DownloadIcon />
            <span className="btn-label">JSON</span>
          </button>
          <button onClick={onExportMarkdown} title="Download plan as PLAN.md markdown">
            <MarkdownIcon />
            <span className="btn-label">Plan.md</span>
          </button>
          <button onClick={onExportPrompt} title="Download the whole workflow as one paste-ready prompt file">
            <DocIcon />
            <span className="btn-label">Prompt</span>
          </button>
          <button onClick={onCopyChain} title="Copy the full prompt chain to clipboard">
            <CopyIcon />
            <span className="btn-label">Copy prompts</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} title="Import a workflow JSON file">
            <UploadIcon />
            <span className="btn-label">Import</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            onClick={onTogglePersist}
            className={persistOn ? 'primary' : ''}
            aria-pressed={persistOn}
            title={persistOn ? 'Saving in this browser — click to switch to session-only' : 'Session-only — click to remember in this browser'}
          >
            <BookmarkIcon />
            <span className="btn-label">{persistOn ? 'Saved' : 'Session'}</span>
          </button>
          <button onClick={onClear} className="danger" title="Remove all nodes and reset the canvas">
            <TrashIcon />
            <span className="btn-label">Clear</span>
          </button>
        </div>

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
