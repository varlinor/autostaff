import fs from "node:fs";
import path from "node:path";
import { createClient, DEFAULT_MODEL } from "./client.js";
import { countPassingFeatures, printSessionHeader, printProgressSummary, getNextExecutableTask, getExecutableTasks } from "./progress.js";
import { ensureAgentsMd } from "./prompts.js";
import { detectProjectType, getWorkspaceFromTask, findWorkspaceRoot } from "./workspace.js";
import chalk from "chalk";

const DELAY_MS = 3000;

export interface AgentConfig {
  projectDir: string;
  model?: string;
  agent?: string;
  maxIterations?: number;
  ulw?: boolean;
  specFile?: string;
  description?: string;
  extend?: boolean;
  packageManager?: string;
  gitBranch?: string;
  initOnly?: boolean;
  silent?: boolean;
  logFile?: string;
}

const SPEC_DIR = "docs";
const SPEC_FILE = "app_spec.md";

type Phase = "need-spec" | "need-tasks" | "execute";

function detectPhase(dir: string): Phase {
  const hasSpec = 
    fs.existsSync(path.join(dir, SPEC_DIR, SPEC_FILE)) || 
    fs.existsSync(path.join(dir, "app_spec.txt"));
  const hasTasks = fs.existsSync(path.join(dir, "task.json"));

  if (!hasSpec && hasTasks) return "execute";
  if (!hasSpec) return "need-spec";
  if (!hasTasks) return "need-tasks";
  return "execute";
}

