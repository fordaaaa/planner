import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { WorkflowGraph } from './types.js';

const WORKFLOWS_DIR = process.env.PLANNER_WORKFLOWS_DIR ?? join(homedir(), '.planner-workflows');

export class WorkflowNotFoundError extends Error {}

function safeName(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
  if (!cleaned) throw new Error('Workflow name must contain at least one letter, number, dash, or underscore');
  return cleaned;
}

async function ensureDir(): Promise<void> {
  await mkdir(WORKFLOWS_DIR, { recursive: true });
}

export function workflowsDir(): string {
  return WORKFLOWS_DIR;
}

export async function saveWorkflow(name: string, graph: WorkflowGraph): Promise<string> {
  await ensureDir();
  const path = join(WORKFLOWS_DIR, `${safeName(name)}.json`);
  await writeFile(path, JSON.stringify(graph, null, 2), 'utf8');
  return path;
}

export async function loadWorkflow(name: string): Promise<WorkflowGraph> {
  const path = join(WORKFLOWS_DIR, `${safeName(name)}.json`);
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as WorkflowGraph;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new WorkflowNotFoundError(`No workflow named "${name}"`);
    }
    throw err;
  }
}

export async function deleteWorkflow(name: string): Promise<void> {
  const path = join(WORKFLOWS_DIR, `${safeName(name)}.json`);
  try {
    await rm(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new WorkflowNotFoundError(`No workflow named "${name}"`);
    }
    throw err;
  }
}

export async function listWorkflows(): Promise<string[]> {
  await ensureDir();
  const files = await readdir(WORKFLOWS_DIR);
  return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -'.json'.length));
}
