/**
 * OpenCode client for code agent
 */

import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

export interface CodeClientOptions {
  cwd: string;
  workspace?: string;
  model?: string;
  agent?: string;
  ulw?: boolean;
  verbose?: boolean;
  logFile?: string;
}

export interface ClientResult {
  status: "continue" | "error";
  output: string;
}

export class CodeOpenCodeClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private options: CodeClientOptions;
  private outputBuffer = "";
  private logFilePath = "";

  constructor(options: CodeClientOptions) {
    super();
    this.options = options;
    
    if (!this.options.verbose) {
      if (this.options.logFile) {
        this.logFilePath = path.isAbsolute(this.options.logFile)
          ? this.options.logFile
          : path.join(this.options.cwd, this.options.logFile);
      } else {
        this.logFilePath = path.join(this.options.cwd, "auto-code.log");
      }
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private writeToLog(text: string): void {
    if (!this.options.verbose && this.logFilePath) {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(this.logFilePath, `[${timestamp}] ${text}\n`);
    }
  }

  async run(message: string): Promise<ClientResult> {
    const model = this.options.model || "minimax(Custom)/MiniMax-M2.5";
    const effectiveDir = this.options.workspace 
      ? path.join(this.options.cwd, this.options.workspace)
      : this.options.cwd;
    const finalMessage = this.options.ulw ? `ulw ${message}` : message;
    
    const cmdLine = `opencode run --model "${model}" --dir "${effectiveDir}" ${finalMessage}`;
    const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout;
      this.outputBuffer = "";

      const log = (text: string) => {
        this.writeToLog(text);
        if (this.options.verbose) console.log(text);
      };

      log(`\n[auto-code] Executing: ${cmdLine.substring(0, 80)}...`);

      this.process = spawn(cmdLine, [], {
        cwd: effectiveDir,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb" },
      });

      this.process.on("spawn", () => {
        log(chalk.green("[auto-code] opencode started"));
      });

      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (this.process) this.process.kill("SIGTERM");
          resolve({ status: "error", output: "[TIMEOUT]" });
        }
      }, SESSION_TIMEOUT_MS);

      this.process.stdout?.on("data", (data) => {
        const text = data.toString();
        this.outputBuffer += text;
        this.writeToLog(text);
        if (this.options.verbose) process.stdout.write(text);
      });

      this.process.stderr?.on("data", (data) => {
        const text = data.toString();
        this.writeToLog(text);
        if (this.options.verbose && !text.includes("Debugger")) {
          process.stderr.write(text);
        }
      });

      const checkSuccess = (code: number | null): "continue" | "error" => {
        const upper = this.outputBuffer.toUpperCase();
        if (code === 0) return "continue";
        if (upper.includes("TASK COMPLETE") || upper.includes("DONE") || upper.includes("SUCCESS")) {
          return "continue";
        }
        return "error";
      };

      this.process.on("close", (code) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          const status = checkSuccess(code);
          log(`\n[auto-code] Done (exit: ${code}) - ${status}`);
          resolve({ status, output: this.outputBuffer });
        }
      });

      this.process.on("error", (err) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          log(chalk.red(`[auto-code] Error: ${err.message}`));
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

/**
 * Create a code client
 */
export function createCodeClient(
  projectDir: string,
  model?: string,
  agent?: string,
  ulw?: boolean,
  workspace?: string,
  verbose?: boolean,
  logFile?: string
): CodeOpenCodeClient {
  return new CodeOpenCodeClient({
    cwd: path.resolve(projectDir),
    workspace,
    model,
    agent,
    ulw,
    verbose: verbose ?? false,
    logFile,
  });
}
