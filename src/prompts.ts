import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, "..", "prompts");

export function ensureAgentsMd(projectDir: string): void {
  const dest = path.join(projectDir, "AGENTS.md");
  if (fs.existsSync(dest)) return;

  const src = path.join(TEMPLATES_DIR, "AGENTS.md");
  fs.copyFileSync(src, dest);
  console.log(`  Created AGENTS.md in project directory`);
}

export function ensureSpecFile(projectDir: string, specPath?: string): void {
  const destMd = path.join(projectDir, "app_spec.md");
  const destTxt = path.join(projectDir, "app_spec.txt");

  if (fs.existsSync(destMd) || fs.existsSync(destTxt)) return;

  if (specPath && fs.existsSync(specPath)) {
    fs.copyFileSync(path.resolve(specPath), destMd);
    console.log(`  Copied spec → app_spec.md`);
  }
}
