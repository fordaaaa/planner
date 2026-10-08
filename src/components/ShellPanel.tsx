import { useEffect, useRef, useState } from 'react';

export interface ShellResult {
  lines: string[];
  clear?: boolean;
}

interface ShellPanelProps {
  onRun: (line: string) => ShellResult;
  onClose: () => void;
}

interface TranscriptEntry {
  cmd: string;
  out: string[];
}

const MAX_ENTRIES = 200;
const MAX_HISTORY = 50;

export default function ShellPanel({ onRun, onClose }: ShellPanelProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    { cmd: '', out: ['planner shell — type `help` to start.'] },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [transcript]);

  const submit = () => {
    const line = draft;
    if (!line.trim()) return;
    const result = onRun(line);
    setHistory((h) => [...h.slice(-MAX_HISTORY + 1), line]);
    setHistIdx(null);
    setDraft('');
    if (result.clear) {
      setTranscript([]);
      return;
    }
    setTranscript((t) => [...t.slice(-MAX_ENTRIES + 1), { cmd: line, out: result.lines }]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      const next = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setDraft(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx === null) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(null);
        setDraft('');
      } else {
        setHistIdx(next);
        setDraft(history[next]);
      }
    }
  };

  return (
    <div className="shell-panel" onClick={() => inputRef.current?.focus()}>
      <div className="shell-header">
        <span className="shell-title">
          <span className="shell-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          planner shell
        </span>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="shell-body" ref={bodyRef}>
        {transcript.map((entry, i) => (
          <div key={i} className="shell-entry">
            {entry.cmd && <div className="shell-cmd"><span className="shell-prompt">&gt;_</span> {entry.cmd}</div>}
            {entry.out.map((line, j) => (
              <div key={j} className="shell-out">{line}</div>
            ))}
          </div>
        ))}
        <div className="shell-input-row">
          <span className="shell-prompt">&gt;_</span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setHistIdx(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="agent build the api · block plan · template feature-loop · help"
            aria-label="Shell command"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
