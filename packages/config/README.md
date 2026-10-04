# @spend-tracker/config

Shared TypeScript and ESLint configuration for every package in this workspace.

## TypeScript

Extend the strict base config from a package's `tsconfig.json`:

```json
{
  "extends": "@spend-tracker/config/tsconfig/base.json",
  "include": ["src"]
}
```

## ESLint

Create `eslint.config.js` in the package:

```js
import { base } from "@spend-tracker/config/eslint";

export default base({ tsconfigRootDir: import.meta.dirname });
```

The package must also list `eslint` and `typescript` as dev dependencies (use `catalog:` versions).
