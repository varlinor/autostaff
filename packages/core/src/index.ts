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
} from "./types.js";

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
} from "./progress.js";

export {
  detectProjectType,
  getEffectiveDir,
  getWorkspaceFromTask,
  findWorkspaceRoot,
} from "./workspace.js";

export {
  detectPhase,
  hasSpec,
  hasTasks,
  getSpecPath,
} from "./phase.js";
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
} from "./git.js";

export type {
  CommitType,
  CommitOptions,
} from "./git.js";


// Executor framework
export {
  DEFAULT_SESSION_TIMEOUT_MS,
  DEFAULT_DELAY_MS,
  isAllComplete,
  createProgressSummary,
} from "./executor.js";

export type {
  BotConfig,
  PhaseHandlers,
} from "./executor.js";
