# auto-code-bot Roadmap

## 版本历程

### v0.1.0 ✅ 已完成

**目标：基础功能**

**已完成功能**：

- [x] 三阶段自动检测：need-spec → need-tasks → execute
- [x] app_spec.md 模板 + 生成规则（skills/app-spec-generator.md）
- [x] task.json 生成（JSONC 格式，支持 passes 字段）
- [x] Conventional Commits 提交规范
- [x] Git 分支策略（develop 分支）
- [x] 包管理器支持（pnpm/yarn/bun/npm 自动检测）
- [x] 测试验证清单（browser 测试要求）
- [x] 代码质量门槛（commit 前检查）

**使用流程**：
```
1. 生成 app_spec.md（使用 app-spec-generator skill）
2. 生成 task.json（auto-bot code --init-only）
3. 审核 task.json（使用 task-auditor skill）
4. 执行任务（auto-bot code --ulw）
```

---

### v0.2.0 ✅ 已完成

**目标：Monorepo 支持 + MCP 服务 + 阶段性工作流**

#### Monorepo 支持

- [x] task.json 支持 `type` 字段（package/app）
- [x] task.json 支持 `workspace` 字段（多包工作区）
- [x] task.json 支持 `dependsOn` 依赖声明
- [x] 自动拓扑排序执行顺序（progress.ts topologicalSort）
- [x] pnpm workspace 检测（workspace.ts detectProjectType）

#### MCP 服务

- [x] MCP 协议兼容（stdio 传输）
- [x] auto_dev_status 工具
- [x] auto_dev_run_one_task 工具
- [x] auto_dev_start 工具
- [x] task.json 资源
- [x] progress.txt 资源
- [x] app_spec 资源

#### 阶段性工作流

- [x] `--init-only` 参数（仅生成 app_spec + task.json）
- [x] Phase 检测优化（支持 task.json 存在时跳过 app_spec）
- [x] task-auditor skill（task.json 审核）

#### 文档

- [x] docs/workflow.md 工作流指南
- [x] docs/mcp.md MCP 配置指南
- [x] skills/task-auditor.md

---

### v0.3.0 ✅ 已完成

**目标：多应用编排 + 日志与输出控制**

#### 多应用编排

**设计理念**：
- 通过 task.json 的 workspace 字段实现子应用切换
- 每个任务独立执行，避免大上下文
- 支持单仓多包工程

**已完成**：
- [x] task.json 支持 `workspace` 字段（多包工作区）
- [x] 自动切换工作目录（getEffectiveDir + createClient）
- [x] 多子应用任务调度（workspace 切换机制）
- [x] 应用间依赖关系（dependsOn 拓扑排序）
- [x] pnpm workspace 根目录检测（findWorkspaceRoot）
- [x] 每个任务独立 opencode 会话

#### 日志与输出控制

**设计理念**：
- auto-bot 自身输出始终显示控制台（实时进度）
- opencode 子进程输出可选转文件（减少干扰）

**已完成**：
- [x] `--silent` 静默模式（opencode 输出写文件）
- [x] `--log-file <path>` 指定日志文件路径
- [x] 分离 auto-bot 与 opencode 输出
- [x] 时间戳日志格式

---

### v1.0.0 ✅ 已完成

**目标：架构拆分 + 统一 CLI + 核心基础设施**

#### 架构拆分

**设计理念**：
- 将通用逻辑抽取到 core 包
- 各业务包（code, text）依赖 core
- 实现关注点分离，便于扩展

**已完成**：
- [x] 创建 `@varlinor/autostaff-core` 包
- [x] 抽取 task.json 解析逻辑（parseTasks, topologicalSort）
- [x] 抽取工作区检测逻辑（detectProjectType, findWorkspaceRoot）
- [x] 抽取阶段检测逻辑（detectPhase）
- [x] 抽取 git 操作逻辑（conventionalCommit, initGit）
- [x] 抽象 Executor 接口，支持任务执行器注入

#### 统一 CLI

**设计理念**：
- 单一入口，多子命令
- code/text 作为子命令
- 包名与命令名一致

**已完成**：
- [x] CLI 包重命名为 `auto-bot`
- [x] 创建 `auto-code` 包（代码开发）
- [x] 创建 `auto-text` 包（文字创作）
- [x] 实现子命令：`auto-bot code` / `auto-bot text`
- [x] 向后兼容：直接运行 `auto-bot` 默认执行 code

#### 核心基础设施

