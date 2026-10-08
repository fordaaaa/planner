# Planner

Visual workflow planner for AI agent runs. Chain prompts into an executable plan, then hand it to any coding agent.

**Live site: https://planner.foworda.workers.dev/**

## What it does

- **Canvas** — drag-and-drop plan graph (`start → agent → subagent/tool/decision → end`) with auto-chaining and import/export JSON.
- **Private by default** — every visit starts a fresh session. Nothing is saved unless you choose “Remember in this browser” (local storage only — no account, no server, nothing leaves your machine). Toggle anytime with the Session/Saved button.
- **Building blocks** — 14 copy-paste-ready prompt blocks distilled from [ECC](https://github.com/affaan-m/ecc) (Everything Claude Code) and edited to work standalone: triage, release scope, PRD, plan, architect, TDD build, build fix, fresh-eyes review, security audit, verify gate, E2E, refactor, docs, ship. One click inserts a step pre-filled with its prompt.
- **Workflow templates** — pre-built chains: spec-plan trio, full ECC feature loop, fix loop, harden & ship. Review steps fork as subagents off the build step.
- **Export the prompt** — download the whole workflow as one paste-ready `prompt.md`, download the plan as markdown, or copy a numbered step-by-step chain straight into an agent session.
- **Voice build** — speak (or type) keyword commands (`start … agent … subagent … end`) and compile them to a graph.
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
