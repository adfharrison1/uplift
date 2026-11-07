## Purpose

Provide pure TypeScript + Zod v4 schemas for the 3-Layer Encoded Visual Authoring Framework (`EpochVisualTheme`, `StageSceneBlueprint`, `CameraVolumeBlueprint`, `CharacterVisualBlueprint`), deterministic `semanticId` addressing, and a WebGL-independent `RenderFrameBuilder` in `src/application/rendering/`.

## ADDED Requirements

### Requirement: 3-Layer Encoded Visual Blueprints and deterministic semanticId addressing
The application rendering layer SHALL define epoch-agnostic Zod-validated schemas for `EpochVisualTheme` (material hex palettes, `#1a1f28` shadow tint, `#c4a574` torch warm tint, `ambientIntensity`, non-zero `keyLightDirection`, `keyLightIntensity`, desaturation, grime, and fog), `StageSceneBlueprint` (`stageId`, `spaceId`, `themeId`, room footprint, `floorSemanticId`, compass `wallSegments` with `thicknessMeters`/`recessMeters`/`offsetAlongWallMeters` and open-identifier `WallMotifInstance[]` with `offsetX`/`offsetY`/`spacingMeters`/`columns`, `props` `StagePropVisualBlueprint[]` with `isPortal`, `lights`, and `CameraVolumeBlueprint[]` with `priority`), and `CharacterVisualBlueprint` (`characterId`, `lineageId`, posture `heightScale`/`shoulderWidth`/`spinePitchRadians`/`gaitStyle`, open-identifier garment/prop slots, grime levels, and optional `droneDisguise`), and SHALL enforce deterministic `semanticId` formatting (`<spaceId>.<wall|alcove>.<compass>.<segmentId>`, `<segmentSemanticId>.motif.<motifId>`, `<spaceId>.floor`, `<spaceId>.prop.<propId>`, `<spaceId>.light.<lightId>`, `npc.<characterId>`, `npc.<characterId>.part.<slot>`) with zero Three.js or DOM imports in `src/application/`.

#### Scenario: Parsing valid 3-layer visual blueprints and formatting deterministic semanticIds
- **WHEN** valid `EpochVisualTheme`, `StageSceneBlueprint`, and `CharacterVisualBlueprint` objects are parsed and `formatWallSegmentSemanticId` / `formatCharacterPartSemanticId` are invoked
- **THEN** all wall/alcove segments (such as `charnel_stairs.wall.north.seg_02` and `chapel.alcove.east.arch_01`), floor surfaces, lights, and character garment/prop slots SHALL resolve to deterministic, globally unique `semanticId` strings within the stage

#### Scenario: Rejecting malformed hex colors, duplicate semanticIds, and out-of-range posture values
- **WHEN** a blueprint contains an invalid hex color, a negative room dimension, duplicate `semanticId`s within the same stage, an out-of-range `heightScale` or `mudLevel`, or a malformed `semanticId` token
- **THEN** schema validation SHALL fail with a descriptive Zod error

#### Scenario: Rebinding lineage character visuals across epochs without domain layer leakage
- **WHEN** `resolveCharacterVisualForTheme` binds a `CharacterVisualBlueprint` matching a successor character's `lineageId` to a new `EpochVisualTheme`
- **THEN** it SHALL preserve the character's posture (`heightScale`, `shoulderWidth`, `spinePitchRadians`, `gaitStyle`) and garment/prop slots while rebinding theme-linked palette defaults when requested, without importing any 3D schema into `src/domain/`

### Requirement: Volume-aware 3rd-person tracking camera, critically damped spring blending, and F3 De-Anchored Free-Cam
`RenderFrameBuilder` SHALL select the active `CameraVolumeBlueprint` containing the tracked target position (choosing highest `priority`, then smallest AABB volume on overlap, and falling back to the first volume for the space), smooth camera position, look-at target, pitch, yaw, and FOV across volume transitions via a critically damped spring (clamping `dtSeconds` to `[0, 0.25]` for stability), apply Emergency (`+1.5°` roll, `-2.0°` pitch, `1.35x` fog density) and orbital `zenith` `activeBurn` (`-1.5°` pitch) modifiers unless `reduceMotionAndFlashing` is enabled, and switch to `cameraMode: 'debug_free_cam'` with `freeCamOffset` and a `+0.40` desaturation boost when `debugMode` and `cameraDeAnchored` are active.

#### Scenario: Smooth critically damped spring transition and overlapping camera volume priority
- **WHEN** the tracked entity moves from an outer courtyard `CameraVolumeBlueprint` (`priority: 0`) into a nested interior `CameraVolumeBlueprint` (`priority: 10`) across successive `dtSeconds` frames
- **THEN** `RenderFrameBuilder` SHALL select the higher-priority interior volume and smoothly interpolate camera position, pitch, and FOV toward the interior framing without instantaneous snapping or `NaN` overshoot

#### Scenario: Emergency and zenith burn tilts, accessibility motion reduction, and F3 De-Anchored Free-Cam
- **WHEN** `buildFrame` is called during an active `EmergencyState` or `zenith` `activeBurn` (with `reduceMotionAndFlashing: false` vs `true`), or with `debugMode: true` and `cameraDeAnchored: true`
- **THEN** emergency/zenith tilts SHALL apply when `reduceMotionAndFlashing` is `false` and zero out when `true`, and `cameraDeAnchored: true` SHALL switch `cameraMode` to `'debug_free_cam'`, apply `freeCamOffset`, and raise `effectiveDesaturation` by `0.40` (clamped to `1.0`)

### Requirement: Pure 3D-to-NDC projection with behind-camera frustum culling for floating Inspector cards and Agent DOM Mirror state
`RenderFrameBuilder` SHALL project 3D world anchors of entities (`y + 1.8 * heightScale`), props, and wall segments into normalized device coordinates (`ndcX`, `ndcY`, `ndcZ`, `visibleInFrustum`) using pure matrix math, marking any target behind the camera (`clipW <= 1e-5`) or outside `[-1, 1]` as `visibleInFrustum: false` so behind-camera targets never invert onto the screen, and SHALL emit `DebugInspectorCard` models and `AgentDomMirrorState`.

#### Scenario: Projecting in-frustum and behind-camera targets in headless Node tests
- **WHEN** `RenderFrameBuilder.buildFrame` projects an entity in front of the camera and a second entity behind the camera (`clipW <= 0`) with `debugMode: true`
- **THEN** the in-front entity's `DebugInspectorCard` SHALL have `visibleInFrustum: true` and finite NDC coordinates in `[-1, 1]`, the behind-camera entity's card SHALL have `visibleInFrustum: false` without inverted on-screen coordinates, and `AgentDomMirrorState` SHALL reflect `activeSpaceId`, `hoveredSemanticId`, and `selectedSemanticId`
