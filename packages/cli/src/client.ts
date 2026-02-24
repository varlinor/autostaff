import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { getEffectiveDir } from "./workspace.js";

export const DEFAULT_MODEL = "minimax(Custom)/MiniMax-M2.5";
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

export interface OpenCodeOptions {
  cwd: string;
  workspace?: string;
  model?: string;
  agent?: string;
  ulw?: boolean;
  silent?: boolean;
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
    if (this.options.silent) {
      this.logFilePath = this.options.logFile 
        ? path.resolve(this.options.logFile) 
        : path.join(this.options.cwd, "auto-code-bot.log");
    }
  }

  private writeToLog(text: string): void {
    if (this.options.silent) {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(this.logFilePath, `[${timestamp}] ${text}\n`);
    }
  }

  private writeToOutput(text: string, isError = false): void {
    this.outputBuffer += text;
    this.writeToLog(text);
    if (!this.options.silent) {
      if (isError) {
        process.stderr.write(text);
      } else {
        process.stdout.write(text);
      }
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
        console.log(text);
      };

      const logError = (text: string) => {
        this.writeToLog(text);
        console.error(text);
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
        if (!this.options.silent) {
          process.stdout.write(text);
        }
      });

      this.process.stderr?.on("data", (data) => {
        const text = data.toString();
        this.writeToLog(text);
        if (!text.includes("Debugger") && !text.includes("ExperimentalWarning")) {
          if (!this.options.silent) {
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

export function createClient(projectDir: string, model?: string, agent?: string, ulw?: boolean, workspace?: string, silent?: boolean, logFile?: string): OpenCodeClient {
  return new OpenCodeClient({
    cwd: path.resolve(projectDir),
    workspace,
    model,
    agent,
    ulw,
    silent,
    logFile,
  });
}
