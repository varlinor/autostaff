#!/usr/bin/env node

import { Command } from "commander";
import path from "node:path";
import { runAutonomousAgent } from "./agent.js";

const program = new Command();

program
  .name("auto-dev")
  .description("Fully autonomous coding system powered by opencode")
  .version("0.1.0");

program
  .argument("[project-dir]", "Working directory for the project", ".")
  .option("-m, --model <model>", "Model to use (provider/model format)")
  .option("-a, --agent <agent>", "Agent to use in opencode")
  .option("--max-iterations <n>", "Maximum number of agent iterations", parseInt)
  .option("--ulw", "Enable ultrawork mode (prefix prompts with ulw)")
  .option("--spec <file>", "Copy this spec file into the project as app_spec.md")
  .option("--desc <text>", "Short description of what to build (generates app_spec.md)")
  .option("-e, --extend", "Extend mode: add new features when all tasks are complete")
  .action(async (projectDir: string, options: {
    model?: string;
    agent?: string;
    maxIterations?: number;
    ulw?: boolean;
    spec?: string;
    desc?: string;
    extend?: boolean;
  }) => {
    const resolvedDir = path.resolve(projectDir);

    try {
      await runAutonomousAgent({
        projectDir: resolvedDir,
        model: options.model,
        agent: options.agent,
        maxIterations: options.maxIterations,
        ulw: options.ulw,
        specFile: options.spec,
        description: options.desc,
        extend: options.extend,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ERR_USE_AFTER_CLOSE" ||
          (error as Error).message?.includes("interrupted")) {
        console.log("\n\nInterrupted by user");
        console.log("To resume, run the same command again");
      } else {
        console.error(`\nFatal error: ${error}`);
        throw error;
      }
    }
  });

process.on("SIGINT", () => {
  console.log("\n\nInterrupted. Run the same command to resume.");
  process.exit(0);
});

program.parse();
