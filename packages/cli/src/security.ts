/**
 * Security Module
 * ===============
 * Command allowlist validation for bash commands.
 * Adapted for cross-platform (Windows + Unix) environments.
 */

/** Allowed commands for development tasks */
export const ALLOWED_COMMANDS = new Set([
  // File inspection
  "ls", "dir", "cat", "type", "head", "tail", "wc", "grep", "find", "tree",
  // File operations
  "cp", "copy", "mkdir", "chmod", "mv", "move", "rm", "del", "touch",
  // Directory
  "pwd", "cd",
  // Node.js development
  "npm", "npx", "node", "pnpm", "yarn", "bun",
  // Go development
  "go",
  // Version control
  "git",
  // Process management
  "ps", "lsof", "sleep", "pkill", "kill", "tasklist", "taskkill",
  // Script execution
  "bash", "sh", "cmd", "powershell",
  // Network (for dev server testing)
  "curl", "wget",
  // Common dev tools
  "echo", "cat", "tee", "sort", "uniq", "sed", "awk", "xargs",
]);

/** Commands that need extra validation even when allowed */
const COMMANDS_NEEDING_EXTRA_VALIDATION = new Set(["pkill", "kill", "taskkill", "rm", "del"]);

/** Allowed process names for pkill/kill */
const ALLOWED_KILL_TARGETS = new Set([
  "node", "npm", "npx", "pnpm", "vite", "next", "nuxt", "go",
]);

/**
 * Extract command names from a shell command string.
 * Handles pipes, chains (&&, ||, ;), and basic subshells.
 */
export function extractCommands(commandString: string): string[] {
  const commands: string[] = [];

  // Split on shell operators: &&, ||, ;, |
  const segments = commandString.split(/\s*(?:&&|\|\||;)\s*/);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // Handle pipes - take each command in the pipeline
    const pipeSegments = trimmed.split(/\s*\|\s*/);

    for (const pipeSeg of pipeSegments) {
      const parts = pipeSeg.trim().split(/\s+/);
      if (parts.length === 0) continue;

      let cmd = parts[0];

      // Skip env variable assignments (VAR=value command)
      while (cmd.includes("=") && !cmd.startsWith("=")) {
        parts.shift();
        cmd = parts[0] || "";
      }

      if (!cmd) continue;

      // Strip path prefix (e.g., /usr/bin/node -> node, ./init.sh -> init.sh)
      const basename = cmd.replace(/^.*[/\\]/, "");

      // Strip .exe, .cmd, .bat extensions on Windows
      const cleanCmd = basename.replace(/\.(exe|cmd|bat|ps1)$/i, "");

      if (cleanCmd) {
        commands.push(cleanCmd);
      }
    }
  }

  return commands;
}

/**
 * Validate a pkill/kill/taskkill command - only allow killing dev-related processes.
 */
function validateKillCommand(commandString: string): { allowed: boolean; reason: string } {
  const parts = commandString.trim().split(/\s+/);
  const args = parts.filter((p) => !p.startsWith("-") && p !== parts[0]);

  if (args.length === 0) {
    return { allowed: false, reason: "kill command requires a target" };
  }

  const target = args[args.length - 1];
  // Extract process name from full command line
  const processName = target.split(/\s+/)[0].replace(/^.*[/\\]/, "");

  if (ALLOWED_KILL_TARGETS.has(processName)) {
    return { allowed: true, reason: "" };
  }

  return {
    allowed: false,
    reason: `Kill only allowed for dev processes: ${[...ALLOWED_KILL_TARGETS].join(", ")}`,
  };
}

/**
 * Validate a rm/del command - prevent accidental deletion of critical files.
 */
function validateDeleteCommand(commandString: string): { allowed: boolean; reason: string } {
  const dangerous = ["/", "\\", "C:\\", "~", "$HOME", "%USERPROFILE%"];
  for (const pattern of dangerous) {
    if (commandString.includes(` ${pattern}`) || commandString.includes(`"${pattern}`)) {
      return { allowed: false, reason: `Dangerous delete target: ${pattern}` };
    }
  }

  // Block recursive force delete at project root
  if (/rm\s+-rf?\s+\.\s*$/.test(commandString) || /rm\s+-rf?\s+\.\/$/.test(commandString)) {
    return { allowed: false, reason: "Cannot delete project root" };
  }

  return { allowed: true, reason: "" };
}

/**
 * Validate a bash command against the allowlist.
 * Returns null if allowed, or an error message if blocked.
 */
export function validateCommand(commandString: string): string | null {
  if (!commandString.trim()) {
    return null; // Empty commands are fine
  }

  const commands = extractCommands(commandString);

  if (commands.length === 0) {
    return `Could not parse command for validation: ${commandString}`;
  }

  for (const cmd of commands) {
    if (!ALLOWED_COMMANDS.has(cmd)) {
      return `Command '${cmd}' is not in the allowed commands list. Allowed: ${[...ALLOWED_COMMANDS].sort().join(", ")}`;
    }

    if (COMMANDS_NEEDING_EXTRA_VALIDATION.has(cmd)) {
      if (cmd === "pkill" || cmd === "kill" || cmd === "taskkill") {
        const result = validateKillCommand(commandString);
        if (!result.allowed) return result.reason;
      }

      if (cmd === "rm" || cmd === "del") {
        const result = validateDeleteCommand(commandString);
        if (!result.allowed) return result.reason;
      }
    }
  }

  return null; // All commands allowed
}
