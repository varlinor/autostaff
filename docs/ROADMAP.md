# auto-dev Roadmap

## 版本历程

### v0.1.0 (当前版本)

**已完成功能**：

- [x] 三阶段自动检测：need-spec → need-tasks → execute
- [x] app_spec.md 模板 + 生成规则
- [x] task.json 生成（JSONC 格式，支持 passes 字段）
- [x] Conventional Commits 提交规范
- [x] Git 分支策略（develop 分支）
- [x] 包管理器支持（pnpm/yarn/bun/npm 自动检测）
- [x] 测试验证清单（browser 测试要求）
- [x] 代码质量门槛（commit 前检查）
- [x] 分拆工作流（app_spec 与执行分离）

**使用流程**：
```
1. 单独生成 app_spec.md（用 opencode/cursor/Claude）
2. 执行 auto-bot 自动完成任务
```

---

## v0.2.0 (规划中)

### 目标：支持 Workspace/Monorepo

**核心改动**：

```markdown
## Build Order (新增)

构建顺序声明：
1. packages/shared-ui    # 先构建共享包
2. packages/utils
3. apps/dashboard      # 再构建应用
4. apps/admin
```

```jsonc
// task.json 新增字段
{
  "tasks": [
    {
      "id": "pkg-shared-ui",
      "type": "package",        // package | app
      "workspace": "packages/shared-ui",
      "dependsOn": [],        // 依赖的任务 ID
      "steps": [...],
      "passes": false
    }
  ]
}
```

**实现要点**：
- [ ] task.json 支持 `type` 字段（package/app）
- [ ] task.json 支持 `dependsOn` 依赖声明
- [ ] auto-bot 自动拓扑排序执行顺序
- [ ] 支持 pnpm workspace 检测

---

## v0.3.0 (规划中)

### 目标：多应用编排

**场景**：
- 一个仓库包含多个独立 web 应用
- 共享组件包 + 多个子应用

**实现**：
- [ ] app_spec 支持多应用声明
- [ ] 支持批量执行多个应用的任务
- [ ] 应用间依赖关系声明

---

## v0.4.0 (规划中)

### 目标：多包发布（CLI + MCP）

**两包结构**：
```
auto-bot/
├── pnpm-workspace.yaml
├── package.json              # 根：workspace 编排
└── packages/
    ├── auto-dev/            # CLI 包：当前所有逻辑
    │   ├── src/
    │   └── package.json    # name: "auto-dev"
    └── auto-dev-mcp/       # MCP 包：调用 auto-dev 的 API
        └── src/
            └── mcp-server.ts
        └── package.json    # name: "auto-dev-mcp", depends: "auto-dev"
```

**三包结构（可选）**：
```
packages/
├── core/                    # 核心逻辑，可被 CLI/MCP/第三方引用
├── cli/                    # CLI 入口，依赖 core
└── mcp/                   # MCP 入口，依赖 core
```

**实现要点**：
- [ ] pnpm-workspace.yaml 配置
- [ ] 根 package.json 编排脚本
- [ ] packages/auto-dev-mcp/ MCP 入口
- [ ] 分别发布的配置

---

## v1.0.0 (目标版本)

### 完整愿景

- [ ] 全功能 Monorepo 支持
- [ ] 智能依赖拓扑排序
- [ ] 并行构建支持
- [ ] 增量构建（只构建变更部分）
- [ ] CLI + MCP 双端发布

---

## 技术债务

- [ ] 单元测试覆盖
- [ ] E2E 测试
- [ ] CI/CD 集成
