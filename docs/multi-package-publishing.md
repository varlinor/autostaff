# 多包发布方案：CLI + MCP

## 方案概述

使用 pnpm workspace 实现多包发布：
- `auto-dev` — CLI 包
- `auto-dev-mcp` — MCP 服务包
- 共用同一套核心逻辑

## 目录结构

```
auto-bot/
├── pnpm-workspace.yaml
├── package.json                    # 根：workspace 编排
├── packages/
│   ├── auto-dev/                 # CLI 包
│   │   ├── src/
│   │   │   ├── agent.ts
│   │   │   ├── client.ts
│   │   │   ├── progress.ts
│   │   ├── prompts.ts
│   │   └── security.ts
│   ├── package.json            # name: "auto-dev"
│   └── dist/
│   └── prompts/               # 模板文件
└── packages/
    └── auto-dev-mcp/            # MCP 包
        ├── src/
        │   └── mcp-server.ts    # MCP 入口
        ├── package.json        # name: "auto-dev-mcp", depends: "auto-dev"
        └── dist/
```

## 配置文件

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
```

### 根 package.json

```json
{
  "name": "auto-dev-workspace",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "dev": "pnpm -r --parallel run dev",
    "lint": "pnpm -r run lint"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### packages/auto-dev/package.json

```json
{
  "name": "auto-dev",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "auto-dev": "./dist/auto-dev.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./agent": "./dist/agent.js",
    "./client": "./dist/client.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w"
  }
}
```

### packages/auto-dev-mcp/package.json

```json
{
  "name": "auto-dev-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/mcp-server.js",
  "dependencies": {
    "auto-dev": "workspace:*"
  },
  "scripts": {
    "build": "tsc"
  }
}
```

## 构建与发布

```bash
# 构建所有包
pnpm build

# 开发模式（监听）
pnpm dev

# 发布 CLI 包
cd packages/auto-dev
npm publish

# 发布 MCP 包
cd packages/auto-dev-mcp
npm publish
```

## MCP 配置

发布后，用户在 Claude/Cursor 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "auto-dev": {
      "command": "node",
      "args": ["path/to/auto-dev-mcp/dist/mcp-server.js"]
    }
  }
}
```
