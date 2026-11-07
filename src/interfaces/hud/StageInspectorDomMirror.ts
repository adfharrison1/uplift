/**
 * In-Game `F3` Stage, Lighting & Character Wardrobe Inspector Controller + Agent DOM Mirror
 * (`src/interfaces/hud/StageInspectorDomMirror.ts`).
 *
 * - Mirrors `AgentDomMirrorState` onto DOM attributes (`data-active-space-id`, `data-hovered-semantic-id`,
 *   `data-selected-semantic-id`, `data-debug-paused`, `data-camera-mode`) so `cursor-ide-browser` and DOM
 *   inspection tools can read the exact 3D surface, prop, or character part under inspection.
 * - Populates `globalThis.__UPLIFT_STAGE_INSPECTOR__` with a deeply frozen snapshot of the active state
 *   and a structured list of inspectable `semanticId` targets.
 * - Provides pure, Zod-validated live `F3` Lab mutators for wall `motifs[]`, lights, camera volumes,
 *   visual themes, and character posture/wardrobe slots.
 */
import type { z } from 'zod';
import {
  type AgentDomMirrorState,
  type CameraVolumeBlueprint,
  type CharacterVisualBlueprint,
  CharacterVisualBlueprintSchema,
  type EpochVisualTheme,
  EpochVisualThemeSchema,
  formatCharacterPartSemanticId,
  formatCharacterRootSemanticId,
  formatWallMotifSemanticId,
  type StageLightBlueprint,
  type StageSceneBlueprint,
  StageSceneBlueprintSchema,
  type WallMotifInstance,
  WallMotifInstanceSchema,
} from '../../application/index.js';

export interface DomAttributeSink {
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  removeAttribute(name: string): void;
}

export class InMemoryDomAttributeSink implements DomAttributeSink {
  private readonly attributes = new Map<string, string>();

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public toRecord(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.attributes.entries());
  }
}

export interface InspectableSemanticTarget {
  readonly semanticId: string;
  readonly kind:
    'floor' | 'wall_segment' | 'motif' | 'prop' | 'light' | 'character' | 'character_part';
  readonly label: string;
}

export interface UpliftStageInspectorGlobal {
  readonly activeSpaceId: string;
  readonly hoveredSemanticId: string | null;
  readonly selectedSemanticId: string | null;
  readonly cameraMode: AgentDomMirrorState['cameraMode'];
  readonly debugPaused: boolean;
  readonly inspectableTargets: ReadonlyArray<InspectableSemanticTarget>;
}

declare global {
  var __UPLIFT_STAGE_INSPECTOR__: UpliftStageInspectorGlobal | undefined;
}

function stripUndefined<T extends Record<string, unknown>>(patch: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(patch)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned as Partial<T>;
}

/**
 * Builds a deterministic, ordered, deeply frozen catalog of all inspectable `semanticId` targets
 * in a stage and its active character visuals for `globalThis.__UPLIFT_STAGE_INSPECTOR__`.
 */
export function buildInspectableTargetCatalog(
  stage: StageSceneBlueprint,
  characterVisuals: ReadonlyArray<CharacterVisualBlueprint> = [],
): ReadonlyArray<InspectableSemanticTarget> {
  const targets: InspectableSemanticTarget[] = [
    Object.freeze({
      semanticId: stage.floorSemanticId,
      kind: 'floor',
      label: `${stage.spaceId} floor`,
    }),
  ];

  for (const seg of stage.wallSegments) {
    targets.push(
      Object.freeze({
        semanticId: seg.semanticId,
        kind: 'wall_segment',
        label: `${seg.compass} ${seg.zone} ${seg.segmentId}`,
      }),
    );
    for (const motif of seg.motifs) {
      targets.push(
        Object.freeze({
          semanticId: formatWallMotifSemanticId(seg.semanticId, motif.id),
          kind: 'motif',
          label: `${seg.segmentId} motif ${motif.id} (x${String(motif.count)})`,
        }),
      );
    }
  }

  for (const prop of stage.props) {
    targets.push(
      Object.freeze({
        semanticId: prop.semanticId,
        kind: 'prop',
        label: `prop ${prop.propId} (${prop.kitbashId})`,
      }),
    );
  }

  for (const light of stage.lights) {
    targets.push(
      Object.freeze({
        semanticId: light.semanticId,
        kind: 'light',
        label: `light ${light.id}`,
      }),
    );
  }

  for (const vis of characterVisuals) {
    targets.push(
      Object.freeze({
        semanticId: formatCharacterRootSemanticId(vis.characterId),
        kind: 'character',
        label: `character ${vis.characterId}`,
      }),
    );
    targets.push(
      Object.freeze({
        semanticId: formatCharacterPartSemanticId(vis.characterId, 'torso'),
        kind: 'character_part',
        label: `${vis.characterId} torso`,
      }),
    );
    targets.push(
      Object.freeze({
        semanticId: formatCharacterPartSemanticId(vis.characterId, 'head'),
        kind: 'character_part',
        label: `${vis.characterId} head`,
      }),
    );
    if (vis.headgear !== 'none') {
      targets.push(
        Object.freeze({
          semanticId: formatCharacterPartSemanticId(vis.characterId, 'headgear'),
          kind: 'character_part',
          label: `${vis.characterId} headgear (${vis.headgear})`,
        }),
      );
    }
    if (vis.cloak !== 'none') {
      targets.push(
        Object.freeze({
          semanticId: formatCharacterPartSemanticId(vis.characterId, 'cloak'),
          kind: 'character_part',
          label: `${vis.characterId} cloak (${vis.cloak})`,
        }),
      );
    }
    if (vis.heldPropLeft !== 'none') {
      targets.push(
        Object.freeze({
          semanticId: formatCharacterPartSemanticId(vis.characterId, 'held_prop_left'),
          kind: 'character_part',
          label: `${vis.characterId} left prop (${vis.heldPropLeft})`,
        }),
      );
    }
    if (vis.heldPropRight !== 'none') {
      targets.push(
        Object.freeze({
          semanticId: formatCharacterPartSemanticId(vis.characterId, 'held_prop_right'),
          kind: 'character_part',
          label: `${vis.characterId} right prop (${vis.heldPropRight})`,
        }),
      );
    }
    if (vis.droneDisguise !== undefined && vis.droneDisguise !== 'none') {
      targets.push(
        Object.freeze({
          semanticId: formatCharacterPartSemanticId(vis.characterId, 'drone_disguise'),
          kind: 'character_part',
          label: `${vis.characterId} drone (${vis.droneDisguise})`,
        }),
      );
    }
  }

  return Object.freeze(targets);
}

