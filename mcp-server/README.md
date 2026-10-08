# planner-mcp-server

An MCP server that lets an AI assistant build and manage Planner workflow graphs directly — no browser required. It exposes the same `start` / `agent` / `subagent` / `tool` / `decision` / `end` keyword command language used by the web app's voice-build feature, and saves results as JSON files compatible with the app's Import JSON button.

## Setup

```bash
cd mcp-server
npm install
npm run build
```

Then point an MCP client at `node <path>/mcp-server/dist/index.js`. For Claude Code, add to your MCP config:

```json
{
  "mcpServers": {
    "planner-workflows": {
      "command": "node",
      "args": ["/absolute/path/to/planner/mcp-server/dist/index.js"]
    }
  }
}
```

## Tools

- `describe_command_language` — explains the keyword grammar (call this first if unsure).
- `build_workflow(name, transcript)` — parses a transcript and saves it.
- `list_workflows()` — lists saved workflow names.
- `get_workflow(name)` — returns a saved workflow's full JSON graph.
- `delete_workflow(name)` — deletes a saved workflow.

## Building blocks (ECC-derived prompts)

12 reusable prompt blocks distilled from ECC (Everything Claude Code) and edited to work standalone, plus 4 workflow templates. Same catalogue as the web app's Blocks panel (`src/lib/blocks.ts` is the source of truth — refresh the copy with `npm run sync:blocks`).

- `list_building_blocks()` — the 21 blocks (triage, release-scope, PRD, question, research, plan, architect, TDD, build-fix, review, security, pentest, silent-failures, verify, e2e, coverage, perf, refactor, docs, prod-audit, ship).
- `get_block_prompt(id)` — full copy-paste prompt text for one block.
- `list_workflow_templates()` — pre-built chains (spec-plan-trio, feature-loop, fix-loop, harden-ship).
- `template_transcript(id)` — renders a template as a transcript for `build_workflow`.

## Storage

Workflows are saved as `<name>.json` under `~/.planner-workflows` by default. Override with the `PLANNER_WORKFLOWS_DIR` environment variable.

## Project management (PM)

Plane.so-lite issue tracking shared with the app's Projects view. Serve it locally with `npm run pm:serve` (`PLANNER_PM_PORT`, default `7808`); the Projects view reads from that server, auto-syncs every 5s, and shows an offline banner when it's down.

- `pm_list_projects` — lists projects.
- `pm_create_project` — creates a project.
- `pm_board` — returns a project's kanban board.
- `pm_create_issue` — creates an issue.
- `pm_update_issue` — updates an issue's status/fields.
- `pm_list_issues` — lists issues.
- `pm_get_issue` — returns one issue with comments.
- `pm_log` — appends a comment/progress note.

```
# conceptually, via MCP:
pm_create_issue(project="website", title="Add offline banner", status="todo")
```

### PM storage

Issues persist as JSON under `~/.planner-projects/` by default. Override with the `PLANNER_PROJECTS_DIR` environment variable.
