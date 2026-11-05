## 1. Prettier & Editor Format-on-Save

- [x] 1.1 Install `prettier@3.9.10`, create `.prettierrc.json` and `.prettierignore`, add `.vscode/settings.json` + `.vscode/extensions.json` for format-on-save, add `format` and `format:check` scripts to `package.json`, and format existing repository files | Verify: `npm run format:check && npm run typecheck` | Commit: `build(format): configure prettier and editor format-on-save`

## 2. ESLint with TypeScript 7.0.2 + `@typescript/typescript6` Side-by-Side

- [x] 2.1 Install `eslint@10.13.0`, `@eslint/js@10.0.1`, `typescript-eslint@8.72.1`, `eslint-config-prettier@10.1.8`, and Microsoft's side-by-side `@typescript/native` (`npm:typescript@7.0.2`) + `typescript` (`npm:@typescript/typescript6@6.0.2`), create `eslint.config.mjs`, and wire `lint` into `npm run verify` | Verify: `npx tsc --version && npm run lint && npm run verify` | Commit: `build(lint): add eslint flat config with typescript 7 side-by-side setup`

## 3. Husky & lint-staged Pre-Commit Hooks

- [x] 3.1 Install `husky@9.1.7` and `lint-staged@17.6.0`, configure `lint-staged` in `package.json`, and create `.husky/pre-commit` running `npx lint-staged` on staged files | Verify: `npx lint-staged && npm run verify` | Commit: `build(hooks): add husky pre-commit hook with lint-staged`

## 4. Documentation, Verification & 5-Subagent Review

- [x] 4.1 Update `openspec/config.yaml`, root `README.md` and `AGENTS.md`, and `tests/README.md` + `tests/AGENTS.md` to document ESLint, Prettier, Husky hooks, and the TS 7 side-by-side setup | Verify: `npm run verify && npm audit` | Commit: `docs(devex): document eslint prettier and husky pre-commit workflow`
- [ ] 4.2 Run the post-change 5-subagent review (adversarial, code adherence, performance, testing, logic), double-check findings, and apply any verified improvements | Verify: `npm run verify` | Commit: `fix(review): address change 01a five-subagent review findings`
