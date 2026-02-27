import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": "/packages/cli/src",
      "@varlinor/auto-bot-core": "/packages/core/src/index.ts",
    },
  },
});
