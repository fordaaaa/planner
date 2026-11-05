# Planner

Visual workflow planner for AI agent runs. Chain prompts into an executable plan, then hand it to any coding agent.

**Live site: https://planner.foworda.workers.dev/**

## What it does

- **Canvas** — drag-and-drop plan graph (`start → agent → subagent/tool/decision/question → end`) with auto-chaining and import/export JSON.
- **Private by default** — every visit starts a fresh session. Nothing is saved unless you choose “Remember in this browser” (local storage only — no account, no server, nothing leaves your machine). Toggle anytime with the Session/Saved button.
- **Building blocks** — 30 copy-paste-ready prompt blocks distilled from [ECC](https://github.com/affaan-m/ecc) (Everything Claude Code) and edited to work standalone: triage, codebase tour, release scope, PRD, questions, explore, research-first, stack picker, bootstrap, plan, architect, screens, backend, TDD build, debug, autopilot loop, build fix, fresh-eyes review, security audit, bounty-hunt pentest, silent-failure hunt, verify gate, E2E, coverage gaps, perf pass, refactor, docs, prod audit, PR finish, ship. One click inserts a step pre-filled with its prompt.
- **Workflow templates** — pre-built chains: spec-plan trio, full ECC feature loop, fix loop, harden & ship. Review steps fork as subagents off the build step.
- **Export the prompt** — download the whole workflow as one paste-ready `prompt.md`, download the plan as markdown, or copy a numbered step-by-step chain straight into an agent session.
- **Voice build** — speak (or type) keyword commands (`start … agent … question … subagent … end`) and compile them to a graph.
- **Shell** — a terminal (`Shell` button) for keyboard-driven building: `agent build the api`, `q which provider?`, `block plan`, `template feature-loop`, `show review`, `ls`, `help`. Command history with ↑/↓.
- **Projects / PM** — Plane.so-lite issue tracking with a 6-column kanban the AI can drive via MCP (`npm run pm:serve`, then the Projects button).

## MCP server

`mcp-server/` lets an AI build and manage workflows without a browser. Same keyword command language as voice build, plus the blocks catalogue:

- `describe_command_language`, `build_workflow(name, transcript)`, `list_workflows`, `get_workflow`, `delete_workflow`
- `list_building_blocks`, `get_block_prompt(id)`, `list_workflow_templates`, `template_transcript(id)` (renders a template straight into `build_workflow`)
- `pm_*` tools for issue tracking

```bash
cd mcp-server
npm install
npm run build
```

Point an MCP client at `node <path>/mcp-server/dist/index.js`. `src/lib/blocks.ts` is the single source of truth for prompts — refresh the server copy with `npm run sync:blocks` (runs automatically on build).

## Self-hosting (Docker Compose)

Runs the static frontend and the PM server in one container, fronted by nginx:

```bash
PLANNER_AUTH_USER=planner PLANNER_AUTH_PASSWORD=choose-a-strong-password \
  docker compose up --build
```

- Frontend: http://localhost:8080 (override with `PLANNER_WEB_PORT`)
- The PM server has **no authentication of its own**. It binds loopback *inside* the container and is only reachable through nginx at `/api/`, which requires HTTP basic auth (`PLANNER_AUTH_USER` / `PLANNER_AUTH_PASSWORD`). If `PLANNER_AUTH_PASSWORD` is unset, a random password is generated and printed to the container logs on every start.
- The raw PM port (7808) is **not published**. Do not add a host port mapping for it without basic auth in front — that would expose an unauthenticated mutation API (create/delete projects, edit issues) to anyone who can reach the host.
- To use Projects, visit `/api/projects` on your instance and sign in with the basic-auth credentials. The container build uses the same host for the API, including when accessed from another device.

### Persistence

Projects and workflows are written to disk under `PLANNER_PROJECTS_DIR` / `PLANNER_WORKFLOWS_DIR` (defaults `/data/projects` and `/data/workflows` in the container). Compose mounts the named volume `planner-data` at `/data`, so issues survive restarts and rebuilds. Back up with `docker run --rm -v planner-selfhost_planner-data:/data -v "$PWD":/backup alpine tar czf /backup/planner-data.tgz /data` (adjust the volume name to `docker volume ls`).

### Limitations

- **No per-user accounts or authorization.** Basic auth is a single shared credential; anyone with it can read and mutate everything. Front the container with your own SSO/reverse proxy (or a VPN) if you need more.
- **HTTP only out of the box.** Terminate TLS in front (e.g. Caddy, Traefik, nginx) — basic auth over plain HTTP is not safe across untrusted networks.
- **No horizontal scaling.** The PM store is file-based with in-process locking; run exactly one replica and keep the volume on local disk.
- The `/api/` proxy requires auth for reads too; there is no read-only anonymous mode.
- A previously configured `localStorage.pmApiBase` override takes precedence; remove it if it points to an old server.
- The PM server validates input loosely and has no rate limiting; treat exposure accordingly.

### Self-host tests

```bash
node --test deploy/test-self-host.mjs
```

Checks that compose publishes no unauthenticated PM port, nginx enforces basic auth on `/api/`, and (with Docker available) builds the image and verifies that `/api/projects` returns 401 without credentials, 200 with them, and accepts authenticated mutations.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run test     # vitest
npm run lint     # oxlint
npm run build    # typecheck + production build
```

## Deploy

Pushes to `main` auto-deploy the `dist/` build to Cloudflare Workers via `.github/workflows/deploy.yml` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets). Live at https://planner.foworda.workers.dev/.
