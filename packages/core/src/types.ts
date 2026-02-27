/**
 * Core types for auto-bot framework
 */

export interface Task {
  id?: number | string;
  category: string;
  description: string;
  steps: string[];
  passes: boolean;
  type?: "package" | "app" | "writing" | "video" | "content";
  workspace?: string;
  dependsOn?: (number | string)[];
}

export interface TaskFile {
  tasks: Task[];
}

export interface ProjectType {
  isMonorepo: boolean;
  workspaceRoot?: string;
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
  workspaces?: string[];
}

export type Phase = "need-spec" | "need-tasks" | "execute";

export interface ExecutorOptions {
  projectDir: string;
  model?: string;
  agent?: string;
  ulw?: boolean;
  specFile?: string;
  description?: string;
  extend?: boolean;
  initOnly?: boolean;
  packageManager?: string;
  gitBranch?: string;
  verbose?: boolean;
  logFile?: string;
}

export interface ExecutorResult {
  status: "continue" | "error" | "complete";
  output: string;
}

export interface ITaskExecutor {
  /**
   * Run the autonomous agent for one iteration
   */
  run(message: string): Promise<ExecutorResult>;

  /**
   * Kill the running agent process
   */
  kill(): void;
}

export interface IPhaseHandler {
  /**
   * Detect current phase based on project state
   */
  detectPhase(dir: string): Phase;

  /**
   * Handle need-spec phase
   */
  handleNeedSpec(): Promise<void>;

  /**
   * Handle need-tasks phase  
   */
  handleNeedTasks(): Promise<void>;

  /**
   * Handle execute phase
   */
  handleExecute(): Promise<void>;
}

export interface ITaskValidator {
  /**
   * Validate task completion
   * @param task The task to validate
   * @param projectDir Project directory
   * @returns true if task passes validation
   */
  validate(task: Task, projectDir: string): Promise<boolean>;

  /**
   * Get validation steps for a task
   * @param taskType Type of task
   * @returns Array of validation step descriptions
   */
  getValidationSteps(taskType: string): string[];
}

export interface IWorkspaceDetector {
  /**
   and workspace structure * Detect project type
   */
  detectProjectType(projectDir: string): ProjectType;

  /**
   * Get effective directory for workspace
   */
  getEffectiveDir(projectDir: string, workspace?: string): string;

  /**
   * Find workspace root from a subdirectory
   */
  findWorkspaceRoot(startDir: string): string | null;
}
