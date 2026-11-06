# Interfaces & Composition Layer (`src/interfaces/`)

## Purpose

`src/interfaces/` is the outer presentation, CLI, local dev middleware, and dependency-wiring shell of **Uplift**:

- **`cli/queryLogs.ts`**: Command-line utility (`npm run logs:query`) for filtering active and compacted session logs by `--level`, `--category`, `--actor`, `--actee`, `--action`, `--min-tick`, `--max-tick`, and `--has-ai-reasoning`.
- **`vite/localDiskBridgePlugin.ts`**: Vite dev-server middleware mounting `/api/telemetry/*` and `/api/saves/*` with a `256 KiB` body cap (`413`) and Zod `safeParse` validation (`400`) so browser sessions write directly to `./logs/` and `./saves/`.
- **`three/`** _(Change 04+)_: Three.js 60 FPS WebGL renderer featuring a **3rd-person fixed-orientation tracking camera** with dark chiaroscuro lighting and a **De-Anchored Free-Cam Debug Mode**.
- **`hud/`** _(Change 04+)_: Groundside role/funds HUD, Wider World Overview board, async correspondence desk UI, orbital Ship Mind / pass-window overlay (`Q`), and floating 3D debug state cards.
- **`composition/`** _(Change 03+)_: Manual dependency injection root wiring content packs, domain registries, telemetry loggers, save/load repositories, and application use cases.

## Current Module Inventory

- `cli/queryLogs.ts` — `parseQueryCliArgs` and `executeLogQuery` CLI runner.
- `vite/localDiskBridgePlugin.ts` — `handleLocalDiskBridgeRequest` and `localDiskBridgePlugin`.
- `index.ts` — Public interfaces layer barrel.
