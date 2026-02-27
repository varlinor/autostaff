/**
 * Shared utilities for MCP server
 * Uses core package for shared functionality
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

// Import from core package - eliminates code duplication
import {
  detectPhase,
  parseTasks,
  countPassingFeatures,
  getFeaturesByCategory,
  readProgressNotes,
  getExecutableTasks,
  getNextExecutableTask,
  getTaskId,
  topologicalSort,
  type Task,
  type Phase,
} from "@varlinor/auto-bot-core";

// Re-export types from core for backward compatibility
export type { Task, Phase };

// Re-export core functions for MCP server
export {
  detectPhase,
  countPassingFeatures,
  getFeaturesByCategory,
  readProgressNotes,
  getExecutableTasks,
  getNextExecutableTask,
};

export interface RunOneTaskOptions {
  model?: string;
  ulw?: boolean;
  agent?: string;
  maxIterations?: number;
}

const TASK_FILE = "task.json";
const PROGRESS_FILE = "progress.txt";
const SPEC_DIR = "docs";
const SPEC_FILE = "app_spec.md";

/**
 * Read task.json content
 */
export function readTaskJson(projectDir: string): string | null {
  const taskFile = path.join(projectDir, TASK_FILE);
  if (fs.existsSync(taskFile)) {
    return fs.readFileSync(taskFile, "utf-8");
  }
  return null;
}

/**
 * Read app_spec.md content
 */
export function readAppSpec(projectDir: string): string | null {
  // Check docs/app_spec.md first, then app_spec.md
  const specInDocs = path.join(projectDir, SPEC_DIR, SPEC_FILE);
  if (fs.existsSync(specInDocs)) {
    return fs.readFileSync(specInDocs, "utf-8");
  }
  
  const specInRoot = path.join(projectDir, "app_spec.md");
  if (fs.existsSync(specInRoot)) {
    return fs.readFileSync(specInRoot, "utf-8");
  }
  
  const specTxt = path.join(projectDir, "app_spec.txt");
  if (fs.existsSync(specTxt)) {
    return fs.readFileSync(specTxt, "utf-8");
  }
  
  return null;
}

/**
 * Get project status summary
 */
export interface ProjectStatus {
  phase: Phase;
  passing: number;
  total: number;
  categories: Record<string, { passing: number; total: number }>;
  progressSummary: string | null;
}

export function getProjectStatus(projectDir: string): ProjectStatus {
  const phase = detectPhase(projectDir);
  const { passing, total } = countPassingFeatures(projectDir);
  const categoriesMap = getFeaturesByCategory(projectDir);
  const categories: Record<string, { passing: number; total: number }> = {};
  
  for (const [cat, stats] of categoriesMap) {
    categories[cat] = stats;
  }
  
  const progressSummary = readProgressNotes(projectDir);
  
  return {
    phase,
    passing,
    total,
    categories,
    progressSummary
  };
}

const DEFAULT_MODEL = "minimax(Custom)/MiniMax-M2.5";

