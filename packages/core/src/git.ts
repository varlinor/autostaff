/**
 * Git operations for auto-bot framework
 * 
 * Provides git commit functionality following Conventional Commits format:
 * - feat: New feature
 * - fix: Bug fix
 * - refactor: Code refactoring
 * - docs: Documentation only
 * - test: Adding/updating tests
 * - chore: Maintenance, deps, build changes
 */

import fs from "node:fs";
import path from "node:path";
import { getProgressPath } from "./progress";

const DEFAULT_BRANCH = "develop";

/**
 * Check if git is initialized in project directory
 */
export function isGitInitialized(projectDir: string): boolean {
  return fs.existsSync(path.join(projectDir, ".git"));
}

/**
 * Initialize git repository with develop branch
 */
export async function initGit(projectDir: string, branch: string = DEFAULT_BRANCH): Promise<void> {
  const { execSync } = await import("node:child_process");
  
  try {
    execSync("git init", { cwd: projectDir, stdio: "inherit" });
    execSync(`git checkout -b ${branch}`, { cwd: projectDir, stdio: "inherit" });
    execSync("git add .", { cwd: projectDir, stdio: "inherit" });
    execSync(`git commit -m "Initial commit"`, { cwd: projectDir, stdio: "inherit" });
  } catch (e) {
    console.warn(`Warning: Git initialization had issues: ${e}`);
  }
}

/**
 * Get current git branch
 */
export async function getCurrentBranch(projectDir: string): Promise<string | null> {
  const { execSync } = await import("node:child_process");
  try {
    const branch = execSync("git branch --show-current", { 
      cwd: projectDir, 
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
    }).trim();
    return branch || null;
  } catch {
    return null;
  }
}

/**
 * Checkout to develop branch (create if doesn't exist)
 */
export async function ensureDevelopBranch(projectDir: string): Promise<void> {
  const { execSync } = await import("node:child_process");
  const currentBranch = await getCurrentBranch(projectDir);
  
  if (currentBranch === DEFAULT_BRANCH) {
    return; // Already on develop
  }
  
  try {
    // Try to checkout existing develop branch
    execSync(`git checkout ${DEFAULT_BRANCH}`, { cwd: projectDir, stdio: "inherit" });
  } catch {
    // Branch doesn't exist, create it
    execSync(`git checkout -b ${DEFAULT_BRANCH}`, { cwd: projectDir, stdio: "inherit" });
  }
}

/**
 * Conventional commit types
 */
export type CommitType = "feat" | "fix" | "refactor" | "docs" | "test" | "chore" | "style" | "perf" | "ci" | "build";

/**
 * Git commit options
 */
export interface CommitOptions {
  projectDir: string;
  type: CommitType;
  scope?: string;
  message: string;
  files?: string[];
}

/**
 * Create a git commit with Conventional Commits format
 * 
 * Format: <type>(<scope>): <description>
 * 
 * Examples:
 * - feat(counter): add increment and decrement buttons
 * - fix(counter): reset button not working on first click
 * - docs(readme): update installation instructions
 */
export async function conventionalCommit(options: CommitOptions): Promise<void> {
  const { projectDir, type, scope, message, files } = options;
  const { execSync } = await import("node:child_process");
  
  const scopePart = scope ? `(${scope})` : "";
  const fullMessage = `${type}${scopePart}: ${message}`;
  
  try {
    // Add specific files or all changes
    if (files && files.length > 0) {
      for (const file of files) {
        execSync(`git add "${file}"`, { cwd: projectDir, stdio: "inherit" });
      }
    } else {
      execSync("git add .", { cwd: projectDir, stdio: "inherit" });
    }
    
    execSync(`git commit -m "${fullMessage}"`, { cwd: projectDir, stdio: "inherit" });
  } catch (e) {
    console.warn(`Warning: Commit failed: ${e}`);
    throw e;
  }
}

/**
 * Commit task completion with automatic type detection
 */
export async function commitTaskCompletion(
  projectDir: string,
  taskId: string,
  taskDescription: string,
  category?: string
): Promise<void> {
  // Auto-detect commit type based on category
  let type: CommitType = "feat";
  
  if (category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower === "bug" || categoryLower === "fix") {
      type = "fix";
    } else if (categoryLower === "docs" || categoryLower === "documentation") {
      type = "docs";
    } else if (categoryLower === "test" || categoryLower === "testing") {
      type = "test";
    } else if (categoryLower === "refactor") {
      type = "refactor";
    } else if (categoryLower === "ci" || categoryLower === "build") {
      type = "chore";
    }
  }
  
  // Truncate description if too long
  const shortDesc = taskDescription.length > 50 
    ? taskDescription.substring(0, 47) + "..."
    : taskDescription;
  
  await conventionalCommit({
    projectDir,
    type,
    message: `[Task] ${shortDesc}`,
  });
}

/**
 * Commit progress update
 */
export async function commitProgressUpdate(
  projectDir: string,
  taskId: string
): Promise<void> {
  await conventionalCommit({
    projectDir,
    type: "chore",
    message: `Update progress: marked task-${taskId} as complete`,
    files: [".autostaff/progress.txt"],
  });
}

/**
 * Generate git command prompt for agent
 * 
 * Returns instructions for the agent to check branch and commit properly
 */
export function generateGitPrompt(
  projectDir: string,
  monorepoNote: string = "",
  progressNote: string = ""
): string {
  return `IMPORTANT: First check branch: git branch
If NOT on '${DEFAULT_BRANCH}', run: git checkout -b ${DEFAULT_BRANCH}${monorepoNote}${progressNote}

After complete: git add . && git commit -m "[Task] description" && Say "TASK COMPLETE"`;
}
