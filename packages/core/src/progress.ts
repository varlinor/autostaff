/**
 * Task management - extracted from cli progress.ts
 */

import fs from "node:fs";
import path from "node:path";
import type { Task } from "./types.js";

export { Task } from "./types.js";

const AUTOSTAFF_DIR = ".autostaff";
const TASK_FILE = "task.json";
const PROGRESS_FILE = "progress.txt";

/**
 * Get the .autostaff directory path
 */
export function getAutostaffDir(projectDir: string): string {
  return path.join(projectDir, AUTOSTAFF_DIR);
}

/**
 * Get task.json path in .autostaff directory
 */
export function getTaskPath(projectDir: string): string {
  return path.join(projectDir, AUTOSTAFF_DIR, TASK_FILE);
}

/**
 * Get progress.txt path in .autostaff directory
 */
export function getProgressPath(projectDir: string): string {
  return path.join(projectDir, AUTOSTAFF_DIR, PROGRESS_FILE);
}

/**
 * Strip JSONC comments from content while preserving URLs and strings
 * 
 * Uses character-by-character parsing to correctly identify comments
 * that appear outside of string literals.
 */
export function stripJsoncComments(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inString = false;
  
  for (let line of lines) {
    let stripped = '';
    
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const prev = i > 0 ? line[i - 1] : '';
      
      // Toggle string state on unescaped quotes
      if (c === '"' && prev !== '\\') {
        inString = !inString;
      }
      
      // Check for comment start (only when not in string)
      if (!inString && c === '/' && i + 1 < line.length && line[i + 1] === '/') {
        // Rest of line is comment, skip it
        break;
      }
      
      stripped += c;
    }
    
    result.push(stripped);
  }
  
  return result.join('\n');
}

/**
 * Parse tasks from task.json content
 */
export function parseTasks(content: string): Task[] {
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
 * Count passing features in project
 */
export function countPassingFeatures(projectDir: string): { passing: number; total: number } {
  const taskFile = getTaskPath(projectDir);

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
    console.warn(`Warning: Failed to parse task.json: ${e}`);
    return { passing: 0, total: 0 };
  }
}

/**
 * Get features grouped by category
 */
export function getFeaturesByCategory(projectDir: string): Map<string, { passing: number; total: number }> {
  const taskFile = getTaskPath(projectDir);
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
 * Check if first run (no task.json)
 */
export function isFirstRun(projectDir: string): boolean {
  return !fs.existsSync(getTaskPath(projectDir));
}

/**
 * Get task ID as string
 */
export function getTaskId(task: Task): string {
  return String(task.id ?? "");
}

function normalizeDepId(dep: number | string): string {
  return String(dep);
}

/**
 * Topological sort of tasks based on dependencies
 */
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
    console.warn("Warning: Circular dependency detected in task.json");
    return tasks;
  }

  return sorted;
}

/**
 * Get executable tasks (tasks where all dependencies are satisfied)
 */
export function getExecutableTasks(projectDir: string): Task[] {
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
    console.warn(`Warning: Failed to get executable tasks: ${e}`);
    return [];
  }
}

/**
 * Get next executable task (highest priority)
 */
export function getNextExecutableTask(projectDir: string): Task | null {
  const executable = getExecutableTasks(projectDir);
  return executable.length > 0 ? executable[0] : null;
}

/**
 * Read progress notes
 */
export function readProgressNotes(projectDir: string): string | null {
  const progressFile = getProgressPath(projectDir);
  if (fs.existsSync(progressFile)) {
    return fs.readFileSync(progressFile, "utf-8");
  }
  return null;
}

/**
 * Write progress notes
 */
export function writeProgressNotes(projectDir: string, content: string): void {
  const progressFile = getProgressPath(projectDir);
  fs.writeFileSync(progressFile, content, "utf-8");
}
/**
 * Progress tracker for auto-bot
 * 
 * Manages progress.txt in .autostaff directory:
 * - Completed Tasks
 * - In Progress
 * - Pending
 * - Notes
 */



/**
 * Ensure .autostaff directory exists
 */

/**
 * Ensure .autostaff directory exists
 */
function ensureAutostaffDir(projectDir: string): void {
  const autostaffDir = getAutostaffDir(projectDir);
  if (!fs.existsSync(autostaffDir)) {
    fs.mkdirSync(autostaffDir, { recursive: true });
  }
}

/**
 * Initialize progress.txt with proper format
 */
export function initProgressFile(projectDir: string): void {
  ensureAutostaffDir(projectDir);
  const progressPath = getProgressPath(projectDir);
  if (fs.existsSync(progressPath)) return;

  const today = new Date().toISOString().split('T')[0];
  const content = `# auto-code-bot Progress

## ${today}

### Completed Tasks
- (none yet)

### In Progress
- (none)

### Pending
- (all tasks from task.json)

### Notes
- Initialized by auto-bot
`;

  fs.writeFileSync(progressPath, content, "utf-8");
}

/**
 * Read progress.txt content
 */
export function readProgressFile(projectDir: string): string | null {
  ensureAutostaffDir(projectDir);
  const progressPath = getProgressPath(projectDir);
  if (!fs.existsSync(progressPath)) return null;
  return fs.readFileSync(progressPath, "utf-8");
}

/**
 * Generate prompt for updating progress.txt after task completion
 */
export function generateProgressUpdatePrompt(
  taskId: string,
  taskDescription: string,
  currentProgress: string | null
): string {
  return `Update the progress.txt file in .autostaff/ directory.

Current progress.txt content:
${currentProgress || "(new file - no content)"}

Task that was just completed:
- ID: ${taskId}
- Description: ${taskDescription}

IMPORTANT: 
1. Move this task from "In Progress" or "Pending" to "Completed Tasks"
2. Add a brief note about what was done in the "Notes" section
3. Keep the date section header (## YYYY-MM-DD) as is
4. Write ONLY the updated content to .autostaff/progress.txt - no explanations

Format:
## YYYY-MM-DD

### Completed Tasks
- task-X: Description ✅

### In Progress
- (list tasks currently being worked on, or "none")

### Pending  
- (remaining tasks, or "none")

### Notes
- (brief notes about progress)
`;
}

/**
 * Generate prompt for reading current progress
 */
export function generateReadProgressPrompt(): string {
  return `Read .autostaff/task.json and .autostaff/progress.txt to understand current project state.

For each task in task.json, indicate:
- If passes=true: mark as completed
- If passes=false and no dependencies pending: mark as executable

Provide a summary of:
1. How many tasks total
2. How many completed
3. How many in progress
4. How many pending
5. Which task should be executed next (highest priority with all dependencies met)
`;
}
