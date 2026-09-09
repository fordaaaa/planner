import { useCallback, useEffect, useState } from 'react';
import { createProject, isOfflineError, listProjects } from './api';
import type { ProjectSummary } from './types';
import './pm.css';

interface ProjectsViewProps {
  onOpenProject: (slug: string) => void;
  onBack?: () => void;
}

export default function ProjectsView({ onOpenProject, onBack }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listProjects();
      setProjects(list);
      setOffline(false);
    } catch (err) {
      if (isOfflineError(err)) {
        setOffline(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating || offline) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createProject(trimmed, description.trim());
      setProjects((prev) => [...prev, created]);
      setName('');
      setDescription('');
    } catch (err) {
      if (isOfflineError(err)) {
        setOffline(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create project');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="pm-view">
      {offline && (
        <div className="pm-offline-banner" role="alert">
          <span>
            PM server not running — start it with <code>npm run pm:serve</code>
          </span>
          <button onClick={() => void load()}>Retry</button>
        </div>
      )}
      <div className="pm-scroll">
        <div className="pm-header-row">
          <div>
            <h2 className="pm-title">Projects</h2>
            <p className="pm-subtitle">{projects.length} project(s)</p>
          </div>
          {onBack && (
            <button className="pm-back-btn" onClick={onBack}>
              ← Back to canvas
            </button>
          )}
        </div>

        {error && <div className="pm-error">{error}</div>}

        <form className="pm-new-form" onSubmit={(e) => void handleCreate(e)}>
          <h3>New project</h3>
          <label className="pm-field">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              disabled={offline || creating}
              required
            />
          </label>
          <label className="pm-field">
            Description (optional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              disabled={offline || creating}
            />
          </label>
          <div className="pm-form-row">
            <button type="submit" className="pm-btn-primary" disabled={offline || creating || !name.trim()}>
              {creating ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>

        {loading ? (
          <p className="pm-empty">Loading projects…</p>
        ) : projects.length === 0 && !offline ? (
          <p className="pm-empty">No projects yet — create one above.</p>
        ) : (
          <div className="pm-grid">
            {projects.map((p) => (
              <button key={p.slug} className="pm-card" onClick={() => onOpenProject(p.slug)}>
                <span className="pm-card-name">{p.name}</span>
                {p.description && <span className="pm-card-desc">{p.description}</span>}
                <span className="pm-card-meta">
                  <span className="pm-chip">{p.status}</span>
                  <span className="pm-chip-open pm-chip">
                    {p.openIssues}/{p.totalIssues} open
                  </span>
                  <span>Open →</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
