# stage-inspector-lab-and-dom-mirror Specification

## Purpose
Provide the In-Game `F3` Stage, Lighting & Character Wardrobe Inspector controller, the Agent DOM Mirror (`data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `globalThis.__UPLIFT_STAGE_INSPECTOR__`), and Vite Local Disk Bridge endpoints (`GET`/`PUT /api/scene-blueprints/:stageId`, `GET`/`PUT /api/character-visuals/:characterId`) for persisting live visual edits to disk.

## Requirements

### Requirement: Agent DOM Mirror and live F3 Stage/Wardrobe Inspector state mutators
`StageInspectorDomMirror` (`src/interfaces/hud/StageInspectorDomMirror.ts`) SHALL mirror `AgentDomMirrorState` onto a target container's DOM attributes (`data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, `data-camera-mode`) and onto `globalThis.__UPLIFT_STAGE_INSPECTOR__` (including a structured scene-inspector target list), and SHALL provide pure, schema-validated live mutation helpers to add/update wall `motifs[]` on a targeted `semanticId`, adjust light intensity/color/falloff, update camera volume pitch/FOV, and tweak character posture, garments, held props, and grime levels.

#### Scenario: Mirroring hovered/selected semanticId to DOM attributes and mutating stage and character blueprints
- **WHEN** the user or test selects `charnel_stairs.wall.north.seg_02` in `StageInspectorDomMirror` and applies live edits to wall `motifs[]`, light intensity, camera volume FOV, and character `headgear`
- **THEN** `data-active-space-id`, `data-hovered-semantic-id`, `data-selected-semantic-id`, `data-debug-paused`, `data-camera-mode`, and `globalThis.__UPLIFT_STAGE_INSPECTOR__` SHALL reflect the active inspector state, and the returned blueprints SHALL contain the updated values without mutating the input blueprints

#### Scenario: Rejecting invalid live inspector mutations without corrupting blueprint state
- **WHEN** a live mutation attempts to target an unknown wall `semanticId` or set a negative motif `count` or invalid hex color
- **THEN** the mutator SHALL throw a descriptive validation error while leaving the prior blueprint unmodified

### Requirement: Vite Local Disk Bridge endpoints for scene blueprints and character visuals
The Vite Local Disk Bridge (`src/interfaces/vite/localDiskBridgePlugin.ts`) SHALL support `GET /api/scene-blueprints/:stageId`, `PUT /api/scene-blueprints/:stageId`, `GET /api/character-visuals/:characterId`, and `PUT /api/character-visuals/:characterId`, enforcing safe alphanumeric/underscore/hyphen asset IDs, enforcing the `256 KiB` body limit (`413`), validating payloads with `StageSceneBlueprintSchema` and `CharacterVisualBlueprintSchema` (`400` on invalid schema or URL/body ID mismatch), and atomically persisting formatted JSON via temp-file-and-rename while preserving backwards compatibility with `/api/telemetry/*` and `/api/saves/*`.

#### Scenario: Saving and loading valid stage blueprints and character visuals via the Local Disk Bridge
- **WHEN** `PUT /api/scene-blueprints/stage_alpha` and `PUT /api/character-visuals/char_alpha` are called with valid JSON blueprints, followed by `GET` requests
- **THEN** both `PUT` and `GET` calls SHALL return `200` with the validated blueprints persisted on disk, and existing `/api/telemetry/*` and `/api/saves/*` routes SHALL continue to operate unchanged

#### Scenario: Rejecting path traversal, missing assets, oversized bodies, and invalid schemas on blueprint routes
- **WHEN** a request uses a path-traversal ID (`../secret`, `%2e%2e`), requests a non-existent blueprint (`GET /api/scene-blueprints/missing_stage`), sends a payload exceeding `256 KiB`, or sends malformed JSON/schema
- **THEN** missing blueprints SHALL return `404`, oversized payloads SHALL return `413`, and path traversal or invalid schema payloads SHALL return `400`
