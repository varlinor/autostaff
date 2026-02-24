import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
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
}

export class OpenCodeClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private options: OpenCodeOptions;

  constructor(options: OpenCodeOptions) {
    super();
    this.options = options;
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
      let outputBuffer = "";

      console.log(`\n[auto-code-bot] Executing: ${cmdLine.substring(0, 120)}...${workspaceInfo}`);
      console.log(chalk.cyan("[auto-code-bot] Starting opencode...\n"));

      this.process = spawn(cmdLine, [], {
        cwd: effectiveDir,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb" },
      });

      this.process.on("spawn", () => {
        console.log(chalk.green("[auto-code-bot] opencode started (PID: " + this.process?.pid + ")\n"));
      });

      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.log(chalk.yellow(`\n[auto-code-bot] Timeout after ${SESSION_TIMEOUT_MS / 60000}min, killing...`));
          if (this.process) {
            this.process.kill("SIGTERM");
          }
          resolve({ status: "error", output: "[TIMEOUT]" });
        }
      }, SESSION_TIMEOUT_MS);

      this.process.stdout?.on("data", (data) => {
        const text = data.toString();
        outputBuffer += text;
        process.stdout.write(text);
      });

      this.process.stderr?.on("data", (data) => {
        const text = data.toString();
        if (!text.includes("Debugger") && !text.includes("ExperimentalWarning")) {
          process.stderr.write(text);
        }
      });

      const checkSuccess = (exitCode: number | null): "continue" | "error" => {
        const upperOutput = outputBuffer.toUpperCase();
        
        if (exitCode === 0) {
          return "continue";
        }
        
        if (upperOutput.includes("TASK COMPLETE") || 
            upperOutput.includes("DONE") ||
            upperOutput.includes("COMPLETE")) {
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
          console.log(chalk.green(`\n[auto-code-bot] Done (exit: ${code}) - status: ${status}`));
          resolve({ status, output: outputBuffer });
        }
      });

      this.process.on("error", (err) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          this.process = null;
          console.error(chalk.red(`\n[auto-code-bot] Error: ${err.message}`));
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

export function createClient(projectDir: string, model?: string, agent?: string, ulw?: boolean, workspace?: string): OpenCodeClient {
  return new OpenCodeClient({
    cwd: path.resolve(projectDir),
    workspace,
    model,
    agent,
    ulw,
  });
}
