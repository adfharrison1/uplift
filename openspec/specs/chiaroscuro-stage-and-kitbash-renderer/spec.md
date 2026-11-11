# chiaroscuro-stage-and-kitbash-renderer Specification

## Purpose
Provide a Three.js 60 FPS stage-paint chiaroscuro scene graph builder, shared 3-band toon gradient ramp, parametric architectural motif & character wardrobe kitbashers with `userData.semanticId` tagging, raycast semantic target lookup, and deterministic GPU resource disposal in `src/interfaces/three/`.

## Requirements

### Requirement: Stage-paint chiaroscuro material ramp, lighting, and parametric motif/character kitbashing
The Three.js rendering adapter (`src/interfaces/three/`) SHALL construct 3D stage and character `THREE.Group` hierarchies from `EpochVisualTheme`, `StageSceneBlueprint`, and `CharacterVisualBlueprint`, with shared chiaroscuro materials, parametric motifs, character kitbashing, and deterministic semantic addressing.

#### Scenario: Shared stage-paint materials and lighting
- **WHEN** the adapter renders stage or character geometry
- **THEN** It SHALL use a shared stepped 3-band toon/chiaroscuro `DataTexture` ramp (`#1a1f28` shadow tint, desaturated surface palettes, warm `#c4a574` point lights, exponential fog `THREE.FogExp2`, and optional alpha-cone god-rays).

#### Scenario: Authored motifs and custom fallback
- **WHEN** the adapter constructs wall motifs
- **THEN** It SHALL use parametric wall motif generators (`ossuary_skull_niche`, `lancet_window`, `buttress_rib`, `fulgurite_lens_sconce`, `guild_anvil_rack`, `torch_sconce` plus a fallback geometry for custom motif IDs).

#### Scenario: Character posture and wardrobe slots
- **WHEN** the adapter constructs character geometry
- **THEN** It SHALL use character posture/wardrobe kitbashers (`spinePitchRadians`, `headgear`, `cloak`, `heldPropLeft`, `heldPropRight`, `droneDisguise`).

#### Scenario: Every generated object has a semantic address
- **WHEN** the adapter generates any `THREE.Object3D` or `THREE.Mesh`
- **THEN** It SHALL stamp that object with its deterministic `userData.semanticId`.

#### Scenario: Building a stage scene graph with semanticId-tagged wall motifs, god-rays, and character kitbash parts
- **WHEN** `buildStageSceneGraph` and `buildCharacterKitbashGroup` are invoked in Node/Vitest with a `StageSceneBlueprint` (containing all 6 canonical motif types and a light with `hasGodRayCone: true`) and a `CharacterVisualBlueprint` (with `spinePitchRadians: 0.25`, `headgear: 'synod_cowl'`, and `droneDisguise: 'bronze_reliquary_lamp'`)
- **THEN** the resulting Three.js scene graph SHALL contain meshes tagged with `userData.semanticId` for every wall segment, motif group (`<segmentSemanticId>.motif.<motifId>`), floor, light, god-ray cone, character part (`npc.<id>.part.headgear`), and companion drone disguise, and `resolveSemanticIdFromObject` / `findObjectBySemanticId` SHALL resolve exact targets or return `null` on unknown IDs

### Requirement: Frame synchronization and leak-free GPU geometry/material/texture disposal
The Three.js stage renderer SHALL synchronize camera transforms, `FogExp2` density, entity world poses, and selection highlights from a `RenderFrame` and SHALL provide `disposeSceneGraph(root)` to deterministically dispose per-stage geometries and materials (while preserving the shared singleton 3-band toon gradient `DataTexture` across live stage rebuilds unless `disposeSharedRamp: true` is passed).

#### Scenario: Synchronizing RenderFrame transforms and disposing rebuilt scene graphs without memory leaks
- **WHEN** `applyRenderFrameToScene` updates entity and camera transforms from a `RenderFrame` and `disposeSceneGraph` is called before a live stage reload
- **THEN** camera and entity `Object3D` transforms SHALL match the `RenderFrame` pose values, per-stage geometries and materials SHALL fire their `dispose` handlers, and the shared chiaroscuro gradient ramp texture SHALL remain valid for the rebuilt stage
