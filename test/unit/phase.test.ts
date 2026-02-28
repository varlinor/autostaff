import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  detectPhase,
  hasSpec,
  hasTasks,
  getSpecPath,
  getTaskPath,
  type Phase,
} from "@varlinor/autostaff-core";

describe("phase.ts", () => {
  const testDir = path.join(process.cwd(), "test", "temp-phase");
  const autostaffDir = path.join(testDir, ".autostaff");

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(autostaffDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("detectPhase", () => {
    it("should return 'need-spec' when no spec file exists", () => {
      const phase = detectPhase(testDir);
      expect(phase).toBe("need-spec");
    });

    it("should return 'need-tasks' when spec exists but no task.json", () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "docs", "app_spec.md"), "# App Spec");
      
      const phase = detectPhase(testDir);
      expect(phase).toBe("need-tasks");
    });

    it("should return 'execute' when task.json exists (even without spec)", () => {
      fs.writeFileSync(path.join(autostaffDir, "task.json"), JSON.stringify({ tasks: [] }));
      
      const phase = detectPhase(testDir);
      expect(phase).toBe("execute");
    });

    it("should return 'execute' when both spec and task.json exist", () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "docs", "app_spec.md"), "# App Spec");
      fs.writeFileSync(path.join(autostaffDir, "task.json"), JSON.stringify({ tasks: [] }));
      
      const phase = detectPhase(testDir);
      expect(phase).toBe("execute");
    });

    it("should detect spec in docs/app_spec.md", () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "docs", "app_spec.md"), "# App Spec");
      
      const phase = detectPhase(testDir);
      expect(phase).toBe("need-tasks");
    });

    it("should detect spec in root app_spec.txt", () => {
      fs.writeFileSync(path.join(testDir, "app_spec.txt"), "# App Spec");
      
      const phase = detectPhase(testDir);
      expect(phase).toBe("need-tasks");
    });
  });

  describe("hasSpec", () => {
    it("should return false when no spec exists", () => {
      expect(hasSpec(testDir)).toBe(false);
    });

    it("should return true when docs/app_spec.md exists", () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "docs", "app_spec.md"), "# App Spec");
      
      expect(hasSpec(testDir)).toBe(true);
    });

    it("should return true when app_spec.txt exists", () => {
      fs.writeFileSync(path.join(testDir, "app_spec.txt"), "# App Spec");
      
      expect(hasSpec(testDir)).toBe(true);
    });
  });

  describe("hasTasks", () => {
    it("should return false when task.json does not exist", () => {
      expect(hasTasks(testDir)).toBe(false);
    });

    it("should return true when task.json exists", () => {
      fs.writeFileSync(path.join(autostaffDir, "task.json"), JSON.stringify({ tasks: [] }));
      
      expect(hasTasks(testDir)).toBe(true);
    });
  });

  describe("getSpecPath", () => {
    it("should return docs/app_spec.md path", () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "docs", "app_spec.md"), "# App Spec");
      
      const specPath = getSpecPath(testDir);
      expect(specPath).toBe(path.join(testDir, "docs", "app_spec.md"));
    });

    it("should return app_spec.txt when docs version doesn't exist", () => {
      fs.writeFileSync(path.join(testDir, "app_spec.txt"), "# App Spec");
      
      const specPath = getSpecPath(testDir);
      expect(specPath).toBe(path.join(testDir, "app_spec.txt"));
    });

    it("should prefer docs/app_spec.md over app_spec.txt", () => {
      fs.mkdirSync(path.join(testDir, "docs"), { recursive: true });
      fs.writeFileSync(path.join(testDir, "docs", "app_spec.md"), "# App Spec");
      fs.writeFileSync(path.join(testDir, "app_spec.txt"), "# App Spec Alt");
      
      const specPath = getSpecPath(testDir);
      expect(specPath).toBe(path.join(testDir, "docs", "app_spec.md"));
    });
  });

  describe("getTaskPath", () => {
    it("should return task.json path in .autostaff", () => {
      const taskPath = getTaskPath(testDir);
      expect(taskPath).toBe(path.join(autostaffDir, "task.json"));
    });
  });

  describe("Phase type", () => {
    it("should allow valid phase values", () => {
      const phases: Phase[] = ["need-spec", "need-tasks", "execute"];
      expect(phases).toHaveLength(3);
    });
  });
});
