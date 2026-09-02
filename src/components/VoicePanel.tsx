import { useMemo, useState } from 'react';
import { useSpeechRecognition } from '../lib/useSpeechRecognition';
import { transcriptToGraph, VoiceGraphError } from '../lib/voiceGraph';
import type { WorkflowGraph } from '../lib/types';

interface VoicePanelProps {
  onCompile: (graph: WorkflowGraph) => void;
  onClose: () => void;
}

export default function VoicePanel({ onCompile, onClose }: VoicePanelProps) {
  const { supported, listening, transcript, start, stop, reset } = useSpeechRecognition();
  const [manualText, setManualText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const text = supported ? transcript : manualText;

  const preview = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return { graph: transcriptToGraph(text), error: null };
    } catch (err) {
      return { graph: null, error: err instanceof VoiceGraphError ? err.message : 'Could not parse command' };
    }
  }, [text]);

  const handleCompile = () => {
    if (!preview?.graph) {
      setError(preview?.error ?? 'Nothing to compile yet');
      return;
    }
    setError(null);
    onCompile(preview.graph);
  };

  return (
    <div className="voice-panel">
      <div className="voice-panel-header">
        <span>Voice build — say "start", "agent", "subagent", "end"</span>
        <button onClick={onClose}>Close</button>
      </div>

      <div className="voice-panel-body">
        {supported ? (
          <div className="voice-controls">
            <button onClick={listening ? stop : start} className={listening ? 'danger' : ''}>
              {listening ? '● Listening… (click to stop)' : '🎤 Start listening'}
            </button>
            <button
              onClick={() => {
                reset();
                setError(null);
              }}
            >
              Clear
            </button>
          </div>
        ) : (
          <textarea
            rows={3}
            placeholder='This browser has no speech recognition — type commands instead, e.g. "start build the website agent build website subagent check backend subagent check frontend end"'
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />
        )}

        <div className="voice-transcript">{text || <span className="voice-placeholder">Nothing heard yet…</span>}</div>

        {preview?.error && <div className="voice-error">{preview.error}</div>}
        {error && !preview?.error && <div className="voice-error">{error}</div>}

        <button className="voice-compile" onClick={handleCompile} disabled={!preview?.graph}>
          Compile to workflow
        </button>
      </div>
    </div>
  );
}
