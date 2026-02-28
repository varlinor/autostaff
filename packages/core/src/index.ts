/**
 * @varlinor/autostaff-core
 * 
 * Core framework for building autonomous automation bots.
 * Provides task management, workspace detection, phase detection,
 * and executor infrastructure.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   detectPhase, 
 *   getNextExecutableTask, 
 *   topologicalSort 
 * } from '@varlinor/autostaff-core';
 * ```
 */

// Types
export type {
  Task,
  TaskFile,
  ProjectType,
  Phase,
  ExecutorOptions,
  ExecutorResult,
  ITaskExecutor,
  IPhaseHandler,
  ITaskValidator,
  IWorkspaceDetector,
} from "./types";

// Core modules
export {
  stripJsoncComments,
  parseTasks,
  countPassingFeatures,
  getFeaturesByCategory,
  isFirstRun,
  getTaskId,
  topologicalSort,
  getExecutableTasks,
  getNextExecutableTask,
  readProgressNotes,
  writeProgressNotes,
  getAutostaffDir,
  getTaskPath,
  getProgressPath,
  initProgressFile,
  generateProgressUpdatePrompt,
  generateReadProgressPrompt,
} from "./progress";

export {
  detectProjectType,
  getEffectiveDir,
  getWorkspaceFromTask,
  findWorkspaceRoot,
} from "./workspace";

export {
  detectPhase,
  hasSpec,
  hasTasks,
  getSpecPath,
} from "./phase";
// Git operations
export {
  isGitInitialized,
  initGit,
  getCurrentBranch,
  ensureDevelopBranch,
  conventionalCommit,
  commitTaskCompletion,
  commitProgressUpdate,
  generateGitPrompt,
} from "./git";

export type {
  CommitType,
  CommitOptions,
} from "./git";


// Executor framework
export {
  DEFAULT_SESSION_TIMEOUT_MS,
  DEFAULT_DELAY_MS,
  isAllComplete,
  createProgressSummary,
} from "./executor";

export type {
  BotConfig,
  PhaseHandlers,
} from "./executor";

// UI functions
export {
  printSessionHeader,
  printProgressSummary,
} from "./progress-ui";

// OpenCode client
export {
  DEFAULT_MODEL,
  SESSION_TIMEOUT_MS,
  OpenCodeClient,
  createClient,
} from "./client";

export type {
  OpenCodeOptions,
  ClientResult,
} from "./client";
