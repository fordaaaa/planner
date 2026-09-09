import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Issue, IssuePriority, IssueStatus, Project } from './pmTypes.js';

export class ProjectNotFoundError extends Error {}
export class IssueNotFoundError extends Error {}

export interface ProjectSummary {
  slug: string;
  name: string;
  description: string;
  status: Project['status'];
  issueCounter: number;
  createdAt: string;
  updatedAt: string;
  openIssues: number;
  totalIssues: number;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: IssuePriority;
  labels?: string[];
  assignee?: string | null;
  parent?: string | null;
  status?: IssueStatus;
}

export interface UpdateIssuePatch {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  labels?: string[];
  assignee?: string | null;
  parent?: string | null;
  order?: number;
}

function safeName(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
  if (!cleaned) throw new Error('Project name must contain at least one letter, number, dash, or underscore');
  return cleaned;
}

// In-process async mutex keyed by lowercased slug so concurrent MCP
// requests can't interleave read-modify-write sequences on one file.
const tails = new Map<string, Promise<void>>();

function lockKey(slug: string): string {
  try {
    return safeName(slug).toLowerCase();
  } catch {
    return slug.toLowerCase();
  }
}

function withProjectLock<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  const key = lockKey(slug);
  const prev = tails.get(key) ?? Promise.resolve();
  const task = prev.then(() => fn());
  const tail = task.then(
    () => undefined,
    () => undefined,
  );
  tails.set(key, tail);
  tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return task;
}

function parseProject(raw: string, file: string): Project {
  try {
    return JSON.parse(raw) as Project;
  } catch (err) {
    throw new Error(`Corrupt project file ${file}: ${(err as Error).message}`);
  }
}

export function projectsDir(): string {
  return process.env.PLANNER_PROJECTS_DIR ?? join(homedir(), '.planner-projects');
}

async function ensureDir(): Promise<void> {
  await mkdir(projectsDir(), { recursive: true });
}

function projectPath(slug: string): string {
  return join(projectsDir(), `${safeName(slug)}.json`);
}

function isOpen(status: IssueStatus): boolean {
  return status !== 'done' && status !== 'cancelled';
}

async function resolveProjectPath(slug: string): Promise<string | null> {
  const exact = projectPath(slug);
  try {
    await readFile(exact, 'utf8');
    return exact;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  await ensureDir();
  const wanted = `${safeName(slug).toLowerCase()}.json`;
  let files: string[];
  try {
    files = await readdir(projectsDir());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  const byName = files.find((f) => f.toLowerCase() === wanted);
  if (byName) return join(projectsDir(), byName);
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await readFile(join(projectsDir(), f), 'utf8');
      const p = JSON.parse(raw) as Project;
      if (p.slug.toLowerCase() === safeName(slug).toLowerCase()) {
        return join(projectsDir(), f);
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function readProject(slug: string): Promise<Project> {
  const found = await resolveProjectPath(slug);
  if (!found) {
    throw new ProjectNotFoundError(`No project "${slug}"`);
  }
  const raw = await readFile(found, 'utf8');
  return parseProject(raw, found);
}

async function writeProject(project: Project): Promise<void> {
  await ensureDir();
  const target = projectPath(project.slug);
  const tmp = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(project, null, 2), 'utf8');
    await rename(tmp, target);
  } catch (err) {
    try {
      await rm(tmp, { force: true });
    } catch {
      // ignore temp cleanup errors
    }
    throw err;
  }
}

export async function createProject(name: string, description = ''): Promise<Project> {
  const slug = safeName(name);
  return withProjectLock(slug, async () => {
    await ensureDir();
    const existingPath = await resolveProjectPath(slug);
    if (existingPath) {
      const raw = await readFile(existingPath, 'utf8');
      return parseProject(raw, existingPath);
    }
    const now = new Date().toISOString();
    const project: Project = {
      slug,
      name,
      description,
      status: 'active',
      issueCounter: 0,
      createdAt: now,
      updatedAt: now,
      issues: [],
    };
    await writeProject(project);
    return project;
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await ensureDir();
  const files = await readdir(projectsDir());
  const summaries: ProjectSummary[] = [];
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await readFile(join(projectsDir(), f), 'utf8');
      const p = JSON.parse(raw) as Project;
      summaries.push({
        slug: p.slug,
        name: p.name,
        description: p.description,
        status: p.status,
        issueCounter: p.issueCounter,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        openIssues: p.issues.filter((i) => isOpen(i.status)).length,
        totalIssues: p.issues.length,
      });
    } catch {
      continue;
    }
  }
  summaries.sort((a, b) => a.slug.localeCompare(b.slug));
  return summaries;
}

export async function getProject(slug: string): Promise<Project> {
  return readProject(slug);
}

export async function deleteProject(slug: string): Promise<void> {
  return withProjectLock(slug, async () => {
    const found = await resolveProjectPath(slug);
    if (!found) {
      throw new ProjectNotFoundError(`No project "${slug}"`);
    }
    await rm(found);
  });
}

export async function createIssue(projectSlug: string, input: CreateIssueInput): Promise<Issue> {
  if (!input.title || !input.title.trim()) throw new Error('Issue title is required');
  return withProjectLock(projectSlug, async () => {
    const project = await readProject(projectSlug);
    const counter = project.issueCounter + 1;
    const key = `${project.slug.toUpperCase()}-${counter}`;
    const maxOrder = project.issues.reduce((m, i) => Math.max(m, i.order), 0);
    const now = new Date().toISOString();
    const issue: Issue = {
      key,
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      labels: input.labels ?? [],
      assignee: input.assignee ?? null,
      parent: input.parent ?? null,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      comments: [],
    };
    project.issueCounter = counter;
    project.issues.push(issue);
    project.updatedAt = now;
    await writeProject(project);
    return issue;
  });
}

export async function updateIssue(projectSlug: string, key: string, patch: UpdateIssuePatch): Promise<Issue> {
  return withProjectLock(projectSlug, async () => {
    const project = await readProject(projectSlug);
    const issue = project.issues.find((i) => i.key === key);
    if (!issue) throw new IssueNotFoundError(`No issue "${key}" in project "${projectSlug}"`);
    if (patch.title !== undefined) issue.title = patch.title;
    if (patch.description !== undefined) issue.description = patch.description;
    if (patch.status !== undefined) issue.status = patch.status;
    if (patch.priority !== undefined) issue.priority = patch.priority;
    if (patch.labels !== undefined) issue.labels = patch.labels;
    if (patch.assignee !== undefined) issue.assignee = patch.assignee;
    if (patch.parent !== undefined) issue.parent = patch.parent;
    if (patch.order !== undefined) issue.order = patch.order;
    const now = new Date().toISOString();
    issue.updatedAt = now;
    project.updatedAt = now;
    await writeProject(project);
    return issue;
  });
}

export async function addComment(projectSlug: string, key: string, author: string, text: string): Promise<Project['issues'][number]['comments'][number]> {
  if (!text || !text.trim()) throw new Error('Comment text is required');
  return withProjectLock(projectSlug, async () => {
    const project = await readProject(projectSlug);
    const issue = project.issues.find((i) => i.key === key);
    if (!issue) throw new IssueNotFoundError(`No issue "${key}" in project "${projectSlug}"`);
    const now = new Date().toISOString();
    const comment = { id: randomUUID(), author, text, createdAt: now };
    issue.comments.push(comment);
    issue.updatedAt = now;
    project.updatedAt = now;
    await writeProject(project);
    return comment;
  });
}
