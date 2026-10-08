import { describe, expect, it } from 'vitest';
import { graphToMarkdown, graphToPrompt, graphToPromptChain } from './planExport';
import type { WorkflowGraph } from './types';

const GRAPH: WorkflowGraph = {
  nodes: [
    {
      id: 'start-1',
      type: 'agent',
      position: { x: 250, y: 50 },
      data: { label: 'PRD for auth', kind: 'start', description: 'Write the PRD.' },
    },
    {
      id: 'node-2',
      type: 'agent',
      position: { x: 250, y: 210 },
      data: { label: 'Plan auth', kind: 'agent', description: '' },
    },
  ],
  edges: [{ id: 'e1', source: 'start-1', target: 'node-2' }],
};

describe('planExport', () => {
  it('chains only nodes that have prompts, in flow order', () => {
    const chain = graphToPromptChain(GRAPH);
    expect(chain).toContain('Step 1 — PRD for auth');
    expect(chain).not.toContain('Plan auth');
  });

  it('wraps the chain in a single paste-ready prompt', () => {
    const prompt = graphToPrompt(GRAPH);
    expect(prompt).toContain('# Agent prompt');
    expect(prompt).toContain('1 step');
    expect(prompt).toContain('Write the PRD.');
  });

  it('marks prompt-less nodes in the markdown plan', () => {
    expect(graphToMarkdown(GRAPH)).toContain('no prompt yet');
  });
});
