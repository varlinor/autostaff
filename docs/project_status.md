# Project Status - auto-code-bot

> Last Updated: 2026-02-19

## Project Overview

**Project Name**: auto-code-bot  
**NPM Packages**: 
- CLI: `auto-code-bot`
- MCP: `auto-code-mcp`
**Repository**: https://github.com/varlinor/code-bot  
**Current Version**: 0.2.0  
**License**: MIT

基于 [Anthropic 长时间运行 Agent](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 理念构建的全自动编程系统。通过 **opencode** 子进程驱动，跨多个上下文窗口持续增量开发，直到项目完成。

---

## Current Status

### Phase: Production Ready (v0.2.0)

项目已实现 **Monorepo 结构 + MCP 服务 + 阶段性工作流**，所有核心功能已实现并通过测试。

### Build Status

| Step | Status |
|------|--------|
| `pnpm install` | ✅ Complete |
| `pnpm build` | ✅ Complete |
| `pnpm build:cli` | ✅ Complete |
| `pnpm build:mcp` | ✅ Complete |
| `pnpm lint` | ✅ Pass |

---

## Key Files

```
auto-code-bot/
├── pnpm-workspace.yaml              # pnpm 工作区配置 (含 catalog)
├── packages/
│   ├── cli/                        # CLI 包 (auto-code-bot)
│   │   ├── package.json            # name: auto-code-bot
│   │   └── src/
│   │       ├── auto-dev.ts         # CLI 入口
│   │       ├── agent.ts            # Agent 核心逻辑
│   │       ├── client.ts           # opencode 子进程封装
│   │       ├── progress.ts         # 任务进度 + topological sort
│   │       ├── prompts.ts          # Prompt 加载
│   │       ├── security.ts         # 命令白名单
│   │       └── workspace.ts        # 项目类型检测
│   └── mcp/                        # MCP 服务包 (auto-code-mcp)
│       ├── package.json            # name: auto-code-mcp
│       └── src/
│           ├── index.ts            # MCP 入口
│           └── lib/
│               └── project.ts      # 项目状态逻辑
├── docs/
│   ├── app_spec.md                # App 规格模板
│   ├── workflow.md                # 工作流指南
│   ├── mcp.md                     # MCP 配置指南
│   ├── ROADMAP.md                 # 版本规划
│   └── project_status.md          # 项目状态
├── skills/
│   ├── app-spec-generator.md      # 生成 app_spec skill
│   └── task-auditor.md            # 审核 task.json skill
├── prompts/
│   └── AGENTS.md                  # Agent 工作流规则
└── test/
    ├── fixtures/                  # 测试数据
    └── unit/                      # 单元测试
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
- 统一依赖管理（catalog 共享版本）
- 跨包类型引用
- 独立发布（changesets）

### 2. Phase Detection Logic

```typescript
// Phase: need-spec → need-tasks → execute
// 优化：当 task.json 存在时，即使没有 app_spec 也可执行
if (!hasSpec && hasTasks) return "execute";
```

**规则**:
- 无 docs/app_spec.md → need-spec（生成规格）
- 有 app_spec，无 task.json → need-tasks（生成任务）
- 有 task.json → execute（执行任务）
- **特殊情况**：有 task.json 但无 app_spec → execute（可直接执行）

### 3. Task Dependency (Topological Sort)

```typescript
// progress.ts
export function topologicalSort(tasks: Task[]): Task[]

// Task 格式
{
  "id": "task-1",
  "type": "package" | "app",
  "workspace": "packages/shared-ui",
  "dependsOn": ["task-2", "task-3"],
  "passes": false
}
```

**规则**:
- 有依赖的任务等待依赖完成后执行
- 循环依赖检测
- 每次选择所有依赖已满足的任务中优先级最高的执行

### 4. app_spec.md Location

- 标准位置: `docs/app_spec.md`
- 回退位置: `app_spec.txt`

### 5. Configuration Priority

```
CLI Options > Config File (auto-code-bot.json) > Hardcoded Defaults
```

### 6. Default Model

- Default: `minimax(Custom)/MiniMax-M2.5`
- 可通过配置文件或 CLI 参数覆盖

### 7. MCP Service Architecture

```
MCP Server (packages/mcp)
├── Tools:
│   ├── auto_dev_status       # 获取项目状态
│   ├── auto_dev_run_one_task # 执行单个任务
│   └── auto_dev_start       # 启动完整循环
├── Resources:
│   ├── task://{project_dir}/task.json
│   ├── progress://{project_dir}/progress.txt
│   └── app_spec://{project_dir}/app_spec.md
└── Transport: stdio
```

### 8. Staged Workflow

```
Phase 1: 生成 app_spec.md (app-spec-generator skill)
    ↓
Phase 2: 生成 task.json (--init-only)
    ↓
Phase 3: 审核 task.json (task-auditor skill)
    ↓
Phase 4: 执行任务 (--ulw)
```

---

## CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `[project-dir]` | - | Working directory | `.` |
| `--config` | `-c` | Config file path | `auto-code-bot.json` |
| `--model` | `-m` | Model (provider/model) | config / minimax(...) |
| `--agent` | `-a` | Agent name | config / default |
| `--max-iterations` | - | Max iterations | unlimited |
| `--ulw` | - | Ultrawork mode | false |
| `--init-only` | - | Only generate spec + tasks, don't execute | false |
| `--spec` | - | Spec file path | - |
| `--desc` | - | Description to generate spec | - |
| `--extend` | `-e` | Extend mode | false |
| `--package-manager` | - | npm/pnpm/yarn/bun | config / npm |
| `--git-branch` | - | Git branch | config / develop |

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `auto_dev_status` | 返回项目阶段、任务进度、分类统计 |
| `auto_dev_run_one_task` | 执行下一个未完成任务（非阻塞） |
| `auto_dev_start` | 启动完整自动化循环（非阻塞） |

---

## Test Scenarios

### Scenario 1: 完整工作流（推荐）

```bash
# Phase 1: 生成 app_spec.md
opencode
# 使用 app-spec-generator skill

# Phase 2: 生成 task.json
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --init-only

# Phase 3: 审核 task.json
opencode
# 使用 task-auditor skill

# Phase 4: 执行任务
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --ulw
```

### Scenario 2: 直接执行（已有 task.json）

```bash
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --ulw
```

### Scenario 3: 继续执行（中断后恢复）

```bash
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --ulw
```

### Scenario 4: 限制迭代次数

```bash
cd packages/cli
npx tsx src/auto-dev.ts ./my-project --ulw --max-iterations 3
```

### Scenario 5: MCP 使用

```json
{
  "mcpServers": {
    "auto-code-bot": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"]
    }
  }
}
```

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

## Next Steps (Future Improvements)

### Priority 1: 质量保障
- [ ] 单元测试覆盖扩展
- [ ] E2E 测试
- [ ] CI/CD 集成

### Priority 2: 多应用编排
- [ ] app_spec 支持多应用声明
- [ ] 批量执行多个应用的任务
- [ ] 应用间依赖关系

### Priority 3: 高级特性
- [ ] 并行构建支持
- [ ] 增量构建（只构建变更部分）
- [ ] 智能依赖拓扑排序优化

---

## Dependencies

### Root

| Package | Version | Purpose |
|---------|---------|---------|
| pnpm | ^9.0.0 | Package manager |
| typescript | ^5.7.0 | TypeScript compiler |
| vitest | ^4.0.0 | Test runner |

### packages/cli

| Package | Version | Purpose |
|---------|---------|---------|
| commander | ^12.1.0 | CLI argument parsing |
| chalk | ^5.3.0 | Terminal styling |
| ora | ^8.1.0 | Spinner animations |

### packages/mcp

| Package | Version | Purpose |
|---------|---------|---------|
| @modelcontextprotocol/sdk | ^1.26.0 | MCP protocol |
| zod | ^3.24.0 | Validation |

---

## Notes

- This project requires **opencode** to be installed and available in PATH
- The agent communicates with opencode via CLI subprocess
- All development happens on `develop` branch
- Uses Conventional Commits for git commit messages
- Monorepo structure enables independent versioning of CLI and MCP packages
- Recommended workflow: generate spec → generate tasks → audit tasks → execute
