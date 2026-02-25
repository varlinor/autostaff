# auto-code-mcp

MCP (Model Context Protocol) 服务器，用于将 auto-code-bot 集成到支持 MCP 的 IDE 中，如 Claude Desktop、Cursor 等。

## 核心特性

### 支持工程类型
- **单包工程**：直接处理，简单高效
- **多包工程 (Monorepo)**：自动检测 `pnpm-workspace.yaml`，根据 `task.json` 中的 `workspace` 字段智能切换目录，跨多个包协作开发

> ⚠️ 多包工程支持目前处于早期验证阶段，欢迎反馈问题与改进建议

### 测试进度
- 已完成 7 个任务的验证测试
- 测试耗时：约 40 分钟
- 后续将进行大型工程的验证

### MCP 协议支持
- 完全兼容 Model Context Protocol
- 可与 Claude Desktop、Cursor 等 IDE 无缝集成

### 项目文件支持
- **app_spec.md**：位于 `docs/app_spec.md`
- **task.json**：位于项目根目录
- **task.json 优先**：当存在 task.json 时，即使没有 app_spec.md 也可直接执行任务
- **Phase 检测**：自动检测项目阶段（need-spec / need-tasks / execute）

---

## 安装

```bash
# 克隆仓库
git clone https://github.com/varlinor/code-bot.git
cd code-bot

# 安装依赖
pnpm install

# 构建
pnpm build:mcp
```

---

## 配置

### Claude Desktop

在 `claude_desktop_config.json` 中添加：

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

### Cursor

在 Cursor 设置中找到 MCP 配置，添加同样的配置。

---

## 工作流

MCP 服务是 auto-code-bot 工作流的一部分。详细工作流说明见 [docs/workflow.md](../docs/workflow.md)。

推荐的阶段性工作流：
1. 使用 app-spec-generator skill 生成 app_spec.md
2. 使用 `auto-code-bot --init-only` 生成 task.json
3. 使用 task-auditor skill 审核 task.json
4. 使用 `auto-code-bot --ulw` 执行任务

---

## 开发

```bash
# 开发模式（热重载）
pnpm dev

# 构建
pnpm build
```

---

## 灵感来源

- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic
- [Model Context Protocol](https://modelcontextprotocol.io/) — Anthropic
