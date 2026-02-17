import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import chalk from "chalk";

export const DEFAULT_MODEL = "minimax(Custom)/MiniMax-M2.5";
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max per session

export interface OpenCodeOptions {
  cwd: string;
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
    const cwd = this.options.cwd;
    const finalMessage = this.options.ulw ? `ulw ${message}` : message;

    const cmdLine = `opencode run --model "${model}" --dir "${cwd}" ${finalMessage}`;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout;

      console.log(`\n[auto-dev] Executing: ${cmdLine.substring(0, 120)}...`);
      console.log(chalk.cyan("[auto-dev] Starting opencode...\n"));

      this.process = spawn(cmdLine, [], {
        cwd: cwd,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb" },
      });

      this.process.on("spawn", () => {
        console.log(chalk.green("[auto-dev] opencode started (PID: " + this.process?.pid + ")\n"));
      });

      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.log(chalk.yellow(`\n[auto-dev] Timeout after ${SESSION_TIMEOUT_MS / 60000}min, killing...`));
          if (this.process) {
            this.process.kill("SIGTERM");
          }
          resolve({ status: "error", output: "[TIMEOUT]" });
        }
      }, SESSION_TIMEOUT_MS);

      this.process.stdout?.on("data", (data) => {
        process.stdout.write(data.toString());
      });

      this.process.stderr?.on("data", (data) => {
        const text = data.toString();
        if (!text.includes("Debugger") && !text.includes("ExperimentalWarning")) {
          process.stderr.write(text);
        }
      });

      this.process.on("close", (code) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          this.process = null;
          console.log(chalk.green(`\n[auto-dev] Done (exit: ${code})`));
          resolve({ status: code === 0 ? "continue" : "error", output: "" });
        }
      });

      this.process.on("error", (err) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          this.process = null;
          console.error(chalk.red(`\n[auto-dev] Error: ${err.message}`));
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

export function createClient(projectDir: string, model?: string, agent?: string, ulw?: boolean): OpenCodeClient {
  return new OpenCodeClient({
    cwd: path.resolve(projectDir),
    model,
    agent,
    ulw,
  });
}
