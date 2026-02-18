# auto-code-bot Toolkit：Mono-repo 与 MCP 服务开发规格

> 本规格描述当前工程需要开发的内容，供 auto-code-bot 进行自我改进和开发。工程将保持 mono-repo 结构，使用 pnpm 管理，CLI 已基本可用，重点在 MCP 服务的实现与多包发布流程。

## Overview

本工程是基于 [Anthropic 长时间运行 Agent](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 理念的全自动编程系统（auto-code-bot toolkit）。采用 **mono-repo** 结构，包含：

- **CLI 包（auto-code-bot）**：已基本可用，用于在本地驱动 opencode 子进程执行任务。
- **MCP 包（auto-code-mcp）**：待开发，用于在 Cursor / Claude 等环境中以 MCP 服务形式暴露能力，方便在 IDE 内直接调用。

目标是通过本规格驱动：完善 mono-repo 与 pnpm 配置、实现并发布 MCP 服务、统一多包构建与发布流程，使工具既能通过 CLI 使用，也能通过 MCP 在 IDE 中提供服务。

## Technology Stack

### 工程与包管理
- **包管理**: pnpm（workspace + catalog 统一依赖版本）
- **Monorepo**: `pnpm-workspace.yaml` 管理 `packages/*`
- **版本与发布**: changesets（多包独立版本与发布）
- **语言**: TypeScript（各包独立 tsconfig，根目录项目引用）

### CLI 包（packages/cli）
- **名称**: `auto-code-bot`
- **运行时**: Node.js，ESM（`"type": "module"`）
- **依赖**: chalk、commander、ora（版本由 catalog 统一）
- **入口**: `dist/auto-dev.js`，bin 为 `auto-code-bot`

### MCP 包（packages/mcp）
- **名称**: `auto-code-mcp`
- **用途**: Model Context Protocol 服务，供 Cursor/Claude 等 MCP 客户端连接
- **实现**: 待开发（当前为占位脚本），需提供可被 `mcpServers` 配置调用的入口

## Core Features

### Mono-repo 与 pnpm 工程结构
- 根目录 `package.json` 为 private workspace，脚本：`build`、`build:cli`、`build:mcp`、`dev`、`dev:cli`、`dev:mcp`、`lint`、`clean`、`changeset`、`version`、`publish`
- `pnpm-workspace.yaml` 定义 `packages: ["packages/*"]` 与 `catalog` 统一版本
- 各包通过 `catalog:` 引用依赖，保证版本一致
- 根与各包 TypeScript 配置协调（可选用项目引用），便于整体构建与类型检查

### CLI 包（已可用，可做小幅改进）
- 支持指定项目目录、`--ulw`、`--model`、`--agent`、`--max-iterations`、`--extend`、`--config`、`--spec`、`--desc`、`--package-manager`、`--git-branch` 等参数
- 工作流：读取 `docs/app_spec.md` + task.json + git，初始化/检查 git（develop 分支），回归验证，拓扑执行任务，实现→验证→提交，更新 task.json 与 progress
- 配置文件 `auto-code-bot.json` 支持 model、packageManager、agent、ulw、maxIterations、gitBranch
- 如需与 MCP 共享逻辑，可考虑从 CLI 中抽取共享模块供 MCP 依赖（可选，按需做）

### MCP 包（待开发）

- **实现标准 MCP 服务**：实现 [Model Context Protocol](https://modelcontextprotocol.io/) 服务端，可通过 stdio 或 SSE 与 Cursor/Claude 等 MCP 客户端通信。
- **入口与构建**：提供稳定入口（如 `dist/index.js`），便于在 MCP 配置中通过 `command` + `args` 启动。
- **发布与使用**：发布到 npm 后，用户可在 Cursor/Claude 的 MCP 配置中添加（参考下方「MCP 配置」）。
- **开发体验**：`pnpm dev:mcp` 可启动 MCP 开发模式（如监听文件变化、便于本地调试）。

#### MCP 能力规格（Tools & Resources）

与 CLI 核心能力对齐，至少提供以下 **Tools** 与 **Resources**，供 IDE 内 AI 调用或读取。

**Tools（必选）**

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `auto_dev_status` | `project_dir`（必填，目标项目绝对或相对路径） | 返回当前阶段（need-spec / need-tasks / execute）、任务进度（passing/total）、各分类统计、最近 progress 摘要。用于 AI 查询「做到哪一步了」。 |
| `auto_dev_run_one_task` | `project_dir`（必填），`options`（可选：model、ulw 等） | 仅执行**下一个未完成任务**一次：在服务端 spawn 一次 opencode session，按 AGENTS.md 完成单任务后返回。不阻塞 MCP 会话；若单次执行时间较长，可返回「已启动，请稍后通过 auto_dev_status 查看结果」。 |
| `auto_dev_start` | `project_dir`（必填），`options`（可选：model、ulw、maxIterations、extend 等） | 在服务端**非阻塞**启动全自动循环（与 CLI `auto-code-bot <dir> --ulw` 等价）。返回「已启动，请通过 auto_dev_status 轮询进度」。避免长时间占用 MCP 连接。 |

**Resources（可选）**

| 资源 URI 约定 | 说明 |
|---------------|------|
| `project://{project_dir}/task.json` | 目标项目的 task.json 只读内容（可解析为 JSON 供 AI 使用）。 |
| `project://{project_dir}/progress.txt` | 目标项目的 progress.txt 只读内容。 |
| `project://{project_dir}/app_spec.md` | 目标项目的 app_spec.md（或 docs/app_spec.md）只读内容。 |

**实现约定**

- MCP 服务内部复用 CLI 包（或 core）的现有逻辑：phase 检测、task 解析、opencode 调用等，通过依赖 `auto-code-bot` 或共享 core 模块实现，不重复造轮子。
- `auto_dev_run_one_task` 对应「只跑下一未完成任务」的单次 session，需从 agent 中抽成可复用函数（若尚未存在）。
- `auto_dev_start` 必须以非阻塞方式启动全量循环（如子进程或后台任务），通过 `auto_dev_status` 查询是否完成或当前进度。

### 多包构建与发布（参考 docs/multi-package-publishing.md）
- **构建**：`pnpm build` 构建所有包；`pnpm build:cli`、`pnpm build:mcp` 分别构建 CLI 与 MCP
- **开发**：`pnpm dev:cli`、`pnpm dev:mcp` 分别开发两包
- **版本与发布**：使用 changesets
  - `pnpm changeset` 创建变更
  - `pnpm changeset version` 更新版本号
  - `pnpm changeset publish` 发布（或按需单独发布某一包）
- **目录与命名**：保持 `packages/cli`（auto-code-bot）、`packages/mcp`（auto-code-mcp），与 multi-package-publishing.md 一致

## 配置与约定

### 根 package.json 脚本约定
| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm build` | 构建所有包 |
| `pnpm build:cli` | 仅构建 CLI |
| `pnpm build:mcp` | 仅构建 MCP |
| `pnpm dev:cli` | 开发 CLI |
| `pnpm dev:mcp` | 开发 MCP |
| `pnpm lint` | 检查所有包 |
| `pnpm clean` | 清理所有包产物 |
| `pnpm changeset` | 创建版本变更 |
| `pnpm changeset version` | 更新版本号 |
| `pnpm changeset publish` | 发布所有包 |

### MCP 发布后用户配置
用户安装 `auto-code-mcp` 后，在 Cursor/Claude 的 MCP 配置中添加：
```json
{
  "mcpServers": {
    "auto-code-bot": {
      "command": "node",
      "args": ["path/to/auto-code-bot/packages/mcp/dist/index.js"]
    }
  }
}
```
（若全局安装，args 可为 npm 全局路径或 npx 对应路径。）

## Testing Requirements

生成或执行 task.json 时，每个任务必须包含可验证步骤。

### Verification Types

1. **构建验证（所有包相关任务）**
   - 在根目录执行 `pnpm build` — 必须成功（exit code 0）
   - 执行 `pnpm build:cli` 或 `pnpm build:mcp` 时，对应包构建成功
   - 若配置了 `pnpm lint`，须通过

2. **功能验证（CLI 任务）**
   - 在示例项目或 fixtures 上运行 `auto-code-bot`（或 `pnpm dev` 下的 CLI），验证参数、配置文件、spec 路径等行为符合预期
   - 无异常退出与明显错误输出

3. **功能验证（MCP 任务）**
   - 能通过配置的 `command` + `args` 启动 MCP 服务
   - 在 Cursor 或 MCP 兼容客户端中连接该服务，能列出并调用声明的 Tools（auto_dev_status、auto_dev_run_one_task、auto_dev_start）与 Resources（task.json、progress.txt、app_spec）
   - auto_dev_status 返回的 phase、passing/total 与目标项目文件一致；auto_dev_run_one_task 执行后进度可被 status 反映

### task.json 格式（多包项目）

- 使用 `type: "package"` 表示针对某个 workspace 包的任务，并指定 `workspace`（如 `packages/cli`、`packages/mcp`）
- 使用 `type: "app"` 表示根级别或跨包流程任务
- 使用 `dependsOn` 声明任务依赖
- 每个任务的 `steps` 中必须包含以 `VERIFY:` 开头的验证步骤；未经验证不得将任务标记为 `passes: true`

示例：

```jsonc
[
  {
    "id": "task-mcp-1",
    "type": "package",
    "workspace": "packages/mcp",
    "category": "functional",
    "description": "实现 MCP 服务入口与 stdio 传输",
    "dependsOn": [],
    "steps": [
      "1. 在 packages/mcp 下实现 MCP 服务端（stdio）",
      "2. 提供 src/index.ts 入口并导出可执行入口",
      "3. 配置 build 脚本输出到 dist/index.js",
      "4. VERIFY: pnpm build:mcp 成功",
      "5. VERIFY: 通过 command+args 能启动且不立即退出"
    ],
    "passes": false
  },
  {
    "id": "task-mcp-2",
    "type": "package",
    "workspace": "packages/mcp",
    "category": "functional",
    "description": "实现 auto_dev_status 与 Resources（task.json / progress.txt / app_spec）",
    "dependsOn": ["task-mcp-1"],
    "steps": [
      "1. 实现 Tool：auto_dev_status(project_dir)，返回 phase、passing/total、分类统计、最近 progress 摘要",
      "2. 实现 Resources：project://{project_dir}/task.json、progress.txt、app_spec.md（或 docs/app_spec.md）只读",
      "3. 复用 CLI 或 core 的 phase 检测与 task 解析逻辑",
      "4. VERIFY: pnpm build:mcp 成功",
      "5. VERIFY: 在 MCP 客户端中调用 auto_dev_status 并读取 Resource 得到正确响应"
    ],
    "passes": false
  },
  {
    "id": "task-mcp-3",
    "type": "package",
    "workspace": "packages/mcp",
    "category": "functional",
    "description": "实现 auto_dev_run_one_task（单次执行下一未完成任务）",
    "dependsOn": ["task-mcp-2"],
    "steps": [
      "1. 从 agent 中抽取「仅执行下一未完成任务」的可复用函数（若尚未存在）",
      "2. 实现 Tool：auto_dev_run_one_task(project_dir, options?)，内部 spawn 一次 opencode 完成单任务",
      "3. 支持可选参数：model、ulw 等，与 CLI 对齐",
      "4. VERIFY: pnpm build:mcp 成功",
      "5. VERIFY: 在 MCP 客户端中调用后，目标项目 task.json 中有一项从 passes:false 变为 passes:true 或进度更新"
    ],
    "passes": false
  },
  {
    "id": "task-mcp-4",
    "type": "package",
    "workspace": "packages/mcp",
    "category": "functional",
    "description": "实现 auto_dev_start（非阻塞全自动循环）",
    "dependsOn": ["task-mcp-3"],
    "steps": [
      "1. 实现 Tool：auto_dev_start(project_dir, options?)，非阻塞启动全量循环（与 CLI 行为等价）",
      "2. 支持可选参数：model、ulw、maxIterations、extend 等",
      "3. 返回提示「已启动，请通过 auto_dev_status 轮询进度」",
      "4. VERIFY: pnpm build:mcp 成功",
      "5. VERIFY: 调用后 auto_dev_status 能反映进行中或完成状态"
    ],
    "passes": false
  }
]
```

**重要**：每个任务的 steps 中必须包含至少一条 `VERIFY:` 步骤；只有在完成并确认所有验证步骤后，才可将该任务标记为通过。
