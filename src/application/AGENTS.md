# Agent Guide — Application Layer (`src/application/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Allowed Imports**: May import from `src/domain/` only.
2. **Forbidden Imports**: Must NEVER import from `src/infrastructure/`, `src/interfaces/`, `src/content/`, `three`, or `@huggingface/transformers`.
3. **Port-Driven Orchestration & Telemetry**: Communicate with AI workers, session logging/compaction, save/load persistence, and 3D rendering exclusively through abstract port interfaces defined in `src/domain/` or `src/application/`. Ensure every player, NPC, rival, and system action emits structured session telemetry events.
4. **Pure Frame Building**: Keep 3rd-person tracking camera bounds, de-anchored debug camera state, NPC interpolation math, and floating debug inspector card projections in pure TypeScript classes here so they can be tested in `tests/unit/` without a browser or WebGL context.
5. **Zero `any`**: Implicit and explicit `any` are forbidden.
