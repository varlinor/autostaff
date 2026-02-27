import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { topologicalSort, getExecutableTasks, getNextExecutableTask, type Task } from "@varlinor/auto-bot-core";

describe("progress.ts", () => {
  const testDir = path.join(process.cwd(), "test", "temp-progress");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  describe("topologicalSort", () => {
    it("should sort tasks with dependencies", () => {
      const tasks: Task[] = [
        { id: 3, category: "test", description: "Task 3", steps: [], passes: false, dependsOn: [2] },
        { id: 1, category: "test", description: "Task 1", steps: [], passes: false, dependsOn: [] },
        { id: 2, category: "test", description: "Task 2", steps: [], passes: false, dependsOn: [1] },
      ];

      const sorted = topologicalSort(tasks);

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it("should handle tasks with no dependencies", () => {
      const tasks: Task[] = [
        { id: 2, category: "test", description: "Task 2", steps: [], passes: false },
        { id: 1, category: "test", description: "Task 1", steps: [], passes: false },
      ];

      const sorted = topologicalSort(tasks);

      expect(sorted).toHaveLength(2);
    });

    it("should return original order on circular dependency", () => {
      const tasks: Task[] = [
        { id: 1, category: "test", description: "Task 1", steps: [], passes: false, dependsOn: [2] },
        { id: 2, category: "test", description: "Task 2", steps: [], passes: false, dependsOn: [1] },
      ];

      const sorted = topologicalSort(tasks);

      expect(sorted).toHaveLength(2);
    });

    it("should handle multi-workspace tasks", () => {
      const tasks: Task[] = [
        { id: 3, type: "app", workspace: "apps/web", category: "test", description: "Web app", steps: [], passes: false, dependsOn: [1, 2] },
        { id: 1, type: "package", workspace: "packages/ui", category: "test", description: "UI package", steps: [], passes: false, dependsOn: [] },
        { id: 2, type: "package", workspace: "packages/utils", category: "test", description: "Utils package", steps: [], passes: false, dependsOn: [] },
      ];

      const sorted = topologicalSort(tasks);

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });
  });

  describe("getExecutableTasks", () => {
    it("should return all tasks with no dependencies as executable", () => {
      const taskFile = path.join(testDir, "task.json");
      fs.writeFileSync(taskFile, JSON.stringify({
        tasks: [
          { id: 1, category: "test", description: "Task 1", steps: [], passes: false },
          { id: 2, category: "test", description: "Task 2", steps: [], passes: false },
        ]
      }));

      const executable = getExecutableTasks(testDir);

      expect(executable).toHaveLength(2);
    });

    it("should only return tasks with satisfied dependencies", () => {
      const taskFile = path.join(testDir, "task.json");
      fs.writeFileSync(taskFile, JSON.stringify({
        tasks: [
          { id: 1, category: "test", description: "Task 1", steps: [], passes: true },
          { id: 2, category: "test", description: "Task 2", steps: [], passes: false, dependsOn: [1] },
          { id: 3, category: "test", description: "Task 3", steps: [], passes: false, dependsOn: [2] },
        ]
      }));

      const executable = getExecutableTasks(testDir);

      expect(executable).toHaveLength(1);
      expect(executable[0].id).toBe(2);
    });

    it("should return empty array when all tasks pass", () => {
      const taskFile = path.join(testDir, "task.json");
      fs.writeFileSync(taskFile, JSON.stringify({
        tasks: [
          { id: 1, category: "test", description: "Task 1", steps: [], passes: true },
        ]
      }));

      const executable = getExecutableTasks(testDir);

      expect(executable).toHaveLength(0);
    });
  });

  describe("getNextExecutableTask", () => {
    it("should return the first executable task", () => {
      const taskFile = path.join(testDir, "task.json");
      fs.writeFileSync(taskFile, JSON.stringify({
        tasks: [
          { id: 1, category: "test", description: "Task 1", steps: [], passes: false },
          { id: 2, category: "test", description: "Task 2", steps: [], passes: false },
        ]
      }));

      const next = getNextExecutableTask(testDir);

      expect(next).not.toBeNull();
      expect(next?.id).toBe(1);
    });

    it("should return null when no executable tasks", () => {
      const taskFile = path.join(testDir, "task.json");
      fs.writeFileSync(taskFile, JSON.stringify({
        tasks: [
          { id: 1, category: "test", description: "Task 1", steps: [], passes: true },
        ]
      }));

      const next = getNextExecutableTask(testDir);

      expect(next).toBeNull();
    });
  });
});
