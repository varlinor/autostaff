# test 目录

## run-ulw.js — 调用 opencode 执行 ulw 并写结果到文件

用于通过 Node 命令行调用 opencode，执行 Oh My OpenCode 的 **ulw**（ultrawork）指令，并将完整输出写入 `test` 目录下指定文件。

### 前置条件

- 已安装 [OpenCode](https://opencode.ai/)
- 若需 ulw 功能：已安装 [Oh My OpenCode](https://ohmyopencode.com/) 插件（`bunx oh-my-opencode install` 或 `npm install -g oh-my-opencode`）

### 用法

```bash
# 仅执行 ulw（触发 ultrawork 模式）
node test/run-ulw.js ulw

# 执行 ulw + 自定义说明
node test/run-ulw.js "ulw 请分析当前项目结构"

# 指定输出文件（默认 test/ulw-output.txt）
OUTPUT_FILE=test/my-result.txt node test/run-ulw.js ulw

# 使用其他 opencode 可执行路径
OPENCODE_CMD="npx opencode" node test/run-ulw.js ulw
```

### 输出

- 控制台：实时打印 opencode 的 stdout/stderr。
- 文件：完整内容（stdout + stderr + 退出码）写入 `test/ulw-output.txt`（或 `OUTPUT_FILE` 指定路径）。
