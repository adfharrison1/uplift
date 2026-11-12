import { describe, expect, it } from 'vitest';
import { PlaySession, RenderFrameBuilder } from '../../../src/application/index.js';
import { makeStageBlueprint } from '../../support/makeStageBlueprint.js';
import { THEME, character, coordinatorFor, doorSession } from './PlaySessionFixtures.js';

describe('PlaySession controls and frame behavior', () => {
  it('calls stepFrame once and then the cognitive pulse on a paused frame without dispatching', () => {
    const { coordinator, session } = doorSession('open');
    session.setPaused(true);
    const steps: number[] = [];
    const pulses: number[] = [];
    let dispatches = 0;
    const stepFrame = coordinator.stepFrame.bind(coordinator);
    const pulse = coordinator.pulseCognitiveScheduler.bind(coordinator);
    const dispatch = coordinator.dispatchEffects.bind(coordinator);
    coordinator.stepFrame = (dtSeconds: number) => {
      steps.push(dtSeconds);
      return stepFrame(dtSeconds);
    };
    coordinator.pulseCognitiveScheduler = () => {
      pulses.push(1);
      return pulse();
    };
    coordinator.dispatchEffects = (effects) => {
      dispatches += 1;
      return dispatch(effects);
    };
    session.frame(2);
    expect(steps).toEqual([2]);
    expect(pulses).toEqual([1]);
    expect(dispatches).toBe(0);
    expect(session.requestMove('wp_lane')).toBe('paused');
    expect(dispatches).toBe(0);
    expect(coordinator.getWorldState().entities['char_walker']?.position).toEqual([8, 0, 0]);
  });

  it('passes a 2 second delta through one step and does not open a second step', () => {
    const { coordinator, session } = doorSession('open', 'gameplay');
    const steps: number[] = [];
    const stepFrame = coordinator.stepFrame.bind(coordinator);
    coordinator.stepFrame = (dtSeconds: number) => {
      steps.push(dtSeconds);
      return stepFrame(dtSeconds);
    };
    session.frame(2);
    expect(steps).toEqual([2]);
    expect(coordinator.getWorldState().elapsedSimulationSeconds).toBeCloseTo(0.25);
  });

  it('ignores a distant floor point and moves to the nearest in-range waypoint', () => {
    const coordinator = coordinatorFor(
      {
        epochId: 'epoch_play',
        packId: 'test_floor_controls',
        packVersion: 1,
        imports: [],
        spaces: [
          {
            id: 'space_floor',
            name: 'Floor',
            kind: 'outdoor_area',
            earshotRadiusMeters: 12,
            surfaceMaterial: 'mud',
            acousticClass: 'open_court',
            ambientMaskLoudness: 0.2,
            connectedSpaceIds: [],
            waypoints: [
              { id: 'wp_near', position: [0, 0, 0] },
              { id: 'wp_far', position: [10, 0, 0] },
            ],
          },
          {
            id: 'space_elsewhere',
            name: 'Elsewhere',
            kind: 'indoor_room',
            earshotRadiusMeters: 6,
            surfaceMaterial: 'stone',
            acousticClass: 'tight_interior',
            ambientMaskLoudness: 0.1,
            connectedSpaceIds: [],
            waypoints: [{ id: 'wp_foreign', position: [5, 0, 5] }],
          },
        ],
        characters: [character('char_walker', 'space_floor', 'wp_near')],
      },
      'fast',
    );
    const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
      stages: new Map([['space_floor', makeStageBlueprint('space_floor')]]),
      characterVisuals: [],
      theme: THEME,
      focusEntityId: 'char_walker',
    });
    expect(session.clickFloor(5, 5)).toBe('miss');
    expect(coordinator.getWorldState().entities['char_walker']?.activePath).toEqual([]);

    expect(session.clickFloor(1.5, 0)).toBe('already_there');
    expect(session.clickFloor(10, 0)).toBe('path');
    expect(session.clickFloor(Number.NaN, 0)).toBe('miss');
    expect(
      coordinator
        .getWorldState()
        .entities['char_walker']?.activePath.map((target) => target.waypointId),
    ).toEqual(['wp_far']);

    session.setPaused(true);
    const paused = coordinator.getWorldState();
    expect(session.clickFloor(10, 0)).toBe('paused');
    expect(coordinator.getWorldState()).toBe(paused);
  });

  it('forwards reduced motion and leaves the body in place when the camera offset changes', () => {
    const { coordinator, session } = doorSession('open');
    const fromFrame = session.frame(1 / 60, { reduceMotionAndFlashing: true });
    expect(fromFrame.renderFrame?.suppressGodRays).toBe(true);
    const cleared = session.frame(1 / 60, { reduceMotionAndFlashing: false });
    expect(cleared.renderFrame?.suppressGodRays).toBe(false);
    session.setReduceMotionAndFlashing(true);
    const reduced = session.frame(1 / 60, { aspect: 2 });
    expect(reduced.renderFrame?.suppressGodRays).toBe(true);
    expect(reduced.renderFrame?.camera.aspect).toBe(2);

    session.setPaused(true);
    session.setCameraDeAnchored(true);
    session.setFreeCamOffset([4, 1, -2]);
    const before = coordinator.getWorldState().entities['char_walker']?.position;
    const framed = session.frame(1 / 60);
    expect(coordinator.getWorldState().entities['char_walker']?.position).toEqual(before);
    expect(framed.renderFrame?.camera.cameraMode).toBe('debug_free_cam');
    expect(framed.renderFrame?.inspectorCards).toEqual([]);
    expect(session.getFreeCamOffset()).toEqual([4, 1, -2]);
  });

  it('reports unknown_prop and does not change a prop', () => {
    const { coordinator, session } = doorSession('open');
    const before = coordinator.getWorldState();
    expect(session.requestPortalState('prop_missing', 'barred')).toBe('unknown_prop');
    expect(coordinator.getWorldState()).toBe(before);
    expect(session.getStatus()).toBe('unknown_prop');
  });
});
