import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prompts directory relative to src (prompts/ is now in cli package root)
const PROMPTS_DIR = path.join(__dirname, "..", "prompts");

const DEFAULT_AGENTS_CONTENT = `# Auto Code Bot

## Workflow

1. Read task.json for current task
2. Implement the task
3. Verify: run build/tests
4. Commit: git add . && git commit -m "[Task] description"
5. Say "TASK COMPLETE" and exit
`;

export function ensureAgentsMd(projectDir: string): void {
  const dest = path.join(projectDir, "AGENTS.md");
  if (fs.existsSync(dest)) return;

  // Try to find prompts directory in cli package
  const src = path.join(PROMPTS_DIR, "AGENTS.md");
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(chalk.green(`  Created AGENTS.md in project directory`));
    return;
  }

  // Fallback: create default content inline
  fs.writeFileSync(dest, DEFAULT_AGENTS_CONTENT, "utf-8");
  console.log(chalk.green(`  Created default AGENTS.md in project directory`));
}

export function ensureSpecFile(projectDir: string, specPath?: string): void {
  const docsDir = path.join(projectDir, "docs");
  const destMd = path.join(docsDir, "app_spec.md");
  const destTxt = path.join(projectDir, "app_spec.txt");

  if (fs.existsSync(destMd) || fs.existsSync(destTxt)) return;

  if (specPath && fs.existsSync(specPath)) {
    fs.mkdirSync(docsDir, { recursive: true });
    fs.copyFileSync(path.resolve(specPath), destMd);
    console.log(chalk.green(`  Copied spec → docs/app_spec.md`));
  }
}
