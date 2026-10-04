import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.generated.ts"],
      // Domain logic handles money: test it almost exhaustively (TEST1).
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
