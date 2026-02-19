#!/usr/bin/env node

import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { runAutonomousAgent } from "./agent.js";

interface FileConfig {
  model?: string;
  agent?: string;
  maxIterations?: number;
  ulw?: boolean;
  spec?: string;
  description?: string;
  extend?: boolean;
  packageManager?: string;
  gitBranch?: string;
  initOnly?: boolean;
}

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

const program = new Command();

program
  .name("auto-code-bot")
  .description("Fully autonomous coding system powered by opencode")
  .version(pkg.version || "0.0.0")
  .option("-c, --config <file>", "Config file path (default: auto-code-bot.json in project dir)")
  .argument("[project-dir]", "Working directory for the project", ".")
  .option("-m, --model <model>", "Model to use (provider/model format)")
  .option("-a, --agent <agent>", "Agent to use in opencode")
  .option("--max-iterations <n>", "Maximum iterations", parseInt)
  .option("--ulw", "Enable ultrawork mode")
  .option("--spec <file>", "Copy spec file as app_spec.md")
  .option("--desc <text>", "Short description to generate app_spec.md")
  .option("-e, --extend", "Extend mode: add new features when all complete")
  .option("--init-only", "Only generate app_spec.md and task.json, do not execute tasks")
  .option("--package-manager <npm|pnpm|yarn|bun>", "Package manager")
  .option("--git-branch <branch>", "Git branch for development", "develop")
  .action(async (projectDir: string, opts: any) => {
    // Load config file: CLI options override config file
    const configPath = opts.config || path.join(projectDir, "auto-code-bot.json");
    let fileConfig: FileConfig = {};
    try {
      if (fs.existsSync(configPath)) {
        fileConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch {}

    const config = {
      model: opts.model || fileConfig.model,
      agent: opts.agent || fileConfig.agent,
      maxIterations: opts.initOnly ? 2 : (opts.maxIterations || fileConfig.maxIterations),
      ulw: opts.ulw ?? fileConfig.ulw,
      specFile: opts.spec || fileConfig.spec,
      description: opts.desc || fileConfig.description,
      extend: opts.extend || fileConfig.extend,
      packageManager: opts.packageManager || fileConfig.packageManager,
      gitBranch: opts.gitBranch || fileConfig.gitBranch || "develop",
    };

    const resolvedDir = path.resolve(projectDir);

    try {
      await runAutonomousAgent({
        projectDir: resolvedDir,
        model: config.model,
        agent: config.agent,
        maxIterations: config.maxIterations,
        ulw: config.ulw,
        specFile: config.specFile,
        description: config.description,
        extend: config.extend,
        packageManager: config.packageManager,
        gitBranch: config.gitBranch,
      });
    } catch (error: any) {
      if (error.code === "ERR_USE_AFTER_CLOSE" || error.message?.includes("interrupted")) {
        console.log("\n\nInterrupted by user");
        console.log("Run same command again to resume");
      } else {
        console.error(`\nFatal error: ${error}`);
        throw error;
      }
    }
  });

program.parse(process.argv);
