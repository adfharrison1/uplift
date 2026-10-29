# Agent Guide — Application Layer (`src/application/`)

## Strict Guardrails (Enforced by `npm run test:arch`)

1. **Allowed Imports**: May import from `src/domain/` only.
2. **Forbidden Imports**: Must NEVER import from `src/infrastructure/`, `src/interfaces/`, `src/content/`, `three`, or `@huggingface/transformers`.
3. **Port-Driven Orchestration**: Communicate with AI workers, persistence, and 3D rendering exclusively through abstract port interfaces defined in `src/domain/` or `src/application/`.
4. **Pure Frame Building**: Keep camera culling, NPC interpolation math, and HUD state projection in pure TypeScript classes here so they can be tested in `tests/unit/` without a browser or WebGL context.
5. **Zero `any`**: Implicit and explicit `any` are forbidden.
