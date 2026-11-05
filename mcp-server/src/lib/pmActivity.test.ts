import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ProjectNotFoundError,
  createIssue,
  createProject,
  getProject,
  listActivity,
  logActivity,
} from './pmStore';

// pmStore reads PLANNER_PROJECTS_DIR lazily per call, so setting it here
// (after import, before any store call) safely isolates tests to a temp dir.
beforeEach(() => {
  process.env.PLANNER_PROJECTS_DIR = mkdtempSync(join(tmpdir(), 'pm-activity-test-'));
});

describe('logActivity (explicit agent notes)', () => {
  it('appends an agent_note entry tied to an issue', async () => {
    await createProject('Proj');
    const issue = await createIssue('Proj', { title: 'track me' });
    const entry = await logActivity('Proj', {
      actor: 'agent',
      detail: 'Started investigation of flaky test',
      issueKey: issue.key,
    });

    expect(entry.action).toBe('agent_note');
    expect(entry.actor).toBe('agent');
    expect(entry.issueKey).toBe(issue.key);
    expect(entry.detail).toBe('Started investigation of flaky test');
    expect(entry.id).toBeTruthy();
    expect(entry.at).toBeTruthy();
  });

  it('defaults the actor to "agent"', async () => {
    await createProject('Proj');
    const entry = await logActivity('Proj', { detail: 'heartbeat' });
    expect(entry.actor).toBe('agent');
    expect(entry.issueKey).toBeUndefined();
  });

  it('rejects empty or whitespace-only details', async () => {
    await createProject('Proj');
    await expect(logActivity('Proj', { detail: '   ' })).rejects.toThrow();
    await expect(logActivity('Proj', { detail: '' })).rejects.toThrow();
  });

  it('throws ProjectNotFoundError for an unknown slug', async () => {
    await expect(logActivity('nope-missing-xyz', { detail: 'hi' })).rejects.toThrow(
      ProjectNotFoundError,
    );
  });

  it('appears in listActivity newest-first and in getProject.activity', async () => {
    await createProject('Proj');
    await logActivity('Proj', { detail: 'first note' });
    await logActivity('Proj', { detail: 'second note' });

    const activity = await listActivity('Proj');
    const notes = activity.filter((a) => a.action === 'agent_note');
    expect(notes.map((n) => n.detail)).toEqual(['second note', 'first note']);

    const project = await getProject('Proj');
    expect(project.activity?.some((a) => a.detail === 'first note')).toBe(true);
  });

  it('persists notes across a reload of the project file', async () => {
    await createProject('Proj');
    await logActivity('Proj', { detail: 'remember me' });

    const project = await getProject('Proj');
    expect(project.activity?.some((a) => a.detail === 'remember me')).toBe(true);
  });
});
