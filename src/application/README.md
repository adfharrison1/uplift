# Application Layer (`src/application/`)

## Purpose

`src/application/` orchestrates use cases between the outer adapters (`src/interfaces/`, `src/infrastructure/`) and the inner simulation core (`src/domain/`).

Responsibilities include:

- Coordinating the continuous 60 FPS kinematics step, 250ms perception pulse, and 8–12s background cognitive/wider-world tick (with full pause support for In-Game Debug Mode).
- Computing pure, WebGL-independent render frames (`RenderFrameBuilder`) for the 3rd-person fixed-orientation tracking camera and de-anchored debug camera so frame logic can be unit-tested in Node/Vitest.
- Orchestrating player dialogue, covert actions, role/funds operations, async correspondence, wider world overview queries, and orbital Ship Mind abilities through domain ports and structured session telemetry.

## Current Module Inventory

- `index.ts` — Public application layer barrel.
