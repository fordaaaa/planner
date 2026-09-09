import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Issue } from './pmTypes.js';
import {
  addComment,
  createIssue,
  createProject,
  getProject,
  listProjects,
  updateIssue,
} from './pmStore.js';

const statusEnum = z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']);
const priorityEnum = z.enum(['none', 'urgent', 'high', 'medium', 'low']);

const STATUS_ORDER = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'] as const;

function parseLabels(input?: string): string[] | undefined {
  if (input === undefined) return undefined;
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function boardLine(issue: Issue): string {
  return `  ${issue.key} ${issue.title} (P:${issue.priority}${issue.assignee ? ` @${issue.assignee}` : ''})`;
}

function listLine(issue: Issue): string {
  return `${issue.key} [${issue.status}] ${issue.title} (P:${issue.priority}${issue.assignee ? ` @${issue.assignee}` : ''})`;
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function registerPmTools(server: McpServer): void {
  server.registerTool(
    'pm_list_projects',
    {
      title: 'List PM projects',
      description: 'Lists all project-management projects as "slug | name | status | open/total", one per line.',
      inputSchema: {},
    },
    async () => {
      try {
        const projects = await listProjects();
        if (!projects.length) return { content: [{ type: 'text' as const, text: 'No projects yet.' }] };
        const lines = projects.map((p) => `${p.slug} | ${p.name} | ${p.status} | ${p.openIssues}/${p.totalIssues}`);
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    'pm_create_project',
    {
      title: 'Create PM project',
      description: 'Creates a new project-management project.',
      inputSchema: {
        name: z.string().min(1).describe('Project name, e.g. "Website Redesign"'),
        description: z.string().optional().describe('Short project description'),
      },
    },
    async ({ name, description }) => {
      try {
        const p = await createProject(name, description ?? '');
        return { content: [{ type: 'text' as const, text: `Created project "${p.slug}": ${p.name}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    'pm_board',
    {
      title: 'Show project board',
      description: 'Shows issues grouped by status column.',
      inputSchema: {
        project: z.string().min(1).describe('Project slug'),
      },
    },
    async ({ project }) => {
      try {
        const p = await getProject(project);
        if (!p.issues.length) return { content: [{ type: 'text' as const, text: 'backlog (0)' }] };
        const lines: string[] = [];
        for (const status of STATUS_ORDER) {
          const col = p.issues.filter((i) => i.status === status).sort((a, b) => a.order - b.order);
          if (!col.length) continue;
          lines.push(`${status} (${col.length})`);
          for (const issue of col) lines.push(boardLine(issue));
        }
        if (!lines.length) return { content: [{ type: 'text' as const, text: 'backlog (0)' }] };
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    'pm_create_issue',
    {
      title: 'Create PM issue',
      description: 'Creates an issue in a project.',
      inputSchema: {
        project: z.string().min(1).describe('Project slug'),
        title: z.string().min(1).describe('Issue title'),
        description: z.string().optional(),
        priority: priorityEnum.optional(),
        labels: z.string().optional().describe('Comma-separated labels, e.g. "bug,frontend"'),
        assignee: z.string().optional(),
        parent: z.string().optional().describe('Parent issue key'),
        status: statusEnum.optional(),
      },
    },
    async ({ project, title, description, priority, labels, assignee, parent, status }) => {
      try {
        const issue = await createIssue(project, {
          title,
          description,
          priority,
          status,
          labels: parseLabels(labels),
          assignee: assignee === undefined || assignee === '' ? undefined : assignee,
          parent: parent === undefined || parent === '' ? undefined : parent,
        });
        return { content: [{ type: 'text' as const, text: `Created ${issue.key}: ${issue.title}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    'pm_update_issue',
    {
      title: 'Update PM issue',
      description: 'Updates mutable fields of an issue.',
      inputSchema: {
        project: z.string().min(1).describe('Project slug'),
        key: z.string().min(1).describe('Issue key, e.g. "PROJ-1"'),
        status: statusEnum.optional(),
        priority: priorityEnum.optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        assignee: z.string().optional().describe('Assignee name; empty string clears'),
        labels: z.string().optional().describe('Comma-separated labels; empty string clears'),
        order: z.number().int().optional(),
      },
    },
    async ({ project, key, status, priority, title, description, assignee, labels, order }) => {
      try {
        const patch: Parameters<typeof updateIssue>[2] = {};
        if (status !== undefined) patch.status = status;
        if (priority !== undefined) patch.priority = priority;
        if (title !== undefined) patch.title = title;
        if (description !== undefined) patch.description = description;
        if (assignee !== undefined) patch.assignee = assignee === '' ? null : assignee;
        if (labels !== undefined) patch.labels = parseLabels(labels) ?? [];
        if (order !== undefined) patch.order = order;
        const issue = await updateIssue(project, key, patch);
        return { content: [{ type: 'text' as const, text: `Updated ${issue.key} [${issue.status}] ${issue.title}` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    'pm_list_issues',
    {
      title: 'List PM issues',
      description: 'Lists issues in a project, optionally filtered by status and/or assignee.',
      inputSchema: {
        project: z.string().min(1).describe('Project slug'),
        status: statusEnum.optional(),
        assignee: z.string().optional(),
      },
    },
    async ({ project, status, assignee }) => {
      try {
        const p = await getProject(project);
        let issues = [...p.issues].sort((a, b) => a.order - b.order);
        if (status !== undefined) issues = issues.filter((i) => i.status === status);
        if (assignee !== undefined) issues = issues.filter((i) => i.assignee === assignee);
        if (!issues.length) return { content: [{ type: 'text' as const, text: 'No issues.' }] };
        return { content: [{ type: 'text' as const, text: issues.map(listLine).join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    'pm_get_issue',
    {
      title: 'Get PM issue',
      description: 'Returns a detail block for one issue including comments.',
      inputSchema: {
        project: z.string().min(1).describe('Project slug'),
        key: z.string().min(1).describe('Issue key, e.g. "PROJ-1"'),
      },
    },
    async ({ project, key }) => {
      try {
        const p = await getProject(project);
        const issue = p.issues.find((i) => i.key === key);
        if (!issue) return { content: [{ type: 'text' as const, text: `No issue "${key}" in project "${project}"` }], isError: true };
        const lines = [
          `${issue.key}: ${issue.title}`,
          `status: ${issue.status} | priority: ${issue.priority} | assignee: ${issue.assignee ?? 'unassigned'} | labels: ${issue.labels.length ? issue.labels.join(',') : '-'} | parent: ${issue.parent ?? '-'} | order: ${issue.order}`,
          `created: ${issue.createdAt} updated: ${issue.updatedAt}`,
        ];
        if (issue.description) lines.push('', issue.description);
        lines.push(`comments (${issue.comments.length}):`);
        for (const c of issue.comments) lines.push(`  - ${c.author}: ${c.text}`);
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    'pm_log',
    {
      title: 'Log progress on an issue',
      description: 'Appends a progress comment (author "agent") to an issue.',
      inputSchema: {
        project: z.string().min(1).describe('Project slug'),
        key: z.string().min(1).describe('Issue key, e.g. "PROJ-1"'),
        text: z.string().min(1).describe('Progress note text'),
      },
    },
    async ({ project, key, text }) => {
      try {
        await addComment(project, key, 'agent', text);
        const p = await getProject(project);
        const issue = p.issues.find((i) => i.key === key);
        const n = issue?.comments.length ?? 1;
        return { content: [{ type: 'text' as const, text: `Logged comment on ${key} (${n} comments)` }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errText(err) }], isError: true };
      }
    },
  );
}
