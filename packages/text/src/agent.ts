/**
 * Text content creation agent
 * 
 * Provides text-specific agent logic for the auto-bot framework.
 * Handles text content creation workflows.
 */

import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import {
  detectPhase,
  countPassingFeatures,
  getNextExecutableTask,
  getExecutableTasks,
} from "@varlinor/autostaff-core";

const SPEC_DIR = "docs";
const SPEC_FILE = "content_spec.md";
const TASK_FILE = "content_tasks.json";
const DELAY_MS = 3000;

export interface TextBotConfig {
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

/**
 * Run the text content agent
 */
export async function runTextBot(config: TextBotConfig): Promise<void> {
  const { projectDir, model, agent, maxIterations, ulw, initOnly, extend, verbose, logFile } = config;

  fs.mkdirSync(projectDir, { recursive: true });

  console.log("\n" + chalk.bold("═".repeat(70)));
  console.log(chalk.bold("  AUTO-STAFF: Autonomous Text Content Creator"));
  console.log(chalk.bold("═".repeat(70)));
  console.log(`\n  Project: ${chalk.cyan(projectDir)}`);
  console.log(`  Model:   ${chalk.cyan(model || "minimax(Custom)/MiniMax-M2.5")}`);
  if (ulw) console.log(`  ULW:     ${chalk.yellow("enabled")}`);
  console.log(`  Limit:   ${maxIterations ? chalk.cyan(String(maxIterations)) : chalk.dim("unlimited")}`);

  let phase = detectTextPhase(projectDir);
  let iteration = 0;

  // Phase 1: Generate content_spec.md
  if (phase === "need-spec") {
    iteration++;
    console.log(chalk.yellow("  Phase: Generating content_spec.md\n"));

    // TODO: Integrate with opencode agent
    console.log(chalk.dim("  Please create docs/content_spec.md manually"));
    console.log(chalk.dim("  Include: Overview, Content Type, Target Audience, Structure, Word Count\n"));

    phase = detectTextPhase(projectDir);
    if (phase === "need-spec") {
      console.log(chalk.yellow("  Waiting for content_spec.md..."));
      return;
    }
    await sleep(DELAY_MS);
  }

  // Phase 2: Generate content_tasks.json
  if (phase === "need-tasks") {
    iteration++;
    if (maxIterations && iteration >= maxIterations) {
      console.log(chalk.yellow(`\n  Reached max iterations (${maxIterations})`));
      return;
    }

    console.log(chalk.yellow("  Phase: Generating content_tasks.json\n"));

    // TODO: Integrate with opencode agent
    const sampleTasks = {
      tasks: [
        {
          id: "task-1",
          category: "content",
          description: "Create content outline",
          steps: [
            "Read content_spec.md",
            "Create outline with sections",
            "Verify: Outline has 3+ sections"
          ],
          passes: false
        }
      ]
    };

    fs.writeFileSync(
      path.join(projectDir, TASK_FILE),
      JSON.stringify(sampleTasks, null, 2),
      "utf-8"
    );
    console.log(chalk.green(`  Created ${TASK_FILE}`));

    phase = detectTextPhase(projectDir);
    printProgress(projectDir);
    await sleep(DELAY_MS);
  }

  // Init-only mode
  if (initOnly) {
    console.log(chalk.cyan("\n  ✓ init-only mode: stopping after initialization"));
    printProgress(projectDir);
    return;
  }

  // Phase 3: Execute tasks
  while (phase === "execute") {
    iteration++;
    if (maxIterations && iteration >= maxIterations) {
      console.log(chalk.yellow(`\n  Reached max iterations (${maxIterations})`));
      break;
    }

    const { passing, total } = countPassingFeatures(projectDir);
    if (total > 0 && passing === total) {
      console.log(chalk.green.bold(`\n  ✓ All ${total} content tasks complete!`));

      if (extend) {
        console.log(chalk.cyan("\n  Extend mode: Adding new content...\n"));
      } else {
        console.log(chalk.cyan("\n  Content creation is complete!"));
      }
      break;
    }

    printProgress(projectDir);

    const nextTask = getNextExecutableTask(projectDir);
    if (!nextTask) {
      console.log(chalk.yellow("\n  No executable tasks found."));
      break;
    }

    console.log(chalk.cyan(`\n  Current Task: ${nextTask.id}`));
    console.log(chalk.dim(`  ${nextTask.description}`));

    // TODO: Integrate with opencode agent for actual content creation
    console.log(chalk.yellow("\n  ⚠ Text agent execution not yet implemented"));
    console.log(chalk.dim("  Manually complete the task and run again to continue"));

    break;
  }

  console.log("\n" + chalk.bold("═".repeat(70)));
  console.log(chalk.bold("  DONE"));
  console.log(chalk.bold("═".repeat(70)));
  printProgress(projectDir);
  console.log();
}

/**
 * Detect phase for text content
 */
function detectTextPhase(dir: string): "need-spec" | "need-tasks" | "execute" {
  const hasSpec = 
    fs.existsSync(path.join(dir, SPEC_DIR, SPEC_FILE)) || 
    fs.existsSync(path.join(dir, "content_spec.md"));
  const hasTasks = fs.existsSync(path.join(dir, TASK_FILE));

  if (!hasSpec && hasTasks) return "execute";
  if (!hasSpec) return "need-spec";
  if (!hasTasks) return "need-tasks";
  return "execute";
}

/**
 * Print progress summary
 */
function printProgress(projectDir: string): void {
  const { passing, total } = countPassingFeatures(projectDir);
  if (total > 0) {
    const pct = ((passing / total) * 100).toFixed(1);
    console.log();
    console.log(chalk.bold(`  Progress: ${passing}/${total} (${pct}%)`));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
