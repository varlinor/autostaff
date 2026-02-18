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
