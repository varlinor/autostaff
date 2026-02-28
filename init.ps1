# Auto-code-bot Toolkit - Development Setup
$ErrorActionPreference = "Stop"

# Install dependencies
pnpm install

# Build all packages first
pnpm build

# Start CLI development server (or use pnpm dev:mcp for MCP)
Write-Host "Starting development server..."
Start-Process -FilePath "pnpm" -ArgumentList "dev:cli" -NoNewWindow

Write-Host "Server running. Use 'pnpm dev:mcp' for MCP development."
