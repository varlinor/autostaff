/**
 * Shared utilities for MCP server
 * Reused logic from CLI for phase detection and task parsing
 */

import fs from "node:fs";
import path from "node:path";

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
      const existing = result.get(cat) || { passing: 0, total: 1 };
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
