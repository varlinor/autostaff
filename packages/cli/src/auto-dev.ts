#!/usr/bin/env node

/**
 * @deprecated This file is deprecated. Please use index.ts instead.
 * 
 * Migration:
 *   Old: npx tsx src/auto-dev.ts <project-dir> [options]
 *   New: npx tsx src/index.ts <command> <project-dir> [options]
 * 
 * Example:
 *   Old: npx tsx src/auto-dev.ts ./my-project --ulw
 *   New: npx tsx src/index.ts code ./my-project --ulw
 * 
 * Or use the CLI directly:
 *   auto-staff code ./my-project --ulw
 */

import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";

function showDeprecationWarning() {
  console.error("");
  console.error("⚠️  WARNING: auto-dev.ts is DEPRECATED");
  console.error("");
  console.error("  This entry point will be removed in a future version.");
  console.error("  Please use index.ts instead:");
  console.error("");
  console.error("    npx tsx src/index.ts code <project-dir> [options]");
  console.error("");
  console.error("  Or use the auto-staff CLI directly:");
  console.error("");
  console.error("    auto-staff code <project-dir> [options]");
  console.error("");
  console.error("  For help: auto-staff --help");
  console.error("");
}

async function main() {
  showDeprecationWarning();
  
  const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  const program = new Command();

  program
    .name("auto-dev")
    .description("⚠️ DEPRECATED - Use auto-staff instead")
    .version(pkg.version || "0.4.0");

  // Legacy code subcommand (maps to index.ts code command)
  const codeCommand = new Command("code")
    .description("Code development agent (deprecated - use 'auto-staff code' instead)")
    .argument("[project-dir]", "Project directory", ".")
    .option("-m, --model <model>", "Model to use")
    .option("-a, --agent <name>", "Agent name")
    .option("--ulw", "Ultrawork mode - high precision execution")
    .option("--max-iterations <n>", "Max iterations", parseInt)
    .option("--spec <file>", "Spec file path")
    .option("--desc <text>", "Description to generate spec")
    .option("-e, --extend", "Extend mode - add new features")
    .option("--init-only", "Only generate spec and tasks, do not execute")
    .option("--verbose", "Verbose output")
    .option("--log-file <path>", "Log file path")
    .action(async (projectDir: string, opts: any) => {
      console.error("");
      console.error("💡 Tip: Use 'npx tsx src/index.ts code' instead for better support.");
      console.error("");
      
      // Forward to index.ts logic would go here, but for simplicity we just warn
      const resolvedDir = path.resolve(projectDir);
      console.error(`Project directory: ${resolvedDir}`);
      console.error("");
      console.error("Please run the following command instead:");
      console.error(`  npx tsx src/index.ts code ${projectDir} ${process.argv.slice(4).join(" ")}`);
      console.error("");
      process.exit(0);
    });

  // Legacy text subcommand (maps to index.ts text command)
  const textCommand = new Command("text")
    .description("Text content creation agent (deprecated - use 'auto-staff text' instead)")
    .argument("[project-dir]", "Project directory", ".")
    .option("-m, --model <model>", "Model to use")
    .option("-a, --agent <name>", "Agent name")
    .option("--ulw", "Ultrawork mode - high precision execution")
    .option("--max-iterations <n>", "Max iterations", parseInt)
    .option("-e, --extend", "Extend mode - add new content")
    .option("--init-only", "Only generate spec and tasks, do not execute")
    .option("--verbose", "Verbose output")
    .option("--log-file <path>", "Log file path")
    .action(async (projectDir: string, opts: any) => {
      console.error("");
      console.error("💡 Tip: Use 'npx tsx src/index.ts text' instead for better support.");
      console.error("");
      
      const resolvedDir = path.resolve(projectDir);
      console.error(`Project directory: ${resolvedDir}`);
      console.error("");
      console.error("Please run the following command instead:");
      console.error(`  npx tsx src/index.ts text ${projectDir} ${process.argv.slice(4).join(" ")}`);
      console.error("");
      process.exit(0);
    });

  // Default action - just show help
  program.action(() => {
    showDeprecationWarning();
    program.help();
  });

  program.addCommand(codeCommand);
  program.addCommand(textCommand);

  program.parse();
}

main();