export class StageInspectorDomMirror {
  private readonly sink: DomAttributeSink;

  public constructor(sink: DomAttributeSink = new InMemoryDomAttributeSink()) {
    this.sink = sink;
  }

  public getSink(): DomAttributeSink {
    return this.sink;
  }

  /**
   * Synchronizes `AgentDomMirrorState` and the inspectable target catalog onto the DOM sink
   * and `globalThis.__UPLIFT_STAGE_INSPECTOR__`.
   */
  public syncMirrorState(
    mirrorState: AgentDomMirrorState,
    stage: StageSceneBlueprint,
    characterVisuals: ReadonlyArray<CharacterVisualBlueprint> = [],
  ): UpliftStageInspectorGlobal {
    this.sink.setAttribute('data-active-space-id', mirrorState.activeSpaceId);
    this.sink.setAttribute('data-camera-mode', mirrorState.cameraMode);
    this.sink.setAttribute('data-debug-paused', String(mirrorState.debugPaused));

    if (mirrorState.hoveredSemanticId !== null) {
      this.sink.setAttribute('data-hovered-semantic-id', mirrorState.hoveredSemanticId);
    } else {
      this.sink.removeAttribute('data-hovered-semantic-id');
    }

    if (mirrorState.selectedSemanticId !== null) {
      this.sink.setAttribute('data-selected-semantic-id', mirrorState.selectedSemanticId);
    } else {
      this.sink.removeAttribute('data-selected-semantic-id');
    }

    const inspectableTargets = buildInspectableTargetCatalog(stage, characterVisuals);
    const snapshot: UpliftStageInspectorGlobal = Object.freeze({
      activeSpaceId: mirrorState.activeSpaceId,
      hoveredSemanticId: mirrorState.hoveredSemanticId,
      selectedSemanticId: mirrorState.selectedSemanticId,
      cameraMode: mirrorState.cameraMode,
      debugPaused: mirrorState.debugPaused,
      inspectableTargets,
    });

    globalThis.__UPLIFT_STAGE_INSPECTOR__ = snapshot;
    return snapshot;
  }
}

/**
 * Adds or updates a `WallMotifInstance` on the wall/alcove segment matching `segmentSemanticId`.
 * When updating an existing motif with the same `id`, merges `motifInput` over the existing motif
 * before Zod parsing so partial updates (e.g. `{ id: 'ossuary_skull_niche', count: 12 }`) preserve
 * authored `spacingMeters`, `recessDepth`, `columns`, and offsets.
 */
export function upsertWallSegmentMotif(
  stage: StageSceneBlueprint,
  segmentSemanticId: string,
  motifInput: z.input<typeof WallMotifInstanceSchema>,
): StageSceneBlueprint {
  const segIndex = stage.wallSegments.findIndex((s) => s.semanticId === segmentSemanticId);
  const targetSegment = stage.wallSegments[segIndex];
  if (segIndex === -1 || targetSegment === undefined) {
    throw new Error(
      `Unknown wall segment semanticId '${segmentSemanticId}' in stage '${stage.stageId}'`,
    );
  }

  const existingMotifIndex = targetSegment.motifs.findIndex((m) => m.id === motifInput.id);
  const existingMotif = targetSegment.motifs[existingMotifIndex];
  const mergedCandidate =
    existingMotif !== undefined
      ? {
          ...existingMotif,
          ...stripUndefined(motifInput as Record<string, unknown>),
        }
      : motifInput;
  const validatedMotif: WallMotifInstance = WallMotifInstanceSchema.parse(mergedCandidate);

  const nextSegments = stage.wallSegments.map((seg, idx) => {
    if (idx !== segIndex) {
      return seg;
    }
    const nextMotifs =
      existingMotifIndex === -1
        ? [...seg.motifs, validatedMotif]
        : seg.motifs.map((m, mIdx) => (mIdx === existingMotifIndex ? validatedMotif : m));
    return {
      ...seg,
      motifs: nextMotifs,
    };
  });

  return StageSceneBlueprintSchema.parse({
    ...stage,
    wallSegments: nextSegments,
  });
}

