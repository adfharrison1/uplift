import { describe, expect, it } from 'vitest';
import {
  assertWaypointsOnStage,
  localXzInsideFootprint,
  spaceOrigin,
  toLocal,
  toWorld,
} from '../../../src/application/index.js';

describe('space frame', () => {
  it('centers a space on its waypoints and keeps authored height', () => {
    const origin = spaceOrigin([
      [6, 2, 1],
      [8, 2, 1],
    ]);
    expect(origin).toEqual([7, 0, 1]);
    expect(toLocal([8, 2, 1], origin)).toEqual([1, 2, 0]);
    expect(toWorld([1, 2, 0], origin)).toEqual([8, 2, 1]);
    expect(spaceOrigin([])).toEqual([0, 0, 0]);
  });

  it('rejects a local point outside the footprint and accepts the edge', () => {
    const footprint = { widthMeters: 12, depthMeters: 10 };
    expect(localXzInsideFootprint(6, 5, footprint)).toBe(true);
    expect(localXzInsideFootprint(6.01, 0, footprint)).toBe(false);
    expect(() =>
      assertWaypointsOnStage({ spaceId: 'space_room', footprint }, [
        { id: 'wp_a', position: [0, 3, 0] },
        { id: 'wp_b', position: [20, 3, 0] },
      ]),
    ).toThrow("Waypoint 'wp_a' is outside the floor of space 'space_room'");
  });
});
