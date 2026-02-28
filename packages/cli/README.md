# auto-staff

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

### 支持工程类型
- **单包工程**：直接处理，简单高效
- **多包工程 (Monorepo)**：自动检测 `pnpm-workspace.yaml`，根据 `task.json` 中的 `workspace` 字段智能切换目录，跨多个包协作开发

> ⚠️ 多包工程支持目前处于早期验证阶段，欢迎反馈问题与改进建议

### 测试进度
- 已完成 7 个任务的验证测试
- 测试耗时：约 40 分钟
- 后续将进行大型工程的验证

### 多模型支持
- 支持 OpenAI、DeepSeek、MiniMax 等主流模型
- 可通过命令行参数或配置文件灵活切换

### 智能任务管理
- 基于 `task.json` 的任务清单
- 拓扑排序自动处理任务依赖
- 支持断点续传，中断后自动恢复

### 自动化测试与验证
- 自动运行浏览器测试 (Playwright/Puppeteer)
- TypeScript 类型检查
- 构建验证

### 规范化提交
- 自动生成符合 Conventional Commits 格式的提交信息

---

## 安装

```bash
# 克隆仓库
git clone https://github.com/varlinor/code-bot.git
cd code-bot

# 安装依赖
pnpm install

# 构建
pnpm build
```

### 安装 CLI 包

```bash
# 进入 CLI 目录
cd packages/cli

# 开发模式（推荐）
pnpm dev

# 或全局安装
pnpm install -g
```

---

## 快速开始

### Step 1: 生成 app_spec.md（可选）

**方式 A：用 opencode（推荐）**
```bash
opencode
# 对话生成 app_spec.md
```

**方式 B：手动编写**
参考 `prompts/app_spec.md` 模板。

**注意**：
- `app_spec.md` 可以放在根目录或 `docs/` 目录
- 如果已有 `task.json`，可以直接跳到 Step 2

### Step 2: 执行 auto-staff

```bash
# 开发模式（推荐）
npx tsx src/index.ts code ./my-project --ulw

# 或构建后运行
pnpm build
auto-staff code ./my-project --ulw
```

---

## CLI 子命令

auto-staff 提供两个子命令，分别用于不同的自动化任务：

| 子命令 | 说明 | 使用场景 |
|--------|------|----------|
| `code` | 代码开发 Agent | 开发应用程序、库、包等代码项目 |
| `text` | 文本内容 Agent | 创作文章、文档、博客等文本内容 |

### code 子命令

代码开发 Agent，处理完整的代码开发工作流：

```bash
auto-staff code <project-dir> [options]
```

**工作流程：**
1. 检测项目阶段（need-spec → need-tasks → execute）
2. Phase 1: 生成 `docs/app_spec.md` 项目规格
3. Phase 2: 生成 `.autostaff/task.json` 任务清单 + 项目初始化脚本
4. Phase 3: 迭代执行任务直到完成

**选项：**

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--ulw` | - | 启用 ultrawork 模式，高精度执行 | 关闭 |
| `--model <model>` | `-m` | 指定模型 | minimax(Custom)/MiniMax-M2.5 |
| `--agent <name>` | `-a` | 指定 agent 名称 | 默认 |
| `--max-iterations <n>` | - | 最大迭代轮数 | 无限制 |
| `--spec <file>` | - | 复制规格文件到目标项目 | - |
| `--desc <text>` | - | 描述要生成规格的项目 | - |
| `--extend` | `-e` | 追加新功能模式 | 关闭 |
| `--init-only` | - | 仅生成规格和任务，不执行（适用于 code 命令） | 关闭 |
| `--verbose` | - | 详细输出（两个命令通用） | 关闭 |
| `--log-file <path>` | - | 日志文件路径（两个命令通用） | auto-staff.log |

**示例：**

```bash
# 开发新项目
auto-staff code ./my-project --ulw

# 指定模型和迭代次数
auto-staff code ./my-project --ulw -m deepseek/deepseek-chat --max-iterations 5

# 仅生成规格和任务清单（不执行）
auto-staff code ./my-project --init-only

# 继续之前中断的任务
auto-staff code ./my-project --ulw

# 通过描述生成规格
auto-staff code ./my-project --desc "一个 React Todo 应用"

# 使用子命令格式（推荐）
npx auto-staff code . --ulw --max-iterations 2
```

### text 子命令

文本内容创作 Agent，处理文本内容创建工作流：

```bash
auto-staff text <project-dir> [options]
```

**工作流程：**
1. 检测项目阶段（need-spec → need-tasks → execute）
2. Phase 1: 生成 `docs/content_spec.md` 内容规格
3. Phase 2: 生成 `content_tasks.json` 内容任务清单
4. Phase 3: 迭代执行内容任务

**选项：**

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--ulw` | - | 启用 ultrawork 模式 | 关闭 |
| `--model <model>` | `-m` | 指定模型 | minimax(Custom)/MiniMax-M2.5 |
| `--agent <name>` | `-a` | 指定 agent 名称 | 默认 |
| `--max-iterations <n>` | - | 最大迭代轮数 | 无限制 |
| `--extend` | `-e` | 追加新内容模式 | 关闭 |
| `--init-only` | - | 仅生成规格和任务，不执行 | 关闭 |
| `--verbose` | - | 详细输出（两个命令通用） | 关闭 |
| `--log-file <path>` | - | 日志文件路径（两个命令通用） | auto-staff.log |

