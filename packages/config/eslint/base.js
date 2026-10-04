// @ts-check
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Base ESLint flat config shared by every package in the workspace.
 *
 * - TypeScript files get typescript-eslint's type-aware `strictTypeChecked`
 *   and `stylisticTypeChecked` rules. The TypeScript project service checks
 *   each file against its nearest tsconfig.
 * - Plain JavaScript files (tooling config that runs in Node.js) get Node
 *   globals and the same rules without type information.
 * - eslint-config-prettier comes last, so formatting is left to Prettier.
 *
 * @param {{ tsconfigRootDir: string }} options `tsconfigRootDir` is the
 *   directory of the calling package's `eslint.config.js`; pass
 *   `import.meta.dirname`.
 */
export function base({ tsconfigRootDir }) {
  return defineConfig(
    globalIgnores(["**/dist/", "**/coverage/", "**/.expo/", "**/.turbo/"]),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      linterOptions: { reportUnusedDisableDirectives: "error" },
      rules: {
        eqeqeq: ["error", "always"],
        // Use the app's logger, which strips personal and financial data.
        "no-console": ["error", { allow: ["warn", "error"] }],
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/switch-exhaustiveness-check": "error",
      },
    },
    {
      files: ["**/*.{js,mjs,cjs}"],
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: { globals: globals.node },
    },
    prettier,
  );
}
