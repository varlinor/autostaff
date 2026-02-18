# auto-code-bot

基于 [Anthropic 长时间运行 Agent](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 理念构建的全自动编程系统。通过 **opencode** 子进程驱动，跨多个上下文窗口持续增量开发，直到项目完成。

## 核心设计：分拆工作流

```
Step 1: 用 app-spec-generator skill 生成 app_spec.md
Step 2: 用 auto-code-bot 执行任务直到完成
```

**为什么分拆**：
- `app_spec.md` 是源头，质量决定后续一切
- 生成 spec 需要迭代打磨，用更强大的 agent
- auto-code-bot 专注执行，职责单一
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

### Step 1: 生成 app_spec.md

**方式 A：用 opencode（推荐）**
```bash
opencode
# 对话生成 app_spec.md
```

**方式 B：手动编写**
参考 `prompts/app_spec.md` 模板。

### Step 2: 执行 auto-code-bot

```bash
# 开发模式（推荐）
npx tsx src/auto-dev.ts ./my-project --ulw

# 或构建后运行
npm run build
npx auto-code-bot ./my-project --ulw
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
| `--extend` | `-e` | 完成后追加新功能模式 | 关闭 |

### 模型示例

```bash
# MiniMax（默认）
npx tsx src/auto-dev.ts ./my-project --ulw

# DeepSeek
npx tsx src/auto-dev.ts ./my-project --ulw -m deepseek/deepseek-chat

# OpenAI
npx tsx src/auto-dev.ts ./my-project --ulw -m openai/gpt-4o
```

---

## 场景用法

### 场景 1：空白目录，首次执行

```bash
# 最简用法
npx tsx src/auto-dev.ts ./my-project --ulw

# 指定模型
npx tsx src/auto-dev.ts ./my-project --ulw -m openai/gpt-4o
```

**自动检测**：
1. 无 `app_spec.md` → 生成规格
2. 无 `task.json` → 生成任务清单 + 初始化 git
3. 有 task.json → 执行任务

### 场景 2：继续执行（中断后恢复）

```bash
# 直接运行，自动检测断点
npx tsx src/auto-dev.ts ./my-project --ulw
```

**恢复逻辑**：
- 检测 task.json 中 passes:false 的任务
- 自动从断点继续执行

### 场景 3：追加新功能

```bash
# 方式 A：--extend 模式
npx tsx src/auto-dev.ts ./my-project --extend --ulw

# 方式 B：手动编辑 task.json 后继续
# 1. 编辑 task.json 添加新任务（passes:false）
# 2. 运行
npx tsx src/auto-dev.ts ./my-project --ulw
```

### 场景 4：限制迭代轮数（测试用）

```bash
# 只跑 3 轮
npx tsx src/auto-dev.ts ./my-project --ulw --max-iterations 3
```

### 场景 5：自定义模型

```bash
# 使用特定模型
npx tsx src/auto-dev.ts ./my-project --ulw -m deepseek/deepseek-chat
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
