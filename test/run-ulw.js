#!/usr/bin/env node
/**
 * 通过 Node 调用 opencode run（非交互模式），配合 Oh My OpenCode 时支持 ulw 指令。
 * CLI 用法参考：https://opencode.ai/docs/zh-cn/cli/ （run 命令）
 *
 * 使用方式：传入 prompt，脚本自动加上 "ulw" 前缀后作为 opencode run 的 [message..]。
 *
 *    node test/run-ulw.js                     → 提示词 "ulw"
 *    node test/run-ulw.js 请分析当前项目结构   → 提示词 "ulw 请分析当前项目结构"
 *
 * 环境变量（可选）：
 *   OUTPUT_FILE              结果输出文件路径（默认 test/ulw-output.txt）
 *   OPENCODE_CMD              opencode 可执行名（默认 opencode）
 *   RUN_ULW_USE_SHELL=1      使用 shell 启动（Windows 下若找不到 opencode 可尝试）
 *   RUN_ULW_MODEL            模型 provider/model，对应 opencode run -m/--model
 *   RUN_ULW_AGENT            代理名，对应 opencode run --agent
 *   RUN_ULW_FORMAT           default|json，对应 opencode run --format
 *   RUN_ULW_TITLE            会话标题，对应 opencode run --title
 *   RUN_ULW_ATTACH           已运行服务地址，对应 opencode run --attach
 *   RUN_ULW_SESSION           会话 ID，对应 opencode run -s/--session
 *   RUN_ULW_CONTINUE=1        继续上一会话，对应 opencode run -c/--continue
 *   RUN_ULW_FORK=1            继续时分叉，对应 opencode run --fork
 *   RUN_ULW_FILES            附加文件，逗号分隔，对应 opencode run --file
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = __dirname;
const DEFAULT_OUTPUT_FILE = path.join(TEST_DIR, "ulw-output.txt");

const OPENCODE_CMD = process.env.OPENCODE_CMD || "opencode";
const OUTPUT_FILE = process.env.OUTPUT_FILE || DEFAULT_OUTPUT_FILE;

const DEFAULT_MODEL = "minimax(Custom)/MiniMax-M2.5";
const ULW_PREFIX = "ulw";

/**
 * 将用户传入的 prompt 自动加上 ulw 前缀，作为完整提示词。
 */
function buildUlwPrompt(userPrompt) {
  const trimmed = (userPrompt || "").trim();
  return trimmed ? `${ULW_PREFIX} ${trimmed}` : ULW_PREFIX;
}

/**
 * 按 OpenCode CLI 文档构建 opencode run 的参数：run [flags] message
 * @see https://opencode.ai/docs/zh-cn/cli/
 */
function buildRunArgs(fullPrompt) {
  const args = ["run"];

  const model = process.env.RUN_ULW_MODEL || DEFAULT_MODEL;
  args.push("--model", model);
  if (process.env.RUN_ULW_AGENT) {
    args.push("--agent", process.env.RUN_ULW_AGENT);
  }
  if (process.env.RUN_ULW_FORMAT) {
    args.push("--format", process.env.RUN_ULW_FORMAT);
  }
  if (process.env.RUN_ULW_TITLE) {
    args.push("--title", process.env.RUN_ULW_TITLE);
  }
  if (process.env.RUN_ULW_ATTACH) {
    args.push("--attach", process.env.RUN_ULW_ATTACH);
  }
  if (process.env.RUN_ULW_SESSION) {
    args.push("--session", process.env.RUN_ULW_SESSION);
  }
  if (process.env.RUN_ULW_CONTINUE === "1") {
    args.push("--continue");
  }
  if (process.env.RUN_ULW_FORK === "1") {
    args.push("--fork");
  }
  const files = process.env.RUN_ULW_FILES;
  if (files) {
    for (const f of files.split(",").map((s) => s.trim()).filter(Boolean)) {
      args.push("--file", f);
    }
  }

  args.push(fullPrompt);
  return args;
}

function runOpencodeWithUlw(fullPrompt) {
  return new Promise((resolve, reject) => {
    const args = buildRunArgs(fullPrompt);
    const isWindows = process.platform === "win32";
    const useShell = process.env.RUN_ULW_USE_SHELL === "1" || isWindows;
    if (useShell) {
      console.log(`[run-ulw] 正在启动子进程 (shell 模式): ${OPENCODE_CMD} ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}\n`);
    } else {
      console.log(`[run-ulw] 正在启动子进程: ${OPENCODE_CMD} ${args.join(" ")}\n`);
    }

    const proc = spawn(OPENCODE_CMD, args, {
      cwd: TEST_DIR, // run 命令无 --dir，工作目录由子进程 cwd 决定
      shell: useShell,
      env: {
        ...process.env,
        TERM: "dumb",
      },
      stdio: ["ignore", "pipe", "pipe"], // 非交互模式，关闭 stdin
    });

    let stdout = "";
    let stderr = "";
    let gotFirstStdout = false;
    let gotFirstStderr = false;

    proc.on("spawn", () => {
      console.error(`[run-ulw] 子进程已启动 PID=${proc.pid ?? "(无)"}，等待 opencode 输出…\n`);
    });

    proc.stdout?.on("data", (chunk) => {
      if (!gotFirstStdout) {
        gotFirstStdout = true;
        console.error(`[run-ulw] 收到首段 stdout (${chunk.length} 字节)\n`);
      }
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr?.on("data", (chunk) => {
      if (!gotFirstStderr) {
        gotFirstStderr = true;
        console.error(`[run-ulw] 收到首段 stderr (${chunk.length} 字节)\n`);
      }
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(`[opencode] ${text}`);
    });

    proc.on("error", (err) => {
      console.error(`[run-ulw] 子进程 error 事件: ${err.message}\n`);
      reject(new Error(`无法启动 ${OPENCODE_CMD}: ${err.message}`));
    });

    proc.on("close", (code, signal) => {
      console.error(`[run-ulw] 子进程已退出 code=${code} signal=${signal ?? "(无)"}\n`);
      const fullOutput = [
        "=== STDOUT ===",
        stdout,
        "",
        "=== STDERR ===",
        stderr,
        "",
        `=== Exit code: ${code} ===`,
      ].join("\n");
      resolve({ code, stdout, stderr, fullOutput });
    });
  });
}

async function main() {
  const userPrompt = process.argv.slice(2).join(" ");
  const fullPrompt = buildUlwPrompt(userPrompt);
  console.log(`[run-ulw] 用户 prompt: ${userPrompt ? `"${userPrompt}"` : "(空)"}`);
  console.log(`[run-ulw] 完整提示词: "${fullPrompt}"`);
  console.log(`[run-ulw] 工作目录: ${TEST_DIR}`);
  console.log(`[run-ulw] 结果将写入: ${OUTPUT_FILE}`);
  console.log(`[run-ulw] 主线程将等待 opencode 子进程结束，若长时间无后续输出可能是 opencode 未安装、未在 PATH 中，或正在等待输入。\n`);

  try {
    const { code, fullOutput } = await runOpencodeWithUlw(fullPrompt);
    mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, fullOutput, "utf8");
    console.log(`\n[run-ulw] 输出已写入 ${OUTPUT_FILE}，退出码: ${code}`);
    process.exit(code ?? 0);
  } catch (err) {
    const errorOutput = `=== ERROR ===\n${err.message}\n`;
    mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, errorOutput, "utf8");
    console.error(`\n[run-ulw] 错误已写入 ${OUTPUT_FILE}:`, err.message);
    process.exit(1);
  }
}

main();
