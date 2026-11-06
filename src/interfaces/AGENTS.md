# Agent Guide — Interfaces & Composition Layer (`src/interfaces/`)

## Strict Guardrails (Enforced by `npm run verify`)

1. **Composition Root & Server-Only Node Imports**: Keep Node `node:fs` / `node:http` adapters inside `src/interfaces/cli/` and `src/interfaces/vite/` (used by CLI scripts and `vite.config.ts`). Browser-side Three.js and HUD modules in `src/interfaces/three/` and `src/interfaces/hud/` must communicate with disk via `/api/telemetry` and `/api/saves` or injected ports.
2. **Zod Boundary Validation**: Validate all incoming HTTP and CLI payloads using Zod schemas and `safeParseJsonWithSchema` rather than hand-rolled type checks.
3. **Thin Three.js Adapter & Camera Modes**: Keep `src/interfaces/three/` focused on translating pure `RenderFrame` data and `WorldSceneBlueprint` definitions into Three.js `Scene` updates at 60 FPS. Never put simulation rules or NPC decision logic inside Three.js components.
4. **Zero `any`**: Both implicit and explicit `any` are forbidden across all CLI, Vite, UI, Three.js, and composition files.
