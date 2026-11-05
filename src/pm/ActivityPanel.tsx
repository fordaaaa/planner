import { useCallback, useEffect, useState } from 'react';
import { fetchActivity, isOfflineError, logActivity } from './api';
import { activityActionLabel, formatRelativeTime } from './activity';
import type { ActivityEntry } from './types';

interface ActivityPanelProps {
  slug: string;
}

export default function ActivityPanel({ slug }: ActivityPanelProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntries(await fetchActivity(slug, 20));
      setError(null);
    } catch (err) {
      if (!isOfflineError(err)) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } else {
        setError('PM server not running');
      }
    }
  }, [slug]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const detail = note.trim();
    if (!detail || saving) return;
    setSaving(true);
    setError(null);
    try {
      await logActivity(slug, detail, undefined, 'you');
      setNote('');
      await load();
    } catch (err) {
      if (!isOfflineError(err)) {
        setError(err instanceof Error ? err.message : 'Failed to add note');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="pm-activity" aria-label="Agent activity">
      <div className="pm-activity-head">Agent activity</div>
      {error && <div className="pm-activity-error">{error}</div>}
      {!error && entries.length === 0 && <div className="pm-activity-empty">No activity yet.</div>}
      <ul className="pm-activity-list">
        {entries.map((e) => (
          <li key={e.id} className="pm-activity-item">
            <span className="pm-activity-time" title={new Date(e.at).toLocaleString()}>
              {formatRelativeTime(e.at)}
            </span>
            <span className="pm-activity-action">{activityActionLabel(e.action)}</span>
            <span className="pm-activity-body">
              <strong>{e.actor}</strong> {e.issueKey ? `${e.issueKey} — ` : ''}
              {e.detail}
            </span>
          </li>
        ))}
      </ul>
      <form className="pm-activity-note" onSubmit={(e) => void handleAddNote(e)}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for agents…"
          aria-label="Add activity note"
          disabled={saving}
        />
        <button type="submit" className="pm-btn" disabled={saving || !note.trim()}>
          Add note
        </button>
      </form>
    </aside>
  );
}
