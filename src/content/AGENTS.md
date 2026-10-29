# Agent Guide — Content & Plug-and-Play Modules (`src/content/`)

## Strict Guardrails (Enforced by `npm run test:arch`)

1. **Topology vs 3D Presentation Split**:
   - Files in `src/content/` (outside `src/content/scene/`) are **pure domain content**: they may import from `src/domain/` only and must NEVER import `three`, `src/interfaces/`, or `src/infrastructure/`.
   - Files in `src/content/scene/` define 3D meshes, coordinates, and lighting for the renderer and may import from `src/interfaces/three/` and `src/domain/`.
2. **Deterministic Content Only**: `Math.random()` and `Date.now()` are forbidden across all files in `src/content/`. Use `context.rng` (`SeededRandom`).
3. **Typed Plugin State**: When a behavior or mechanic needs custom state on `WorldState`, declare a `StateSliceKey<T>` via `defineStateSlice<T>(id, defaultValue)` — never use untyped maps.

## Recipes for Adding / Swapping Modules

- **Add a Character**: Create a `CharacterBlueprint` in `src/content/characters/`, specify its tier (`utility_schemer`, `role_routine`, or `ambient_crowd`) and `lineageId`, and register it in the era pack.
- **Add a Behavior**: Implement `BehaviorModule` in `src/content/behaviors/` returning `WorldEffect[]` and register it in the era pack — never add switch statements to `src/domain/`.
- **Add a Room or Outdoor Space**: Add the logical `SpaceNode` (`indoor_room` or `outdoor_area`) and waypoints to `src/content/worlds/`, and add its corresponding visual layout to `src/content/scene/`.
