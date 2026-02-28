/**
 * Progress tracker for auto-bot
 * 
 * Manages progress.txt in .autostaff directory:
 * - Completed Tasks
 * - In Progress
 * - Pending
 * - Notes
 */

import fs from "node:fs";
import path from "node:path";
import { getAutostaffDir, getProgressPath } from "@varlinor/autostaff-core";

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
