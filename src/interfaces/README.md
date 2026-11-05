# Interfaces & Composition Layer (`src/interfaces/`)

## Purpose

`src/interfaces/` is the outer presentation, local dev middleware, and dependency-wiring shell of **Uplift**:

- **`three/`**: Three.js 60 FPS WebGL renderer featuring a **3rd-person fixed-orientation tracking camera** (_FF7_ / _Disco Elysium_ / _Inside_ style) with dark chiaroscuro lighting, seamless indoor/outdoor spaces, continuous NPC locomotion, and a **De-Anchored Free-Cam Debug Mode**.
- **`hud/`**: Groundside role/funds HUD, Wider World Overview board, async correspondence desk UI, orbital Ship Mind / pass-window overlay (`Q`), and floating 3D debug state cards over targeted NPCs/items.
- **`composition/`**: Manual dependency injection root wiring content packs, domain registries, telemetry loggers, save/load repositories, and application use cases.

## Current Module Inventory

- `index.ts` — Public interfaces layer barrel.
