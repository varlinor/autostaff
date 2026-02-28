#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp;
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio;
import { z } from "zod";
import { getProjectStatus, readTaskJson, readProgressNotes, readAppSpec, runOneTask, getNextExecutableTask, runFullLoop } from "./lib/project";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));

const SERVER_NAME = "auto-staff";
const SERVER_VERSION = packageJson.version;

function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.tool(
    "auto_dev_status",
    { 
      project_dir: z.string().describe("Project directory path (absolute or relative)") 
    },
    async ({ project_dir }) => {
      try {
        const status = getProjectStatus(project_dir);
        
        let categorySummary = "";
        for (const [cat, stats] of Object.entries(status.categories)) {
          const pct = stats.total > 0 ? ((stats.passing / stats.total) * 100).toFixed(0) : "0";
          categorySummary += `\n  - ${cat}: ${stats.passing}/${stats.total} (${pct}%)`;
        }
        
        let progressText = "";
        if (status.progressSummary) {
          const lines = status.progressSummary.split("\n").slice(0, 10);
          progressText = "\n\nRecent progress:\n" + lines.join("\n");
        }
        
        const response = `Project Status for: ${project_dir}

Phase: ${status.phase}
Progress: ${status.passing}/${status.total} tasks passing${categorySummary}${progressText}

Phase explanation:
- need-spec: Project needs app_spec.md
- need-tasks: Project has app_spec.md but needs task.json
- execute: Project has task.json, ready to execute tasks`;
        
        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting project status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "auto_dev_run_one_task",
    {
      project_dir: z.string().describe("Project directory path (absolute or relative)"),
      model: z.string().optional().describe("Model to use (e.g., 'minimax(Custom)/MiniMax-M2.5')"),
      ulw: z.boolean().optional().describe("Enable ultrawork mode for high precision"),
      max_iterations: z.number().optional().describe("Maximum iterations (default: 1 for single task)")
    },
    async ({ project_dir, model, ulw, max_iterations }) => {
      try {
        const result = runOneTask(project_dir, {
          model,
          ulw,
          maxIterations: max_iterations
        });

        return {
          content: [
            {
              type: "text",
              text: result.message,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error running task: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "auto_dev_start",
    {
      project_dir: z.string().describe("Project directory path (absolute or relative)"),
      model: z.string().optional().describe("Model to use (e.g., 'minimax(Custom)/MiniMax-M2.5')"),
      ulw: z.boolean().optional().describe("Enable ultrawork mode for high precision"),
      max_iterations: z.number().optional().describe("Maximum iterations (default: unlimited)"),
      extend: z.boolean().optional().describe("Enable extend mode to add new features after completion"),
      agent: z.string().optional().describe("Agent name to use")
    },
    async ({ project_dir, model, ulw, max_iterations, extend, agent }) => {
      try {
        const result = runFullLoop(project_dir, {
          model,
          ulw,
          maxIterations: max_iterations,
          extend,
          agent
        });

        return {
          content: [
            {
              type: "text",
              text: result.message,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error starting automation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.resource(
    "task-json",
    "project://{project_dir}/task.json",
    async (uri) => {
      const project_dir = uri.searchParams.get("project_dir") || ".";
      const content = readTaskJson(project_dir);
      
      if (!content) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: "Task file not found"
          }]
        };
      }
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: content
        }]
      };
    }
  );

  server.resource(
    "progress-txt",
    "project://{project_dir}/progress.txt",
    async (uri) => {
      const project_dir = uri.searchParams.get("project_dir") || ".";
      const content = readProgressNotes(project_dir);
      
      if (!content) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "text/plain",
            text: "Progress file not found"
          }]
        };
      }
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: content
        }]
      };
    }
  );

  server.resource(
    "app-spec",
    "project://{project_dir}/app_spec.md",
    async (uri) => {
      const project_dir = uri.searchParams.get("project_dir") || ".";
      const content = readAppSpec(project_dir);
      
      if (!content) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: "text/markdown",
            text: "App spec file not found"
          }]
        };
      }
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: content
        }]
      };
    }
  );

  return server;
}

/**
 * Main entry point
 */
async function main() {
  console.error(`[${SERVER_NAME}] Starting MCP server v${SERVER_VERSION}...`);
  
  const server = createServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  console.error(`[${SERVER_NAME}] MCP server ready and listening on stdio`);
}

// Handle process termination gracefully
process.on("SIGINT", async () => {
  console.error(`[${SERVER_NAME}] Received SIGINT, shutting down...`);
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.error(`[${SERVER_NAME}] Received SIGTERM, shutting down...`);
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error(`[${SERVER_NAME}] Fatal error:`, error);
  process.exit(1);
});
