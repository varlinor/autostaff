# auto-code-bot CHANGELOG

## 0.3.1

### Patch Changes

- chore: alter prompts dir position

## 0.3.0

### Minor Changes

- **Monorepo support**: Auto-detect workspace root and switch to correct subdirectory
- **Exit code handling**: Improved detection with keyword fallback (PASS, SUCCESS, COMPLETE)
- **One task per session**: Each task runs in independent opencode session
- **Silent mode**: `--silent` flag to write opencode output to file
- **Log file option**: `--log-file <path>` to specify custom log path
- **Output separation**: auto-bot output always to console, opencode output optional to file

## 0.2.1

### Patch Changes

- **Phase detection**: Skip app_spec check when task.json exists in project root
- **--init-only flag**: Generate app_spec.md and task.json without executing tasks
- **Build verification**: Ensure TypeScript compilation passes

## 0.2.0

### Minor Changes

- update to mono-repo with multiple packages, and add mcp support