export async function runAutonomousAgent(config: AgentConfig): Promise<void> {
  const { projectDir, model, agent, maxIterations, ulw, specFile, description, extend, initOnly, silent, logFile } = config;
  const effectiveModel = model || DEFAULT_MODEL;

  fs.mkdirSync(projectDir, { recursive: true });

  console.log("\n" + chalk.bold("═".repeat(70)));
  console.log(chalk.bold("  AUTO-DEV: Autonomous Coding Agent"));
  console.log(chalk.bold("═".repeat(70)));
  console.log(`\n  Project: ${chalk.cyan(projectDir)}`);
  console.log(`  Model:   ${chalk.cyan(effectiveModel)}${model ? "" : chalk.dim(" (default)")}`);
  if (ulw) console.log(`  ULW:     ${chalk.yellow("enabled")}`);
  console.log(`  Limit:   ${maxIterations ? chalk.cyan(String(maxIterations)) : chalk.dim("unlimited")}`);

  const projectType = detectProjectType(projectDir);

  if (specFile) {
    const destDir = path.join(projectDir, SPEC_DIR);
    const dest = path.join(destDir, SPEC_FILE);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(path.resolve(specFile), dest);
      console.log(`\n  Copied spec: ${specFile} → ${SPEC_DIR}/${SPEC_FILE}`);
    }
  }

  let phase = detectPhase(projectDir);
  let iteration = 0;

  // ── Phase 1: Generate app_spec.md ──
  if (phase === "need-spec") {
    iteration++;
    printSessionHeader(iteration, true);
    console.log(chalk.yellow("  Phase: Generating app_spec.md\n"));

    const client = createClient(projectDir, model, agent, ulw);

    const specPath = path.join(SPEC_DIR, SPEC_FILE);
    let msg: string;
    if (description) {
      msg = `Create a file called '${specPath}' in the current directory. It should be a detailed project specification in Markdown format based on this description: "${description}". Include: Overview, Technology Stack, Core Features (with detailed bullet points), and API Endpoints if applicable. Make it thorough enough for another agent to implement from scratch.`;
    } else {
      msg = `The current directory is empty and needs a project specification. Create a file called '${specPath}'. Ask me what I want to build, then generate a detailed Markdown specification with: Overview, Technology Stack, Core Features, and API Endpoints if applicable.`;
    }

    const result = await client.run(msg);
    if (result.status === "error") {
      console.error(chalk.red("\n  Failed to generate app_spec.md"));
      return;
    }

    phase = detectPhase(projectDir);
    if (phase === "need-spec") {
      console.error(chalk.red("\n  app_spec.md was not created. Please create it manually and re-run."));
      return;
    }
    await sleep(DELAY_MS);
  }

  // ── Phase 2: Generate task.json + project scaffold ──
  if (phase === "need-tasks") {
    iteration++;
    if (maxIterations && iteration >= maxIterations) {
      console.log(chalk.yellow(`\n  Reached max iterations (${maxIterations})`));
      return;
    }

    printSessionHeader(iteration, true);
    console.log(chalk.yellow("  Phase: Generating task.json + project scaffold\n"));

    // Write detailed instructions to a file in project dir
    const initPromptPath = path.join(projectDir, ".auto-dev-init.md");
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
   - Example task structure:
     \{
       "id": "task-docs-1",
       "type": "docs",
       "category": "documentation",
       "description": "Update README documentation for all modified packages",
       "workspace": null,
       "dependsOn": ["task-XXX (last implementation task)"],
       "steps": [
         "1. Check git status or diff to find modified packages",
         "2. For each modified package, read current README.md",
         "3. Update README.md with new features, API changes, examples",
         "4. VERIFY: git diff shows README changes"
       ],
       "passes": false
     \}

4. **Create init.sh** (Unix) and **init.ps1** (Windows):
   - Use the package manager from ${specPath} (pnpm/yarn/bun/npm)
   - Install dependencies with the specified package manager
   - Start dev server in background
   - Print "Server running at http://localhost:PORT"

5. **Initialize Git**:
   - git init
   - git checkout -b develop (create develop branch)
   - git add .
   - git commit -m "Initial setup: task.json and project structure"
   - Note: All work happens on 'develop' branch

6. **Set up project structure**:
   - Scaffold the tech stack from ${specPath}
   - Use pnpm/yarn/bun/npm as specified in ${specPath}
   - If frontend and no package manager specified, use npm

7. **IMPORTANT**: Do NOT implement any tasks yet. Just set up the foundation.

Read AGENTS.md for the complete workflow rules.`;

    fs.writeFileSync(initPromptPath, initPrompt, "utf-8");
    ensureAgentsMd(projectDir);

    const client = createClient(projectDir, model, agent, ulw);
    const msg = `IMPORTANT: Read the file .auto-dev-init.md in your current directory and follow its instructions exactly. This file contains your detailed initialization task.`;

    console.log(chalk.dim(`  Instruction file: .auto-dev-init.md`));
    const result = await client.run(msg);

    // Cleanup prompt file
    try { fs.unlinkSync(initPromptPath); } catch {}

    if (result.status === "error") {
      console.error(chalk.red("\n  Session error during initialization"));
    }

    phase = detectPhase(projectDir);
    if (phase === "need-tasks") {
      console.log(chalk.yellow("\n  ⚠ task.json was not created. Re-run to retry."));
      console.log(chalk.yellow("  The agent may need more time or clarification.\n"));
      return;
    }

    printProgressSummary(projectDir);
    await sleep(DELAY_MS);
  }

  // ── Init-only mode: Stop after generating spec and tasks ──
  if (initOnly) {
    console.log(chalk.cyan("\n  ✓ init-only mode: stopping after initialization"));
    console.log(chalk.dim("  Run again without --init-only to execute tasks\n"));
    printProgressSummary(projectDir);
    return;
  }

  // Check if git exists, if not initialize it
  const gitDir = path.join(projectDir, ".git");
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.yellow("\n  Git not initialized. Running git setup...\n"));

    iteration++;
    printSessionHeader(iteration, true);
    console.log(chalk.yellow("  Phase: Git initialization\n"));

    // Run git commands directly instead of via agent
    const { execSync } = await import("node:child_process");
    try {
      execSync("git init", { cwd: projectDir, stdio: "inherit" });
      execSync("git checkout -b develop", { cwd: projectDir, stdio: "inherit" });
      execSync("git add .", { cwd: projectDir, stdio: "inherit" });
      execSync('git commit -m "Initial commit"', { cwd: projectDir, stdio: "inherit" });
      console.log(chalk.green("\n  Git initialized on develop branch with initial commit"));
    } catch (e) {
      console.log(chalk.yellow("\n  Git setup had issues, continuing anyway..."));
    }

    await sleep(DELAY_MS);
  }

  // ── Phase 3: Execute tasks ──
  let allComplete = false;
  while (phase === "execute") {
    iteration++;
    if (maxIterations && iteration >= maxIterations) {
      console.log(chalk.yellow(`\n  Reached max iterations (${maxIterations})`));
      break;
    }

    const { passing, total } = countPassingFeatures(projectDir);
    if (total > 0 && passing === total) {
      console.log(chalk.green.bold(`\n  ✓ All ${total} tasks passing!`));

      if (extend) {
        console.log(chalk.cyan("\n  Extend mode: Adding new features...\n"));

        ensureAgentsMd(projectDir);
        const client = createClient(projectDir, model, agent, ulw);
        const msg = `The current task.json has all ${total} tasks marked as passing.
IMPORTANT: First, check which branch you are on with: git branch
If NOT on 'develop' branch, create and switch to it:
  git checkout -b develop
  git push -u origin develop

Then ask the user what additional features they want to add.
Then update task.json to add NEW tasks for those features.
CRITICAL:
1. Do NOT modify existing tasks (keep passes:true).
2. Add new tasks with passes:false.
3. ALWAYS add a documentation task to update README files:
   - For monorepo: Update each modified package's README.md
   - For single package: Update root README.md
   - Documentation task should detect which packages were modified and update their docs
   - Example:
     \{
       "id": "task-docs-update",
       "type": "docs",
       "category": "documentation", 
       "description": "Update README documentation for newly added features",
       "workspace": null,
       "dependsOn": ["list of new feature task IDs"],
       "steps": [
         "1. Identify which packages were modified",
         "2. Update each package's README.md with new features",
         "3. VERIFY: git diff shows README changes"
       ],
       "passes": false
     \}
4. After adding tasks, run:
   git checkout develop (if not already on develop)
   git add .
   git commit -m "Added new features: [list of new tasks]"
5. Do NOT implement the new tasks yet - just add them to task.json and commit.`;

        const result = await client.run(msg);
        if (result.status === "error") {
          console.log(chalk.red("\n  Error while adding features."));
        }

        phase = detectPhase(projectDir);
        if (phase !== "execute") break;

        const newStats = countPassingFeatures(projectDir);
        if (newStats.total === total && newStats.passing === total) {
          console.log(chalk.yellow("\n  No new tasks added."));
        } else {
          console.log(chalk.green(`\n  Added ${newStats.total - total} new task(s). Continuing...\n`));
          await sleep(DELAY_MS);
          continue;
        }
      } else {
        console.log(chalk.cyan("\n  Project is complete!"));
        console.log(chalk.dim("  To add more features:"));
        console.log(chalk.dim("    1. Edit task.json to add new tasks with passes:false"));
        console.log(chalk.dim("    2. Run: auto-dev ./my-project --extend --ulw\n"));
      }
      break;
    }

    printSessionHeader(iteration, false);
    printProgressSummary(projectDir);

    ensureAgentsMd(projectDir);

    const { passing: checkPassing, total: checkTotal } = countPassingFeatures(projectDir);
    const nextTask = getNextExecutableTask(projectDir);
    const executableTasks = getExecutableTasks(projectDir);

    if (!nextTask && executableTasks.length === 0) {
      if (checkTotal > 0 && checkPassing === checkTotal) {
        console.log(chalk.green.bold(`\n  ✓ All ${checkTotal} tasks passing!`));
        console.log(chalk.cyan("\n  Project is complete!"));
        console.log(chalk.dim("  To add more features:"));
        console.log(chalk.dim("    1. Edit task.json to add new tasks with passes:false"));
        console.log(chalk.dim("    2. Run: auto-dev ./my-project --extend --ulw\n"));
        break;
      } else if (checkTotal === 0) {
        console.log(chalk.yellow("\n  Warning: task.json exists but could not be parsed. Please fix the JSON syntax."));
        break;
      } else {
        console.log(chalk.yellow(`\n  Warning: No executable tasks (${checkPassing}/${checkTotal} passing). Check task.json for dependency issues.`));
        break;
      }
    }

    let taskInfo = "";
    let workspace = undefined;
    const workspaceRoot = findWorkspaceRoot(projectDir);
    if (nextTask) {
      workspace = getWorkspaceFromTask(nextTask.workspace);
      const deps = nextTask.dependsOn?.length ? ` (depends on: ${nextTask.dependsOn.join(", ")})` : "";
      taskInfo = `\n\nCURRENT TASK (highest priority - all dependencies satisfied):
ID: ${nextTask.id}
Type: ${nextTask.type || "app"}
Workspace: ${nextTask.workspace || "root"}
Description: ${nextTask.description}${deps}
Steps:
${(nextTask.steps || []).map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

Other available tasks (also ready - dependencies satisfied):
${executableTasks.slice(1).map(t => `  - ${t.id}: ${t.description}`).join("\n") || "  (none)"}`;
    } else {
      taskInfo = "\n\nNo executable tasks found. All tasks either completed or waiting for dependencies.";
    }

    const client = createClient(projectDir, model, agent, ulw, workspace, silent, logFile);
    let msg: string;
    
    if (!nextTask && executableTasks.length === 0) {
      msg = `All tasks in task.json are already complete (passes: true).
IMPORTANT: Do NOT ask me what to do next. Do NOT suggest new features.
Simply respond with "DONE" and exit cleanly.
Do NOT start any new work. Just say "DONE" and nothing else.`;
    } else {
      const monorepoNote = workspaceRoot && workspaceRoot !== projectDir
        ? `\n\nMONOREPO DETECTED: You are in a workspace subdirectory.\nWorkspace root: ${workspaceRoot}\nFor build/verification commands, run from workspace root:\n  pnpm -r --filter <package-name> run build\nOr: cd ${workspaceRoot} && pnpm run build`
        : "";
      msg = `IMPORTANT: First, check which branch you are on: git branch
If NOT on 'develop' branch, run: git checkout -b develop${monorepoNote}

Read AGENTS.md for the complete workflow, then follow it exactly.
Read task.json and pick the next incomplete task (passes:false).
${taskInfo}

CRITICAL: Complete EXACTLY ONE task, then exit cleanly.
Do NOT attempt multiple tasks in one session.
After completing and verifying a task, you MUST:
  1. git checkout develop (ensure on develop branch)
  2. git add .
  3. git commit -m "[Task #X] description - completed and verified"
  4. Update progress.txt with what was done
  5. Say "TASK COMPLETE" and exit cleanly
Do NOT continue to the next task - the outer loop will handle that.`;
    }

    const result = await client.run(msg);

    const { passing: currentPassing, total: currentTotal } = countPassingFeatures(projectDir);
    const allNowComplete = currentTotal > 0 && currentPassing === currentTotal;

    if (result.status === "continue" && !allNowComplete) {
      printProgressSummary(projectDir);
    } else if (allNowComplete) {
      console.log(chalk.green(`\n  ✓ All ${currentTotal} tasks now passing!`));
    } else {
      console.log(chalk.red("\n  Session error. Will retry..."));
    }

    await sleep(DELAY_MS);
    phase = detectPhase(projectDir);
  }

  console.log("\n" + chalk.bold("═".repeat(70)));
  console.log(chalk.bold("  DONE"));
  console.log(chalk.bold("═".repeat(70)));
  console.log(`  Project: ${chalk.cyan(projectDir)}`);
  printProgressSummary(projectDir);
  console.log();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
