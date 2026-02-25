# auto-code-mcp CHANGELOG

## 0.3.0

### Minor Changes

- **Workspace support**: Enhanced multi-package project support
- **Improved phase detection**: Better handling of task.json precedence

## 0.2.1

### Patch Changes

- **getFeaturesByCategory**: Fixed total initial value from 1 to 0
- **detectPhase**: Check root app_spec.md (docs/app_spec.md only)
- **runFullLoop**: Call CLI via pnpm exec instead of opencode run
- **runOneTask**: Run from project root for proper AGENTS.md access

## 0.2.0

### Minor Changes

- update to mono-repo with multiple packages, and add mcp support
