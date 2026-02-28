import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { getEffectiveDir } from "@varlinor/autostaff-core";

export const DEFAULT_MODEL = "minimax(Custom)/MiniMax-M2.5";
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

export interface OpenCodeOptions {
  cwd: string;
  workspace?: string;
  model?: string;
  agent?: string;
  ulw?: boolean;
  verbose?: boolean;
  logFile?: string;
}

export class OpenCodeClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private options: OpenCodeOptions;
  private outputBuffer = "";
  private logFilePath = "";

  constructor(options: OpenCodeOptions) {
    super();
    this.options = options;
    // Default: output to log file only (verbose=false/undefined)
    // If verbose=true: print to console
    if (!this.options.verbose) {
      if (this.options.logFile) {
        // 判断是否为绝对路径
        if (path.isAbsolute(this.options.logFile)) {
          this.logFilePath = this.options.logFile;
        } else {
          // 相对路径基于 projectDir (cwd) 计算
          this.logFilePath = path.join(this.options.cwd, this.options.logFile);
        }
      } else {
        // 默认日志文件名
        this.logFilePath = path.join(this.options.cwd, "auto-code-bot-detail.log");
      }
      // 确保日志文件目录存在
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private writeToLog(text: string): void {
    // Default: output to log file only (verbose=false/undefined)
    // If verbose=true: already writes to console separately
    if (!this.options.verbose && this.logFilePath) {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(this.logFilePath, `[${timestamp}] ${text}\n`);
    }
  }

  async run(message: string): Promise<{ status: "continue" | "error"; output: string }> {
    const model = this.options.model || DEFAULT_MODEL;
    const effectiveDir = getEffectiveDir(this.options.cwd, this.options.workspace);
    const finalMessage = this.options.ulw ? `ulw ${message}` : message;

    const workspaceInfo = this.options.workspace
      ? chalk.dim(` [workspace: ${this.options.workspace}]`)
      : "";
    const cmdLine = `opencode run --model "${model}" --dir "${effectiveDir}" ${finalMessage}`;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout;
      this.outputBuffer = "";

      const log = (text: string) => {
        this.writeToLog(text);
        // Print to console only if verbose=true
        if (this.options.verbose) {
          console.log(text);
        }
      };

      const logError = (text: string) => {
        this.writeToLog(text);
        // Print to console only if verbose=true
        if (this.options.verbose) {
          console.error(text);
        }
      };

      log(`\n[auto-code-bot] Executing: ${cmdLine.substring(0, 120)}...${workspaceInfo}`);
      log(chalk.cyan("[auto-code-bot] Starting opencode...\n"));

      this.process = spawn(cmdLine, [], {
        cwd: effectiveDir,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb" },
      });

      this.process.on("spawn", () => {
        log(chalk.green("[auto-code-bot] opencode started (PID: " + this.process?.pid + ")\n"));
      });

      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          logError(chalk.yellow(`\n[auto-code-bot] Timeout after ${SESSION_TIMEOUT_MS / 60000}min, killing...`));
          if (this.process) {
            this.process.kill("SIGTERM");
          }
          resolve({ status: "error", output: "[TIMEOUT]" });
        }
      }, SESSION_TIMEOUT_MS);

      this.process.stdout?.on("data", (data) => {
        const text = data.toString();
        this.outputBuffer += text;
        this.writeToLog(text);
        // Print to console only if verbose=true
        if (this.options.verbose) {
          process.stdout.write(text);
        }
      });

      this.process.stderr?.on("data", (data) => {
        const text = data.toString();
        this.writeToLog(text);
        if (!text.includes("Debugger") && !text.includes("ExperimentalWarning")) {
          // Print to console only if verbose=true
          if (this.options.verbose) {
            process.stderr.write(text);
          }
        }
      });

      const checkSuccess = (exitCode: number | null): "continue" | "error" => {
        const upperOutput = this.outputBuffer.toUpperCase();
        
        if (exitCode === 0) {
          return "continue";
        }
        
        if (upperOutput.includes("TASK COMPLETE") || 
            upperOutput.includes("DONE") ||
            upperOutput.includes("COMPLETE") ||
            upperOutput.includes("PASS") ||
            upperOutput.includes("SUCCESS")) {
          return "continue";
        }
        
        return "error";
      };

      this.process.on("close", (code) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          this.process = null;
          const status = checkSuccess(code);
          log(chalk.green(`\n[auto-code-bot] Done (exit: ${code}) - status: ${status}`));
          resolve({ status, output: this.outputBuffer });
        }
      });

      this.process.on("error", (err) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          this.process = null;
          logError(chalk.red(`\n[auto-code-bot] Error: ${err.message}`));
          resolve({ status: "error", output: err.message });
        }
      });
    });
  }

  kill(): void {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }
}

export function createClient(projectDir: string, model?: string, agent?: string, ulw?: boolean, workspace?: string, verbose?: boolean, logFile?: string): OpenCodeClient {
  return new OpenCodeClient({
    cwd: path.resolve(projectDir),
    workspace,
    model,
    agent,
    ulw,
    verbose,
    logFile,
  });
}
