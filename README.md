# auto-dev

基于 [Anthropic 长时间运行 Agent](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 理念构建的全自动编程系统。通过 **opencode** 子进程驱动，跨多个上下文窗口持续增量开发，直到项目完成。

## 核心设计：分拆工作流

```
Step 1: 用 app-spec-generator skill 生成 app_spec.md
Step 2: 用 auto-bot 执行任务直到完成
```

**为什么分拆**：
- `app_spec.md` 是源头，质量决定后续一切
- 生成 spec 需要迭代打磨，用更强大的 agent
- auto-bot 专注执行，职责单一
- 符合论文的 initializer + coding agent 分离

## 快速开始

### Step 1: 生成 app_spec.md

**方式 A：用 app-spec-generator skill**
```bash
# 使用 skill 生成（如果已安装）
# 激活 skill 后告诉它你想做什么
```

**方式 B：用 opencode 直接生成**
```bash
opencode
# 对话生成 app_spec.md
```

**方式 C：手动编写**
参考 `prompts/app_spec.md` 模板。

### Step 2: 执行 auto-bot

```bash
cd auto-bot
npm run build

# 执行
npx tsx src/auto-dev.ts ./my-project --ulw
```

## 安装 app-spec-generator skill

```bash
# 方式 1: 如果 skill 在本地
# 将 skills/app-spec-generator.md 复制到你的 skill 目录

# 方式 2: 使用 skill 工具安装
skill install ./skills/app-spec-generator.md
```

## CLI 参数

| 参数 | 说明 |
|------|------|
| `[project-dir]` | 项目目录 |
| `--ulw` | 启用 ultrawork 模式 |
| `--extend` | 完成后追加新功能 |

## 场景

| 场景 | 命令 |
|------|------|
| 空白目录，首次执行 | `npx tsx src/auto-dev.ts ./my-project --ulw` |
| 继续执行 | 同上命令，自动检测断点 |
| 追加新功能 | `npx tsx src/auto-dev.ts ./my-project --extend --ulw` |

## task.json 格式

```jsonc
{
  "tasks": [
    {
      "id": "task-1",
      "category": "functional",
      "description": "用户可以创建新任务",
      "steps": [
        "打开应用首页",
        "点击新建按钮",
        "验证任务出现"
      ],
      "passes": false
    }
  ]
}
```

## 项目结构

```
my-project/
├── app_spec.md      # 项目规格（源头）
├── task.json       # 任务清单（执行依据）
├── progress.txt    # 进度记录
├── AGENTS.md      # 工作流规则
└── [代码文件]
```

## Agent 工作流

```
Step 1: 读取 app_spec + task.json + git log
Step 2: 检查/初始化 git（develop 分支）
Step 3: 回归验证
Step 4: 选择下一个 passes:false 任务
Step 5: 实现功能
Step 6: 测试验证（必须 browser 测试）
Step 7: git commit（Conventional Commits 格式）
Step 8: 更新 task.json + progress.txt
```

## 自定义

### 修改默认模型
编辑 `src/client.ts` 中的 `DEFAULT_MODEL`。

### 修改技术栈偏好
编辑 `prompts/AGENTS.md`。

## 灵感来源

- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Anthropic
- [auto-coding-agent-demo](https://github.com/SamuelQZQ/auto-coding-agent-demo) — SamuelQZQ
