import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  formatPropSemanticId,
  PlaySession,
  RenderFrameBuilder,
} from '../../../src/application/index.js';
import { makeStageBlueprint } from '../../support/makeStageBlueprint.js';
import { THEME, character, coordinatorFor, doorSession } from './PlaySessionFixtures.js';

describe('PlaySession stage selection and rendering', () => {
  it('does not name a content pack or an exemplar place or character', () => {
    const source = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../src/application/shell/PlaySession.ts',
      ),
      'utf8',
    );
    expect(source).not.toContain('char_player_operative');
    expect(source).not.toContain('char_yard_walker');
    expect(source).not.toContain('space_glass_yard');
    expect(source).not.toContain('space_player_chambers');
    expect(source).not.toContain('src/content');
    expect(source).not.toContain("from 'three'");
  });
  it('adopts the stage registered for a non-proving-slice space', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        packId: 'test_other_stage',
        packVersion: 1,
        imports: [],
        spaces: [
          {
            id: 'space_other',
            name: 'Other',
            kind: 'indoor_room',
            earshotRadiusMeters: 8,
            surfaceMaterial: 'stone',
            acousticClass: 'tight_interior',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_other', position: [0, 0, 0] }],
          },
        ],
        characters: [character('char_other', 'space_other', 'wp_other')],
      },
      'gameplay',
    );
    const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([['space_other', makeStageBlueprint('space_other')]]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_other',
    });
    expect(session.getResidentStage()?.spaceId).toBe('space_other');
    expect(session.frame(1 / 60).renderFrame?.activeSpaceId).toBe('space_other');
  });

  it('swaps to the yard stage after an open door and keeps the chambers stage when the door is barred', () => {
    const open = doorSession('open');
    expect(open.session.requestMove('wp_lane')).toBe('path');
    const arrived = open.session.frame(8);
    expect(open.coordinator.getWorldState().entities['char_walker']?.spaceId).toBe('space_yard');
    expect(arrived.residentStage?.spaceId).toBe('space_yard');
    expect(arrived.releasedStageId).toBe('stage_space_room');

    const barred = doorSession('barred');
    const before = barred.coordinator.getWorldState();
    expect(barred.session.requestMove('wp_lane')).toBe('blocked');
    expect(barred.coordinator.getWorldState()).toBe(before);
    expect(barred.session.getResidentStage()?.spaceId).toBe('space_room');
    expect(barred.session.getStatus()).toBe('blocked');
  });

  it('keeps the resident stage and reports missing_stage for an unregistered space', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        packId: 'test_missing_stage',
        packVersion: 1,
        imports: [],
        spaces: [
          {
            id: 'space_home',
            name: 'Home',
            kind: 'indoor_room',
            earshotRadiusMeters: 8,
            surfaceMaterial: 'stone',
            acousticClass: 'tight_interior',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_home', position: [0, 0, 0] }],
          },
          {
            id: 'space_unregistered',
            name: 'Unregistered',
            kind: 'outdoor_area',
            earshotRadiusMeters: 8,
            surfaceMaterial: 'earth',
            acousticClass: 'open_court',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_away', position: [30, 0, 0] }],
          },
        ],
        characters: [
          character('char_home', 'space_home', 'wp_home'),
          character('char_away', 'space_unregistered', 'wp_away'),
        ],
      },
      'gameplay',
    );
    const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([['space_home', makeStageBlueprint('space_home')]]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_home',
    });
    const established = session.frame(0);
    expect(established.residentStage?.spaceId).toBe('space_home');
    expect(session.setFocusEntity('char_away')).toBeNull();
    expect(session.getResidentStage()?.spaceId).toBe('space_home');
    expect(session.getStatus()).toBe('missing_stage');
    const kept = session.frame(1 / 60).renderFrame;
    expect(kept?.activeSpaceId).toBe('space_home');
    expect(kept?.camera.lookAt).toEqual([0, 0, 0]);

    const swapped = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([
        ['space_home', makeStageBlueprint('space_home')],
        ['space_unregistered', makeStageBlueprint('space_unregistered')],
      ]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_home',
    });
    expect(swapped.setFocusEntity('char_away')).toBe('stage_space_home');
    expect(swapped.getResidentStage()?.spaceId).toBe('space_unregistered');
    expect(swapped.getStatus()).toBe('ready');
  });

  it('draws entities and props around the space origin and keeps authored height', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        packId: 'test_space_origin',
        packVersion: 1,
        imports: [],
        spaces: [
          {
            id: 'space_lane',
            name: 'Lane',
            kind: 'outdoor_area',
            earshotRadiusMeters: 12,
            surfaceMaterial: 'mud',
            acousticClass: 'open_court',
            ambientMaskLoudness: 0.2,
            connectedSpaceIds: [],
            waypoints: [
              { id: 'wp_gate', position: [0, 1.25, 0] },
              { id: 'wp_door', position: [4, 1.25, 0] },
            ],
          },
        ],
        characters: [character('char_walker', 'space_lane', 'wp_door')],
      },
      'fast',
    );
    const stage = makeStageBlueprint('space_lane', {
      props: [
        {
          propId: 'prop_marker',
          semanticId: formatPropSemanticId('space_lane', 'prop_marker'),
          position: [4, 1.25, 0],
        },
      ],
    });
    const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([['space_lane', stage]]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_walker',
    });
    expect(session.getSpaceOrigin()).toEqual([2, 0, 0]);
    const frame = session.frame(1 / 60).renderFrame;
    expect(frame?.entityPoses.find((pose) => pose.entityId === 'char_walker')?.position).toEqual([
      2, 1.25, 0,
    ]);
    expect(frame?.propPoses[0]?.position).toEqual([2, 1.25, 0]);
  });

  it('rejects a launch whose waypoint is outside the stage floor', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        packId: 'test_wide_stage',
        packVersion: 1,
        imports: [],
        spaces: [
          {
            id: 'space_wide',
            name: 'Wide',
            kind: 'outdoor_area',
            earshotRadiusMeters: 12,
            surfaceMaterial: 'mud',
            acousticClass: 'open_court',
            ambientMaskLoudness: 0.2,
            connectedSpaceIds: [],
            waypoints: [
              { id: 'wp_near', position: [0, 0, 0] },
              { id: 'wp_far', position: [40, 0, 0] },
            ],
          },
        ],
        characters: [character('char_walker', 'space_wide', 'wp_near')],
      },
      'fast',
    );
    const world = coordinator.getWorldState();
    expect(
      () =>
        new PlaySession(coordinator, new RenderFrameBuilder(), {
          stages: new Map([['space_wide', makeStageBlueprint('space_wide')]]),
          characterVisuals: [],
          theme: THEME,
          focusEntityId: 'char_walker',
        }),
    ).toThrow("Waypoint 'wp_near' is outside the floor of space 'space_wide'");
    expect(coordinator.getWorldState()).toBe(world);
  });
});
