# auto-staff Toolkit

基于 [Anthropic 长时间运行 Agent](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 理念构建的全自动编程系统。通过 **opencode** 子进程驱动，跨多个上下文窗口持续增量开发，直到项目完成。

## 核心设计：分拆工作流

```
Step 1: 用 app-spec-generator skill 生成 docs/app_spec.md
Step 2: 用 auto-staff 执行任务直到完成
```

**为什么分拆**：
- `docs/app_spec.md` 是源头，质量决定后续一切
- 如果已有 `task.json`，可直接执行，跳过 app_spec 阶段
- 生成 spec 需要迭代打磨，用更强大的 agent
- auto-staff 专注执行，职责单一
- 符合论文的 initializer + coding agent 分离

---

## 核心特性

### 多模型支持
- 支持 OpenAI、DeepSeek、MiniMax 等主流模型
- 可通过命令行参数或配置文件灵活切换

### 智能任务管理
- 基于 `task.json` 的任务清单
- 拓扑排序自动处理任务依赖
- 支持断点续传，中断后自动恢复

### 单包 & 多包工程支持
- **单包工程**：直接处理，简单高效
- **多包工程 (Monorepo)**：自动检测 `pnpm-workspace.yaml`，根据 `task.json` 中的 `workspace` 字段智能切换目录，跨多个包协作开发

> ⚠️ 多包工程支持目前处于早期阶段，欢迎反馈问题与改进建议

### 自动化测试与验证
- 自动运行浏览器测试 (Playwright/Puppeteer)
- TypeScript 类型检查
- 构建验证

### 规范化提交
- 自动生成符合 Conventional Commits 格式的提交信息
- 自动更新版本号与 Changelog

---

## 当前使用状态

> ⚠️ **重要提示** - 使用前请阅读

### CLI（推荐 ✅）
- **状态**: 功能完整，经过充分测试和使用
- **推荐**: ✅ 生产环境首选，推荐使用 CLI 方式进行项目开发
- **使用方式**: `pnpm dev:cli` 或直接运行 `packages/cli`

### MCP 服务器（实验性 ⚠️）
- **状态**: 已实现功能，但待进一步验证
- **风险提示**: ⚠️ 目前尚未经过充分测试，使用前请注意风险
- **使用方式**: 配置 MCP 客户端（如 Claude Desktop、Cursor），详细配置见下方

---

## 包架构

### 依赖关系

```
packages/
├── core/           (@varlinor/autostaff-core)     ← 核心基础设施
├── code/           (auto-code)                   → 依赖 core
├── text/           (auto-text)                   → 依赖 core  
├── cli/            (auto-staff)                  → 依赖 core + code + text
└── mcp/            (auto-mcp)                    → 依赖 core
```

### 包版本与职责

| 包 | 版本 | 职责 |
|---|---|---|
| **@varlinor/autostaff-parent** | 0.3.0 | 根包 (workspace) |
| **@varlinor/autostaff-core** | 0.1.0 | 核心基础设施 - task.json 解析、阶段检测、progress.txt 管理、git 提交、workspace 检测 |
| **auto-code** | 0.1.0 | 代码开发 agent，提供 runCodeAgent() |
| **auto-text** | 0.1.0 | 文本内容 agent，提供 runTextBot() |
| **auto-staff** | 0.4.0 | 主入口 CLI，支持 code/text 子命令 |
| **auto-mcp** | 0.3.0 | MCP 协议服务器，供 Claude Desktop/Cursor 集成 |

---

## 目录结构

```
auto-staff/                         # 项目根目录 (Monorepo)
├── pnpm-workspace.yaml              # pnpm 工作区配置 + catalog 依赖管理
├── package.json                     # 根包 (@varlinor/autostaff-parent)
├── tsconfig.json                    # TypeScript 项目引用
├── vitest.config.ts                 # 测试配置
├── docs/                           # 文档
│   ├── app_spec.md                # 项目规格模板
│   ├── ROADMAP.md                 # 版本路线图
│   ├── mcp.md                     # MCP 服务器配置指南
│   └── workflow.md                 # 工作流指南
├── packages/                       # 子包
│   ├── core/                      # 核心包 (@varlinor/autostaff-core)
│   │   ├── package.json
│   │   └── src/
│   ├── code/                      # 代码开发 Agent (auto-code)
│   │   ├── package.json
│   │   └── src/
│   ├── text/                      # 文本内容 Agent (auto-text)
│   │   ├── package.json
│   │   └── src/
│   ├── cli/                       # CLI 主入口 (auto-staff)
│   │   ├── package.json
│   │   ├── README.md             # CLI 详细文档
│   │   └── src/
│   └── mcp/                       # MCP 服务器 (auto-mcp)
│       ├── package.json
│       ├── README.md             # MCP 详细文档
│       └── src/
├── skills/                        # Agent skills
│   ├── app-spec-generator.md     # 生成 app_spec.md 的 skill
│   └── task-auditor.md           # 审核 task.json 的 skill
└── test/                         # 测试用例
```

---

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 构建

```bash
# 构建所有包
pnpm build

# 构建单个包
pnpm build:cli      # 构建 CLI 包 (auto-staff)
pnpm build:mcp     # 构建 MCP 包 (auto-mcp)
```

### 开发

```bash
# 开发 CLI
pnpm dev:cli

# 开发 MCP
pnpm dev:mcp
```

---

## CLI 用法

auto-staff 提供两个子命令，分别用于不同的自动化任务：

| 子命令 | 说明 | 使用场景 |
|--------|------|----------|
| `code` | 代码开发 Agent | 开发应用程序、库、包等代码项目 |
| `text` | 文本内容 Agent | 创作文章、文档、博客等文本内容 |

### code 子命令

代码开发 Agent，处理完整的代码开发工作流：

```bash
# 开发模式（推荐）
cd packages/cli
npx tsx src/index.ts code ./my-project --ulw

# 或构建后运行
pnpm build
auto-staff code ./my-project --ulw
```

### text 子命令

文本内容创作 Agent，处理文本内容创建工作流：

```bash
# 开发模式（推荐）
cd packages/cli
npx tsx src/index.ts text ./my-blog --ulw

# 或构建后运行
pnpm build
auto-staff text ./my-blog --ulw
```

### 参数说明

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `[project-dir]` | - | 项目目录（目标项目） | `.` |
| `--ulw` | - | 启用 ultrawork 模式 | 关闭 |
| `--model` | `-m` | 指定模型 | config / minimax(...) |
| `--agent` | `-a` | 指定 agent 名称 | 默认 |
| `--max-iterations` | - | 最大迭代轮数 | 无限制 |
| `--init-only` | - | 仅生成 app_spec.md 和 task.json，不执行 | 关闭 |
| `--extend` | `-e` | 追加新功能模式 | 关闭 |
| `--config` | `-c` | 配置文件路径 | auto-staff.json |
| `--spec` | - | 规格文件路径 | - |
| `--desc` | - | 描述生成规格 | - |
| `--git-branch` | - | Git 分支 | develop |
| `--verbose` | - | 详细模式：输出到控制台（默认：输出到日志文件） | 关闭 |
| `--silent` | - | 静默模式：opencode 输出写文件 | 关闭 |

### 使用示例

```powershell
# 在当前工程运行，自动检测 docs/app_spec.md
cd packages/cli
npx tsx src/index.ts code "D:\workspaces\fe-workspace\my-project" --ulw

# 指定最大迭代次数
cd packages/cli
npx tsx src/index.ts code "D:\workspaces\fe-workspace\my-project" --ulw --max-iterations 5

# 使用指定模型
cd packages/cli
npx tsx src/index.ts code "D:\workspaces\fe-workspace\my-project" --ulw -m deepseek/deepseek-chat

# 继续之前中断的任务
cd packages/cli
npx tsx src/index.ts code "D:\workspaces\fe-workspace\my-project" --ulw

# 追加新功能
cd packages/cli
npx tsx src/index.ts code "D:\workspaces\fe-workspace\my-project" --extend --ulw
```

### 注意事项

- 目标项目需要有 `docs/app_spec.md` 文件
- 多包项目会检测 `pnpm-workspace.yaml` 并根据 task.json 中的 workspace 字段切换目录
- 默认使用 `develop` 分支进行开发

---

## MCP 服务器（实验性 ⚠️）

> ⚠️ **MCP 功能待验证** - 目前尚未经过充分测试，使用前请注意风险

详细配置说明见 [docs/mcp.md](docs/mcp.md)。

### 快速配置

```json
{
  "mcpServers": {
    "auto-staff": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"]
    }
  }
}
```

---

## 工作流指南

详细的工作流说明见 [docs/workflow.md](docs/workflow.md)。

### 推荐的阶段性工作流

```
Phase 1: 生成 app_spec.md
  → 使用 app-spec-generator skill

Phase 2: 生成 task.json
  → auto-staff code <dir> --init-only

Phase 3: 审核 task.json（推荐）
  → 使用 task-auditor skill

Phase 4: 执行任务
  → auto-staff code <dir> --ulw
```

---

## task.json 格式

```jsonc
{
  "tasks": [
    {
      "id": "task-1",
      "type": "package",
      "workspace": "packages/shared-ui",
      "category": "functional",
      "description": "Create shared UI button component",
      "dependsOn": [],
      "steps": [...],
      "passes": false
    }
  ]
}
```

---

## 配置

### 配置文件

在项目目录创建 `auto-staff.json`：

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

**优先级**: CLI 参数 > 配置文件 > 默认值

---

## 版本管理

使用 [changesets](https://github.com/changesets/changesets) 管理多包版本。

```bash
# 创建版本变更
pnpm changeset

# 更新版本
pnpm changeset version

# 发布所有包
pnpm changeset publish
```

---

## 灵感来源

- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic
- [auto-coding-agent-demo](https://github.com/SamuelQZQ/auto-coding-agent-demo) — SamuelQZQ
