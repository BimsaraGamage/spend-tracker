// @ts-check
import { base } from "@spend-tracker/config/eslint";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig(
  base({ tsconfigRootDir: import.meta.dirname }),
  // The rules of hooks, and what the React Compiler needs to optimize code.
  reactHooks.configs.flat.recommended,
);
