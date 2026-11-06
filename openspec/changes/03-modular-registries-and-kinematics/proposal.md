## Why

With the Clean Architecture guardrails (`Change 01`), ESLint/Prettier/Husky (`Change 01a`), and structured NDJSON session telemetry + multi-session saves (`Change 02`) in place, `uplift` needs its epoch-agnostic simulation core: the plug-and-play module registries (so characters, offices/pretexts, illicit fund instruments, inertia pillars, rival civilizations, butterfly/martyrdom/crisis threads, async correspondence, emergencies, and orbital pass rules can be added or swapped without touching engine code), the pure `WorldEffect` reducer + continuous 60Hz `stepKinematics(dt)` locomotion math, and the Dual-Ledger `CivilizationLegacyState` mutator that carries Material Scars, Veil Scars, and character lineage mutations across historical Epochs.

## What Changes

- Define epoch-agnostic **Plug-and-Play Module Blueprints & Registry** in `src/domain/registries/` (`EpochModuleRegistry`, `SpaceNodeBlueprint`, `PropBlueprint`, `CharacterBlueprint`, `OfficeBlueprint`, `BehaviorModule`, `RivalCivBlueprint`, `TrajectoryThreadBlueprint`, `ChannelMediumBlueprint`, `EmergencyStateBlueprint`, `OrbitalPassBlueprint`) with Zod validation, duplicate-ID detection, spatial reference validation, and topological sort cycle detection for behavior dependencies.
- Implement the **Pure `WorldState`, `WorldEffect` Reducer, and Continuous 60Hz Kinematics Engine** in `src/domain/simulation/` (`WorldState`, `WorldEffect`, `applyWorldEffects`, `stepKinematics`):
  - Moves Tier 1–3 entities continuously along waypoints at realistic walking speeds (`~1.4 m/s`) and smooth yaw rotation (`rad/s`) on every 60 FPS frame (`dtSeconds`), emitting `WaypointArrivalEvent`s only when targets are physically reached, and honoring `paused: true` for In-Game Debug Mode.
  - Applies discrete simulation effects (`move_entity_to_waypoint`, `update_prop_state`, `adjust_pressure_stock`, `set_discovery_layer`, `collapse_inertia_pillar`, `trigger_emergency`, `resolve_emergency`, `spend_orbital_delta`, `record_legacy_scar`, `set_state_slice`) via a pure, immutable reducer.
- Implement the **Dual-Ledger `CivilizationLegacyState` & Lineage Mutator** in `src/domain/legacy/` (`CivilizationLegacyState`, `InheritedScar`, `LineageMutation`, `applyLegacyToCharacterBlueprints`):
  - Tracks **Material Scars** (economic/institutional structures, communications backbone ownership) separately from **Veil Scars** (miracle-dependent faith, doctrinal rifts, anachronistic relics, rival alien footprints).
  - Applies ordered, conflict-checked lineage mutations (`add`, `multiply`, `clamp`, `override`) by `lineageId` when seeding the next Epoch.
- Implement the **Application Simulation Coordinator** in `src/application/simulation/SimulationCoordinator.ts` wiring `EpochModuleRegistry`, `stepKinematics(dt)`, `applyWorldEffects`, `SessionTelemetryPort`, and `SaveSlotRepositoryPort` for deterministic headless simulation runs.

### Non-goals

- No Three.js 3D rendering or camera volumes yet (deferred to Change 04: `04-third-person-camera-and-inspector`).
- No Highglass Hold feudal content pack authoring yet (deferred to Changes 05–06; Change 03 tests use minimal epoch-agnostic fixture modules).
- No local ONNX model loading or inference yet (deferred to Change 08: `08-local-onnx-hybrid-intent`).
- Runtime and tests require **zero external API keys, zero paid tokens, and zero cloud inference**.

### Dependencies on Prior Changes

- Depends on `01-clean-scaffold-and-verify` (archived), `01a-eslint-prettier-and-hooks` (archived), and `02-telemetry-saves-and-debug-skill` (archived).

## Capabilities

### New Capabilities

- `modular-epoch-registries`: Epoch-agnostic plug-and-play module blueprints and `EpochModuleRegistry` with reference validation and behavior dependency cycle detection.
- `continuous-kinematics-and-world-reducer`: Pure `WorldState`, deterministic `WorldEffect` reducer, and continuous 60Hz `stepKinematics(dt)` locomotion with pause support and arrival events.
- `dual-ledger-civilization-legacy`: Dual-Ledger `CivilizationLegacyState` (**Material Scars** vs. **Veil Scars**) and composable `lineageId` successor mutations across Epochs.

### Modified Capabilities

<!-- None -->

## Impact

- Adds `src/domain/registries/*`, `src/domain/simulation/*`, `src/domain/legacy/*`, `src/application/simulation/SimulationCoordinator.ts`, and unit/simulation tests under `tests/unit/domain/` and `tests/unit/application/`.
- Updates `src/domain/index.ts`, `src/application/index.ts`, and section `README.md` / `AGENTS.md` files in `src/domain/`, `src/application/`, and `tests/`.
