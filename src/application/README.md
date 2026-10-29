# Application Layer (`src/application/`)

## Purpose

`src/application/` orchestrates use cases between the outer adapters (`src/interfaces/`, `src/infrastructure/`) and the inner simulation core (`src/domain/`).

Responsibilities include:

- Coordinating the continuous 60 FPS kinematics step, 250ms perception pulse, and 8–12s background cognitive tick.
- Computing pure, WebGL-independent render frames (`RenderFrameBuilder`) that can be unit-tested in Node/Vitest.
- Orchestrating player dialogue, covert actions, and orbital Ship Mind scans through domain ports.

## Current Module Inventory

- `index.ts` — Public application layer barrel.
