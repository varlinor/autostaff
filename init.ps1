$ErrorActionPreference = "Stop"

pnpm install

Start-Process -FilePath "pnpm" -ArgumentList "dev" -NoNewWindow

Write-Host "Server running at http://localhost:3000"
