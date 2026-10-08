import type { WorkflowGraph } from './types';

/** Nodes sorted top-to-bottom so the exported plan reads in flow order. */
function sortedNodes(graph: WorkflowGraph) {
  return [...graph.nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
}

export function graphToMarkdown(graph: WorkflowGraph): string {
  const nodes = sortedNodes(graph);
  const lines: string[] = ['# Workflow plan', ''];
  nodes.forEach((n, i) => {
    lines.push(`## ${i + 1}. [${n.data.kind}] ${n.data.label}`);
    lines.push('');
    if (n.data.description?.trim()) {
      lines.push(n.data.description.trim());
      lines.push('');
    } else {
      lines.push('_(no prompt yet — pick a building block or write one)_');
      lines.push('');
    }
  });
  lines.push('## Connections');
  lines.push('');
  if (graph.edges.length === 0) {
    lines.push('_(no connections)_');
  } else {
    const byId = new Map(nodes.map((n) => [n.id, n.data.label]));
    for (const e of graph.edges) {
      lines.push(`- ${byId.get(e.source) ?? e.source} → ${byId.get(e.target) ?? e.target}`);
    }
  }
  return lines.join('\n');
}

export function downloadMarkdown(graph: WorkflowGraph): void {
  const blob = new Blob([graphToMarkdown(graph)], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plan.md';
  a.click();
  URL.revokeObjectURL(url);
}

/** Numbered prompt chain for pasting into an agent session step by step. */
export function graphToPromptChain(graph: WorkflowGraph): string {
  const nodes = sortedNodes(graph).filter((n) => n.data.description?.trim());
  return nodes
    .map((n, i) => `### Step ${i + 1} — ${n.data.label} [${n.data.kind}]\n\n${n.data.description.trim()}`)
    .join('\n\n---\n\n');
}
