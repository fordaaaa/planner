import { mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ProjectNotFoundError,
  addComment,
  createIssue,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateIssue,
} from './pmStore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// pmStore reads PLANNER_PROJECTS_DIR lazily per call, so setting it here
// (after import, before any store call) safely isolates tests to a temp dir.
beforeEach(() => {
  process.env.PLANNER_PROJECTS_DIR = mkdtempSync(join(tmpdir(), 'pm-test-'));
});

describe('pmStore', () => {
  it('createProject + listProjects counts', async () => {
    await createProject('Alpha', 'first');
    let list = await listProjects();
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe('Alpha');
    expect(list[0].openIssues).toBe(0);
    expect(list[0].totalIssues).toBe(0);

    await createProject('Beta');
    list = await listProjects();
    expect(list).toHaveLength(2);
  });

  it('createIssue key increments (PROJ-1, PROJ-2)', async () => {
    await createProject('Proj');
    const a = await createIssue('Proj', { title: 'first' });
    const b = await createIssue('Proj', { title: 'second' });
    expect(a.key).toBe('PROJ-1');
    expect(b.key).toBe('PROJ-2');
    expect(a.order).toBe(1);
    expect(b.order).toBe(2);
  });

  it('updateIssue changes status and bumps updatedAt', async () => {
    await createProject('Proj');
    const created = await createIssue('Proj', { title: 'work' });
    await sleep(5);
    const updated = await updateIssue('Proj', created.key, { status: 'in_progress' });
    expect(updated.status).toBe('in_progress');
    expect(updated.updatedAt).not.toBe(created.updatedAt);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it('addComment round-trips', async () => {
    await createProject('Proj');
    const issue = await createIssue('Proj', { title: 'discuss' });
    const comment = await addComment('Proj', issue.key, 'alice', 'hello world');
    expect(comment.author).toBe('alice');
    expect(comment.text).toBe('hello world');
    expect(comment.id).toBeTruthy();

    const project = await getProject('Proj');
    const found = project.issues.find((i) => i.key === issue.key)!;
    expect(found.comments).toHaveLength(1);
    expect(found.comments[0].text).toBe('hello world');
  });

  it('getProject unknown slug throws ProjectNotFoundError', async () => {
    await expect(getProject('nope-missing-xyz')).rejects.toThrow(ProjectNotFoundError);
  });

  it('mixed-case lookup resolves case-insensitively, keeps stored slug', async () => {
    const created = await createProject('PM System');
    expect(created.slug).toBe('PM-System');

    const viaLower = await getProject('pm-system');
    expect(viaLower.slug).toBe('PM-System');

    const issue = await createIssue('pm-system', { title: 'lowercase lookup' });
    expect(issue.key).toBe('PM-SYSTEM-1');

    await deleteProject('PM-SYSTEM');
    await expect(getProject('PM-System')).rejects.toThrow(ProjectNotFoundError);
  });

  it('createProject twice returns same project with issues intact', async () => {
    const first = await createProject('PM System');
    await createIssue('PM-System', { title: 'keep me' });

    const second = await createProject('pm system');
    expect(second.slug).toBe(first.slug);

    const project = await getProject('pm-system');
    expect(project.issues).toHaveLength(1);
    expect(project.issues[0].title).toBe('keep me');
    expect(project.issueCounter).toBe(1);

    const list = await listProjects();
    expect(list.filter((p) => p.slug.toLowerCase() === 'pm-system')).toHaveLength(1);
  });

  it('concurrent createIssue serializes without lost updates or torn writes', async () => {
    await createProject('Race');
    const N = 20;
    await Promise.all(
      Array.from({ length: N }, (_, i) => createIssue('Race', { title: `issue ${i + 1}` })),
    );

    const project = await getProject('Race');
    expect(project.issueCounter).toBe(N);
    expect(project.issues).toHaveLength(N);
    const keys = project.issues.map((i) => i.key);
    expect(new Set(keys).size).toBe(N);
    expect([...keys].sort()).toEqual(
      Array.from({ length: N }, (_, i) => `RACE-${i + 1}`).sort(),
    );

    const raw = await readFile(join(process.env.PLANNER_PROJECTS_DIR!, 'Race.json'), 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.issueCounter).toBe(N);
    expect(parsed.issues).toHaveLength(N);
  });
});
