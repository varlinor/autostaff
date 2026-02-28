/**
 * Phase detection - determines current workflow phase
 */

import fs from "node:fs";
import path from "node:path";
import type { Phase } from "./types";
import { getTaskPath } from "./progress";

const SPEC_DIR = "docs";
const SPEC_FILE = "app_spec.md";

/**
 * Detect current phase based on project state
 * 
 * Phase flow:
 * - need-spec: No app_spec.md exists
 * - need-tasks: app_spec.md exists but no task.json
 * - execute: task.json exists
 */
export function detectPhase(dir: string): Phase {
  const hasSpec = 
    fs.existsSync(path.join(dir, SPEC_DIR, SPEC_FILE)) || 
    fs.existsSync(path.join(dir, "app_spec.txt"));
  const hasTasks = fs.existsSync(getTaskPath(dir));

  if (!hasSpec && hasTasks) return "execute";
  if (!hasSpec) return "need-spec";
  if (!hasTasks) return "need-tasks";
  return "execute";
}

/**
 * Check if app_spec.md exists
 */
export function hasSpec(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, SPEC_DIR, SPEC_FILE)) ||
    fs.existsSync(path.join(dir, "app_spec.txt"))
  );
}

/**
 * Check if task.json exists
 */
export function hasTasks(dir: string): boolean {
  return fs.existsSync(getTaskPath(dir));
}

/**
 * Get spec file path
 */
export function getSpecPath(dir: string): string {
  const standardPath = path.join(dir, SPEC_DIR, SPEC_FILE);
  const altPath = path.join(dir, "app_spec.txt");
  
  if (fs.existsSync(standardPath)) {
    return standardPath;
  }
  return altPath;
}
