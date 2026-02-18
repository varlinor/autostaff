#!/bin/bash
set -e

pnpm install

pnpm dev &

echo "Server running at http://localhost:3000"
