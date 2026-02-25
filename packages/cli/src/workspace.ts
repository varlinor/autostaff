import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

export interface ProjectType {
  isMonorepo: boolean;
  workspaceRoot?: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
  workspaces?: string[];
}

const MONOREPO_MARKERS = [
  "pnpm-workspace.yaml",
  "lerna.json",
  "turbo.json",
  "nx.json",
  "package.json",
];

export function detectProjectType(projectDir: string): ProjectType {
  const result: ProjectType = {
    isMonorepo: false,
    packageManager: "npm",
  };

  if (!fs.existsSync(projectDir)) {
    return result;
  }

  const files = fs.readdirSync(projectDir);

  if (files.includes("pnpm-workspace.yaml")) {
    result.isMonorepo = true;
    result.packageManager = "pnpm";
    result.workspaceRoot = projectDir;

    try {
      const workspaceContent = fs.readFileSync(
        path.join(projectDir, "pnpm-workspace.yaml"),
        "utf-8"
      );
      const packageMatch = workspaceContent.match(/packages:\s*\n(\s*-\s*[^\n]+\n)*/);
      if (packageMatch) {
        const workspaces: string[] = [];
        const lines = packageMatch[0].split("\n");
        for (const line of lines) {
          const match = line.match(/-\s*["']?([^"']+)["']?/);
          if (match && match[1]) {
            workspaces.push(match[1].replace("packages/", "").replace("/*", ""));
          }
        }
        result.workspaces = workspaces;
      }
    } catch {}
  } else if (files.includes("lerna.json")) {
    result.isMonorepo = true;
    result.packageManager = "npm";
  } else if (files.includes("turbo.json")) {
    result.isMonorepo = true;
    result.packageManager = "npm";
  } else if (files.includes("nx.json")) {
    result.isMonorepo = true;
    result.packageManager = "npm";
  } else if (files.includes("package.json")) {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(projectDir, "package.json"), "utf-8")
      );
      if (pkg.workspaces) {
        result.isMonorepo = true;
        result.packageManager = "npm";
      }
    } catch {}
  }

  if (!result.isMonorepo && files.includes("package.json")) {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(projectDir, "package.json"), "utf-8")
      );
      if (pkg.packageManager && pkg.packageManager.startsWith("pnpm")) {
        result.packageManager = "pnpm";
      } else if (pkg.packageManager && pkg.packageManager.startsWith("yarn")) {
        result.packageManager = "yarn";
      } else if (pkg.packageManager && pkg.packageManager.startsWith("bun")) {
        result.packageManager = "bun";
      }
    } catch {}
  }

  if (result.isMonorepo) {
    console.log(
      chalk.cyan(`  Detected monorepo project (${result.packageManager})`)
    );
    if (result.workspaces) {
      console.log(
        chalk.dim(`  Workspaces: ${result.workspaces.join(", ")}`)
      );
    }
  }

  return result;
}

export function getEffectiveDir(
  projectDir: string,
  workspace?: string
): string {
  if (!workspace) {
    return projectDir;
  }
  return path.join(projectDir, workspace);
}

export function getWorkspaceFromTask(workspace?: string): string | undefined {
  if (!workspace || workspace.trim() === "") {
    return undefined;
  }
  return workspace;
}

export function findWorkspaceRoot(startDir: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    if (fs.existsSync(path.join(current, "lerna.json"))) {
      return current;
    }
    if (fs.existsSync(path.join(current, "turbo.json"))) {
      return current;
    }
    if (fs.existsSync(path.join(current, "nx.json"))) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}
