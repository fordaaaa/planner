import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BLOCKS, BLOCK_MAP, WORKFLOW_TEMPLATES, TEMPLATE_MAP } from './blocks.js';

/**
 * NOTE: blocks.ts in this folder is a synced copy of ../../src/lib/blocks.ts
 * (see package.json `sync:blocks`). Edit the web-app original, then sync.
 */

export function templateToTranscript(templateId: string): string {
  const template = TEMPLATE_MAP[templateId];
  if (!template) throw new Error(`Unknown template "${templateId}"`);
  return template.steps
    .map((s) => {
      const b = BLOCK_MAP[s.blockId];
      return `${b.kind} ${b.label}`;
    })
    .join(' ');
}

export function registerBlockTools(server: McpServer): void {
  server.registerTool(
    'list_building_blocks',
    {
      title: 'List prompt building blocks',
      description:
        'Lists the 14 reusable prompt blocks (triage, release-scope, PRD, plan, architect, TDD, build-fix, review, security, verify, e2e, refactor, docs, ship). Each block is a pre-written agent prompt distilled from ECC and edited to work standalone. Use get_block_prompt for the full text, or build_workflow with a transcript of block labels.',
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: BLOCKS.map((b) => `${b.id} [${b.kind}/${b.category}] — ${b.title}: ${b.blurb}`).join('\n'),
        },
      ],
    }),
  );

  server.registerTool(
    'get_block_prompt',
    {
      title: 'Get a building block prompt',
      description: 'Returns the full copy-paste prompt text for one building block.',
      inputSchema: {
        id: z.string().min(1).describe('Block id from list_building_blocks, e.g. "plan"'),
      },
    },
    async ({ id }) => {
      const b = BLOCK_MAP[id];
      if (!b) {
        return { content: [{ type: 'text', text: `Unknown block "${id}".` }], isError: true };
      }
      return {
        content: [{ type: 'text', text: `# ${b.title} [${b.kind}]\nDefault label: ${b.label}\n\n${b.prompt}` }],
      };
    },
  );

  server.registerTool(
    'list_workflow_templates',
    {
      title: 'List workflow templates',
      description:
        'Lists the pre-built block chains (spec-plan-trio, feature-loop, fix-loop, harden-ship). Pair with template_transcript to feed an existing build_workflow call.',
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: WORKFLOW_TEMPLATES.map(
            (t) => `${t.id} (${t.steps.length} steps) — ${t.title}: ${t.description}`,
          ).join('\n'),
        },
      ],
    }),
  );

  server.registerTool(
    'template_transcript',
    {
      title: 'Template as command transcript',
      description:
        'Renders a workflow template as a keyword-command transcript for build_workflow (start/agent/subagent/tool/decision/end + labels).',
      inputSchema: {
        id: z.string().min(1).describe('Template id from list_workflow_templates'),
      },
    },
    async ({ id }) => {
      try {
        return { content: [{ type: 'text', text: templateToTranscript(id) }] };
      } catch (err) {
        return { content: [{ type: 'text', text: String(err) }], isError: true };
      }
    },
  );
}
