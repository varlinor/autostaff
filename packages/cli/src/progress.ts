import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import {
  getTaskPath,
  getProgressPath,
  getAutostaffDir,
  countPassingFeatures as coreCountPassingFeatures,
  getFeaturesByCategory as coreGetFeaturesByCategory,
  topologicalSort as coreTopologicalSort,
  parseTasks,
  getTaskId as coreGetTaskId,
} from "@varlinor/autostaff-core";

export { Task } from "@varlinor/autostaff-core";

/**
 * Ensure .autostaff directory exists
 */
export function ensureAutostaffDir(projectDir: string): void {
  const autostaffDir = getAutostaffDir(projectDir);
  if (!fs.existsSync(autostaffDir)) {
    fs.mkdirSync(autostaffDir, { recursive: true });
  }
}

/**
 * Count passing features in project
 */
export function countPassingFeatures(projectDir: string): { passing: number; total: number } {
  ensureAutostaffDir(projectDir);
  return coreCountPassingFeatures(projectDir);
}

/**
 * Get features grouped by category
 */
export function getFeaturesByCategory(projectDir: string): Map<string, { passing: number; total: number }> {
  ensureAutostaffDir(projectDir);
  return coreGetFeaturesByCategory(projectDir);
}

/**
 * Check if first run (no task.json)
 */
export function isFirstRun(projectDir: string): boolean {
  ensureAutostaffDir(projectDir);
  return !fs.existsSync(getTaskPath(projectDir));
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
  ensureAutostaffDir(projectDir);
  const progressFile = getProgressPath(projectDir);
  if (fs.existsSync(progressFile)) {
    return fs.readFileSync(progressFile, "utf-8");
  }
  return null;
}

export function getTaskId(task: any): string {
  return coreGetTaskId(task);
}

export function topologicalSort(tasks: any[]): any[] {
  return coreTopologicalSort(tasks);
}

export function getExecutableTasks(projectDir: string): any[] {
  ensureAutostaffDir(projectDir);
  const taskFile = getTaskPath(projectDir);

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

    const executable: any[] = [];
    for (const task of sorted) {
      if (task.passes) {
        continue;
      }

      const deps = (task.dependsOn || []).map(String);
      const allDepsCompleted = deps.every((depId: string) => completedIds.has(depId));

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

export function getNextExecutableTask(projectDir: string): any | null {
  const executable = getExecutableTasks(projectDir);
  return executable.length > 0 ? executable[0] : null;
}
