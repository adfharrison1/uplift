# Interfaces & Composition Layer (`src/interfaces/`)

## Purpose

`src/interfaces/` is the outer presentation and dependency-wiring shell of **Uplift**:
- **`three/`**: Three.js 60 FPS WebGL renderer for seamless indoor rooms and free-roam outdoor areas, continuous NPC locomotion/head-tracking visuals, and first-person pointer-lock WASD + raycast controller.
- **`hud/`**: Minimalist first-person inspection HUD, hybrid dialogue interface, and neural-lace Ship Mind overlay (`Q`).
- **`composition/`**: Manual dependency injection root wiring content packs, domain registries, application use cases, and infrastructure adapters.

## Current Module Inventory

- `index.ts` — Public interfaces layer barrel.
