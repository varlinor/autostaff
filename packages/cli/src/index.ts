#!/usr/bin/env node

/**
 * auto-bot - Unified CLI for autonomous automation
 * 
 * Usage:
 *   auto-bot [command] [project-dir] [options]
 * 
 * Commands:
 *   code                   Code development agent
 *   text                   Text content creation agent
 * 
 * Examples:
 *   auto-bot code . --ulw --max-iterations 2
 *   auto-bot text ./my-project -m deepseek/deepseek-chat
 */

import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { runCodeAgent, createCodeClient } from "auto-code";
import { runTextBot } from "auto-text";

interface FileConfig {
  model?: string;
  agent?: string;
  maxIterations?: number;
  ulw?: boolean;
  spec?: string;
  description?: string;
  extend?: boolean;
  initOnly?: boolean;
  verbose?: boolean;
  logFile?: string;
}

function loadConfig(projectDir: string): FileConfig {
  const configPath = path.join(projectDir, "auto-bot.json");
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch {}
  return {};
}

function mergeConfig(opts: any, fileConfig: FileConfig, initOnly?: boolean): any {
  return {
    model: opts.model || fileConfig.model,
    agent: opts.agent || fileConfig.agent,
    maxIterations: initOnly ? 2 : (opts.maxIterations ?? fileConfig.maxIterations),
    ulw: opts.ulw ?? fileConfig.ulw,
    specFile: opts.spec || fileConfig.spec,
    description: opts.description || fileConfig.description,
    extend: opts.extend || fileConfig.extend,
    initOnly: opts.initOnly ?? fileConfig.initOnly,
    verbose: opts.verbose ?? fileConfig.verbose,
    logFile: opts.logFile || fileConfig.logFile,
  };
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  const program = new Command();

  program
    .name("auto-bot")
    .description("Unified CLI for autonomous automation - code, text, and more")
    .version(pkg.version || "0.4.0");

  // Use a single command with positional argument for subcommand
  program
    .argument("<command>", "Command: code or text")
    .argument("[project-dir]", "Project directory", ".")
    .option("-m, --model <model>", "Model to use")
    .option("-a, --agent <name>", "Agent name")
    .option("--ulw", "Ultrawork mode")
    .option("--max-iterations <n>", "Max iterations", parseInt)
    .option("--spec <file>", "Spec file path")
    .option("--desc <text>", "Description to generate spec")
    .option("-e, --extend", "Extend mode")
    .option("--init-only", "Only generate spec and tasks")
    .option("--verbose", "Verbose output")
    .option("--log-file <path>", "Log file path")
    .action(async (command: string, projectDir: string, opts: any) => {
      const resolvedDir = path.resolve(projectDir);
      const fileConfig = loadConfig(resolvedDir);
      const config = mergeConfig(opts, fileConfig, opts.initOnly);

      if (command === "code") {
        const deps = {
          createClient: createCodeClient,
          ensureAgentsMd: (dir: string) => {
            const agentsMd = path.join(dir, "AGENTS.md");
            if (!fs.existsSync(agentsMd)) {
              const agentsContent = `# Auto Code Bot

## Workflow

1. Read task.json for current task
2. Implement the task
3. Verify: run build/tests
4. Commit: git add . && git commit -m "[Task] description"
5. Say "TASK COMPLETE" and exit
`;
              fs.writeFileSync(agentsMd, agentsContent, "utf-8");
            }
          },
        };

        try {
          await runCodeAgent({ projectDir: resolvedDir, ...config }, deps);
        } catch (error: any) {
          if (error.code === "ERR_USE_AFTER_CLOSE" || error.message?.includes("interrupted")) {
            console.log("\nInterrupted. Run again to resume.");
          } else {
            console.error(`\nFatal error: ${error}`);
            throw error;
          }
        }
      } else if (command === "text") {
        try {
          await runTextBot({ projectDir: resolvedDir, ...config });
        } catch (error: any) {
          if (error.code === "ERR_USE_AFTER_CLOSE") {
            console.log("\nInterrupted.");
          } else {
            console.error(`\nFatal error: ${error}`);
            throw error;
          }
        }
      } else {
        console.error(`Unknown command: ${command}`);
        console.log("Available commands: code, text");
        process.exit(1);
      }
    });

  program.parse();
}

main();
