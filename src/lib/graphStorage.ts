import type { WorkflowGraph } from './types';

const STORAGE_KEY = 'planner.graph';

export function saveToLocalStorage(graph: WorkflowGraph): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
}

export function loadFromLocalStorage(): WorkflowGraph | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return parsed as WorkflowGraph;
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

export function exportGraph(graph: WorkflowGraph): void {
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workflow.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importGraph(file: File): Promise<WorkflowGraph> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error('Invalid workflow file: missing nodes/edges arrays');
        }
        resolve(parsed as WorkflowGraph);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse workflow file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
