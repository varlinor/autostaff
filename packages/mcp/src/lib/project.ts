/**
 * Shared utilities for MCP server
 * Reused logic from CLI for phase detection and task parsing
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export interface Task {
  id?: number | string;
  category: string;
  description: string;
  steps: string[];
  passes: boolean;
  type?: "package" | "app";
  workspace?: string;
  dependsOn?: (number | string)[];
}

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

export type Phase = "need-spec" | "need-tasks" | "execute";

/**
 * Detect the current phase of the project
 */
export function detectPhase(dir: string): Phase {
  const hasSpec = 
    fs.existsSync(path.join(dir, SPEC_DIR, SPEC_FILE)) || 
    fs.existsSync(path.join(dir, "app_spec.txt"));
  const hasTasks = fs.existsSync(path.join(dir, TASK_FILE));

  if (!hasSpec && hasTasks) return "execute";
  if (!hasSpec) return "need-spec";
  if (!hasTasks) return "need-tasks";
  return "execute";
}

function stripJsoncComments(text: string): string {
  return text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseTasks(content: string): Task[] {
  const stripped = stripJsoncComments(content);
  const parsed = JSON.parse(stripped);
  // Support both formats: [...] and { "tasks": [...] }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed.tasks && Array.isArray(parsed.tasks)) {
    return parsed.tasks;
  }
  throw new Error("Invalid task.json format");
}

/**
 * Count passing and total tasks
 */
export function countPassingFeatures(projectDir: string): { passing: number; total: number } {
  const taskFile = path.join(projectDir, TASK_FILE);

  if (!fs.existsSync(taskFile)) {
    return { passing: 0, total: 0 };
  }

  try {
    const content = fs.readFileSync(taskFile, "utf-8");
    const tasks = parseTasks(content);
    const total = tasks.length;
    const passing = tasks.filter((t) => t.passes).length;
    return { passing, total };
  } catch (e) {
    return { passing: 0, total: 0 };
  }
}

/**
 * Get task counts by category
 */
export function getFeaturesByCategory(projectDir: string): Map<string, { passing: number; total: number }> {
  const taskFile = path.join(projectDir, TASK_FILE);
  const result = new Map<string, { passing: number; total: number }>();

  if (!fs.existsSync(taskFile)) {
    return result;
  }

  try {
    const content = fs.readFileSync(taskFile, "utf-8");
    const tasks = parseTasks(content);

    for (const task of tasks) {
      const cat = task.category || "unknown";
      const existing = result.get(cat) || { passing: 0, total: 0 };
      existing.total++;
      if (task.passes) existing.passing++;
      result.set(cat, existing);
    }
  } catch (e) {
    /* ignore parse errors */
  }

  return result;
}

/**
 * Read progress notes
 */
export function readProgressNotes(projectDir: string): string | null {
  const progressFile = path.join(projectDir, PROGRESS_FILE);
  if (fs.existsSync(progressFile)) {
    return fs.readFileSync(progressFile, "utf-8");
  }
  return null;
}

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

function normalizeDepId(dep: number | string): string {
  return String(dep);
}

function getTaskId(task: Task): string {
  return String(task.id ?? "");
}

function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task>();
  const inDegree = new Map<string, number>();
  const dependsOnMap = new Map<string, string[]>();

  for (const task of tasks) {
    const id = getTaskId(task);
    taskMap.set(id, task);
    inDegree.set(id, 0);
    dependsOnMap.set(id, (task.dependsOn || []).map(normalizeDepId));
  }

  for (const [id, deps] of dependsOnMap) {
    for (const depId of deps) {
      const currentDegree = inDegree.get(id) ?? 0;
      inDegree.set(id, currentDegree + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  const sorted: Task[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const task = taskMap.get(id);
    if (task) {
      sorted.push(task);
    }

    for (const [otherId, deps] of dependsOnMap) {
      if (deps.includes(id)) {
        const newDegree = (inDegree.get(otherId) ?? 1) - 1;
        inDegree.set(otherId, newDegree);
        if (newDegree === 0) {
          queue.push(otherId);
        }
      }
    }
  }

  if (sorted.length !== tasks.length) {
    console.error("Warning: Circular dependency detected in task.json");
    return tasks;
  }

  return sorted;
}

function parseTasksFromFile(projectDir: string): Task[] {
  const taskFile = path.join(projectDir, TASK_FILE);
  if (!fs.existsSync(taskFile)) {
    return [];
  }
  try {
    const content = fs.readFileSync(taskFile, "utf-8");
    return parseTasks(content);
  } catch (e) {
    console.error(`Warning: Failed to parse task.json: ${e}`);
    return [];
  }
}

export function getExecutableTasks(projectDir: string): Task[] {
  const tasks = parseTasksFromFile(projectDir);
  
  if (tasks.length === 0) {
    return [];
  }
  
  const sorted = topologicalSort(tasks);

  const completedIds = new Set<string>();
  for (const task of sorted) {
    if (task.passes) {
      completedIds.add(getTaskId(task));
    }
  }

  const executable: Task[] = [];
  for (const task of sorted) {
    if (task.passes) {
      continue;
    }

    const deps = (task.dependsOn || []).map(normalizeDepId);
    const allDepsCompleted = deps.every((depId) => completedIds.has(depId));

    if (allDepsCompleted) {
      executable.push(task);
    }
  }

  return executable;
}

export function getNextExecutableTask(projectDir: string): Task | null {
  const executable = getExecutableTasks(projectDir);
  return executable.length > 0 ? executable[0] : null;
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
