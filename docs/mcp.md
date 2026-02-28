# MCP Server Configuration

本项目提供 MCP (Model Context Protocol) 服务器，可在 Cursor、Claude Desktop 等 MCP 客户端中使用。

## 架构

MCP 服务器依赖 `@varlinor/autostaff-core` 核心包，提供以下功能：

- 阶段检测 (need-spec / need-tasks / execute)
- 任务解析和拓扑排序
- 进度统计
- 通过 CLI 执行任务

## 快速开始

## 快速开始

### 1. 构建 MCP 服务

```bash
# 构建 MCP 包
pnpm build:mcp

# 或构建所有包
pnpm build
```

### 2. 配置 MCP 客户端

#### Cursor 配置

在 Cursor 设置中添加 MCP 服务器：

```json
{
  "mcpServers": {
    "auto-code-bot": {
      "command": "node",
      "args": ["D:\\workspaces\\fe-workspace\\auto-bot\\packages\\mcp\\dist\\index.js"],
      "env": {}
    }
  }
}
```

#### Claude Desktop 配置

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "auto-code-bot": {
      "command": "node",
      "args": ["D:/workspaces/fe-workspace/auto-bot/packages/mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 3. 使用 MCP 工具

配置完成后，你可以在 Claude/Cursor 中使用以下工具：

---

## 可用工具

### auto_dev_status

获取项目状态信息。

**参数：**
- `project_dir` (必需): 项目目录路径（绝对或相对路径）

**返回：**
- 当前阶段 (phase)
- 任务完成进度
- 分类统计
- 最近进度摘要

**阶段说明：**
- `need-spec`: 项目需要 app_spec.md
- `need-tasks`: 项目有 app_spec.md 但需要 task.json
- `execute`: 项目有 task.json，可以执行任务

**使用示例：**
```
请检查 D:\workspaces\my-project 的状态
```

---

### auto_dev_run_one_task

执行单个任务。

**参数：**
- `project_dir` (必需): 项目目录路径
- `model` (可选): 指定模型，如 `minimax(Custom)/MiniMax-M2.5`
- `ulw` (可选): 启用 ultrawork 模式
- `max_iterations` (可选): 最大迭代次数

**返回：**
- 任务执行结果消息

**使用示例：**
```
在 D:\workspaces\my-project 执行一个任务
```

---

### auto_dev_start

启动完整的自动化循环。

**参数：**
- `project_dir` (必需): 项目目录路径
- `model` (可选): 指定模型
- `ulw` (可选): 启用 ultrawork 模式
- `max_iterations` (可选): 最大迭代次数
- `extend` (可选): 追加新功能模式
- `agent` (可选): 指定 agent 名称

**返回：**
- 启动消息

**使用示例：**
```
启动 D:\workspaces\my-project 的自动化开发
```

---

## 可用资源

### project://{project_dir}/task.json

读取项目的 task.json 文件内容。

**返回：**
- JSON 格式的任务清单

### project://{project_dir}/progress.txt

读取项目的 progress.txt 文件内容。

**返回：**
- 纯文本格式的进度记录

### project://{project_dir}/app_spec.md

读取项目的 app_spec.md 文件内容。

**返回：**
- Markdown 格式的项目规格文档

---

## 注意事项

1. 项目目录需要包含 `docs/app_spec.md` 文件
2. MCP 服务器通过 stdio 通信，需要保持连接
3. 长时间运行的任务会返回"已启动，请稍后查询状态"的消息

---

## 灵感来源

- [Model Context Protocol](https://modelcontextprotocol.io/) — Anthropic
- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic
