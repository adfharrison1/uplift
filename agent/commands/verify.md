---
name: '/verify'
description: 'Run the post-task verification loop (Prettier format check, ESLint, TypeScript typecheck, architecture boundary linter, and unit tests)'
category: 'Development'
---

Run the standard post-task verification sequence for Uplift. Execute each step in order and report pass/fail for each. Do not skip failing steps silently.

**Steps**

Run from the project root (`/Users/alanharrison/Desktop/Code/uplift`):

```bash
npm run verify
```

(Which runs `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:arch`, and `npm run test:unit`.)

**Notes**

- Unit and architecture tests run in Node/Vitest in `<3s` without requiring WebGL or loading the 23MB ONNX model.
- Never weaken `tests/architecture/layer_boundaries.test.ts` or `eslint.config.mjs` to make a failing check pass.
- In `/opsx-apply`, run `/verify` before creating each task's atomic git commit.