**已完成**：
- [x] task.json 创建、检查、阶段判断
- [x] progress.txt 初始化、更新
- [ ] task.json 和 progress.txt 移至目标 project-dir/.autostaff/ 目录
- [x] 长时间任务执行、状态收集、记录
- [x] git 提交及 Conventional Commits 格式约束
- [x] 代码相关 agent 和检查要求
- [x] 文本相关 agent 和检查要求

---

### v1.1.0 🔄 规划中

**目标：配置提取 + Agent 可替换**

#### 配置提取

**设计理念**：
- 将代码中的常量提取到配置文件
- 支持用户自定义配置
- 参考 opencode 配置实现，全局配置放在 `~/.config/auto-bot/`
- 保持与现有配置格式兼容

**规划中**：
- [ ] 创建 `~/.config/auto-bot/config.json` 全局配置
- [ ] 支持项目级配置 `auto-code-bot.json`（优先级：CLI > 项目 > 全局）
- [ ] 提取默认模型配置
- [ ] 提取默认分支配置
- [ ] 提取日志配置
- [ ] 提取静默模式配置

#### Agent 可替换

**设计理念**：
- 不硬编码执行命令，允许用户替换为其他 agent
- 例如：将 opencode 替换为 claude-code 来执行
- 保持接口一致，按需实现具体执行逻辑
- 参考现有配置格式，使用 executor 对象

**规划中**：
- [ ] 抽象 Agent 执行器接口（IAgentExecutor）
- [ ] 默认使用 opencode 执行
- [ ] 支持配置 claude-code 作为替代
- [ ] 支持自定义 agent 命令
- [ ] 传递 workspace、model、参数等配置

#### 配置项设计

```json
// 项目级配置 auto-code-bot.json 或全局配置 ~/.config/auto-bot/config.json
{
  "executor": {
    "type": "opencode",
    "command": "pnpm exec opencode",
    "args": [],
    "silent": false,
    "logFile": "auto-code-bot.log"
  },
  "model": "minimax(Custom)/MiniMax-M2.5",
  "packageManager": "npm",
  "agent": "",
  "ulw": false,
  "maxIterations": 0,
  "gitBranch": "develop"
}
```

**配置优先级**（从高到低）：
1. CLI 参数（最高优先级）
2. 项目级配置 `auto-code-bot.json`
3. 全局配置 `~/.config/auto-bot/config.json`
4. 代码默认值（最低优先级）

---

### v1.2.0 🔄 规划中

**目标：完善 text agent + 扩展性增强**

#### text agent 完善

- [ ] 实现 opencode 集成
- [ ] 完善文字内容验证器
- [ ] 支持多种内容格式（博客、文档，营销文案）

#### 扩展性增强

- [ ] 抽象更多 core 接口
- [ ] 插件化验证器

---

## 当前项目结构

```
auto-code-bot/
├── pnpm-workspace.yaml              ✅
├── package.json                      ✅
├── docs/                            ✅
│   ├── app_spec.md
│   ├── workflow.md
│   ├── mcp.md
│   ├── ROADMAP.md
│   └── project_status.md
├── packages/
│   ├── cli/                         ✅ (auto-bot)
│   │   ├── package.json            ✅ name: "auto-bot"
│   │   └── src/
│   │       └── index.ts           ✅ 子命令入口
│   ├── core/                       ✅ (@varlinor/autostaff-core)
│   │   ├── package.json            ✅ name: "@varlinor/autostaff-core"
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── progress.ts
│   │       ├── workspace.ts
│   │       ├── phase.ts
│   │       ├── git.ts
│   │       └── executor.ts
│   ├── code/                       ✅ (auto-code)
│   │   ├── package.json            ✅ name: "auto-code"
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent.ts
│   │       └── client.ts
│   ├── text/                       ✅ (auto-text)
│   │   ├── package.json            ✅ name: "auto-text"
│   │   └── src/
│   │       ├── index.ts
│   │       ├── agent.ts
│   │       └── validator.ts
│   └── mcp/                       ✅ (auto-code-mcp)
│       ├── package.json            ✅ name: "auto-code-mcp"
│       └── src/
│           └── index.ts            ✅ MCP 入口
└── skills/                          ✅
    ├── app-spec-generator.md
    └── task-auditor.md
```

## CLI 使用方式

```bash
# 代码开发
auto-bot code ./project --ulw

# 文字创作
auto-bot text ./content --ulw

# 默认（向后兼容，等同于 code）
auto-bot ./project --ulw
```