/**
 * Removes a motif by `motifId` from the wall/alcove segment matching `segmentSemanticId`.
 */
export function removeWallSegmentMotif(
  stage: StageSceneBlueprint,
  segmentSemanticId: string,
  motifId: string,
): StageSceneBlueprint {
  const segIndex = stage.wallSegments.findIndex((s) => s.semanticId === segmentSemanticId);
  const targetSegment = stage.wallSegments[segIndex];
  if (segIndex === -1 || targetSegment === undefined) {
    throw new Error(
      `Unknown wall segment semanticId '${segmentSemanticId}' in stage '${stage.stageId}'`,
    );
  }

  if (!targetSegment.motifs.some((m) => m.id === motifId)) {
    return stage;
  }

  const nextSegments = stage.wallSegments.map((seg, idx) =>
    idx === segIndex
      ? {
          ...seg,
          motifs: seg.motifs.filter((m) => m.id !== motifId),
        }
      : seg,
  );

  return StageSceneBlueprintSchema.parse({
    ...stage,
    wallSegments: nextSegments,
  });
}

/**
 * Updates a stage light matching `lightSemanticId` immutably and re-validates via `StageSceneBlueprintSchema`.
 */
export function updateStageLight(
  stage: StageSceneBlueprint,
  lightSemanticId: string,
  patch: Partial<
    Pick<
      StageLightBlueprint,
      'colorHex' | 'intensity' | 'falloffDistance' | 'hasGodRayCone' | 'position'
    >
  >,
): StageSceneBlueprint {
  const lightIndex = stage.lights.findIndex((l) => l.semanticId === lightSemanticId);
  if (lightIndex === -1) {
    throw new Error(`Unknown light semanticId '${lightSemanticId}' in stage '${stage.stageId}'`);
  }

  const cleanedPatch = stripUndefined(patch as Record<string, unknown>);
  const nextLights = stage.lights.map((light, idx) =>
    idx === lightIndex ? { ...light, ...cleanedPatch } : light,
  );

  return StageSceneBlueprintSchema.parse({
    ...stage,
    lights: nextLights,
  });
}

/**
 * Updates a camera volume matching `volumeId` immutably and re-validates via `StageSceneBlueprintSchema`.
 */
export function updateCameraVolumeFraming(
  stage: StageSceneBlueprint,
  volumeId: string,
  patch: Partial<
    Pick<
      CameraVolumeBlueprint,
      'offset' | 'pitchDegrees' | 'yawDegrees' | 'fovDegrees' | 'springStiffness' | 'priority'
    >
  >,
): StageSceneBlueprint {
  const volIndex = stage.cameraVolumes.findIndex((v) => v.id === volumeId);
  if (volIndex === -1) {
    throw new Error(`Unknown cameraVolume id '${volumeId}' in stage '${stage.stageId}'`);
  }

  const cleanedPatch = stripUndefined(patch as Record<string, unknown>);
  const nextVolumes = stage.cameraVolumes.map((vol, idx) =>
    idx === volIndex ? { ...vol, ...cleanedPatch } : vol,
  );

  return StageSceneBlueprintSchema.parse({
    ...stage,
    cameraVolumes: nextVolumes,
  });
}

/**
 * Updates an `EpochVisualTheme` (e.g. fog density, desaturation, grime, or palette hexes) immutably.
 */
export function updateEpochVisualTheme(
  theme: EpochVisualTheme,
  patch: Partial<Omit<EpochVisualTheme, 'id' | 'epochId'>>,
): EpochVisualTheme {
  const cleanedPatch = stripUndefined(patch as Record<string, unknown>);
  return EpochVisualThemeSchema.parse({
    ...theme,
    ...cleanedPatch,
  });
}

/**
 * Updates a `CharacterVisualBlueprint` (posture, spine pitch, garments, held props, colors, grime, or drone disguise) immutably.
 */
export function updateCharacterVisualSlot(
  visual: CharacterVisualBlueprint,
  patch: Partial<Omit<CharacterVisualBlueprint, 'characterId' | 'lineageId'>>,
): CharacterVisualBlueprint {
  const cleanedPatch = stripUndefined(patch as Record<string, unknown>);
  return CharacterVisualBlueprintSchema.parse({
    ...visual,
    ...cleanedPatch,
  });
}
