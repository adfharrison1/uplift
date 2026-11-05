# Agent Guide — Content & Plug-and-Play Modules (`src/content/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Topology vs 3D Presentation Split**:
   - Files in `src/content/` (outside `src/content/scene/`) are **pure domain content**: they may import from `src/domain/` only and must NEVER import `three`, `src/interfaces/`, or `src/infrastructure/`.
   - Files in `src/content/scene/` define 3D meshes, coordinates, camera angles, and chiaroscuro lighting for the renderer and may import from `src/interfaces/three/` and `src/domain/`.
2. **Deterministic Content Only**: `Math.random()`, `Date.now()`, `performance.now()`, and `new Date()` are forbidden across all files in `src/content/` (enforced by ESLint and `layer_boundaries.test.ts`). Use `context.rng` (`SeededRandom`).
3. **Typed Plugin State**: When a behavior, crisis thread, role, or mechanic needs custom state on `WorldState`, declare a `StateSliceKey<T>` via `defineStateSlice<T>(id, defaultValue)` — never use untyped maps.

## Recipes for Adding / Swapping Modules

- **Add a Character or Rival Operative**: Create a blueprint in `src/content/characters/` or `src/content/rivals/`, specify its tier, `lineageId`, `inertia` weight, and distinct voice/attitude profile, and register it in the era pack.
- **Add a Role, Crisis Thread, or Orbital Ability**: Implement the corresponding domain contract in `src/content/roles/` or `src/content/mechanics/` returning `WorldEffect[]` and register it in the era pack — never add hardcoded switch statements to `src/domain/`.
- **Add an Indoor Room, Outdoor Area, or Off-Stage Region**: Add the logical node to `src/content/worlds/`, and (for visible stages) add its 3rd-person tracking camera framing and 3D layout to `src/content/scene/`.
