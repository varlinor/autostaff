# auto-code-bot

## 0.2.1

### Patch Changes

- ## 0.2.1 (2026-02-19)

  ### CLI Improvements

  - **Phase detection**: Skip app_spec check when task.json exists in project root
  - **--init-only flag**: Generate app_spec.md and task.json without executing tasks
  - **Build verification**: Ensure TypeScript compilation passes

  ### MCP Server Fixes

  - **getFeaturesByCategory**: Fixed total initial value from 1 to 0
  - **detectPhase**: Check root app_spec.md (docs/app_spec.md only)
  - **runFullLoop**: Call CLI via pnpm exec instead of opencode run
  - **runOneTask**: Run from project root for proper AGENTS.md access

  ### Documentation

  - **New workflow guide**: docs/workflow.md with phased execution
  - **Task auditor skill**: skills/task-auditor.md for task.json quality audit
  - **Updated READMEs**: Added workflow sections to root, CLI, and MCP packages
  - **Roadmap**: Restructured to v0.1.0/v0.2.0/v0.3.0/v1.0.0
  - **Project status**: Complete rewrite in docs/project_status.md

## 0.3.0

### Minor Changes

- ## 0.2.1 (2026-02-19)

  ### CLI Improvements

  - **Phase detection**: Skip app_spec check when task.json exists in project root
  - **--init-only flag**: Generate app_spec.md and task.json without executing tasks
  - **Build verification**: Ensure TypeScript compilation passes

  ### MCP Server Fixes

  - **getFeaturesByCategory**: Fixed total initial value from 1 to 0
  - **detectPhase**: Check root app_spec.md (docs/app_spec.md only)
  - **runFullLoop**: Call CLI via pnpm exec instead of opencode run
  - **runOneTask**: Run from project root for proper AGENTS.md access

  ### Documentation

  - **New workflow guide**: docs/workflow.md with phased execution
  - **Task auditor skill**: skills/task-auditor.md for task.json quality audit
  - **Updated READMEs**: Added workflow sections to root, CLI, and MCP packages
  - **Roadmap**: Restructured to v0.1.0/v0.2.0/v0.3.0/v1.0.0
  - **Project status**: Complete rewrite in docs/project_status.md

## 0.2.0

### Minor Changes

- update to mono-repo with multiple packages, and add mcp support
