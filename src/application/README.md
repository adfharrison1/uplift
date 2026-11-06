# Application Layer (`src/application/`)

## Purpose

`src/application/` orchestrates use cases between the outer adapters (`src/interfaces/`, `src/infrastructure/`) and the inner simulation core (`src/domain/`).

Responsibilities include:

- Coordinating the continuous 60 FPS kinematics step (`stepFrame`), discrete `WorldEffect` dispatch (`dispatchEffects`), and anti-thundering-herd round-robin cognitive scheduler (`pulseCognitiveScheduler`) with full pause support for In-Game Debug Mode and fast-eval overrides (`FAST_EVAL_PACING_CONFIG`).
- Managing Dual-Ledger `CivilizationLegacyState` inheritance on epoch startup, in-epoch scar accumulation (`exportLegacyState`), and atomic multi-session save/load snapshots (`saveToSlot`, `loadFromSlot`) via `SaveSlotRepositoryPort`.
- Emitting structured session telemetry (`SessionTelemetryPort`) for kinematics arrivals, cognitive phase transitions, frame `dt` clamping, world effects, and persistence operations.
- Computing pure, WebGL-independent render frames (`RenderFrameBuilder`, Change 04) for the 3rd-person fixed-orientation tracking camera and de-anchored debug camera so frame logic can be unit-tested in Node/Vitest.

## Current Module Inventory

- `simulation/SimulationCoordinator.ts` — Application simulation coordinator wiring `EpochModuleRegistry`, `stepKinematics`, `applyWorldEffects`, round-robin `pulseCognitiveScheduler`, `CivilizationLegacyState`, `SessionTelemetryPort`, and `SaveSlotRepositoryPort`.
- `index.ts` — Public application layer barrel re-exporting `SimulationCoordinator` and related types.
