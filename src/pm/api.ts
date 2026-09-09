import type { Issue, ProjectFull, ProjectSummary } from './types';

export interface PmApiError extends Error {
  offline?: boolean;
  httpStatus?: number;
}

export function getApiBase(): string {
  try {
    const override = localStorage.getItem('pmApiBase');
    if (override && override.trim().length > 0) return override.trim().replace(/\/$/, '');
  } catch {
    // localStorage unavailable (private mode) — fall through to default.
  }
  return 'http://127.0.0.1:7808';
}

function toPmError(err: unknown, fallback: string): PmApiError {
  if (err instanceof Error) {
    const e = err as PmApiError;
    // fetch() rejects with TypeError on network failure / refused connection.
    if (err instanceof TypeError) e.offline = true;
    if (!e.message) e.message = fallback;
    return e;
  }
  const e = new Error(fallback) as PmApiError;
  e.offline = true;
  return e;
}

function isNetworkFailure(status: number | undefined, code: string | undefined): boolean {
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') return true;
  void status;
  return false;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err: unknown) {
    const e = toPmError(err, `Cannot reach PM server at ${base}`);
    e.offline = true;
    throw e;
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      if (typeof body?.error === 'string' && body.error) message = body.error;
      else if (typeof body?.message === 'string' && body.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    const e = new Error(message) as PmApiError;
    e.httpStatus = res.status;
    if (isNetworkFailure(res.status, undefined)) e.offline = true;
    throw e;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>('/api/projects');
}

export async function createProject(name: string, description?: string): Promise<ProjectSummary> {
  return request<ProjectSummary>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description: description ?? '' }),
  });
}

export async function getProject(slug: string): Promise<ProjectFull> {
  return request<ProjectFull>(`/api/projects/${encodeURIComponent(slug)}`);
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: string;
  labels?: string[];
  assignee?: string | null;
  parent?: string | null;
  status?: string;
}

export async function createIssue(slug: string, input: CreateIssueInput): Promise<Issue> {
  return request<Issue>(`/api/projects/${encodeURIComponent(slug)}/issues`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export type PatchIssueInput = Partial<
  Pick<Issue, 'status' | 'priority' | 'title' | 'description' | 'assignee' | 'labels' | 'order'>
>;

export async function patchIssue(slug: string, key: string, patch: PatchIssueInput): Promise<Issue> {
  return request<Issue>(`/api/projects/${encodeURIComponent(slug)}/issues/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function addComment(
  slug: string,
  key: string,
  author: string,
  text: string,
): Promise<Issue> {
  return request<Issue>(
    `/api/projects/${encodeURIComponent(slug)}/issues/${encodeURIComponent(key)}/comments`,
    { method: 'POST', body: JSON.stringify({ author, text }) },
  );
}

export async function deleteProject(slug: string): Promise<void> {
  await request<unknown>(`/api/projects/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

export function isOfflineError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (typeof err === 'object' && err !== null && (err as PmApiError).offline === true)
  );
}