**示例：**

```bash
# 创建文本内容项目
auto-staff text ./my-blog --ulw

# 指定模型
auto-staff text ./my-blog -m openai/gpt-4o

# 继续之前的工作
auto-staff text ./my-blog --ulw

# 使用子命令格式（推荐）
npx auto-staff text ./content --model deepseek/deepseek-chat
```

---

## CLI 参数详解

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `[project-dir]` | - | 项目目录 | 当前目录 `.` |
| `--ulw` | - | 启用 ultrawork 模式，触发高精度执行 | 关闭 |
| `--model <model>` | `-m` | 指定模型，格式 `provider/model` | `minimax(Custom)/MiniMax-M2.5` |
| `--agent <name>` | `-a` | 指定 opencode 中的 agent 名称 | 默认 agent |
| `--max-iterations <n>` | - | 最大迭代轮数 | 无限制 |
| `--init-only` | - | 仅生成 app_spec.md 和 task.json，不执行任务 | 关闭 |
| `--extend` | `-e` | 完成后追加新功能模式 | 关闭 |

---

## 工作流

详细工作流说明见 [docs/workflow.md](../docs/workflow.md)。

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

### 模型示例

```bash
# MiniMax（默认）
auto-staff code ./my-project --ulw

# DeepSeek
auto-staff code ./my-project --ulw -m deepseek/deepseek-chat

# OpenAI
auto-staff code ./my-project --ulw -m openai/gpt-4o
```

---

## 场景用法

### 场景 1：空白目录，首次执行

```bash
# 最简用法
auto-staff code ./my-project --ulw

# 指定模型
auto-staff code ./my-project --ulw -m openai/gpt-4o
```

**自动检测**：
1. 无 `docs/app_spec.md` → 生成规格
2. 无 `task.json` → 生成任务清单 + 初始化 git
3. 有 task.json → 直接执行任务（可跳过 app_spec）

### 场景 2：继续执行（中断后恢复）

```bash
# 直接运行，自动检测断点
auto-staff code ./my-project --ulw
```

**恢复逻辑**：
- 检测 task.json 中 passes:false 的任务
- 自动从断点继续执行

### 场景 3：仅生成 task.json（审核后执行）

```bash
# 步骤 1: 仅生成 app_spec.md 和 task.json，不执行
auto-staff code ./my-project --init-only

# 步骤 2: 审核 task.json（使用 task-auditor skill）

# 步骤 3: 确认无误后执行任务
auto-staff code ./my-project --ulw
```

**使用场景**：
- 需要在执行前审核 task.json 质量
- 希望分阶段控制开发流程

### 场景 4：追加新功能

```bash
# 方式 A：--extend 模式
auto-staff code ./my-project --extend --ulw

# 方式 B：手动编辑 task.json 后继续
# 1. 编辑 task.json 添加新任务（passes:false）
# 2. 运行
auto-staff code ./my-project --ulw
```

### 场景 5：限制迭代轮数（测试用）

```bash
# 只跑 3 轮
auto-staff code ./my-project --ulw --max-iterations 3
```

### 场景 6：自定义模型

```bash
# 使用特定模型
auto-staff code ./my-project --ulw -m deepseek/deepseek-chat
```

---

## 工作流

```
Step 1: 读取 app_spec + task.json + git log
Step 2: 检查/初始化 git（develop 分支）
Step 3: 回归验证（确认之前任务仍正常）
Step 4: 选择下一个 passes:false 任务
Step 5: 实现功能
Step 6: 测试验证（必须 browser 测试）
Step 7: git commit（Conventional Commits 格式）
Step 8: 更新 task.json + progress.txt
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
      "steps": [
        "Create packages/shared-ui/src/Button.tsx",
        "Export Button component",
        "Verify: npm run build succeeds"
      ],
      "passes": false
    },
    {
      "id": "task-2",
      "type": "app",
      "category": "functional",
      "description": "User can create new task",
      "dependsOn": ["task-1"],
      "steps": [
        "Open app in browser",
        "Click new button",
        "Verify task appears"
      ],
      "passes": false
    }
  ]
}
```

**字段说明：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `package` \| `app` | 任务类型：包或应用 |
| `workspace` | string | 工作区路径，如 `packages/shared-ui` |
| `dependsOn` | string[] | 依赖的任务 ID 数组 |

---

## 项目结构

```
my-project/
├── app_spec.md      # 项目规格（源头）
├── task.json       # 任务清单（执行依据）
├── progress.txt    # 进度记录
├── AGENTS.md      # 工作流规则
└── [代码文件]
```

---

## 配置

### 修改默认模型

编辑 `src/client.ts` 中的 `DEFAULT_MODEL`：

```typescript
export const DEFAULT_MODEL = "minimax(Custom)/MiniMax-M2.5";
```

### 修改技术栈偏好

编辑 `prompts/AGENTS.md` 中的技术选择。

---

## 灵感来源

- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic
- [auto-coding-agent-demo](https://github.com/SamuelQZQ/auto-coding-agent-demo) — SamuelQZQ
