# Project Status - auto-code-bot

> Last Updated: 2026-02-18

## Project Overview

**Project Name**: auto-code-bot  
**NPM Packages**: 
- CLI: `auto-code-bot`
- MCP: `auto-code-mcp`
**Repository**: https://github.com/varlinor/code-bot  
**Current Version**: 0.1.2  
**License**: MIT

基于 [Anthropic 长时间运行 Agent](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 理念构建的全自动编程系统。通过 **opencode** 子进程驱动，跨多个上下文窗口持续增量开发，直到项目完成。

---

## Current Status

### Phase: Production Ready (Monorepo)

项目已转换为 **pnpm monorepo** 结构，支持多包管理和任务依赖。所有核心功能已实现并通过测试。

### Build Status

| Step | Status |
|------|--------|
| `pnpm install` | ✅ Complete |
| `pnpm build` | ✅ Complete |
| `pnpm test` | ✅ 21/21 tests passing |
| `pnpm lint` | ✅ Pass |
| `pnpm publish` | ✅ Published as auto-code-bot@0.1.2 |

---

## Key Files

```
auto-bot/
├── pnpm-workspace.yaml              # pnpm 工作区配置 (含 catalog)
├── packages/
│   ├── cli/                        # CLI 包
│   │   ├── package.json           # name: auto-code-bot
│   │   └── src/
│   │       ├── auto-dev.ts        # CLI 入口
│   │       ├── agent.ts           # Agent 核心逻辑
│   │       ├── client.ts          # opencode 子进程封装
│   │       ├── progress.ts        # 任务进度 + topological sort
│   │       ├── prompts.ts         # Prompt 加载
│   │       ├── security.ts        # 命令白名单
│   │       └── workspace.ts       # 项目类型检测 (单包/多包)
│   └── mcp/                        # MCP 服务包
│       ├── package.json            # name: auto-code-mcp
│       └── src/
├── docs/
│   ├── app_spec.md                # App 规格模板 (已移动)
│   ├── project_status.md          # 项目状态
│   └── multi-package-publishing.md # 发布指南
├── prompts/
│   └── AGENTS.md                  # Agent 工作流规则
├── test/
│   ├── fixtures/                  # 测试数据
│   │   ├── task-1.json
│   │   ├── task-2.json
│   │   └── workspace-package.json
│   └── unit/
│       ├── progress.test.ts       # 9 tests - topological sort
│       └── workspace.test.ts       # 12 tests - project detection
├── package.json                    # 根目录 (workspace)
└── tsconfig.json                   # TypeScript 项目引用
```

---

## Key Decisions Made

### 1. Monorepo Architecture

```
pnpm-workspace.yaml + TypeScript Project References
├── packages/cli/  (auto-code-bot)
└── packages/mcp/  (auto-code-mcp)
```

**优势**:
- 统一依赖管理
- 跨包类型引用
- 独立发布

### 2. Project Type Detection

```typescript
// workspace.ts
export type ProjectType = 'single' | 'monorepo';

export function detectProjectType(projectDir: string): ProjectType
```

- 单包工程：可以不生成 workspace
- 多包工程：根据 task.json 中的 workspace 字段切换目录

### 3. Task Dependency (Topological Sort)

```typescript
// progress.ts
export function topologicalSort(tasks: Task[]): Task[]

// Task 格式
{
  "id": "task-1",
  "dependsOn": ["task-2", "task-3"],
  "passes": false
}
```

**规则**:
- 有依赖的任务等待依赖完成后执行
- 循环依赖检测
- 每次选择所有依赖已满足的任务中优先级最高的执行

### 4. app_spec.md Location

- 新位置: `docs/app_spec.md`
- 回退: `app_spec.md` (根目录)

### 5. Configuration Priority

```
CLI Options > Config File (auto-code-bot.json) > Hardcoded Defaults
```

### 6. Default Model

- Default: `minimax(Custom)/MiniMax-M2.5`
- 可通过配置文件或 CLI 参数覆盖

---

## Test Results

### Unit Tests (21/21 passing)

```
test/unit/progress.test.ts
├── topologicalSort: empty array
├── topologicalSort: single task
├── topologicalSort: no dependencies
├── topologicalSort: linear dependencies
├── topologicalSort: parallel tasks
├── topologicalSort: complex dependencies
├── topologicalSort: circular detection
├── topologicalSort: duplicate task IDs
└── topologicalSort: multiple tasks same level

test/unit/workspace.test.ts
├── detectProjectType: pnpm workspace
├── detectProjectType: package.json only
├── detectProjectType: package.json in subdir
├── detectProjectType: yarn workspace
├── detectProjectType: lerna config
├── findWorkspaces: basic workspaces
├── findWorkspaces: nested workspaces
├── findWorkspaces: no workspaces
├── findWorkspaces: with workspaces field
├── detectProjectType: non-existent directory
├── detectProjectType: yarn workspace v1
└── findWorkspaces: complex workspace structure
```

---

## CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `[project-dir]` | - | Working directory | `.` |
| `--config` | `-c` | Config file path | `auto-code-bot.json` |
| `--model` | `-m` | Model (provider/model) | config file / minimax(...) |
| `--agent` | `-a` | Agent name | config file / default |
| `--max-iterations` | - | Max iterations | unlimited |
| `--ulw` | - | Ultrawork mode | false |
| `--spec` | - | Spec file path | - |
| `--desc` | - | Description to generate spec | - |
| `--extend` | `-e` | Extend mode | false |
| `--package-manager` | - | npm/pnpm/yarn/bun | config file / npm |
| `--git-branch` | - | Git branch | config file / develop |

---

## Configuration File Format

**File**: `auto-code-bot.json` (in project directory)

```json
{
  "model": "minimax(Custom)/MiniMax-M2.5",
  "packageManager": "npm",
  "agent": "",
  "ulw": false,
  "maxIterations": 0,
  "gitBranch": "develop"
}
```

---

## Test Scenarios

### Scenario 1: Single Package Project

```bash
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --ulw
```

### Scenario 2: Monorepo Project

```bash
cd packages/cli
npx tsx src/auto-dev.ts ./my-monorepo --ulw
# Agent will detect workspace and switch directories based on task.workspace
```

### Scenario 3: Continue After Interrupt

```bash
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --ulw
```

### Scenario 4: Limit Iterations

```bash
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --ulw --max-iterations 3
```

---

## Next Steps (Future Improvements)

### Priority 1: Integration Testing
- End-to-end workflow test (spec → task → execute)
- Git commit behavior verification

### Priority 2: Enhanced Error Handling
- Graceful degradation on workspace detection failure
- Config file validation with helpful error messages

### Priority 3: Additional Workspace Support
- Yarn workspace detection (basic support exists)
- Lerna detection (basic support exists)
- npm workspace detection

### Priority 4: Performance Optimization
- Cache workspace detection results
- Parallel task execution for independent tasks

---

## Dependencies

### Root

| Package | Version | Purpose |
|---------|---------|---------|
| pnpm | ^9.0.0 | Package manager |
| typescript | ^5.7.0 | TypeScript compiler |
| vitest | ^2.0.0 | Test runner |

### packages/cli

| Package | Version | Purpose |
|---------|---------|---------|
| commander | ^12.1.0 | CLI argument parsing |
| chalk | ^5.3.0 | Terminal styling |
| ora | ^8.1.0 | Spinner animations |
| @types/node | ^22.10.0 | TypeScript types |
| tsx | ^4.19.0 | TypeScript execution |

---

## Notes

- This project requires **opencode** to be installed and available in PATH
- The agent communicates with opencode via CLI subprocess
- All development happens on `develop` branch
- Uses Conventional Commits for git commit messages
- Monorepo structure enables independent versioning of CLI and MCP packages
