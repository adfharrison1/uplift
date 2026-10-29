## Why

Adding standard TypeScript ESLint rules (`eslint` + `typescript-eslint`), Prettier formatting (`.prettierrc.json` + IDE format-on-save in `.vscode/settings.json`), and automated pre-commit hooks (`husky` + `lint-staged`) before Change 02 ensures consistent formatting and AST-level lint checks on every file save and every git commit across all remaining changes.

## What Changes

- Configure **ESLint** (`eslint.config.mjs` flat config with `@eslint/js`, `typescript-eslint` strict/recommended rules, and `eslint-config-prettier`) enforcing `@typescript-eslint/no-explicit-any`, `@typescript-eslint/consistent-type-imports`, and clean TypeScript practices across `src/` and `tests/`.
- Use Microsoft's official **TypeScript 7.0.2 + `@typescript/typescript6` side-by-side setup** (`"@typescript/native": "npm:typescript@7.0.2"` + `"typescript": "npm:@typescript/typescript6@6.0.2"`) so `tsc --noEmit` continues running the native **TypeScript 7.0.2** compiler while `typescript-eslint@8.72.1` receives the programmatic JavaScript AST API (`6.0.3`) it requires.
- Configure **Prettier** (`.prettierrc.json` and `.prettierignore`) with sensible TypeScript defaults and add workspace editor configuration (`.vscode/settings.json` and `.vscode/extensions.json`) so Prettier runs automatically on save in Cursor / VS Code.
- Configure **Husky** (`husky@9.1.7`) and **lint-staged** (`lint-staged@17.6.0`) with a `.husky/pre-commit` hook that runs Prettier and ESLint on staged files before every commit.
- Expand `npm run verify` to run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:arch`, and `npm run test:unit`.

### Non-goals

- No new domain simulation logic, registries, or 3D rendering features (those remain in Change 02: `02-modular-registries-and-kinematics`).
- Runtime and tests continue to require **zero external API keys, zero paid tokens, and zero cloud inference**.
- Does not alter the plug-and-play module registry design; ESLint complements our existing Clean Architecture boundary tests.

### Dependencies on Prior Changes

- Depends on `01-clean-scaffold-and-verify` (archived).

## Capabilities

### New Capabilities

<!-- None: extends existing clean-architecture-and-quality-gate capability -->

### Modified Capabilities

- `clean-architecture-and-quality-gate`: Add requirements for ESLint static analysis, Prettier formatting (including editor format-on-save), Husky + `lint-staged` pre-commit hooks, and inclusion of `lint` + `format:check` in `npm run verify`.

## Impact

- Updates `package.json`, `openspec/config.yaml`, `README.md`, `AGENTS.md`, `tests/README.md`, and `tests/AGENTS.md`.
- Adds `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.vscode/settings.json`, `.vscode/extensions.json`, and `.husky/pre-commit`.
