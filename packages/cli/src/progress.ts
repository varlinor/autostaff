import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

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

const TASK_FILE = "task.json";
const PROGRESS_FILE = "progress.txt";

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
    console.log(chalk.yellow(`  Warning: Failed to parse task.json: ${e}`));
    return { passing: 0, total: 0 };
  }
}

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

export function isFirstRun(projectDir: string): boolean {
  return !fs.existsSync(path.join(projectDir, TASK_FILE));
}

export function printSessionHeader(sessionNum: number, isInitializer: boolean): void {
  const sessionType = isInitializer ? "INITIALIZER" : "CODING AGENT";
  const color = isInitializer ? chalk.yellow : chalk.cyan;

  console.log();
  console.log(color("═".repeat(70)));
  console.log(color(`  SESSION ${sessionNum}: ${sessionType}`));
  console.log(color("═".repeat(70)));
  console.log();
}

export function printProgressSummary(projectDir: string): void {
  const { passing, total } = countPassingFeatures(projectDir);

  if (total > 0) {
    const percentage = ((passing / total) * 100).toFixed(1);
    const bar = createProgressBar(passing, total, 40);
    console.log();
    console.log(chalk.bold(`  Progress: ${passing}/${total} tasks passing (${percentage}%)`));
    console.log(`  ${bar}`);

    const categories = getFeaturesByCategory(projectDir);
    if (categories.size > 0) {
      console.log();
      for (const [cat, stats] of categories) {
        const catPct = stats.total > 0 ? ((stats.passing / stats.total) * 100).toFixed(0) : "0";
        console.log(chalk.dim(`    ${cat}: ${stats.passing}/${stats.total} (${catPct}%)`));
      }
    }
  } else {
    console.log(chalk.dim("\n  Progress: task.json not yet created"));
  }
}

function createProgressBar(current: number, total: number, width: number): string {
  const ratio = total > 0 ? current / total : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  const filledBar = chalk.green("█".repeat(filled));
  const emptyBar = chalk.dim("░".repeat(empty));

  return `[${filledBar}${emptyBar}]`;
}

export function readProgressNotes(projectDir: string): string | null {
  const progressFile = path.join(projectDir, PROGRESS_FILE);
  if (fs.existsSync(progressFile)) {
    return fs.readFileSync(progressFile, "utf-8");
  }
  return null;
}

export function getTaskId(task: Task): string {
  return String(task.id ?? "");
}

function normalizeDepId(dep: number | string): string {
  return String(dep);
}

export function topologicalSort(tasks: Task[]): Task[] {
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
    console.log(chalk.yellow("  Warning: Circular dependency detected in task.json"));
    return tasks;
  }

  return sorted;
}

export function getExecutableTasks(projectDir: string): Task[] {
  const taskFile = path.join(projectDir, TASK_FILE);

  if (!fs.existsSync(taskFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(taskFile, "utf-8");
    const tasks = parseTasks(content);
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
  } catch (e) {
    console.log(chalk.yellow(`  Warning: Failed to get executable tasks: ${e}`));
    return [];
  }
}

export function getNextExecutableTask(projectDir: string): Task | null {
  const executable = getExecutableTasks(projectDir);
  return executable.length > 0 ? executable[0] : null;
}
