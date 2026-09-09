import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  addComment,
  createIssue,
  createProject,
  deleteProject,
  getProject,
  IssueNotFoundError,
  listProjects,
  ProjectNotFoundError,
  updateIssue,
} from './lib/pmStore.js';

const PORT = Number(process.env.PLANNER_PM_PORT ?? 7808);

function cors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, status: number, obj: unknown): void {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        if (!text.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(text) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function normalizeLabels(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function asStringOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asStringOrNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'string') return v === '' ? null : v;
  return undefined;
}

function errorStatus(err: unknown): number {
  if (err instanceof ProjectNotFoundError || err instanceof IssueNotFoundError) return 404;
  if (err instanceof Error && err.message.includes('already exists')) return 409;
  return 400;
}

const server = createServer(async (req, res) => {
  cors(res);
  const method = (req.method ?? 'GET').toUpperCase();
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // GET /api/projects
    if (pathname === '/api/projects' && method === 'GET') {
      sendJson(res, 200, await listProjects());
      return;
    }

    // POST /api/projects
    if (pathname === '/api/projects' && method === 'POST') {
      let body: Record<string, unknown>;
      try {
        body = await readBody(req);
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }
      const name = asStringOrUndefined(body.name);
      if (!name || !name.trim()) {
        sendJson(res, 400, { error: 'name is required' });
        return;
      }
      const description = asStringOrUndefined(body.description) ?? '';
      try {
        const project = await createProject(name, description);
        sendJson(res, 201, project);
      } catch (err) {
        sendJson(res, errorStatus(err), { error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    const parts = pathname.split('/').filter(Boolean);
    // parts: ['api','projects', slug, ...]
    if (parts.length >= 3 && parts[0] === 'api' && parts[1] === 'projects') {
      const slug = decodeURIComponent(parts[2]);

      // /api/projects/:slug
      if (parts.length === 3) {
        if (method === 'GET') {
          try {
            sendJson(res, 200, await getProject(slug));
          } catch (err) {
            sendJson(res, errorStatus(err), { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }
        if (method === 'DELETE') {
          try {
            await deleteProject(slug);
            sendJson(res, 200, { ok: true });
          } catch (err) {
            sendJson(res, errorStatus(err), { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }
      }

      // POST /api/projects/:slug/issues
      if (parts.length === 4 && parts[3] === 'issues' && method === 'POST') {
        let body: Record<string, unknown>;
        try {
          body = await readBody(req);
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON body' });
          return;
        }
        try {
          const issue = await createIssue(slug, {
            title: asStringOrUndefined(body.title) ?? '',
            description: asStringOrUndefined(body.description),
            priority: body.priority as never,
            status: body.status as never,
            labels: normalizeLabels(body.labels),
            assignee: asStringOrNull(body.assignee),
            parent: asStringOrNull(body.parent),
          });
          sendJson(res, 201, issue);
        } catch (err) {
          sendJson(res, errorStatus(err), { error: err instanceof Error ? err.message : String(err) });
        }
        return;
      }

      // PATCH /api/projects/:slug/issues/:key
      if (parts.length === 5 && parts[3] === 'issues' && method === 'PATCH') {
        const key = decodeURIComponent(parts[4]);
        let body: Record<string, unknown>;
        try {
          body = await readBody(req);
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON body' });
          return;
        }
        try {
          const patch: Parameters<typeof updateIssue>[2] = {};
          if (body.title !== undefined) patch.title = asStringOrUndefined(body.title);
          if (body.description !== undefined) patch.description = asStringOrUndefined(body.description);
          if (body.status !== undefined) patch.status = body.status as never;
          if (body.priority !== undefined) patch.priority = body.priority as never;
          if (body.labels !== undefined) patch.labels = normalizeLabels(body.labels);
          if (body.assignee !== undefined) patch.assignee = asStringOrNull(body.assignee);
          if (body.parent !== undefined) patch.parent = asStringOrNull(body.parent);
          if (body.order !== undefined && typeof body.order === 'number') patch.order = body.order;
          const issue = await updateIssue(slug, key, patch);
          sendJson(res, 200, issue);
        } catch (err) {
          sendJson(res, errorStatus(err), { error: err instanceof Error ? err.message : String(err) });
        }
        return;
      }

      // POST /api/projects/:slug/issues/:key/comments
      if (parts.length === 6 && parts[3] === 'issues' && parts[5] === 'comments' && method === 'POST') {
        const key = decodeURIComponent(parts[4]);
        let body: Record<string, unknown>;
        try {
          body = await readBody(req);
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON body' });
          return;
        }
        const text = asStringOrUndefined(body.text);
        if (!text || !text.trim()) {
          sendJson(res, 400, { error: 'text is required' });
          return;
        }
        const author = asStringOrUndefined(body.author) ?? 'agent';
        try {
          const comment = await addComment(slug, key, author, text);
          sendJson(res, 201, comment);
        } catch (err) {
          sendJson(res, errorStatus(err), { error: err instanceof Error ? err.message : String(err) });
        }
        return;
      }
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`planner pm-server on http://127.0.0.1:${PORT}`);
});
