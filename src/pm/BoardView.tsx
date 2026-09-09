import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createIssue,
  getProject,
  isOfflineError,
  patchIssue,
} from './api';
import type { Issue, IssuePriority, IssueStatus, ProjectFull } from './types';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, statusLabel } from './types';
import IssueDrawer from './IssueDrawer';
import './pm.css';

interface BoardViewProps {
  slug: string;
  onBack: () => void;
}

function sameIssues(a: Issue[], b: Issue[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function BoardView({ slug, onBack }: BoardViewProps) {
  const [project, setProject] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<IssueStatus | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStatus, setCreateStatus] = useState<IssueStatus>('todo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [labelsText, setLabelsText] = useState('');
  const [assignee, setAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(0);
  const projectRef = useRef<ProjectFull | null>(null);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const applyRemote = useCallback((next: ProjectFull) => {
    setProject((prev) => {
      if (
        prev &&
        prev.name === next.name &&
        prev.description === next.description &&
        prev.status === next.status &&
        sameIssues(prev.issues, next.issues)
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const next = await getProject(slug);
        applyRemote(next);
        setOffline(false);
      } catch (err) {
        if (isOfflineError(err)) {
          setOffline(true);
        } else if (!silent) {
          setError(err instanceof Error ? err.message : 'Failed to load project');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [slug, applyRemote],
  );

  useEffect(() => {
    setProject(null);
    setSelectedKey(null);
    setError(null);
    void load(false);
  }, [slug, load]);

  // Poll every 5s to pick up changes made by an AI agent via MCP.
  // Reconcile only when no mutation is in flight and the data changed.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (inFlight.current === 0 && document.visibilityState === 'visible') {
        void load(true);
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const handleDrop = useCallback(
    async (status: IssueStatus, key: string) => {
      setDragOver(null);
      const current = projectRef.current;
      if (!current || offline) return;
      const issue = current.issues.find((i) => i.key === key);
      if (!issue || issue.status === status) return;
      const prev = current.issues;
      setProject({ ...current, issues: prev.map((i) => (i.key === key ? { ...i, status } : i)) });
      inFlight.current += 1;
      try {
        const updated = await patchIssue(slug, key, { status });
        setProject((p) =>
          p ? { ...p, issues: p.issues.map((i) => (i.key === key ? updated : i)) } : p,
        );
        setError(null);
      } catch (err) {
        // Revert the optimistic move.
        setProject((p) => (p ? { ...p, issues: prev } : p));
        if (isOfflineError(err)) {
          setOffline(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to move issue');
        }
      } finally {
        inFlight.current -= 1;
      }
    },
    [slug, offline],
  );

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setLabelsText('');
    setAssignee('');
  };

  const openCreate = (status: IssueStatus) => {
    setCreateStatus(status);
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving || offline) return;
    setSaving(true);
    setError(null);
    inFlight.current += 1;
    try {
      const labels = labelsText
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const created = await createIssue(slug, {
        title: trimmed,
        description: description.trim() || undefined,
        priority,
        labels,
        assignee: assignee.trim() || undefined,
        status: createStatus,
      });
      setProject((p) => (p ? { ...p, issues: [...p.issues, created] } : p));
      resetCreateForm();
      setShowCreate(false);
    } catch (err) {
      if (isOfflineError(err)) {
        setOffline(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create issue');
      }
    } finally {
      inFlight.current -= 1;
      setSaving(false);
    }
  };

  const issues = project?.issues ?? [];
  const selected = selectedKey ? (issues.find((i) => i.key === selectedKey) ?? null) : null;

  return (
    <div className="pm-view">
      {offline && (
        <div className="pm-offline-banner" role="alert">
          <span>
            PM server not running — start it with <code>npm run pm:serve</code>
          </span>
          <button onClick={() => void load(false)}>Retry</button>
        </div>
      )}
      <div className="pm-board-wrap">
        <div className="pm-board-header">
          <button className="pm-back-btn" onClick={onBack}>
            ← Projects
          </button>
          <div className="pm-title-row">
            <h2 className="pm-title">{project ? project.name : slug}</h2>
            {project?.description && <span className="pm-subtitle">{project.description}</span>}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="pm-btn-primary" onClick={() => openCreate('todo')} disabled={offline || !project}>
              + New issue
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 20px 0' }}>
            <div className="pm-error">{error}</div>
          </div>
        )}

        {showCreate && (
          <form className="pm-create-form" style={{ marginTop: 12 }} onSubmit={(e) => void handleCreate(e)}>
            <div className="pm-field">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Issue title (required)"
                required
                disabled={offline || saving}
              />
            </div>
            <div className="pm-select-row">
              <label className="pm-field">
                Status
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value as IssueStatus)}
                  disabled={offline || saving}
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
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as IssuePriority)}
                  disabled={offline || saving}
                >
                  {ISSUE_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="pm-select-row">
              <label className="pm-field">
                Assignee (optional)
                <input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="@handle"
                  disabled={offline || saving}
                />
              </label>
              <label className="pm-field">
                Labels, comma separated
                <input
                  value={labelsText}
                  onChange={(e) => setLabelsText(e.target.value)}
                  placeholder="bug, ui"
                  disabled={offline || saving}
                />
              </label>
            </div>
            <label className="pm-field">
              Description (optional)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={offline || saving}
              />
            </label>
            <div className="pm-form-row">
              <button type="submit" className="pm-btn-primary" disabled={offline || saving || !title.trim()}>
                {saving ? 'Creating…' : 'Create issue'}
              </button>
              <button
                type="button"
                className="pm-btn"
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="pm-empty" style={{ padding: '20px' }}>
            Loading board…
          </p>
        ) : (
          <div className="pm-board-scroll">
            {ISSUE_STATUSES.map((status) => {
              const col = issues
                .filter((i) => i.status === status)
                .sort((a, b) => a.order - b.order);
              return (
                <div
                  key={status}
                  className={`pm-column${dragOver === status ? ' drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(status);
                  }}
                  onDragLeave={() => setDragOver((d) => (d === status ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const key = e.dataTransfer.getData('text/plain');
                    if (key) void handleDrop(status, key);
                  }}
                >
                  <div className="pm-column-head">
                    <span>{statusLabel(status)}</span>
                    <span className="pm-count">{col.length}</span>
                  </div>
                  <div className="pm-column-body">
                    {col.map((issue) => (
                      <button
                        key={issue.key}
                        className="pm-issue"
                        draggable={!offline}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', issue.key);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => setSelectedKey(issue.key)}
                      >
                        <span className="pm-issue-key">{issue.key}</span>
                        <span className="pm-issue-title">{issue.title}</span>
                        <span className="pm-issue-tags">
                          <span className={`pm-priority pm-priority-${issue.priority}`}>
                            {issue.priority}
                          </span>
                          {issue.labels.map((l) => (
                            <span key={l} className="pm-label">
                              {l}
                            </span>
                          ))}
                        </span>
                        {issue.assignee && <span className="pm-assignee">@{issue.assignee}</span>}
                      </button>
                    ))}
                    <button className="pm-col-add" onClick={() => openCreate(status)} disabled={offline}>
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && project && (
        <IssueDrawer
          slug={slug}
          issue={selected}
          issues={issues}
          disabled={offline}
          onClose={() => setSelectedKey(null)}
          onUpdated={(updated) =>
            setProject((p) =>
              p ? { ...p, issues: p.issues.map((i) => (i.key === updated.key ? updated : i)) } : p,
            )
          }
          onOpenIssue={(key) => setSelectedKey(key)}
        />
      )}
    </div>
  );
}
