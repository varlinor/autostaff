import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  isGitInitialized,
  initGit,
  getCurrentBranch,
  ensureDevelopBranch,
  conventionalCommit,
  commitTaskCompletion,
  commitProgressUpdate,
  generateGitPrompt,
  type CommitType,
} from "@varlinor/autostaff-core";

describe("git.ts", () => {
  // Use OS temp directory to avoid parent git repo interference
  const testDir = path.join(os.tmpdir(), "auto-bot-git-test");

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

  describe("isGitInitialized", () => {
    it("should return false when .git does not exist", () => {
      expect(isGitInitialized(testDir)).toBe(false);
    });

    it("should return true when .git exists", () => {
      fs.mkdirSync(path.join(testDir, ".git"), { recursive: true });
      expect(isGitInitialized(testDir)).toBe(true);
    });
  });

  describe("initGit", () => {
    it("should initialize git repository", async () => {
      await initGit(testDir);
      expect(fs.existsSync(path.join(testDir, ".git"))).toBe(true);
    });

    it("should create develop branch", async () => {
      await initGit(testDir);
      const branch = await getCurrentBranch(testDir);
      expect(branch).toBe("develop");
    });
  });

  describe("getCurrentBranch", () => {
    it("should return null when not in a git repo", async () => {
      // Force clean directory to ensure no leftover git
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
      
      const branch = await getCurrentBranch(testDir);
      expect(branch).toBeNull();
    });

    it("should return current branch name", async () => {
      await initGit(testDir);
      const branch = await getCurrentBranch(testDir);
      expect(branch).toBe("develop");
    });
  });

  describe("ensureDevelopBranch", () => {
    it("should stay on develop if already on develop", async () => {
      await initGit(testDir);
      await ensureDevelopBranch(testDir);
      const branch = await getCurrentBranch(testDir);
      expect(branch).toBe("develop");
    });
  });

  describe("conventionalCommit", () => {
    it("should create commit with correct format", async () => {
      await initGit(testDir);
      
      // Create a file to commit
      fs.writeFileSync(path.join(testDir, "test.txt"), "test content");
      
      await conventionalCommit({
        projectDir: testDir,
        type: "feat",
        scope: "test",
        message: "add test feature",
      });
      
      // Verify commit was created
      const { execSync } = await import("node:child_process");
      const log = execSync("git log --oneline -1", { cwd: testDir, encoding: "utf-8" });
      expect(log).toContain("feat(test): add test feature");
    });

    it("should handle commit without scope", async () => {
      await initGit(testDir);
      fs.writeFileSync(path.join(testDir, "test2.txt"), "test content");
      
      await conventionalCommit({
        projectDir: testDir,
        type: "fix",
        message: "fix bug",
      });
      
      const { execSync } = await import("node:child_process");
      const log = execSync("git log --oneline -1", { cwd: testDir, encoding: "utf-8" });
      expect(log).toContain("fix: fix bug");
    });

    it("should commit specific files only", async () => {
      await initGit(testDir);
      fs.writeFileSync(path.join(testDir, "file1.txt"), "file 1");
      fs.writeFileSync(path.join(testDir, "file2.txt"), "file 2");
      
      await conventionalCommit({
        projectDir: testDir,
        type: "feat",
        message: "add file 1 only",
        files: ["file1.txt"],
      });
      
      const { execSync } = await import("node:child_process");
      const log = execSync("git log --oneline -1", { cwd: testDir, encoding: "utf-8" });
      expect(log).toContain("feat: add file 1 only");
    });
  });

  describe("commitTaskCompletion", () => {
    it("should auto-detect commit type based on category", async () => {
      await initGit(testDir);
      fs.writeFileSync(path.join(testDir, "task.txt"), "task content");
      
      await commitTaskCompletion(testDir, "1", "Task description", "bug");
      
      const { execSync } = await import("node:child_process");
      const log = execSync("git log --oneline -1", { cwd: testDir, encoding: "utf-8" });
      expect(log).toContain("fix:");
    });

    it("should use feat as default type", async () => {
      await initGit(testDir);
      fs.writeFileSync(path.join(testDir, "task.txt"), "task content");
      
      await commitTaskCompletion(testDir, "2", "Task description", "functional");
      
      const { execSync } = await import("node:child_process");
      const log = execSync("git log --oneline -1", { cwd: testDir, encoding: "utf-8" });
      expect(log).toContain("feat:");
    });
  });

  describe("commitProgressUpdate", () => {
    it("should commit progress.txt with chore type", async () => {
      await initGit(testDir);
      
      // Create .autostaff directory and progress.txt
      const autostaffDir = path.join(testDir, ".autostaff");
      fs.mkdirSync(autostaffDir, { recursive: true });
      fs.writeFileSync(path.join(autostaffDir, "progress.txt"), "# Progress\n");
      
      await commitProgressUpdate(testDir, "1");
      
      const { execSync } = await import("node:child_process");
      const log = execSync("git log --oneline -1", { cwd: testDir, encoding: "utf-8" });
      expect(log).toContain("chore:");
      expect(log).toContain("task-1");
    });
  });

  describe("generateGitPrompt", () => {
    it("should generate basic git prompt", () => {
      const prompt = generateGitPrompt(testDir);
      expect(prompt).toContain("git branch");
      expect(prompt).toContain("develop");
    });

    it("should include monorepo note when provided", () => {
      const prompt = generateGitPrompt(testDir, "\nMONOREPO: Workspace root /path");
      expect(prompt).toContain("MONOREPO");
    });

    it("should include progress note when provided", () => {
      const prompt = generateGitPrompt(testDir, "", "\n\nCurrent Progress: 2/5 tasks");
      expect(prompt).toContain("Current Progress");
    });
  });

  describe("CommitType", () => {
    it("should support all conventional commit types", () => {
      const types: CommitType[] = ["feat", "fix", "refactor", "docs", "test", "chore", "style", "perf", "ci", "build"];
      expect(types).toHaveLength(10);
    });
  });
});