export function runOneTask(
  projectDir: string,
  options: RunOneTaskOptions = {}
): { success: boolean; message: string; taskId?: string; pid?: number } {
  const resolvedDir = path.resolve(projectDir);
  
  // Check phase
  const phase = detectPhase(resolvedDir);
  if (phase !== "execute") {
    return {
      success: false,
      message: `Project is not in execute phase. Current phase: ${phase}. Need app_spec.md and task.json to execute tasks.`
    };
  }

  // Get next task
  const nextTask = getNextExecutableTask(resolvedDir);
  const { passing, total } = countPassingFeatures(resolvedDir);
  
  if (!nextTask) {
    if (total > 0 && passing === total) {
      return {
        success: false,
        message: "All tasks are complete! Use extend mode to add new features, or manually add new tasks to task.json with passes:false."
      };
    }
    return {
      success: false,
      message: "No executable tasks found. All tasks are either completed or waiting for dependencies. Check task.json for dependency issues."
    };
  }

  const taskId = getTaskId(nextTask);
  const taskDesc = nextTask.description;
  const workspace = nextTask.workspace;

  const model = options.model || DEFAULT_MODEL;
  const ulwFlag = options.ulw ? "--ulw" : "";
  const maxIterFlag = options.maxIterations ? `--max-iterations ${options.maxIterations}` : "";
  const finalMaxIter = "--max-iterations 1";
  const workspaceArg = workspace ? `--workspace "${workspace}"` : "";

  // Always run from project root (resolvedDir) to ensure access to AGENTS.md and task.json
  // The workspace path is passed via CLI argument
  const fullCommand = `pnpm exec auto-code-bot "${resolvedDir}" --model "${model}" ${ulwFlag} ${finalMaxIter} ${workspaceArg}`;

  try {
    const child = spawn(fullCommand, [], {
      cwd: resolvedDir,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    // Log output to stderr (MCP uses stderr for server logs)
    child.stdout?.on("data", (data) => {
      process.stderr.write(data.toString());
    });
    
    child.stderr?.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    child.on("error", (err) => {
      process.stderr.write(`Error spawning opencode: ${err.message}\n`);
    });

    // Unref to allow parent to exit independently
    child.unref();

    return {
      success: true,
      message: `Started task execution for '${taskId}: ${taskDesc}'.\n\nProject: ${resolvedDir}\nWorkspace: ${workspace || "root"}\nModel: ${model}\nULW: ${options.ulw ? "enabled" : "disabled"}\n\nPID: ${child.pid}\n\nPoll auto_dev_status to track progress.`,
      taskId,
      pid: child.pid
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to start task: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export interface RunFullLoopOptions {
  model?: string;
  ulw?: boolean;
  agent?: string;
  maxIterations?: number;
  extend?: boolean;
  packageManager?: string;
  gitBranch?: string;
}

export function runFullLoop(
  projectDir: string,
  options: RunFullLoopOptions = {}
): { success: boolean; message: string; pid?: number } {
  const resolvedDir = path.resolve(projectDir);
  
  const phase = detectPhase(resolvedDir);
  if (phase === "need-spec") {
    return {
      success: false,
      message: `Project needs app_spec.md. Create docs/app_spec.md first, then run auto_dev_start.`
    };
  }
  
  if (phase === "need-tasks") {
    return {
      success: false,
      message: `Project has app_spec.md but needs task.json. Run auto_dev_run_one_task first to generate task.json, or manually create it.`
    };
  }

  const model = options.model || DEFAULT_MODEL;
  const ulwFlag = options.ulw ? "--ulw" : "";
  const extendFlag = options.extend ? "--extend" : "";
  const maxIterFlag = options.maxIterations ? `--max-iterations ${options.maxIterations}` : "";
  const agentFlag = options.agent ? `--agent "${options.agent}"` : "";
  
  const cliCommand = `"auto-code-bot" "${resolvedDir}" --model "${model}" ${ulwFlag} ${extendFlag} ${maxIterFlag} ${agentFlag}`;
  const fullCommand = `pnpm exec ${cliCommand}`;

  try {
    const child = spawn(fullCommand, [], {
      cwd: resolvedDir,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    child.stdout?.on("data", (data: Buffer) => {
      process.stderr.write(data.toString());
    });
    
    child.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(data.toString());
    });

    child.on("error", (err: Error) => {
      process.stderr.write(`Error spawning auto-code-bot: ${err.message}\n`);
    });

    child.unref();

    return {
      success: true,
      message: `Started full automation loop for: ${resolvedDir}

Model: ${model}
ULW: ${options.ulw ? "enabled" : "disabled"}
Extend: ${options.extend ? "enabled" : "disabled"}
Max Iterations: ${options.maxIterations || "unlimited"}

PID: ${child.pid}

Poll auto_dev_status to track progress.`,
      pid: child.pid
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to start automation: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
