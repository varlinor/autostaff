/**
 * CLI-specific UI functions for progress display
 * These are kept in CLI as they're presentation-layer concerns
 */

import chalk from "chalk";
import { countPassingFeatures, getFeaturesByCategory } from "@varlinor/autostaff-core";

/**
 * Print session header with styling
 */
export function printSessionHeader(sessionNum: number, isInitializer: boolean): void {
  const sessionType = isInitializer ? "INITIALIZER" : "CODING AGENT";
  const color = isInitializer ? chalk.yellow : chalk.cyan;

  console.log();
  console.log(color("═".repeat(70)));
  console.log(color(`  SESSION ${sessionNum}: ${sessionType}`));
  console.log(color("═".repeat(70)));
  console.log();
}

/**
 * Create progress bar
 */
function createProgressBar(current: number, total: number, width: number): string {
  const ratio = total > 0 ? current / total : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  const filledBar = chalk.green("█".repeat(filled));
  const emptyBar = chalk.dim("░".repeat(empty));

  return `[${filledBar}${emptyBar}]`;
}

/**
 * Print progress summary to console
 */
export function printProgressSummary(projectDir: string): void {
  const { passing, total } = countPassingFeatures(projectDir);

  if (total > 0) {
    const percentage = ((passing / total) * 100).toFixed(1);
    const bar = createProgressBar(passing, total, 40);
    console.log();
    console.log(chalk.bold(`  Progress: ${passing}/${total} tasks passing (${percentage}%)`));
    console.log(`  ${bar}`);

    const categories = getFeaturesByCategory(projectDir);
    if (categories.size > 0) {
      console.log();
      for (const [cat, stats] of categories) {
        const catPct = stats.total > 0 ? ((stats.passing / stats.total) * 100).toFixed(0) : "0";
        console.log(chalk.dim(`    ${cat}: ${stats.passing}/${stats.total} (${catPct}%)`));
      }
    }
  } else {
    console.log(chalk.dim("\n  Progress: task.json not yet created"));
  }
}
