# 多包发布方案：CLI + MCP

## 方案概述

使用 pnpm workspace + changesets 实现多包发布：
- `auto-code-bot` — CLI 包
- `auto-code-mcp` — MCP 服务包
- 使用 catalog 统一管理依赖版本

---

## 目录结构

```
auto-code-bot/
├── pnpm-workspace.yaml              # 工作区 + catalog 配置
├── package.json                      # 根：workspace 编排 + changesets
├── tsconfig.json                     # TypeScript 项目引用
├── .changeset/
│   └── config.json                   # changesets 配置
├── docs/
│   └── multi-package-publishing.md  # 本文档
├── packages/
│   ├── cli/                         # CLI 包
│   │   ├── package.json             # name: "auto-code-bot"
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   └── dist/
│   └── mcp/                         # MCP 包
│       ├── package.json             # name: "auto-code-mcp"
│       ├── tsconfig.json
│       └── src/
└── prompts/                         # 模板文件
    ├── AGENTS.md
    └── app_spec.md
```

---

## 配置文件

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"

catalog:
  chalk: ^5.3.0
  commander: ^12.1.0
  ora: ^8.1.0
  "@types/node": ^22.10.0
  tsx: ^4.19.0
  typescript: ^5.7.0
```

### 根 package.json

```json
{
  "name": "@varlinor/code-bot-toolkit",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "build": "pnpm -r run build",
    "build:cli": "pnpm --filter auto-code-bot run build",
    "build:mcp": "pnpm --filter auto-code-mcp run build",
    "dev": "pnpm -r run dev",
    "dev:cli": "pnpm --filter auto-code-bot run dev",
    "dev:mcp": "pnpm --filter auto-code-mcp run dev",
    "lint": "pnpm -r run lint",
    "clean": "pnpm -r run clean",
    "changeset": "changeset",
    "version": "changeset version",
    "publish": "changeset publish"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "tsx": "catalog:",
    "typescript": "catalog:",
    "@changesets/cli": "^2.27.0"
  }
}
```

### packages/cli/package.json

```json
{
  "name": "auto-code-bot",
  "version": "0.1.2",
  "type": "module",
  "main": "dist/auto-dev.js",
  "bin": {
    "auto-code-bot": "dist/auto-dev.js"
  },
  "dependencies": {
    "chalk": "catalog:",
    "commander": "catalog:",
    "ora": "catalog:"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "tsx": "catalog:",
    "typescript": "catalog:"
  }
}
```

### packages/mcp/package.json

```json
{
  "name": "auto-code-mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "echo 'MCP dev server'",
    "build": "echo 'No build required'"
  },
  "keywords": ["ai", "agent", "mcp", "model-context-protocol"]
}
```

---

## changesets 配置

### 初始化

```bash
pnpm install
pnpm changeset init
```

### .changeset/config.json

```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.27.0/schema.json",
  "changelog": "@changesets/changelog-github",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

---

## 构建与发布流程

### 开发

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 开发 CLI
pnpm dev:cli

# 开发 MCP
pnpm dev:mcp
```

### 版本管理

```bash
# 1. 创建版本变更
pnpm changeset

# 2. 选择要发布的包和版本类型
#    - patch: 补丁版本 (0.1.0 -> 0.1.1)
#    - minor: 次版本 (0.1.0 -> 0.2.0)
#    - major: 主版本 (0.1.0 -> 1.0.0)

# 3. 更新版本号
pnpm changeset version

# 4. 发布到 npm
pnpm changeset publish
```

### 单独发布

```bash
# 发布 CLI
cd packages/cli
npm publish

# 发布 MCP
cd packages/mcp
npm publish
```

---

## MCP 配置

发布后，用户在 Claude/Cursor 的 MCP 配置中添加：

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

---

## 命令汇总

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装依赖 |
| `pnpm build` | 构建所有包 |
| `pnpm build:cli` | 构建 CLI |
| `pnpm build:mcp` | 构建 MCP |
| `pnpm dev:cli` | 开发 CLI |
| `pnpm dev:mcp` | 开发 MCP |
| `pnpm lint` | 检查所有包 |
| `pnpm clean` | 清理所有包 |
| `pnpm changeset` | 创建版本变更 |
| `pnpm changeset version` | 更新版本号 |
| `pnpm changeset publish` | 发布所有包 |
