/**
 * Abstract executor framework
 * 
 * This module provides the base infrastructure for building autonomous bots.
 * Concrete implementations (cli, text-bot, video-bot) provide specific executor logic.
 */

import type { 
  ExecutorOptions, 
  ExecutorResult, 
  ITaskExecutor,
  Phase,
  Task
} from "./types";
import { 
  getNextExecutableTask,
  getExecutableTasks,
  countPassingFeatures 
} from "./progress";
import { detectPhase } from "./phase";

export { 
  ExecutorOptions, 
  ExecutorResult, 
  ITaskExecutor,
  Phase,
  Task
};

export interface BotConfig extends ExecutorOptions {
  /**
   * Custom phase handlers
   */
  phaseHandlers?: PhaseHandlers;
  
  /**
   * Task validator
   */
  validator?: ITaskValidator;
  
  /**
   * Session timeout in ms
   */
  sessionTimeoutMs?: number;
}

export interface PhaseHandlers {
  onNeedSpec?: (config: BotConfig) => Promise<void>;
  onNeedTasks?: (config: BotConfig) => Promise<void>;
  onExecute?: (config: BotConfig, task: Task) => Promise<void>;
}

export interface ITaskValidator {
  validate(task: Task, projectDir: string): Promise<boolean>;
  getValidationSteps(taskType: string): string[];
}

/**
 * Default session timeout (10 minutes)
 */
export const DEFAULT_SESSION_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Delay between iterations
 */
export const DEFAULT_DELAY_MS = 3000;

/**
 * Helper to check if all tasks are complete
 */
export function isAllComplete(projectDir: string): boolean {
  const { passing, total } = countPassingFeatures(projectDir);
  return total > 0 && passing === total;
}

/**
 * Helper to create common progress summary
 */
export function createProgressSummary(projectDir: string): {
  passing: number;
  total: number;
  percentage: string;
  byCategory: Map<string, { passing: number; total: number }>;
} {
  const { passing, total } = countPassingFeatures(projectDir);
  const percentage = total > 0 ? ((passing / total) * 100).toFixed(1) : "0.0";
  
  return {
    passing,
    total,
    percentage,
    byCategory: new Map(),
  };
}

export * from "./types";
export * from "./progress";
export * from "./workspace";
export * from "./phase";
