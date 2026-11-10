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

The Vite Local Disk Bridge SHALL support GET and PUT for /api/scene-blueprints/:stageId and /api/character-visuals/:characterId, enforcing safe alphanumeric/underscore/hyphen asset IDs, the configured body limit (default 256 KiB), schema validation and URL/body ID agreement, and atomic formatted JSON persistence. All routes SHALL obey the shared bridge request and filesystem contracts; existing telemetry and save response schemas SHALL remain compatible.

#### Scenario: Saving and loading valid stage blueprints and character visuals via the Local Disk Bridge

- **WHEN** the local browser transport sends authorized PUT requests with valid stage and character JSON, followed by authorized GET requests
- **THEN** PUT and GET SHALL return 200, disk JSON and returned payloads SHALL contain the submitted values, and telemetry and save routes SHALL remain usable under the same request guard

#### Scenario: Rejecting path traversal, missing assets, oversized bodies, and invalid schemas on blueprint routes

- **WHEN** an otherwise authorized request uses a traversal or encoded ID, requests a missing blueprint, exceeds the body limit, or submits malformed JSON, schema or mismatched URL/body ID
- **THEN** missing blueprints SHALL return 404, traversal/schema/ID errors SHALL return 400, and oversized streams SHALL return 413 or close promptly as defined by the shared bridge contract, with no partial writes

#### Scenario: Linked visual asset paths cannot escape their registered directories

- **WHEN** stage or character storage contains a linked root, parent directory, destination or temporary path, including a dangling link
- **THEN** reads and writes SHALL reject it without following the link or changing outside files

### Requirement: Stage-lab write authorization and failure reporting

The stage-lab transport SHALL read the dev HTML token and attach it with JSON media type to same-origin mutations. Its stage save control and callable character-save API SHALL report missing-token, rejected-request and network failures as retained text in a polite, atomic live status region, without exposing the token or discarding edited state. A failed write SHALL NOT replay automatically.

#### Scenario: Existing lab save obtains authorization from the served page

- **WHEN** the stage save control or existing callable saveVisual API sends a valid edited asset through its browser transport after loading the dev page
- **THEN** the real middleware SHALL accept the current token and JSON headers and a subsequent GET SHALL return the edited asset from disk

#### Scenario: Restarted server makes an old tab reload before saving

- **WHEN** an old tab saves with a previous-run token or the page has no token
- **THEN** the HUD SHALL display a text instruction to reload the dev page, no unauthorized write SHALL occur, and the unsaved edit SHALL remain in memory

#### Scenario: Network or storage failure is visible

- **WHEN** an authorized save receives a non-success response or the network request rejects
- **THEN** the HUD SHALL show the failure in text, retain the edited blueprint and allow an explicit retry without an unhandled rejection or false success

#### Scenario: Failure status survives frame updates and explicit retry replaces it

- **WHEN** a save fails and frame/input synchronization continues, followed later by an explicit save attempt
- **THEN** the dedicated status text SHALL survive synchronization with role=status, aria-live=polite and aria-atomic=true; the next attempt SHALL replace it with Saving and then Saved or a new error, without modifying the in-memory edit
