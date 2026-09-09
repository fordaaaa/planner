import { useEffect, useState } from 'react';
import { addComment, isOfflineError, patchIssue } from './api';
import type { Issue, IssuePriority, IssueStatus } from './types';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, statusLabel } from './types';
import './pm.css';

interface IssueDrawerProps {
  slug: string;
  issue: Issue;
  issues: Issue[];
  disabled?: boolean;
  onClose: () => void;
  onUpdated: (issue: Issue) => void;
  onOpenIssue: (key: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function IssueDrawer({
  slug,
  issue,
  issues,
  disabled,
  onClose,
  onUpdated,
  onOpenIssue,
}: IssueDrawerProps) {
  const [title, setTitle] = useState(issue.title);
  const [assignee, setAssignee] = useState(issue.assignee ?? '');
  const [labelsText, setLabelsText] = useState(issue.labels.join(', '));
  const [description, setDescription] = useState(issue.description);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(issue.title);
    setAssignee(issue.assignee ?? '');
    setLabelsText(issue.labels.join(', '));
    setDescription(issue.description);
    setError(null);
  }, [issue.key, issue.title, issue.assignee, issue.labels, issue.description]);

  const mutate = async (patch: Parameters<typeof patchIssue>[2]) => {
    if (disabled) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchIssue(slug, issue.key, patch);
      onUpdated(updated);
    } catch (err) {
      if (!isOfflineError(err)) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const parseLabels = (raw: string): string[] =>
    raw
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

  const parent = issue.parent ? (issues.find((i) => i.key === issue.parent) ?? null) : null;
  const subtasks = issues.filter((i) => i.parent === issue.key);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || saving || disabled) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await addComment(slug, issue.key, 'you', text);
      onUpdated(updated);
      setCommentText('');
    } catch (err) {
      if (!isOfflineError(err)) {
        setError(err instanceof Error ? err.message : 'Failed to add comment');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="pm-drawer-backdrop" onClick={onClose} />
      <aside className="pm-drawer" role="dialog" aria-label={`Issue ${issue.key}`}>
        <div className="pm-drawer-head">
          <span className="pm-issue-key">{issue.key}</span>
          <button className="pm-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="pm-drawer-body">
          {error && <div className="pm-error">{error}</div>}

          <label className="pm-field">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title.trim() && title !== issue.title) void mutate({ title: title.trim() });
                else setTitle(issue.title);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              disabled={disabled || saving}
            />
          </label>

          <div className="pm-select-row">
            <label className="pm-field">
              Status
              <select
                value={issue.status}
                onChange={(e) => void mutate({ status: e.target.value as IssueStatus })}
                disabled={disabled || saving}
              >
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="pm-field">
              Priority
              <select
                value={issue.priority}
                onChange={(e) => void mutate({ priority: e.target.value as IssuePriority })}
                disabled={disabled || saving}
              >
                {ISSUE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="pm-field">
            Assignee
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              onBlur={() => {
                const next = assignee.trim() || null;
                if (next !== issue.assignee) void mutate({ assignee: next });
              }}
              placeholder="@handle"
              disabled={disabled || saving}
            />
          </label>

          <label className="pm-field">
            Labels (comma separated)
            <input
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              onBlur={() => {
                const next = parseLabels(labelsText);
                if (JSON.stringify(next) !== JSON.stringify(issue.labels)) void mutate({ labels: next });
              }}
              placeholder="bug, ui"
              disabled={disabled || saving}
            />
          </label>

          <label className="pm-field">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={disabled || saving}
            />
          </label>
          <div className="pm-form-row">
            <button
              className="pm-btn-primary"
              onClick={() => void mutate({ description })}
              disabled={disabled || saving || description === issue.description}
            >
              Save description
            </button>
          </div>

          {issue.parent && (
            <div>
              <h4 className="pm-section-title">Parent</h4>
              {parent ? (
                <button className="pm-parent-link" onClick={() => onOpenIssue(parent.key)}>
                  ↑ {parent.key} — {parent.title}
                </button>
              ) : (
                <span className="pm-assignee">↑ {issue.parent}</span>
              )}
            </div>
          )}

          <div>
            <h4 className="pm-section-title">Subtasks ({subtasks.length})</h4>
            <div className="pm-comments" style={{ marginTop: 8 }}>
              {subtasks.length === 0 ? (
                <span className="pm-assignee">No subtasks.</span>
              ) : (
                subtasks.map((s) => (
                  <button key={s.key} className="pm-subtask" onClick={() => onOpenIssue(s.key)}>
                    {s.key} — {s.title}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="pm-section-title">Comments ({issue.comments.length})</h4>
            <div className="pm-comments" style={{ marginTop: 8 }}>
              {issue.comments.length === 0 ? (
                <span className="pm-assignee">No comments yet.</span>
              ) : (
                issue.comments.map((c) => (
                  <div key={c.id} className="pm-comment">
                    <div className="pm-comment-meta">
                      <strong>{c.author}</strong> · {formatTime(c.createdAt)}
                    </div>
                    <p>{c.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={(e) => void handleAddComment(e)}>
            <label className="pm-field">
              Add comment as you
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                placeholder="Write a comment…"
                disabled={disabled || saving}
              />
            </label>
            <div className="pm-form-row" style={{ marginTop: 8 }}>
              <button
                type="submit"
                className="pm-btn"
                disabled={disabled || saving || !commentText.trim()}
              >
                Add comment
              </button>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}
