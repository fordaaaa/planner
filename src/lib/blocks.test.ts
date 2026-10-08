import { describe, expect, it } from 'vitest';
import { BLOCKS, BLOCK_MAP, WORKFLOW_TEMPLATES } from './blocks';
import { transcriptToGraph } from './voiceGraph';
import { NODE_KINDS as KINDS } from './types';

describe('blocks library', () => {
  it('has unique ids and valid node kinds', () => {
    const ids = BLOCKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BLOCKS) {
      expect(KINDS).toContain(b.kind);
      expect(b.title.length).toBeGreaterThan(0);
      expect(b.prompt.length).toBeGreaterThan(200);
      expect(b.label.length).toBeGreaterThan(0);
    }
  });

  it('every template step references a real block', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      expect(t.steps.length).toBeGreaterThanOrEqual(2);
      for (const s of t.steps) {
        expect(BLOCK_MAP[s.blockId], `template ${t.id} references missing block ${s.blockId}`).toBeDefined();
      }
    }
  });

  it('prompts are standalone (no ECC-install paths)', () => {
    const banned = ['~/.claude/.ccg', 'codeagent-wrapper', '/ecc:'];
    for (const b of BLOCKS) {
      for (const needle of banned) {
        expect(b.prompt).not.toContain(needle);
      }
    }
  });

  it('every template renders to a transcript the graph parser accepts', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      const transcript = t.steps.map((s) => `${BLOCK_MAP[s.blockId].kind} ${BLOCK_MAP[s.blockId].label}`).join(' ');
      const graph = transcriptToGraph(transcript);
      expect(graph.nodes.length).toBe(t.steps.length);
    }
  });
});
