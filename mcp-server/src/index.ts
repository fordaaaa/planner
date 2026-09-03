#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { transcriptToGraph, WorkflowGraphError } from './lib/workflowGraph.js';
import { deleteWorkflow, listWorkflows, loadWorkflow, saveWorkflow, workflowsDir, WorkflowNotFoundError } from './lib/store.js';

const COMMAND_LANGUAGE_DOC = `Workflows are described as a flat stream of keyword commands, each followed by a short label:

  start <label>      begins the workflow (exactly one, must come first)
  agent <label>       a sequential step, chained after the previous step
  tool <label>        same as agent, semantically a tool-call step
  decision <label>     same as agent, semantically a branch/decision step
  subagent <label>     a child spawned off the immediately preceding agent/tool/decision step (repeat for siblings)
  end <label>          closes the workflow (exactly one, must come last)

Example:
  "start build the website agent build website subagent check backend subagent check frontend end"

This produces: Start -> Agent(build website) -> [Subagent(check backend), Subagent(check frontend)] -> End,
where End is connected from whichever subagents/steps were most recently active.`;

const server = new McpServer({
  name: 'planner-workflows',
  version: '0.1.0',
});

server.registerTool(
  'describe_command_language',
  {
    title: 'Describe workflow command language',
    description:
      'Explains the keyword command language used to build workflow graphs (start/agent/subagent/tool/decision/end). Call this first if unsure how to phrase a transcript.',
    inputSchema: {},
  },
  async () => ({
    content: [{ type: 'text', text: COMMAND_LANGUAGE_DOC }],
  }),
);

server.registerTool(
  'build_workflow',
  {
    title: 'Build and save a workflow',
    description:
      'Parses a keyword-command transcript (see describe_command_language) into a workflow graph and saves it under the given name. Overwrites any existing workflow with the same name.',
    inputSchema: {
      name: z.string().min(1).describe('Filename to save the workflow under, e.g. "deploy-pipeline"'),
      transcript: z.string().min(1).describe('The keyword-command transcript, e.g. "start ... agent ... end"'),
    },
  },
  async ({ name, transcript }) => {
    try {
      const graph = transcriptToGraph(transcript);
      const path = await saveWorkflow(name, graph);
      return {
        content: [
          {
            type: 'text',
            text: `Saved "${name}" to ${path}\n\n${graph.nodes.length} nodes, ${graph.edges.length} edges:\n${JSON.stringify(graph, null, 2)}`,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof WorkflowGraphError ? err.message : String(err);
      return { content: [{ type: 'text', text: `Could not build workflow: ${message}` }], isError: true };
    }
  },
);

server.registerTool(
  'list_workflows',
  {
    title: 'List saved workflows',
    description: `Lists the names of all saved workflows (stored under ${workflowsDir()}).`,
    inputSchema: {},
  },
  async () => {
    const names = await listWorkflows();
    return {
      content: [
        { type: 'text', text: names.length ? names.join('\n') : 'No workflows saved yet.' },
      ],
    };
  },
);

server.registerTool(
  'get_workflow',
  {
    title: 'Get a saved workflow',
    description: 'Returns the full graph JSON for a saved workflow, in the format the Planner web app can import.',
    inputSchema: {
      name: z.string().min(1).describe('Name of the workflow to load'),
    },
  },
  async ({ name }) => {
    try {
      const graph = await loadWorkflow(name);
      return { content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }] };
    } catch (err) {
      const message = err instanceof WorkflowNotFoundError ? err.message : String(err);
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  },
);

server.registerTool(
  'delete_workflow',
  {
    title: 'Delete a saved workflow',
    description: 'Permanently deletes a saved workflow by name.',
    inputSchema: {
      name: z.string().min(1).describe('Name of the workflow to delete'),
    },
  },
  async ({ name }) => {
    try {
      await deleteWorkflow(name);
      return { content: [{ type: 'text', text: `Deleted "${name}"` }] };
    } catch (err) {
      const message = err instanceof WorkflowNotFoundError ? err.message : String(err);
      return { content: [{ type: 'text', text: message }], isError: true };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
