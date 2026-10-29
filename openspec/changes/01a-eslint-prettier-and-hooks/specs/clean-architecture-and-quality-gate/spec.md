## ADDED Requirements

### Requirement: ESLint static analysis and Prettier formatting with IDE format-on-save
The project SHALL enforce standard TypeScript ESLint rules (`eslint` + `typescript-eslint` + `eslint-config-prettier`) and Prettier code formatting across all project files, and SHALL include workspace editor configuration enabling Prettier formatting on save.

#### Scenario: ESLint check passes on valid TypeScript code and rejects lint violations
- **WHEN** `npm run lint` executes
- **THEN** ESLint SHALL validate all `.ts` files under `src/` and `tests/` with `@typescript-eslint/no-explicit-any` and standard TypeScript rules enabled and exit with code 0

#### Scenario: Prettier check verifies repository formatting
- **WHEN** `npm run format:check` executes
- **THEN** Prettier SHALL verify formatting across all repository `.ts`, `.json`, and `.md` files and exit with code 0

#### Scenario: Workspace editor format-on-save configuration
- **WHEN** a developer opens the repository in Cursor or VS Code and saves a file
- **THEN** `.vscode/settings.json` SHALL configure `editor.formatOnSave: true` and `esbenp.prettier-vscode` as the default formatter

### Requirement: Husky and lint-staged pre-commit quality hooks
The project SHALL configure Husky (`husky`) and `lint-staged` so that every `git commit` automatically formats and lints staged files before the commit is recorded.

#### Scenario: Pre-commit hook runs lint-staged on staged files
- **WHEN** a developer or agent runs `git commit`
- **THEN** `.husky/pre-commit` SHALL invoke `npx lint-staged`, running Prettier and ESLint on staged files and aborting the commit if any lint or formatting error remains

## MODIFIED Requirements

### Requirement: Single-command verification loop
The project SHALL provide an `npm run verify` script that executes formatting checks, ESLint static analysis, typechecking, architectural/static boundary checks, and unit tests in under 5 seconds without requiring network access, API keys, or WebGL.

#### Scenario: Post-task verification pass
- **WHEN** a developer or agent runs `npm run verify` on a valid codebase state
- **THEN** `format:check`, `lint`, `typecheck`, `test:arch`, and `test:unit` SHALL all execute in sequence and exit with code 0
