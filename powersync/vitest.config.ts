import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // These tests talk to the local stack, and replication takes a moment.
    testTimeout: 60_000,
  },
});
