# Agent Guide — Interfaces & Composition Layer (`src/interfaces/`)

## Strict Guardrails (Enforced by `npm run test:arch`)

1. **Composition Root Boundary**: All wiring of concrete content packs (`src/content/`), infrastructure workers (`src/infrastructure/`), and application use cases (`src/application/`) happens in `src/interfaces/composition/`.
2. **Thin Three.js Adapter**: Keep `src/interfaces/three/` focused on translating pure `RenderFrame` data and `WorldSceneBlueprint` definitions into Three.js `Scene` updates at 60 FPS. Never put simulation rules or NPC decision logic inside Three.js components.
3. **Zero `any`**: Both implicit and explicit `any` are forbidden across all UI, Three.js, and composition files.
