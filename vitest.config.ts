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
      "@varlinor/autostaff-core": "/packages/core/src/index.ts",
    },
  },
});
