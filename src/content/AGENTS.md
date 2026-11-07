# Agent Guide — Content & Plug-and-Play Modules (`src/content/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Topology vs 3D Presentation Split**:
   - Files in `src/content/` (outside `src/content/scene/`) are **pure domain content**: they may import from `src/domain/` only and must NEVER import `three`, `src/interfaces/`, or `src/infrastructure/`.
   - Files in `src/content/scene/` define 3-Layer Encoded Visual Blueprints (`EpochVisualTheme`, `StageSceneBlueprint`, `CharacterVisualBlueprint`) for the renderer and may import from `src/interfaces/three/` and `src/domain/`.
2. **Deterministic & Immutable Content Only**: `Math.random()`, `Date.now()`, `performance.now()`, and `new Date()` are forbidden across all files in `src/content/` (enforced by ESLint and `layer_boundaries.test.ts`). Deeply freeze exported blueprint constants so runtime callers cannot mutate shared content definitions in place.
3. **Typed Plugin State**: When a behavior, crisis thread, role, or mechanic needs custom state on `WorldState`, declare a `StateSliceKey<T>` via `defineStateSlice<T>(id, defaultValue)` — never use untyped maps.

## Recipes for Adding / Swapping Modules

- **Add a Character or Rival Operative**: Create a domain blueprint in `src/content/characters/` or `src/content/rivals/` (specifying tier, `lineageId`, `inertiaPillars`, and `emergencyVice`), and add a matching `CharacterVisualBlueprint` in `src/content/scene/` keyed by `characterId` and `lineageId`.
- **Add a Role, Crisis Thread, or Orbital Ability**: Implement the corresponding domain contract in `src/content/roles/` or `src/content/mechanics/` returning `WorldEffect[]` and register it in the era pack — never add hardcoded switch statements to `src/domain/`.
- **Add an Indoor Room, Outdoor Area, or Off-Stage Region**: Add the logical `SpaceNodeBlueprint` to `src/content/worlds/`, and (for visible 3D stages) add a `StageSceneBlueprint` with deterministic wall/prop/light `semanticId`s and `CameraVolumeBlueprint`s in `src/content/scene/`.
