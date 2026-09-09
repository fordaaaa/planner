# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Projects / PM

Plane.so-lite issue tracking the AI can drive via MCP. Run `npm run pm:serve`, then open the Projects button in the app toolbar for project cards, the 6-column kanban with drag-drop, and issue drawers; the view auto-syncs every 5s and shows an offline banner if the pm server isn't running.

The AI uses the `pm_*` MCP tools (`pm_list_projects`, `pm_create_project`, `pm_board`, `pm_create_issue`, `pm_update_issue`, `pm_list_issues`, `pm_get_issue`, `pm_log`); data persists as JSON under `~/.planner-projects/` (`PLANNER_PROJECTS_DIR` override, API port via `PLANNER_PM_PORT`, default `7808`).

```
# conceptually, via MCP:
pm_create_issue(project="website", title="Add offline banner", status="todo")
```
