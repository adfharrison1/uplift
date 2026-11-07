import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
  DEFAULT_HIGHGLASS_CHARACTER_VISUALS,
  DEFAULT_HIGHGLASS_VISUAL_THEME,
} from '../../../src/content/index.js';
import {
  InMemoryDomAttributeSink,
  removeWallSegmentMotif,
  StageInspectorDomMirror,
  updateCameraVolumeFraming,
  updateCharacterVisualSlot,
  updateEpochVisualTheme,
  updateStageLight,
  upsertWallSegmentMotif,
} from '../../../src/interfaces/hud/StageInspectorDomMirror.js';
import { buildStageSceneGraph } from '../../../src/interfaces/three/ChiaroscuroStageRenderer.js';

describe('StageInspectorDomMirror, live F3 Lab mutators, and default Highglass scene content', () => {
  it('mirrors AgentDomMirrorState to DOM attributes and deeply frozen globalThis.__UPLIFT_STAGE_INSPECTOR__ and indexes starter Highglass scene targets', () => {
    const sink = new InMemoryDomAttributeSink();
    const mirror = new StageInspectorDomMirror(sink);

    const snapshot = mirror.syncMirrorState(
      {
        activeSpaceId: 'charnel_stairs',
        hoveredSemanticId: 'charnel_stairs.wall.north.seg_01',
        selectedSemanticId: 'charnel_stairs.wall.north.seg_02',
        cameraMode: 'debug_free_cam',
        debugPaused: true,
      },
      DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
      DEFAULT_HIGHGLASS_CHARACTER_VISUALS,
    );

    expect(sink.getAttribute('data-active-space-id')).toBe('charnel_stairs');
    expect(sink.getAttribute('data-hovered-semantic-id')).toBe('charnel_stairs.wall.north.seg_01');
    expect(sink.getAttribute('data-selected-semantic-id')).toBe('charnel_stairs.wall.north.seg_02');
    expect(sink.getAttribute('data-camera-mode')).toBe('debug_free_cam');
    expect(sink.getAttribute('data-debug-paused')).toBe('true');

    expect(globalThis.__UPLIFT_STAGE_INSPECTOR__).toEqual(snapshot);
    expect(Object.isFrozen(snapshot.inspectableTargets)).toBe(true);
    expect(
      snapshot.inspectableTargets.some(
        (t) => t.semanticId === 'charnel_stairs.wall.north.seg_02.motif.ossuary_skull_niche',
      ),
    ).toBe(true);
    expect(
      snapshot.inspectableTargets.some(
        (t) => t.semanticId === 'npc.ellin_quell.part.drone_disguise',
      ),
    ).toBe(true);

    // Clearing hover and selection removes those DOM attributes and updates globalThis.__UPLIFT_STAGE_INSPECTOR__
    mirror.syncMirrorState(
      {
        activeSpaceId: 'charnel_stairs',
        hoveredSemanticId: null,
        selectedSemanticId: null,
        cameraMode: 'tracking_volume',
        debugPaused: false,
      },
      DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
    );
    expect(sink.getAttribute('data-hovered-semantic-id')).toBeNull();
    expect(sink.getAttribute('data-selected-semantic-id')).toBeNull();
    expect(globalThis.__UPLIFT_STAGE_INSPECTOR__?.hoveredSemanticId).toBeNull();
    expect(globalThis.__UPLIFT_STAGE_INSPECTOR__?.selectedSemanticId).toBeNull();

    // Starter Highglass blueprints build cleanly into a Three.js scene graph
    const built = buildStageSceneGraph({
      theme: DEFAULT_HIGHGLASS_VISUAL_THEME,
      stage: DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
      characterVisuals: DEFAULT_HIGHGLASS_CHARACTER_VISUALS,
    });
    expect(built.entityGroups.size).toBe(6);
    expect(
      built.semanticIndex.has('charnel_stairs.wall.north.seg_02.motif.ossuary_skull_niche'),
    ).toBe(true);
  });

  it('applies pure, schema-validated live F3 Lab edits (including partial motif updates and undefined-ignoring patches) without mutating inputs', () => {
    const originalStage = structuredClone(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT);
    const sorrelBlueprint = DEFAULT_HIGHGLASS_CHARACTER_VISUALS[1];
    if (sorrelBlueprint === undefined) {
      throw new Error('Expected sorrel visual blueprint at index 1');
    }
    const originalSorrel = structuredClone(sorrelBlueprint);

    // 1a. Partial update of existing motif 'ossuary_skull_niche' on seg_02 preserves spacingMeters (0.38) and recessDepth (0.25)
    const updatedSkullCount = upsertWallSegmentMotif(
      DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
      'charnel_stairs.wall.north.seg_02',
      {
        id: 'ossuary_skull_niche',
        count: 12,
      },
    );
    const seg02 = updatedSkullCount.wallSegments.find(
      (s) => s.semanticId === 'charnel_stairs.wall.north.seg_02',
    );
    const updatedSkullMotif = seg02?.motifs.find((m) => m.id === 'ossuary_skull_niche');
    expect(updatedSkullMotif?.count).toBe(12);
    expect(updatedSkullMotif?.spacingMeters).toBe(0.38);
    expect(updatedSkullMotif?.recessDepth).toBe(0.25);
    expect(seg02?.motifs.some((m) => m.id === 'torch_sconce')).toBe(true);

    // 1b. Add a new motif on seg_01, then remove it
    const withAnvilMotif = upsertWallSegmentMotif(
      DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
      'charnel_stairs.wall.north.seg_01',
      {
        id: 'guild_anvil_rack',
        count: 4,
        recessDepth: 0.3,
        scale: 1.1,
        columns: 2,
      },
    );
    expect(withAnvilMotif.wallSegments[0]?.motifs.some((m) => m.id === 'guild_anvil_rack')).toBe(
      true,
    );
    expect(withAnvilMotif.wallSegments[0]?.motifs.some((m) => m.id === 'buttress_rib')).toBe(true);

    const afterRemove = removeWallSegmentMotif(
      withAnvilMotif,
      'charnel_stairs.wall.north.seg_01',
      'guild_anvil_rack',
    );
    expect(afterRemove.wallSegments[0]?.motifs.some((m) => m.id === 'guild_anvil_rack')).toBe(
      false,
    );

    // Removing a non-existent motif is a safe no-op returning the same stage reference
    expect(
      removeWallSegmentMotif(afterRemove, 'charnel_stairs.wall.north.seg_01', 'non_existent_motif'),
    ).toBe(afterRemove);

    // 2. Update stage light intensity/color/falloff and camera volume pitch/FOV
    const updatedLightAndVol = updateCameraVolumeFraming(
      updateStageLight(
        DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
        'charnel_stairs.light.torch_north_01',
        {
          colorHex: '#d4b584',
          intensity: 4.2,
          falloffDistance: 18,
          hasGodRayCone: false,
        },
      ),
      'vol_charnel_main',
      { fovDegrees: 38, pitchDegrees: -30 },
    );
    expect(updatedLightAndVol.lights[0]?.colorHex).toBe('#d4b584');
    expect(updatedLightAndVol.lights[0]?.intensity).toBe(4.2);
    expect(updatedLightAndVol.lights[0]?.falloffDistance).toBe(18);
    expect(updatedLightAndVol.lights[0]?.hasGodRayCone).toBe(false);
    expect(updatedLightAndVol.cameraVolumes[0]?.fovDegrees).toBe(38);
    expect(updatedLightAndVol.cameraVolumes[0]?.pitchDegrees).toBe(-30);
    expect(updatedLightAndVol.cameraVolumes[1]?.id).toBe('vol_charnel_alcove');

    // 3. Update theme fog density and character posture/wardrobe slots
    const updatedTheme = updateEpochVisualTheme(DEFAULT_HIGHGLASS_VISUAL_THEME, {
      fogDensity: 0.045,
    });
    expect(updatedTheme.fogDensity).toBe(0.045);

    const updatedSorrel = updateCharacterVisualSlot(originalSorrel, {
      spinePitchRadians: 0.3,
      headgear: 'court_circlet',
      heldPropLeft: 'forge_tongs',
      mudLevel: 0.5,
      sootLevel: 0.4,
    });
    expect(updatedSorrel.spinePitchRadians).toBeCloseTo(0.3);
    expect(updatedSorrel.headgear).toBe('court_circlet');
    expect(updatedSorrel.heldPropLeft).toBe('forge_tongs');
    expect(updatedSorrel.mudLevel).toBe(0.5);
    expect(updatedSorrel.sootLevel).toBe(0.4);
    expect(updatedSorrel.cloak).toBe('waxed_mantle');

    // Original blueprints were never mutated
    expect(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT).toEqual(originalStage);
    expect(DEFAULT_HIGHGLASS_CHARACTER_VISUALS[1]).toEqual(originalSorrel);
  });

  it('rejects unknown semanticIds and invalid schema values in live F3 Lab mutators without corrupting state', () => {
    const stageSnapshot = structuredClone(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT);
    const firstVisual = DEFAULT_HIGHGLASS_CHARACTER_VISUALS[0];
    if (firstVisual === undefined) {
      throw new Error('Expected first visual blueprint');
    }
    const visualSnapshot = structuredClone(firstVisual);

    expect(() =>
      upsertWallSegmentMotif(
        DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
        'charnel_stairs.wall.north.missing_seg',
        { id: 'ossuary_skull_niche', count: 4 },
      ),
    ).toThrow(/Unknown wall segment semanticId/);

    expect(() =>
      upsertWallSegmentMotif(
        DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
        'charnel_stairs.wall.north.seg_02',
        { id: 'ossuary_skull_niche', count: -5 },
      ),
    ).toThrow(/Too small/i);

    expect(() =>
      updateStageLight(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT, 'charnel_stairs.light.missing', {
        intensity: 1.0,
      }),
    ).toThrow(/Unknown light semanticId/);

    expect(() =>
      updateCameraVolumeFraming(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT, 'vol_missing', {
        fovDegrees: 40,
      }),
    ).toThrow(/Unknown cameraVolume id/);

    expect(() =>
      updateCharacterVisualSlot(firstVisual, {
        primaryColorHex: 'bad-color',
      }),
    ).toThrow(/hex color/i);

    expect(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT).toEqual(stageSnapshot);
    expect(firstVisual).toEqual(visualSnapshot);
  });
});
