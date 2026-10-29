## Context

See `proposal.md` for motivation. This is an intermediate quality-tooling change (`01a-eslint-prettier-and-hooks`) inserted between Change 01 (`01-clean-scaffold-and-verify`) and Change 02 (`02-modular-registries-and-kinematics`).

## Goals / Non-Goals

**Goals:**
- Keep `tsc --noEmit` running on native **TypeScript 7.0.2** while giving `typescript-eslint@8.72.1` the JS compiler API it requires via Microsoft's official side-by-side package alias (`@typescript/typescript6@6.0.2`).
- Add ESLint (`eslint.config.mjs` flat config + `typescript-eslint`) with sensible TypeScript defaults and strict zero-`any` rules.
- Add Prettier (`.prettierrc.json` + `.prettierignore`) and Cursor/VS Code workspace format-on-save settings (`.vscode/settings.json`).
- Add Husky (`husky@9.1.7`) + `lint-staged` (`17.6.0`) so every `git commit` runs Prettier and ESLint on staged files automatically.
- Integrate `npm run format:check` and `npm run lint` into `npm run verify`.

**Non-Goals:**
- Downgrading `tsc` away from TypeScript 7.0.2 or using `--legacy-peer-deps` hacks.

## Decisions

### 1. Why Husky + `lint-staged` for Pre-Commit Hooks?

- **Recommendation**: **Yes — use `husky` (`9.1.7`) + `lint-staged` (`17.6.0`)**.
- **Rationale**:
  - Husky v9 uses native Git `core.hooksPath` (`.husky/_`) wired automatically via `"prepare": "husky"` in `package.json` on `npm install` — zero manual setup steps for friends cloning the repo.
  - Pairing Husky with `lint-staged` means pre-commit hooks only format and lint the **staged files** in each atomic commit (`1–3 files`), completing in `<400ms` rather than re-linting the entire repository on every commit.
  - *Alternative considered*: Raw `.git/hooks/pre-commit` script or Python `pre-commit`. Rejected because `.git/hooks/` is not tracked by Git on `git clone`, and Python `pre-commit` introduces a secondary runtime dependency outside Node/npm.

### 2. Keeping TypeScript 7.0.2 (`tsc`) with `typescript-eslint@8.72.1` (Official Side-by-Side Setup)

- **Why plain `"typescript": "7.0.2"` fails with `typescript-eslint`**:
  - In TypeScript 7.0 (`7.0.2`, Project Corsa native Go compiler), the package's main JS entry point (`./lib/version.cjs`) only exports `version` and `versionMajorMinor` — it does not expose the legacy JavaScript compiler AST API (`ts.createSourceFile`, `ts.SyntaxKind`).
  - Consequently, `typescript-eslint@8.72.1` declares `peerDependencies: { typescript: '>=4.8.4 <6.1.0' }` and throws `Error: typescript-eslint does not support TS 7.0` at runtime if `import('typescript')` resolves to `7.0.2`.
- **Microsoft's Official Side-by-Side Solution (No Downgrade of `tsc`)**:
  - Microsoft publishes `@typescript/typescript6` (`6.0.2`, which wraps `typescript@6.0.3` and exposes its binary as `tsc6` so it never collides with `tsc`).
  - By configuring:
    ```json
    "devDependencies": {
      "@typescript/native": "npm:typescript@7.0.2",
      "typescript": "npm:@typescript/typescript6@6.0.2"
    }
    ```
    1. `npx tsc --version` runs **TypeScript 7.0.2** (keeping native Go typechecking speed for `npm run typecheck`).
    2. `import('typescript')` resolves to the **TypeScript 6.0.3 JS API**, satisfying `typescript-eslint@8.72.1` and `npm install` with zero `ERESOLVE` errors.

### 3. Pinned Versions Table (Verified 2026-10-29, Including Latest Security / CVE Fixes)

| Tool / Package | Pinned Version | Role & Security / CVE Notes |
|---|---|---|
| Node.js LTS | `24.22.2` (`.nvmrc`) | Runtime; includes Oct 21, 2026 security patches (`CVE-2026-111497`, `CVE-2026-105482`, `CVE-2026-105483`, `CVE-2026-106069`, `CVE-2026-106074`) |
| npm | `12.2.1` | Package manager |
| `@fission-ai/openspec` | `1.15.0` | Spec-Driven Development CLI |
| `@typescript/native` | `npm:typescript@7.0.2` | Native Go `tsc` compiler binary (`7.0.2`, `ES2025`) |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | Official TS 6.0.3 JS compiler API bridge required by `typescript-eslint` |
| `vite` | `8.3.5` | Local dev server and bundler |
| `vitest` | `5.0.5` | Fast unit, architecture, and headless simulation test runner |
| `@types/node` | `24.19.2` | Node.js type definitions |
| `eslint` | `10.13.0` | Pluggable JavaScript/TypeScript linter (Flat Config) |
| `@eslint/js` | `10.0.1` | Core ESLint recommended JavaScript rules |
| `typescript-eslint` | `8.72.1` | TypeScript parser and recommended/strict ESLint rules |
| `eslint-config-prettier` | `10.1.8` | Disables ESLint formatting rules that conflict with Prettier |
| `prettier` | `3.9.10` | Opinionated code formatter |
| `husky` | `9.1.7` | Git hooks manager (`prepare` script) |
| `lint-staged` | `17.6.0` | Runs Prettier and ESLint on staged git files during `.husky/pre-commit` |

### 4. Layer Placement & Section Documentation Updates

- Tooling configuration lives at the repository root (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.vscode/settings.json`, `.vscode/extensions.json`, `.husky/pre-commit`) and does not alter `src/domain/`, `src/application/`, `src/infrastructure/`, `src/content/`, or `src/interfaces/` layer boundaries.
- **Documentation & Agent files updated in this change**:
  - Root `README.md` and `AGENTS.md` (updated pinned dependency manifest, `npm run lint` / `npm run format` commands, and pre-commit hook notes).
  - `tests/README.md` and `tests/AGENTS.md` (updated verification pipeline description).
  - `openspec/config.yaml` (updated pinned versions table).

### 5. Local Dev Setup & Verification Commands

- `npm run format`: `prettier --write .`
- `npm run format:check`: `prettier --check .`
- `npm run lint`: `eslint src tests vitest.config.ts`
- `npm run lint:fix`: `eslint --fix src tests vitest.config.ts`
- `npm run verify`: `npm run format:check && npm run lint && npm run typecheck && npm run test:arch && npm run test:unit`

## Risks / Trade-offs

- **[Risk] Pre-commit hook slows down commits if it lints the whole repo** $\rightarrow$ **Mitigation**: Use `lint-staged` in `.husky/pre-commit` so only staged files are formatted and linted on commit (`<400ms`), while `npm run verify` checks the entire repo.
