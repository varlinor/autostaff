/**
 * OpenCode client - Unified implementation for all agents
 *
 * This module provides a common client for executing opencode commands
 * across different agent implementations (code, text, etc.).
 */

import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { getEffectiveDir } from "./workspace";

/**
 * Default model to use if not specified
 */
export const DEFAULT_MODEL = "minimax(Custom)/MiniMax-M2.5";

/**
 * Session timeout in milliseconds (10 minutes)
 */
export const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Client options
 */
export interface OpenCodeOptions {
  cwd: string;
  workspace?: string;
  model?: string;
  agent?: string;
  ulw?: boolean;
  verbose?: boolean;
  logFile?: string;
}

/**
 * Client execution result
 */
export interface ClientResult {
  status: "continue" | "error";
  output: string;
}

/**
 * OpenCode client class
 *
 * Handles opencode process execution with:
 * - Verbose/console output mode
 * - Log file output mode
 * - Session timeout
 * - Success detection based on output keywords
 */
export class OpenCodeClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private options: OpenCodeOptions;
  private outputBuffer = "";
  private logFilePath = "";

  constructor(options: OpenCodeOptions) {
    super();
    this.options = options;

    // Configure log file path (only when verbose=false)
    if (!this.options.verbose) {
      if (this.options.logFile) {
        this.logFilePath = path.isAbsolute(this.options.logFile)
          ? this.options.logFile
          : path.join(this.options.cwd, this.options.logFile);
      } else {
        // Default log file name
        this.logFilePath = path.join(this.options.cwd, "auto-staff.log");
      }

      // Ensure log directory exists
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Write text to log file (for subprocess output)
   * Adds timestamp and writes to auto-staff.log
   */
  private writeToLog(text: string): void {
    if (!this.options.verbose && this.logFilePath) {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(this.logFilePath, `[${timestamp}] ${text}\n`);
    }
  }

  /**
   * Log flow control messages (for framework status updates)
   * Uses console.log instead of writing to log file
   */
  private flowLog(text: string): void {
    console.log(text);
  }

  /**
   * Log flow control error messages
   */
  private flowLogError(text: string): void {
    console.error(text);
  }

  /**
   * Run opencode command with message
   */
  async run(message: string): Promise<ClientResult> {
    const model = this.options.model || DEFAULT_MODEL;
    const effectiveDir = getEffectiveDir(
      this.options.cwd,
      this.options.workspace,
    );
    const finalMessage = this.options.ulw ? `ulw ${message}` : message;

    const workspaceInfo = this.options.workspace
      ? chalk.dim(` [workspace: ${this.options.workspace}]`)
      : "";

    const cmdLine = `opencode run --model "${model}" --dir "${effectiveDir}" ${finalMessage}`;

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId: NodeJS.Timeout;
      this.outputBuffer = "";

      // Flow control logging (framework status)
      this.flowLog(
        `\n[auto-staff] Executing: ${cmdLine.substring(0, 120)}...${workspaceInfo}`,
      );
      this.flowLog(chalk.cyan("[auto-staff] Starting opencode...\n"));

      // Spawn opencode process
      this.process = spawn(cmdLine, [], {
        cwd: effectiveDir,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb" },
      });

      // Handle process spawn
      this.process.on("spawn", () => {
        this.flowLog(
          chalk.green(
            `[auto-staff] opencode started (PID: ${this.process?.pid})\n`,
          ),
        );
      });

      // Setup timeout
      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.flowLogError(
            chalk.yellow(
              `\n[auto-staff] Timeout after ${SESSION_TIMEOUT_MS / 60000}min, killing...`,
            ),
          );
          if (this.process) {
            this.process.kill("SIGTERM");
          }
          resolve({ status: "error", output: "[TIMEOUT]" });
        }
      }, SESSION_TIMEOUT_MS);

      // Handle stdout (subprocess output)
      this.process.stdout?.on("data", (data) => {
        const text = data.toString();
        this.outputBuffer += text;
        this.writeToLog(text); // Write to log file with timestamp
        if (this.options.verbose) {
          process.stdout.write(text); // Direct passthrough
        }
      });

      // Handle stderr (subprocess output)
      this.process.stderr?.on("data", (data) => {
        const text = data.toString();
        this.writeToLog(text); // Write to log file with timestamp
        // Filter out debugger/experimental warnings
        if (
          !text.includes("Debugger") &&
          !text.includes("ExperimentalWarning")
        ) {
          if (this.options.verbose) {
            process.stderr.write(text); // Direct passthrough
          }
        }
      });

      // Success detection logic
      const checkSuccess = (exitCode: number | null): "continue" | "error" => {
        const upperOutput = this.outputBuffer.toUpperCase();

        if (exitCode === 0) {
          return "continue";
        }

        // Check for success keywords in output
        if (
          upperOutput.includes("TASK COMPLETE") ||
          upperOutput.includes("DONE") ||
          upperOutput.includes("COMPLETE") ||
          upperOutput.includes("PASS") ||
          upperOutput.includes("SUCCESS")
        ) {
          return "continue";
        }

        return "error";
      };

      // Handle process close
      this.process.on("close", (code) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          this.process = null;
          const status = checkSuccess(code);
          this.flowLog(
            chalk.green(
              `\n[auto-staff] Done (exit: ${code}) - status: ${status}`,
            ),
          );
          resolve({ status, output: this.outputBuffer });
        }
      });

      // Handle process error
      this.process.on("error", (err) => {
        clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          this.process = null;
          this.flowLogError(chalk.red(`\n[auto-staff] Error: ${err.message}`));
          resolve({ status: "error", output: err.message });
        }
      });
    });
  }

  /**
   * Kill the opencode process
   */
  kill(): void {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }
}

/**
 * Create an OpenCode client instance
 */
export function createClient(
  projectDir: string,
  model?: string,
  agent?: string,
  ulw?: boolean,
  workspace?: string,
  verbose?: boolean,
  logFile?: string,
): OpenCodeClient {
  return new OpenCodeClient({
    cwd: path.resolve(projectDir),
    workspace,
    model,
    agent,
    ulw,
    verbose: verbose ?? false,
    logFile,
  });
}
