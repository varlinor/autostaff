# Workflow Guide

本指南描述 auto-code-bot 的完整工作流程，包括如何分阶段执行以确保高质量的任务生成和执行。

## 推荐的阶段性工作流

```
┌─────────────────────────────────────────────────────────────────┐
│                    推荐的工作流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1        Phase 2           Phase 3       Phase 4        │
│  ┌──────┐      ┌──────────┐      ┌──────┐    ┌──────────┐    │
│  │生成   │ ──▶ │生成      │ ──▶  │审核   │ ──▶ │执行      │    │
│  │app   │      │task.json │      │task  │    │tasks    │    │
│  │spec  │      │          │      │json  │    │         │    │
│  └──────┘      └──────────┘      └──────┘    └──────────┘    │
│                                                                 │
│  (可选)         (--max-iter 2)  (task-    (--ulw)           │
│                               auditor)                          │
└─────────────────────────────────────────────────────────────────┘
```

## 阶段详解

### Phase 1: 生成 app_spec.md

**目标**：创建项目规格文档

**使用 Skill**：`app-spec-generator`

**执行方式**：
```bash
opencode
# 使用 app-spec-generator skill 生成 docs/app_spec.md
```

**输出**：`docs/app_spec.md`

---

### Phase 2: 生成 task.json

**目标**：根据 app_spec.md 生成任务清单

**执行方式**（两种选择）：

**方式 A：使用 --init-only（推荐）**
```bash
# 仅生成 app_spec.md 和 task.json，不执行
cd packages/cli
npx tsx src/auto-dev.ts <project-dir> --init-only
```

**方式 B：使用 --max-iterations 2**
```bash
# 限制迭代次数为 2
cd packages/cli
npx tsx src/auto-dev.ts <project-dir> --max-iterations 2
```

**说明**：
- `--init-only` 是更直观的写法，自动设置 maxIterations=2
- 两者效果相同，都会在生成 task.json 后停止

**输出**：`task.json`

---

### Phase 3: 审核 task.json（推荐）

**目标**：验证 task.json 质量，确保完整覆盖需求

**使用 Skill**：`task-auditor`

**执行方式**：
```bash
opencode
# 使用 task-auditor skill 审核 task.json
```

**审核内容**：
1. **覆盖率检查**：app_spec.md 中的每个功能是否都有对应任务
2. **质量检查**：每个任务是否有验证步骤（VERIFY）
3. **文档检查**：是否有 README 更新任务
4. **依赖检查**：任务依赖是否正确排序

**输出**：审核报告

**可能结果**：
- ✅ **APPROVED**：可以进入执行阶段
- ❌ **NEEDS REVISION**：需要修复问题后重新生成

---

### Phase 4: 执行任务

**目标**：执行所有任务直到完成

**执行方式**：
```bash
# 启用 ULW 模式执行
cd packages/cli
npx tsx src/auto-dev.ts <project-dir> --ulw
```

**输出**：完整的项目实现

---

## 快速参考表

| 场景 | 命令 | 说明 |
|------|------|------|
| 全新项目，从规格开始 | Phase 1 → Phase 2 → Phase 3 | 完整流程 |
| 已有 app_spec.md | Phase 2 → Phase 3 → Phase 4 | 跳过 Phase 1 |
| 已有 task.json | Phase 3 → Phase 4 | 跳过 Phase 1 & 2 |
| 仅审核 task.json | Phase 3 | 仅审核 |
| 仅生成 task.json | `--init-only` | 生成后停止 |

---

## 高级用法

### 使用 --extend 模式追加新功能

当所有任务完成后，需要添加新功能：

```bash
cd packages/cli
npx tsx src/auto-dev.ts <project-dir> --extend --ulw
```

### 限制执行轮数

测试用，限制最大迭代次数：

```bash
# 只执行 3 轮
cd packages/cli
npx tsx src/auto-dev.ts <project-dir> --ulw --max-iterations 3
```

### 指定模型

```bash
cd packages/cli
npx tsx src/auto-dev.ts <project-dir> --ulw --model deepseek/deepseek-chat
```

### 静默模式

将 opencode 输出写入文件，减少控制台干扰：

```bash
cd packages/cli
# 静默模式：opencode 输出写文件
npx tsx src/auto-dev.ts <project-dir> --ulw --silent

# 指定日志文件路径
npx tsx src/auto-dev.ts <project-dir> --ulw --silent --log-file ./logs/bot.log
```

**说明**：
- auto-bot 自身输出始终显示在控制台（实时进度）
- opencode 子进程输出可选转文件（减少干扰）
- 日志文件默认为项目目录下的 `auto-code-bot.log`
- 日志带时间戳，便于问题排查

---

## task.json 质量标准

高质量的 task.json 必须满足：

### 1. 完整覆盖

app_spec.md 中的每个功能都有对应的任务：
```json
{
  "tasks": [
    { "id": "task-1", "description": "用户认证功能", ... },
    { "id": "task-2", "description": "CRUD 操作", ... }
  ]
}
```

### 2. 验证步骤

每个任务必须包含 VERIFICATION 步骤：
```json
{
  "id": "task-1",
  "steps": [
    "创建用户认证模块",
    "实现登录/注册 API",
    "VERIFY: npm run build 成功",
    "VERIFY: curl 测试登录接口返回 200"
  ]
}
```

### 3. 文档任务

必须有文档更新任务：
```json
{
  "id": "task-docs-1",
  "category": "documentation",
  "dependsOn": ["task-1", "task-2"],
  "steps": [
    "检查 git diff 找出修改的包",
    "更新每个包的 README.md",
    "VERIFY: git diff 显示 README 变更"
  ]
}
```

### 4. 正确的依赖顺序

基础任务在前，高级任务在后：
```json
{
  "tasks": [
    { "id": "task-1", "dependsOn": [] },           // 基础
    { "id": "task-2", "dependsOn": ["task-1"] },  // 依赖 task-1
    { "id": "task-3", "dependsOn": ["task-2"] }  // 依赖 task-2
  ]
}
```

---

## 故障排除

### 问题：task.json 未生成

**原因**：app_spec.md 格式问题或 agent 执行失败

**解决**：
1. 检查 `docs/app_spec.md` 是否存在
2. 检查 app_spec.md 格式是否正确
3. 重新运行 Phase 2

### 问题：审核失败

**常见原因**：
1. 缺少某些功能的任务
2. 任务没有验证步骤
3. 缺少文档更新任务

**解决**：根据审核报告修改 task.json，或重新生成

### 问题：执行中断

**原因**：达到 max-iterations 限制或手动中断

**解决**：
```bash
# 继续执行
npx tsx src/auto-dev.ts <project-dir> --ulw
```

---

## 相关资源

- [app-spec-generator skill](../skills/app-spec-generator.md)
- [task-auditor skill](../skills/task-auditor.md)
- [MCP 配置指南](mcp.md)
- [项目状态](project_status.md)
