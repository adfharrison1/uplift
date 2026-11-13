import { describe, expect, it } from 'vitest';
import { EpochModuleRegistry, type EpochModulePackInput } from '../../../src/domain/index.js';

function pack(
  packId: string,
  spaceId: string,
  imports: EpochModulePackInput['imports'] = [],
): EpochModulePackInput {
  return {
    packId,
    packVersion: 1,
    imports,
    epochId: 'epoch_test',
    spaces: [
      {
        id: spaceId,
        name: spaceId,
        kind: 'indoor_room',
        earshotRadiusMeters: 5,
        surfaceMaterial: 'stone',
        acousticClass: 'tight_interior',
        ambientMaskLoudness: 0.1,
        connectedSpaceIds: [],
        waypoints: [{ id: `wp_${spaceId}`, position: [0, 0, 0] }],
      },
    ],
  };
}

describe('EpochModuleRegistry pack identity', () => {
  it('rejects padded epoch IDs before binding or importing and permits a corrected retry', () => {
    const registry = new EpochModuleRegistry();
    expect(() =>
      registry.registerPack({ ...pack('primary', 'space_padded'), epochId: ' epoch_test ' }),
    ).toThrow(/epochId/);
    expect(registry.getPrimaryPackIdentity()).toBeUndefined();
    expect(() => registry.getSpace('space_padded')).toThrow(/Unknown space/);

    registry.registerPack(pack('primary', 'space_primary', [{ packId: 'cameo', packVersion: 1 }]));
    expect(() =>
      registry.registerPack({ ...pack('cameo', 'space_cameo_padded'), epochId: 'epoch_test ' }),
    ).toThrow(/epochId/);
    expect(() => registry.getSpace('space_cameo_padded')).toThrow(/Unknown space/);
    registry.registerPack(pack('cameo', 'space_cameo'));
    expect(registry.getSpace('space_cameo').id).toBe('space_cameo');
    expect(registry.getPrimaryPackIdentity()?.epochId).toBe('epoch_test');
  });

  it('retains the primary identity while registering a declared same-epoch cameo', () => {
    const registry = new EpochModuleRegistry();
    registry.registerPack(pack('primary', 'space_primary', [{ packId: 'cameo', packVersion: 1 }]));
    expect(registry.getPrimaryPackIdentity()).toEqual({
      epochId: 'epoch_test',
      packId: 'primary',
      packVersion: 1,
    });
    registry.registerPack(pack('cameo', 'space_cameo'));
    expect(registry.getSpace('space_cameo').id).toBe('space_cameo');
    expect(registry.getPrimaryPackIdentity()).toEqual({
      epochId: 'epoch_test',
      packId: 'primary',
      packVersion: 1,
    });
  });

  it('rejects undeclared, wrong-version, wrong-epoch and duplicate imports without losing the allowed retry', () => {
    const registry = new EpochModuleRegistry();
    registry.registerPack(pack('primary', 'space_primary', [{ packId: 'cameo', packVersion: 2 }]));
    expect(() => registry.registerPack(pack('unknown', 'space_unknown'))).toThrow(
      /declared import/,
    );
    expect(() => registry.getSpace('space_unknown')).toThrow(/Unknown space/);
    expect(() => registry.registerPack(pack('cameo', 'space_wrong_version'))).toThrow(
      /declared import/,
    );
    expect(() =>
      registry.registerPack({
        ...pack('cameo', 'space_wrong_epoch'),
        packVersion: 2,
        epochId: 'other_epoch',
      }),
    ).toThrow(/epoch/);
    expect(() => registry.getSpace('space_wrong_epoch')).toThrow(/Unknown space/);
    registry.registerPack({ ...pack('cameo', 'space_cameo'), packVersion: 2 });
    expect(() =>
      registry.registerPack({ ...pack('cameo', 'space_duplicate'), packVersion: 2 }),
    ).toThrow(/already registered/);
    expect(() => registry.getSpace('space_duplicate')).toThrow(/Unknown space/);
    expect(registry.getPrimaryPackIdentity()).toEqual({
      epochId: 'epoch_test',
      packId: 'primary',
      packVersion: 1,
    });
  });

  it('rejects invalid primary identities, duplicate declarations and direct-population binding', () => {
    const registry = new EpochModuleRegistry();
    expect(() => registry.registerPack(pack('', 'space_invalid_id'))).toThrow(/packId/);
    expect(() =>
      registry.registerPack({
        ...pack('primary', 'space_missing_id'),
        packId: undefined,
      } as unknown as EpochModulePackInput),
    ).toThrow(/packId/);
    expect(() =>
      registry.registerPack({
        ...pack('primary', 'space_missing_version'),
        packVersion: undefined,
      } as unknown as EpochModulePackInput),
    ).toThrow(/packVersion/);
    expect(() =>
      registry.registerPack({ ...pack('primary', 'space_invalid_version'), packVersion: 0 }),
    ).toThrow(/packVersion/);
    expect(() =>
      registry.registerPack({ ...pack('primary', 'space_fractional_version'), packVersion: 1.5 }),
    ).toThrow(/packVersion/);
    expect(() =>
      registry.registerPack({
        ...pack('primary', 'space_missing_imports'),
        imports: undefined,
      } as unknown as EpochModulePackInput),
    ).toThrow(/imports/);
    expect(() =>
      registry.registerPack(
        pack('primary', 'space_duplicate_imports', [
          { packId: 'cameo', packVersion: 1 },
          { packId: 'cameo', packVersion: 1 },
        ]),
      ),
    ).toThrow(/duplicate import/);
    expect(() =>
      registry.registerPack(
        pack('primary', 'space_invalid_import_version', [{ packId: 'cameo', packVersion: 0 }]),
      ),
    ).toThrow(/packVersion/);
    expect(registry.getPrimaryPackIdentity()).toBeUndefined();
    registry.registerSpaces(pack('direct', 'space_direct').spaces);
    expect(() => registry.registerPack(pack('primary', 'space_primary'))).toThrow(
      /directly populated/,
    );
    expect(registry.getPrimaryPackIdentity()).toBeUndefined();
    expect(registry.getSpace('space_direct').id).toBe('space_direct');
  });

  it('blocks every direct registration method after a primary pack binds the registry', () => {
    const registry = new EpochModuleRegistry();
    registry.registerPack(pack('primary', 'space_primary'));
    const directCalls: ReadonlyArray<() => void> = [
      () => registry.registerSpaces([]),
      () => registry.registerProps([]),
      () => registry.registerCharacters([]),
      () => registry.registerOffices([]),
      () => registry.registerQuietClaims([]),
      () => registry.registerRivals([]),
      () => registry.registerThreads([]),
      () => registry.registerChannels([]),
      () => registry.registerEmergencies([]),
      () =>
        registry.registerOrbitalPass({
          id: 'orbit_direct',
          zenithDurationTicks: 1,
          horizonDurationTicks: 1,
          occludedDurationTicks: 1,
          maxDelta: 1,
          slingshotCost: 1,
          burnCostPerTick: 1,
        }),
      () => registry.registerBehaviors([]),
    ];
    for (const directCall of directCalls) expect(directCall).toThrow(/bound registry/);
    expect(registry.getAllSpaces().map((space) => space.id)).toEqual(['space_primary']);
  });

  it('does not let a pack accessor invoke a direct registration during its transaction', () => {
    const registry = new EpochModuleRegistry();
    registry.registerPack(pack('primary', 'space_primary', [{ packId: 'cameo', packVersion: 1 }]));
    const rogueSpace = pack('rogue', 'space_rogue').spaces;
    const cameo = pack('cameo', 'space_cameo');
    let getterCalls = 0;
    Object.defineProperty(cameo, 'props', {
      get() {
        if (getterCalls++ === 0) registry.registerSpaces(rogueSpace);
        return [];
      },
    });
    expect(() => registry.registerPack(cameo)).toThrow(/bound registry/);
    expect(() => registry.getSpace('space_rogue')).toThrow(/Unknown space/);
    expect(() => registry.getSpace('space_cameo')).toThrow(/Unknown space/);
    registry.registerPack(pack('cameo', 'space_cameo'));
    expect(registry.getSpace('space_cameo').id).toBe('space_cameo');

    const emptyRegistry = new EpochModuleRegistry();
    const primaryWithGetter = pack('fresh_primary', 'space_fresh_primary');
    Object.defineProperty(primaryWithGetter, 'props', {
      get() {
        emptyRegistry.registerSpaces(rogueSpace);
        return [];
      },
    });
    expect(() => emptyRegistry.registerPack(primaryWithGetter)).toThrow(/bound registry/);
    expect(emptyRegistry.getPrimaryPackIdentity()).toBeUndefined();
    expect(() => emptyRegistry.getSpace('space_rogue')).toThrow(/Unknown space/);
    emptyRegistry.registerPack(pack('fresh_primary', 'space_fresh_primary'));
  });

  it('publishes the identity validated before blueprint getters run', () => {
    const registry = new EpochModuleRegistry();
    const primary = pack('primary', 'space_primary');
    const spaces = primary.spaces;
    Object.defineProperty(primary, 'spaces', {
      get() {
        Object.assign(primary, { packId: 'changed_after_validation', packVersion: 9 });
        return spaces;
      },
    });
    registry.registerPack(primary);
    expect(registry.getPrimaryPackIdentity()).toEqual({
      epochId: 'epoch_test',
      packId: 'primary',
      packVersion: 1,
    });
  });

  it('rolls back failed primary and imported pack blueprints and identity, then accepts a correction', () => {
    const registry = new EpochModuleRegistry();
    const invalidProp = {
      id: 'prop_bad',
      name: 'Bad Prop',
      spaceId: 'missing_space',
      waypointId: 'missing_waypoint',
      tier: 'static' as const,
      initialState: {},
    };
    expect(() =>
      registry.registerPack({ ...pack('primary', 'space_primary'), props: [invalidProp] }),
    ).toThrow(/unknown spaceId/);
    expect(registry.getPrimaryPackIdentity()).toBeUndefined();
    expect(() => registry.getSpace('space_primary')).toThrow(/Unknown space/);
    registry.registerPack(pack('primary', 'space_primary', [{ packId: 'cameo', packVersion: 1 }]));
    expect(() =>
      registry.registerPack({ ...pack('cameo', 'space_cameo'), props: [invalidProp] }),
    ).toThrow(/unknown spaceId/);
    expect(() => registry.getSpace('space_cameo')).toThrow(/Unknown space/);
    registry.registerPack(pack('cameo', 'space_cameo', [{ packId: 'unapproved', packVersion: 1 }]));
    expect(() => registry.registerPack(pack('unapproved', 'space_unapproved'))).toThrow(
      /declared import/,
    );
    expect(registry.getPrimaryPackIdentity()).toEqual({
      epochId: 'epoch_test',
      packId: 'primary',
      packVersion: 1,
    });
  });
});
