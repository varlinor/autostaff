import fs from "node:fs";
import path from "node:path";
import { createClient, DEFAULT_MODEL } from "./client.js";
import { countPassingFeatures, printSessionHeader, printProgressSummary } from "./progress.js";
import { ensureAgentsMd } from "./prompts.js";
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
}

type Phase = "need-spec" | "need-tasks" | "execute";

function detectPhase(dir: string): Phase {
  const hasSpec = fs.existsSync(path.join(dir, "app_spec.md")) || fs.existsSync(path.join(dir, "app_spec.txt"));
  const hasTasks = fs.existsSync(path.join(dir, "task.json"));

  if (!hasSpec) return "need-spec";
  if (!hasTasks) return "need-tasks";
  return "execute";
}

export async function runAutonomousAgent(config: AgentConfig): Promise<void> {
  const { projectDir, model, agent, maxIterations, ulw, specFile, description, extend } = config;
  const effectiveModel = model || DEFAULT_MODEL;

  fs.mkdirSync(projectDir, { recursive: true });

  console.log("\n" + chalk.bold("═".repeat(70)));
  console.log(chalk.bold("  AUTO-DEV: Autonomous Coding Agent"));
  console.log(chalk.bold("═".repeat(70)));
  console.log(`\n  Project: ${chalk.cyan(projectDir)}`);
  console.log(`  Model:   ${chalk.cyan(effectiveModel)}${model ? "" : chalk.dim(" (default)")}`);
  if (ulw) console.log(`  ULW:     ${chalk.yellow("enabled")}`);
  console.log(`  Limit:   ${maxIterations ? chalk.cyan(String(maxIterations)) : chalk.dim("unlimited")}`);

  if (specFile) {
    const dest = path.join(projectDir, "app_spec.md");
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.resolve(specFile), dest);
      console.log(`\n  Copied spec: ${specFile} → app_spec.md`);
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

    let msg: string;
    if (description) {
      msg = `Create a file called app_spec.md in the current directory. It should be a detailed project specification in Markdown format based on this description: "${description}". Include: Overview, Technology Stack, Core Features (with detailed bullet points), and API Endpoints if applicable. Make it thorough enough for another agent to implement from scratch.`;
    } else {
      msg = `The current directory is empty and needs a project specification. Create a file called app_spec.md. Ask me what I want to build, then generate a detailed Markdown specification with: Overview, Technology Stack, Core Features, and API Endpoints if applicable.`;
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
    if (maxIterations && iteration > maxIterations) {
      console.log(chalk.yellow(`\n  Reached max iterations (${maxIterations})`));
      return;
    }

    printSessionHeader(iteration, true);
    console.log(chalk.yellow("  Phase: Generating task.json + project scaffold\n"));

    // Write detailed instructions to a file in project dir
    const initPromptPath = path.join(projectDir, ".auto-dev-init.md");
    const initPrompt = `# Initialization Task

You are in: ${projectDir}

## Your Job (in order):

1. **Read app_spec.md** - This is your source of truth for what to build
   - NOTE: Look for "packageManager" or "Package Manager" in the Technology Stack section
   - If specified (pnpm/yarn/bun), use that. If not specified for frontend, default to npm

2. **Create task.json** (JSONC format with comments allowed):
   - Each task: {id, category, description, steps[], passes:false}
   - CRITICAL: Every task's steps[] MUST include VERIFICATION steps
   - Use the package manager from app_spec.md in verification steps
   - Cover ALL features from app_spec.md
   - Order: foundational features first

3. **Create init.sh** (Unix) and **init.ps1** (Windows):
   - Use the package manager from app_spec.md (pnpm/yarn/bun/npm)
   - Install dependencies with the specified package manager
   - Start dev server in background
   - Print "Server running at http://localhost:PORT"

4. **Initialize Git**:
   - git init
   - git checkout -b develop (create develop branch)
   - git add .
   - git commit -m "Initial setup: task.json and project structure"
   - Note: All work happens on 'develop' branch

5. **Set up project structure**:
   - Scaffold the tech stack from app_spec.md
   - Use pnpm/yarn/bun/npm as specified in app_spec.md
   - If frontend and no package manager specified, use npm

6. **IMPORTANT**: Do NOT implement any tasks yet. Just set up the foundation.

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
    if (maxIterations && iteration > maxIterations) {
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
3. After adding tasks, run:
   git checkout develop (if not already on develop)
   git add .
   git commit -m "Added new features: [list of new tasks]"
4. Do NOT implement the new tasks yet - just add them to task.json and commit.`;

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

    const client = createClient(projectDir, model, agent, ulw);
    const msg = `IMPORTANT: First, check which branch you are on: git branch
If NOT on 'develop' branch, run: git checkout -b develop

Read AGENTS.md for the complete workflow, then follow it exactly.
Read task.json and pick the next incomplete task (passes:false).
Implement it, test it, update task.json (only change passes:false to passes:true).
CRITICAL: After completing and verifying a task, you MUST:
  1. git checkout develop (ensure on develop branch)
  2. git add .
  3. git commit -m "[Task #X] description - completed and verified"
  4. Update progress.txt with what was done
Do NOT skip the commit step - it records progress for future sessions.`;

    const result = await client.run(msg);

    if (result.status === "continue") {
      printProgressSummary(projectDir);
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
