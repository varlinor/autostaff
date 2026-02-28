/**
 * Code development agent
 *
 * Provides code-specific agent logic for the auto-bot framework.
 * Handles code development workflows including spec generation,
 * task management, and verification.
 */

import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { detectProjectType, parseTasks } from "@varlinor/autostaff-core";
import { detectPhase, getAutostaffDir, getTaskPath, type Task } from "@varlinor/autostaff-core";
import { type CodeOpenCodeClient } from "./client.js";

export interface CodeAgentConfig {
  projectDir: string;
  model?: string;
  agent?: string;
  maxIterations?: number;
  ulw?: boolean;
  specFile?: string;
  description?: string;
  extend?: boolean;
  initOnly?: boolean;
  verbose?: boolean;
  logFile?: string;
}

export interface CodeAgentDeps {
  createClient: (projectDir: string, model?: string, agent?: string, ulw?: boolean, workspace?: string, verbose?: boolean, logFile?: string) => CodeOpenCodeClient;
  ensureAgentsMd: (projectDir: string) => void;
}

const SPEC_DIR = "docs";
const SPEC_FILE = "app_spec.md";
const DELAY_MS = 1000;

/**
 * Run the code development agent
 */
export async function runCodeAgent(
  config: CodeAgentConfig,
  deps: CodeAgentDeps
): Promise<void> {
  const { projectDir, model, agent, maxIterations, ulw, specFile, description, extend, initOnly, verbose, logFile } = config;

  fs.mkdirSync(projectDir, { recursive: true });

  console.log("\n" + chalk.bold("═".repeat(70)));
  console.log(chalk.bold("  AUTO-STAFF: Autonomous Code Generator"));
  console.log(chalk.bold("═".repeat(70)));
  console.log(`\n  Project: ${chalk.cyan(projectDir)}`);
  console.log(`  Model:   ${chalk.cyan(model || "minimax(Custom)/MiniMax-M2.5")}`);
  if (ulw) console.log(`  ULW:     ${chalk.yellow("enabled")}`);
  console.log(`  Limit:   ${maxIterations ? chalk.cyan(String(maxIterations)) : chalk.dim("unlimited")}`);

  let phase = detectPhase(projectDir);

  // Detect project type
  detectProjectType(projectDir);

  // Copy spec file if provided
  if (specFile) {
    const destDir = path.join(projectDir, SPEC_DIR);
    const dest = path.join(destDir, SPEC_FILE);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(path.resolve(specFile), dest);
      console.log(`\n  Copied spec: ${specFile} → ${SPEC_DIR}/${SPEC_FILE}`);
    }
  }

  let iteration = 0;

  // Phase 1: Generate app_spec.md
  if (phase === "need-spec") {
    iteration++;
    console.log(chalk.yellow("  Phase: Generating app_spec.md\n"));

    const client = deps.createClient(projectDir, model, agent, ulw, undefined, verbose, logFile);
    const specPath = path.join(SPEC_DIR, SPEC_FILE);
    
    let msg: string;
    if (description) {
      msg = `Create a file called '${specPath}' in the current directory. It should be a detailed project specification in Markdown format based on this description: "${description}". Include: Overview, Technology Stack, Core Features (with detailed bullet points), and API Endpoints if applicable. Make it thorough enough for another agent to implement from scratch.`;
    } else {
      msg = `The current directory is empty and needs a project specification. Create a file called '${specPath}'. Ask me what I want to build, then generate a detailed Markdown specification with: Overview, Technology Stack, Core Features, and API Endpoints if applicable.`;
    }

    const result = await client.run(msg);

    if (result.status === "error") {
      console.error(chalk.red("\n  Session error during spec generation"));
    }

    const newPhase = detectPhase(projectDir);
    if (newPhase === "need-spec") {
      console.log(chalk.yellow("\n  ⚠ app_spec.md was not created. Re-run to retry."));
      console.log(chalk.yellow("  The agent may need more time or clarification.\n"));
      return;
    }
    
    phase = newPhase;

    await sleep(DELAY_MS);
  }

  // Phase 2: Generate task.json + project scaffold
  if (phase === "need-tasks") {
    iteration++;
    if (maxIterations && iteration >= maxIterations) {
      console.log(chalk.yellow(`\n  Reached max iterations (${maxIterations})`));
      return;
    }

    console.log(chalk.yellow("  Phase: Generating task.json + project scaffold\n"));

    const specPath = path.join(SPEC_DIR, SPEC_FILE);
    const initPrompt = `# Initialization Task

You are in: ${projectDir}

## Your Job (in order):

1. **Read ${specPath}** - This is your source of truth for what to build
   - NOTE: Look for "packageManager" or "Package Manager" in the Technology Stack section
   - If specified (pnpm/yarn/bun), use that. If not specified for frontend, default to npm

2. **Create task.json** (JSONC format with comments allowed):
   - Each task: {id, category, description, steps[], passes:false}
   - CRITICAL: Every task's steps[] MUST include VERIFICATION steps
   - Use the package manager from ${specPath} in verification steps
   - Cover ALL features from ${specPath}
   - Order: foundational features first

3. **Create README documentation tasks**:
   - For monorepo (packages/*): Add a task to update ALL package READMEs
   - For single package: Add a task to update root README
   - Documentation task should:
     - Auto-detect which packages have changes (via git diff --name-only or task completion)
     - Update each affected package's README.md with new features/APIs
     - Include: Overview, Installation, Usage, API (if applicable), Examples

4. **Create init.sh** (Unix) and **init.ps1** (Windows):
   - Use the package manager from ${specPath} (pnpm/yarn/bun/npm)
   - Install dependencies with the specified package manager
   - Start dev server in background

## Important:
- Create the .autostaff/ directory and task.json inside it
- Do NOT write any code yet - just create the task list and initialization scripts
- Exit when done by saying "TASK COMPLETE"
`;

    const initPromptPath = path.join(projectDir, ".auto-dev-init.md");
    fs.writeFileSync(initPromptPath, initPrompt, "utf-8");

    const client = deps.createClient(projectDir, model, agent, ulw, undefined, verbose, logFile);
    const msg = `IMPORTANT: Read the file .auto-dev-init.md in your current directory and follow its instructions exactly. This file contains your detailed initialization task.`;

    console.log(chalk.dim(`  Instruction file: .auto-dev-init.md`));
    const result = await client.run(msg);

    // Cleanup prompt file
    try { fs.unlinkSync(initPromptPath); } catch {}

    if (result.status === "error") {
      console.error(chalk.red("\n  Session error during initialization"));
    }

    const newPhase = detectPhase(projectDir);
    if (newPhase === "need-tasks") {
      console.log(chalk.yellow("\n  ⚠ task.json was not created. Re-run to retry."));
      console.log(chalk.yellow("  The agent may need more time or clarification.\n"));
      return;
    }
    
    phase = newPhase;

    await sleep(DELAY_MS);
  }

  // Init-only mode: Stop after generating spec and tasks
  if (initOnly) {
    console.log(chalk.cyan("\n  ✓ init-only mode: stopping after initialization"));
    console.log(chalk.dim("  Run again without --init-only to execute tasks\n"));
    return;
  }

  // Check if git exists, if not initialize it
  const gitDir = path.join(projectDir, ".git");
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.yellow("\n  Git not initialized. Running git setup...\n"));

    iteration++;
    const { execSync } = await import("node:child_process");
    try {
      execSync("git init", { cwd: projectDir, stdio: "inherit" });
      execSync("git checkout -b develop", { cwd: projectDir, stdio: "inherit" });
      execSync("git add .", { cwd: projectDir, stdio: "inherit" });
      execSync('git commit -m "Initial commit"', { cwd: projectDir, stdio: "inherit" });
      console.log(chalk.green("\n  Git initialized on develop branch with initial commit"));
    } catch (error: any) {
      console.log(chalk.yellow(`\n  Warning: Git setup failed: ${error.message}`));
    }

    await sleep(DELAY_MS);
  }

  // Phase 3: Execute tasks
  while (true) {
    iteration++;
    
    if (maxIterations && iteration >= maxIterations) {
      console.log(chalk.yellow(`\n  Reached max iterations (${maxIterations})`));
      break;
    }

    const tasks = loadTasks(projectDir);
    
    // CRITICAL: If task.json failed to load, stop immediately
    if (tasks.length === 0) {
      const taskPath = getTaskPath(projectDir);
      if (fs.existsSync(taskPath)) {
        // File exists but failed to parse - error already printed by loadTasks()
        console.error(chalk.red("  Aborting due to task.json parse error.\n"));
        process.exit(1);
      } else {
        // File doesn't exist - shouldn't happen in execute phase
        console.log(chalk.green("\n  ✓ No tasks defined. Project initialization complete!"));
        break;
      }
    }
    
    const pendingTasks = tasks.filter(t => !t.passes);

    if (pendingTasks.length === 0) {
      console.log(chalk.green("\n  ✓ All tasks completed!"));
      break;
    }

    const task = pendingTasks[0];
    console.log(chalk.yellow(`\n  Phase: Executing task ${task.id} (${pendingTasks.length} remaining)\n`));

    const client = deps.createClient(projectDir, model, agent, ulw, task.workspace, verbose, logFile);
    const msg = `You are working on task "${task.id}": ${task.description}

Project: ${projectDir}
${task.workspace ? `Workspace: ${task.workspace}` : ""}

## Your Job:
1. Read the task's steps in .autostaff/task.json
2. Implement each step in order
3. For each step, verify it works before moving on
4. When all steps are complete, update the task's "passes" to true in .autostaff/task.json
5. Say "TASK COMPLETE" when done

## Important:
- Follow existing code patterns in the project
- Write production-quality code
- Test your implementation
- Update progress.txt after completion
`;

    const result = await client.run(msg);

    if (result.status === "error") {
      console.error(chalk.red("\n  Session error during task execution"));
      break;
    }

    // Reload tasks to get updated state
    const updatedTasks = loadTasks(projectDir);
    const completedTask = updatedTasks.find(t => t.id === task.id);
    
    if (completedTask?.passes) {
      console.log(chalk.green(`\n  ✓ Task ${task.id} completed`));
    } else {
      console.log(chalk.yellow(`\n  ⚠ Task ${task.id} may not be complete. Verify manually.`));
    }

    await sleep(DELAY_MS);
  }
}


function loadTasks(projectDir: string): Task[] {
  const taskPath = getTaskPath(projectDir);
  try {
    const content = fs.readFileSync(taskPath, "utf-8");
    const tasks = parseTasks(content);
    return tasks;
  } catch (error: any) {
    console.error(chalk.red("\n  ✗ Failed to load task.json:"));
    console.error(chalk.red(`    File: ${taskPath}`));
    console.error(chalk.red(`    Error: ${error.message}`));
    console.error(chalk.yellow("\n  Please fix the JSON syntax error and try again.\n"));
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
