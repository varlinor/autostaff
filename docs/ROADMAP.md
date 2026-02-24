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
2. 生成 task.json（auto-code-bot --init-only）
3. 审核 task.json（使用 task-auditor skill）
4. 执行任务（auto-code-bot --ulw）
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

**目标：多应用编排**

**设计理念**：
- 通过 task.json 的 workspace 字段实现子应用切换
- 每个任务独立执行，避免大上下文
- 支持单仓多包工程

**已完成**：
- [x] task.json 支持 `workspace` 字段（多包工作区）
- [x] 自动切换工作目录（getEffectiveDir + createClient）
- [x] 多子应用任务调度（workspace 切换机制）
- [x] 应用间依赖关系（dependsOn 拓扑排序）
---

### v0.4.0 ✅ 已完成

**目标：日志与输出控制**

**设计理念**：
- auto-bot 自身输出始终显示控制台（实时进度）
- opencode 子进程输出可选转文件（减少干扰）

**已完成**：
- [x] `--silent` 静默模式（opencode 输出写文件）
- [x] `--log-file <path>` 指定日志文件路径
- [x] 分离 auto-bot 与 opencode 输出
- [x] 时间戳日志格式
---

### v1.0.0 🔄 规划中

**目标：完整愿景**

**高级特性**：
- [ ] 并行构建支持
- [ ] 增量构建（只构建变更部分）
- [ ] 智能依赖拓扑排序（优化）

**质量保障**：
- [ ] 单元测试覆盖
- [ ] E2E 测试
- [ ] CI/CD 集成

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
│   ├── cli/                         ✅ (auto-code-bot)
│   │   ├── package.json            ✅ name: "auto-code-bot"
│   │   └── src/
│   └── mcp/                        ✅ (auto-code-mcp)
│       ├── package.json            ✅ name: "auto-code-mcp"
│       └── src/
│           └── index.ts            ✅ MCP 入口
└── skills/                          ✅
    ├── app-spec-generator.md
    └── task-auditor.md
```
