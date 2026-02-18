#!/usr/bin/env node

/**
 * MCP Server for auto-code-bot
 * 
 * Provides tools and resources for interacting with auto-code-bot projects
 * via the Model Context Protocol (MCP).
 * 
 * Usage:
 *   npx tsx src/index.ts           # Development
 *   node dist/index.js             # Production
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SERVER_NAME = "auto-code-bot";
const SERVER_VERSION = "0.1.0";

/**
 * Create and configure the MCP server
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Tool: ping - Simple health check tool
  server.tool(
    "ping",
    { message: z.string().optional() },
    async ({ message }) => {
      const response = message || "pong";
      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }
  );

  // Tool: echo - Echo back the input (for testing)
  server.tool(
    "echo",
    { text: z.string() },
    async ({ text }) => {
      return {
        content: [
          {
            type: "text",
            text: `Echo: ${text}`,
          },
        ],
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
