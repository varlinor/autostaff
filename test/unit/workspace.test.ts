import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { detectProjectType, getEffectiveDir, getWorkspaceFromTask, type ProjectType } from "../../packages/cli/src/workspace.js";

describe("workspace.ts", () => {
  const testDir = path.join(process.cwd(), "test", "temp-workspace");

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("detectProjectType", () => {
    it("should detect npm project (single package)", () => {
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({
        name: "test-project",
        version: "1.0.0"
      }));

      const result = detectProjectType(testDir);

      expect(result.isMonorepo).toBe(false);
      expect(result.packageManager).toBe("npm");
    });

    it("should detect pnpm monorepo", () => {
      fs.writeFileSync(path.join(testDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'");
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({
        name: "test-monorepo",
        version: "1.0.0"
      }));

      const result = detectProjectType(testDir);

      expect(result.isMonorepo).toBe(true);
      expect(result.packageManager).toBe("pnpm");
    });

    it("should detect pnpm from packageManager field", () => {
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        packageManager: "pnpm@8.0.0"
      }));

      const result = detectProjectType(testDir);

      expect(result.isMonorepo).toBe(false);
      expect(result.packageManager).toBe("pnpm");
    });

    it("should detect yarn from packageManager field", () => {
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        packageManager: "yarn@1.22.0"
      }));

      const result = detectProjectType(testDir);

      expect(result.packageManager).toBe("yarn");
    });

    it("should detect bun from packageManager field", () => {
      fs.writeFileSync(path.join(testDir, "package.json"), JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        packageManager: "bun@1.0.0"
      }));

      const result = detectProjectType(testDir);

      expect(result.packageManager).toBe("bun");
    });

    it("should return default for non-existent directory", () => {
      const result = detectProjectType("/non/existent/path");

      expect(result.isMonorepo).toBe(false);
      expect(result.packageManager).toBe("npm");
    });
  });

  describe("getEffectiveDir", () => {
    it("should return project dir when workspace is empty", () => {
      const result = getEffectiveDir("/project", undefined);
      expect(result).toBe("/project");
    });

    it("should return project dir when workspace is empty string", () => {
      const result = getEffectiveDir("/project", "");
      expect(result).toBe("/project");
    });

    it("should return workspace path when workspace is provided", () => {
      const result = getEffectiveDir("/project", "packages/ui");
      expect(result).toBe(path.join("/project", "packages/ui"));
    });

    it("should handle nested workspace paths", () => {
      const result = getEffectiveDir("/project", "packages/shared/components");
      expect(result).toBe(path.join("/project", "packages/shared/components"));
    });
  });

  describe("getWorkspaceFromTask", () => {
    it("should return undefined for empty workspace", () => {
      expect(getWorkspaceFromTask(undefined)).toBeUndefined();
      expect(getWorkspaceFromTask("")).toBeUndefined();
      expect(getWorkspaceFromTask("   ")).toBeUndefined();
    });

    it("should return workspace when provided", () => {
      expect(getWorkspaceFromTask("packages/ui")).toBe("packages/ui");
      expect(getWorkspaceFromTask("apps/web")).toBe("apps/web");
    });
  });
});
