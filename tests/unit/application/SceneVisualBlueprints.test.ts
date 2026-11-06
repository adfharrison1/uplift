import { describe, expect, it } from 'vitest';
import {
  CharacterVisualBlueprintSchema,
  EpochVisualThemeSchema,
  formatCharacterPartSemanticId,
  formatCharacterRootSemanticId,
  formatFloorSemanticId,
  formatLightSemanticId,
  formatPropSemanticId,
  formatWallMotifSemanticId,
  formatWallSegmentSemanticId,
  resolveCharacterVisualForTheme,
  StageSceneBlueprintSchema,
  validateSemanticId,
} from '../../../src/application/rendering/SceneVisualBlueprints.js';

describe('3-Layer Encoded Visual Blueprints and deterministic semanticId schemas', () => {
  it('parses valid EpochVisualTheme, StageSceneBlueprint (with wall offsets, motif grids, and prop/portal visuals), and CharacterVisualBlueprint', () => {
    const theme = EpochVisualThemeSchema.parse({
      id: 'theme_highglass_era1',
      epochId: 'epoch_1',
      name: 'Highglass Hold Chiaroscuro',
      stoneColorHex: '#4A525D',
      mudColorHex: '#3b3228',
      ironColorHex: '#2c3137',
      woodColorHex: '#523d2b',
    });

    expect(theme.stoneColorHex).toBe('#4a525d');
    expect(theme.shadowTintHex).toBe('#1a1f28');
    expect(theme.torchWarmHex).toBe('#c4a574');
    expect(theme.ambientIntensity).toBe(0.35);
    expect(theme.keyLightDirection).toEqual([-0.5, -1.0, -0.4]);
    expect(theme.keyLightIntensity).toBe(1.1);
    expect(theme.desaturationFactor).toBe(0.3);
    expect(theme.grimeIntensity).toBe(0.35);
    expect(theme.fogDensity).toBe(0.025);
    expect(theme.fogColorHex).toBe('#1a1f28');

    const wallId = formatWallSegmentSemanticId('charnel_stairs', 'north', 'seg_02');
    const motifId = formatWallMotifSemanticId(wallId, 'ossuary_skull_niche');
    const alcoveId = formatWallSegmentSemanticId('charnel_stairs', 'east', 'arch_01', 'alcove');
    const floorId = formatFloorSemanticId('charnel_stairs');
    const lightId = formatLightSemanticId('charnel_stairs', 'torch_01');
    const propId = formatPropSemanticId('charnel_stairs', 'door_01');
    const charRootId = formatCharacterRootSemanticId('sorrel');
    const partHeadgearId = formatCharacterPartSemanticId('sorrel', 'headgear');
    const partLeftPropId = formatCharacterPartSemanticId('sorrel', 'held_prop_left');
    const partDroneId = formatCharacterPartSemanticId('sorrel', 'drone_disguise');

    expect(wallId).toBe('charnel_stairs.wall.north.seg_02');
    expect(motifId).toBe('charnel_stairs.wall.north.seg_02.motif.ossuary_skull_niche');
    expect(alcoveId).toBe('charnel_stairs.alcove.east.arch_01');
    expect(floorId).toBe('charnel_stairs.floor');
    expect(lightId).toBe('charnel_stairs.light.torch_01');
    expect(validateSemanticId(propId)).toBe('charnel_stairs.prop.door_01');
    expect(validateSemanticId(charRootId)).toBe('npc.sorrel');
    expect(validateSemanticId(partHeadgearId)).toBe('npc.sorrel.part.headgear');
    expect(validateSemanticId(partLeftPropId)).toBe('npc.sorrel.part.held_prop_left');
    expect(validateSemanticId(partDroneId)).toBe('npc.sorrel.part.drone_disguise');

    const stage = StageSceneBlueprintSchema.parse({
      stageId: 'stage_charnel',
      spaceId: 'charnel_stairs',
      themeId: theme.id,
      footprint: { widthMeters: 16, depthMeters: 12, heightMeters: 5 },
      floorSemanticId: floorId,
      wallSegments: [
        {
          segmentId: 'seg_02',
          compass: 'north',
          zone: 'wall',
          semanticId: wallId,
          widthMeters: 4,
          heightMeters: 5,
          thicknessMeters: 0.45,
          recessMeters: 0,
          offsetAlongWallMeters: 2.0,
          surfaceMaterial: 'stone',
          motifs: [
            {
              id: 'ossuary_skull_niche',
              count: 24,
              recessDepth: 0.25,
              scale: 1,
              offsetX: -0.5,
              offsetY: 1.5,
              spacingMeters: 0.35,
              columns: 6,
            },
            {
              id: 'custom_epoch2_conduit',
            },
          ],
        },
        {
          segmentId: 'arch_01',
          compass: 'east',
          zone: 'alcove',
          semanticId: alcoveId,
          surfaceMaterial: 'stone',
        },
      ],
      props: [
        {
          propId: 'door_01',
          semanticId: propId,
          kitbashId: 'oak_portal_door',
          position: [0, 0, -6],
          yawRadians: 0.5,
          surfaceMaterial: 'wood',
          isPortal: true,
        },
      ],
      lights: [
        {
          id: 'torch_01',
          semanticId: lightId,
          position: [0, 2.8, -5.5],
          colorHex: '#c4a574',
          intensity: 2.5,
          falloffDistance: 10,
          hasGodRayCone: true,
        },
      ],
      cameraVolumes: [
        {
          id: 'vol_main',
          spaceId: 'charnel_stairs',
          priority: 1,
          boundsMin: [-8, 0, -6],
          boundsMax: [8, 5, 6],
          offset: [0, 8, 10],
          pitchDegrees: -32,
          yawDegrees: 0,
          fovDegrees: 40,
          springStiffness: 12,
        },
      ],
    });

    expect(stage.wallSegments).toHaveLength(2);
    expect(stage.wallSegments[0]?.thicknessMeters).toBe(0.45);
    expect(stage.wallSegments[0]?.offsetAlongWallMeters).toBe(2.0);
    expect(stage.wallSegments[0]?.motifs[0]?.columns).toBe(6);
    expect(stage.wallSegments[0]?.motifs[0]?.spacingMeters).toBe(0.35);
    expect(stage.wallSegments[0]?.motifs[0]?.offsetX).toBe(-0.5);
    expect(stage.wallSegments[0]?.motifs[1]?.id).toBe('custom_epoch2_conduit');
    expect(stage.wallSegments[0]?.motifs[1]?.columns).toBe(6);
    expect(stage.wallSegments[0]?.motifs[1]?.spacingMeters).toBe(0.5);
    expect(stage.wallSegments[1]?.thicknessMeters).toBe(0.4);
    expect(stage.wallSegments[1]?.recessMeters).toBe(0);
    expect(stage.props).toHaveLength(1);
    expect(stage.props[0]?.kitbashId).toBe('oak_portal_door');
    expect(stage.props[0]?.yawRadians).toBe(0.5);
    expect(stage.props[0]?.scale).toEqual([1, 1, 1]);
    expect(stage.props[0]?.isPortal).toBe(true);

    const charVisual = CharacterVisualBlueprintSchema.parse({
      characterId: 'char_sorrel',
      lineageId: 'lineage_sorrel',
      heightScale: 0.96,
      shoulderWidth: 0.48,
      spinePitchRadians: 0.22,
      gaitStyle: 'stooped',
      headgear: 'synod_cowl',
      cloak: 'waxed_mantle',
      heldPropLeft: 'taper_holder',
      heldPropRight: 'ledger_book',
      primaryColorHex: '#3a404a',
      accentColorHex: '#7a684b',
      mudLevel: 0.3,
      sootLevel: 0.2,
      droneDisguise: 'bronze_reliquary_lamp',
    });

    expect(charVisual.spinePitchRadians).toBeCloseTo(0.22);
    expect(charVisual.droneDisguise).toBe('bronze_reliquary_lamp');
  });

  it('rejects malformed hex colors, zero key-light vectors, non-wall motif parents, duplicate/mismatched IDs, inverted camera bounds, and out-of-range posture/grime values', () => {
    expect(() =>
      EpochVisualThemeSchema.parse({
        id: 'theme_bad',
        epochId: 'epoch_1',
        name: 'Bad Hex',
        stoneColorHex: 'not-a-hex',
        mudColorHex: '#3b3228',
        ironColorHex: '#2c3137',
        woodColorHex: '#523d2b',
      }),
    ).toThrow(/hex color/i);

    expect(() =>
      EpochVisualThemeSchema.parse({
        id: 'theme_zero_dir',
        epochId: 'epoch_1',
        stoneColorHex: '#4a525d',
        mudColorHex: '#3b3228',
        ironColorHex: '#2c3137',
        woodColorHex: '#523d2b',
        keyLightDirection: [0, 0, 0],
      }),
    ).toThrow(/non-zero 3D vector/i);

    expect(() => validateSemanticId('invalid..semantic/id')).toThrow(
      /canonical stage or NPC semanticId/i,
    );

    expect(() => formatWallMotifSemanticId('space_alpha.floor', 'ossuary_skull_niche')).toThrow(
      /must be a valid wall or alcove segment semanticId/i,
    );

    // 1. Negative footprint dimension
    expect(() =>
      StageSceneBlueprintSchema.parse({
        stageId: 'stage_neg',
        spaceId: 'space_alpha',
        footprint: { widthMeters: -10, depthMeters: 10, heightMeters: 4 },
        floorSemanticId: 'space_alpha.floor',
        wallSegments: [
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
        ],
        cameraVolumes: [
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [-5, 0, -5],
            boundsMax: [5, 4, 5],
            offset: [0, 6, 8],
          },
        ],
      }),
    ).toThrow();

    // 2. Mismatched floorSemanticId alone
    expect(() =>
      StageSceneBlueprintSchema.parse({
        stageId: 'stage_bad_floor',
        spaceId: 'space_alpha',
        footprint: { widthMeters: 10, depthMeters: 10, heightMeters: 4 },
        floorSemanticId: 'wrong_space.floor',
        wallSegments: [
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
        ],
        cameraVolumes: [
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [-5, 0, -5],
            boundsMax: [5, 4, 5],
            offset: [0, 6, 8],
          },
        ],
      }),
    ).toThrow(/floorSemanticId/i);

    // 3. Duplicate wall segment semanticId alone
    expect(() =>
      StageSceneBlueprintSchema.parse({
        stageId: 'stage_dup_wall',
        spaceId: 'space_alpha',
        footprint: { widthMeters: 10, depthMeters: 10, heightMeters: 4 },
        floorSemanticId: 'space_alpha.floor',
        wallSegments: [
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
        ],
        cameraVolumes: [
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [-5, 0, -5],
            boundsMax: [5, 4, 5],
            offset: [0, 6, 8],
          },
        ],
      }),
    ).toThrow(/Duplicate semanticId/i);

    // 4. Mismatched prop semanticId and duplicate prop semanticId
    expect(() =>
      StageSceneBlueprintSchema.parse({
        stageId: 'stage_bad_prop',
        spaceId: 'space_alpha',
        footprint: { widthMeters: 10, depthMeters: 10, heightMeters: 4 },
        floorSemanticId: 'space_alpha.floor',
        wallSegments: [
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
        ],
        props: [
          {
            propId: 'anvil_1',
            semanticId: 'space_alpha.prop.wrong_id',
            position: [1, 0, 1],
          },
        ],
        cameraVolumes: [
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [-5, 0, -5],
            boundsMax: [5, 4, 5],
            offset: [0, 6, 8],
          },
        ],
      }),
    ).toThrow(/Prop 'anvil_1' semanticId/i);

    expect(() =>
      StageSceneBlueprintSchema.parse({
        stageId: 'stage_dup_light',
        spaceId: 'space_alpha',
        footprint: { widthMeters: 10, depthMeters: 10, heightMeters: 4 },
        floorSemanticId: 'space_alpha.floor',
        wallSegments: [
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
        ],
        lights: [
          {
            id: 'torch_1',
            semanticId: 'space_alpha.light.torch_1',
            position: [0, 2, 0],
          },
          {
            id: 'torch_1',
            semanticId: 'space_alpha.light.torch_1',
            position: [1, 2, 0],
          },
        ],
        cameraVolumes: [
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [-5, 0, -5],
            boundsMax: [5, 4, 5],
            offset: [0, 6, 8],
          },
        ],
      }),
    ).toThrow(/Duplicate semanticId/i);

    expect(() =>
      StageSceneBlueprintSchema.parse({
        stageId: 'stage_dup_vol',
        spaceId: 'space_alpha',
        footprint: { widthMeters: 10, depthMeters: 10, heightMeters: 4 },
        floorSemanticId: 'space_alpha.floor',
        wallSegments: [
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
        ],
        cameraVolumes: [
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [-5, 0, -5],
            boundsMax: [5, 4, 5],
            offset: [0, 6, 8],
          },
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [-4, 0, -4],
            boundsMax: [4, 4, 4],
            offset: [0, 5, 7],
          },
        ],
      }),
    ).toThrow(/Duplicate cameraVolume id/i);

    // 5. Inverted camera boundsMin >= boundsMax
    expect(() =>
      StageSceneBlueprintSchema.parse({
        stageId: 'stage_bad_bounds',
        spaceId: 'space_alpha',
        footprint: { widthMeters: 10, depthMeters: 10, heightMeters: 4 },
        floorSemanticId: 'space_alpha.floor',
        wallSegments: [
          {
            segmentId: 'seg_01',
            compass: 'north',
            semanticId: 'space_alpha.wall.north.seg_01',
          },
        ],
        cameraVolumes: [
          {
            id: 'vol_1',
            spaceId: 'space_alpha',
            boundsMin: [5, 0, -5],
            boundsMax: [-5, 4, 5],
            offset: [0, 6, 8],
          },
        ],
      }),
    ).toThrow(/boundsMin must be strictly less than boundsMax/i);

    // 6. Out-of-range heightScale and mudLevel
    expect(() =>
      CharacterVisualBlueprintSchema.parse({
        characterId: 'char_bad_height',
        lineageId: 'lineage_bad',
        heightScale: 3.5,
        primaryColorHex: '#333333',
        accentColorHex: '#444444',
      }),
    ).toThrow();

    expect(() =>
      CharacterVisualBlueprintSchema.parse({
        characterId: 'char_bad_mud',
        lineageId: 'lineage_bad',
        mudLevel: 1.5,
        primaryColorHex: '#333333',
        accentColorHex: '#444444',
      }),
    ).toThrow();
  });

  it('rebinds lineage character visuals across epochs by lineageId first while preserving all posture and garment slots', () => {
    const era1Alpha = CharacterVisualBlueprintSchema.parse({
      characterId: 'char_era1_alpha',
      lineageId: 'lineage_alpha',
      heightScale: 1.05,
      shoulderWidth: 0.6,
      spinePitchRadians: 0.18,
      gaitStyle: 'measured',
      headgear: 'synod_cowl',
      cloak: 'waxed_mantle',
      heldPropLeft: 'taper_holder',
      heldPropRight: 'ledger_book',
      primaryColorHex: '#3a404a',
      accentColorHex: '#7a684b',
      mudLevel: 0.25,
      sootLevel: 0.15,
      droneDisguise: 'bronze_reliquary_lamp',
    });

    const unrelatedOtherLineage = CharacterVisualBlueprintSchema.parse({
      characterId: 'char_era2_descendant',
      lineageId: 'lineage_other',
      heightScale: 1.8,
      shoulderWidth: 0.9,
      spinePitchRadians: -0.2,
      gaitStyle: 'brisk',
      headgear: 'kettle_helm',
      cloak: 'none',
      heldPropLeft: 'gate_halberd',
      heldPropRight: 'none',
      primaryColorHex: '#111111',
      accentColorHex: '#222222',
    });

    const era2Theme = EpochVisualThemeSchema.parse({
      id: 'theme_era2_industrial',
      epochId: 'epoch_2',
      name: 'Era 2 Brass & Soot',
      stoneColorHex: '#555e68',
      mudColorHex: '#2f2923',
      ironColorHex: '#887245',
      woodColorHex: '#453528',
    });

    const preservedPalette = resolveCharacterVisualForTheme(
      [unrelatedOtherLineage, era1Alpha],
      { characterId: 'char_era2_descendant', lineageId: 'lineage_alpha' },
      era2Theme,
    );
    expect(preservedPalette.primaryColorHex).toBe('#3a404a');
    expect(preservedPalette.accentColorHex).toBe('#7a684b');
    expect(preservedPalette.heightScale).toBeCloseTo(1.05);
    expect(preservedPalette.shoulderWidth).toBeCloseTo(0.6);
    expect(preservedPalette.gaitStyle).toBe('measured');
    expect(preservedPalette.cloak).toBe('waxed_mantle');
    expect(preservedPalette.heldPropLeft).toBe('taper_holder');
    expect(preservedPalette.heldPropRight).toBe('ledger_book');
    expect(preservedPalette.mudLevel).toBeCloseTo(0.25);
    expect(preservedPalette.sootLevel).toBeCloseTo(0.15);

    const rebound = resolveCharacterVisualForTheme(
      [unrelatedOtherLineage, era1Alpha],
      { characterId: 'char_era2_descendant', lineageId: 'lineage_alpha' },
      era2Theme,
      {
        rebindPaletteToTheme: true,
        newDroneDisguise: 'surveying_theodolite',
      },
    );

    expect(rebound.characterId).toBe('char_era2_descendant');
    expect(rebound.lineageId).toBe('lineage_alpha');
    expect(rebound.spinePitchRadians).toBeCloseTo(0.18);
    expect(rebound.headgear).toBe('synod_cowl');
    expect(rebound.primaryColorHex).toBe('#555e68');
    expect(rebound.accentColorHex).toBe('#887245');
    expect(rebound.droneDisguise).toBe('surveying_theodolite');

    expect(() =>
      resolveCharacterVisualForTheme(
        [era1Alpha],
        { characterId: 'char_unknown', lineageId: 'lineage_unknown' },
        era2Theme,
      ),
    ).toThrow(/No CharacterVisualBlueprint found/);
  });
});
