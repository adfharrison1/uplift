import { describe, expect, it } from 'vitest';
import type {
  SpaceKind,
  SpaceNodeBlueprint,
  WaypointBlueprint,
} from '../../../src/domain/index.js';
import {
  planWaypointPath,
  type PortalGate,
  truncatePathAtClosedPortals,
  type WaypointPlan,
} from '../../../src/domain/index.js';
import type { WaypointTarget } from '../../../src/domain/simulation/WorldState.js';

function room(
  id: string,
  waypoints: ReadonlyArray<WaypointBlueprint>,
  connectedSpaceIds: readonly string[] = [],
  kind: SpaceKind = 'indoor_room',
): SpaceNodeBlueprint {
  return {
    id,
    name: id,
    kind,
    earshotRadiusMeters: 8,
    surfaceMaterial: kind === 'outdoor_area' ? 'mud' : 'stone',
    acousticClass: kind === 'outdoor_area' ? 'open_court' : 'tight_interior',
    ambientMaskLoudness: 0.2,
    connectedSpaceIds,
    waypoints,
  };
}

function target(
  waypointId: string,
  spaceId: string,
  position: readonly [number, number, number],
): WaypointTarget {
  return { waypointId, spaceId, position };
}

const yard = room(
  'space_yard',
  [
    { id: 'wp_lane', position: [0, 0, 0] },
    { id: 'wp_door', position: [4, 0, 0] },
  ],
  ['space_chambers'],
  'outdoor_area',
);
const chambers = room('space_chambers', [{ id: 'wp_inside', position: [6, 1, 2] }], ['space_yard']);
const door = (portalState: PortalGate['portalState']): PortalGate => ({
  nearWaypointId: 'wp_door',
  farWaypointId: 'wp_inside',
  portalState,
});

describe('planWaypointPath', () => {
  it('crosses an open portal and records the far space', () => {
    const plan = planWaypointPath([yard, chambers], [door('open')], 'wp_lane', 'wp_inside');
    expect(plan.status).toBe('path');
    expect(plan.path.map((entry) => entry.waypointId)).toEqual(['wp_door', 'wp_inside']);
    expect(plan.path[1]).toEqual({
      waypointId: 'wp_inside',
      spaceId: 'space_chambers',
      position: [6, 1, 2],
    });
  });

  it('treats an ajar portal as an undirected edge', () => {
    const spaces = [yard, chambers];
    const portals = [door('ajar')];
    const outbound = planWaypointPath(spaces, portals, 'wp_lane', 'wp_inside');
    const inbound = planWaypointPath(spaces, portals, 'wp_inside', 'wp_lane');
    expect(outbound.path.map((entry) => entry.waypointId)).toEqual(['wp_door', 'wp_inside']);
    expect(inbound.path.map((entry) => entry.waypointId)).toEqual(['wp_door', 'wp_lane']);
    expect(inbound.path[1]?.spaceId).toBe('space_yard');
  });

  it('returns blocked for a closed or barred portal when no other route exists', () => {
    for (const portalState of ['closed', 'barred'] as const) {
      const plan = planWaypointPath([yard, chambers], [door(portalState)], 'wp_lane', 'wp_inside');
      expect(plan).toEqual({ status: 'blocked', path: [] });
    }
  });

  it('returns already_there or unknown_waypoint without inventing coordinates', () => {
    expect(planWaypointPath([yard, chambers], [], 'wp_door', 'wp_door')).toEqual({
      status: 'already_there',
      path: [],
    });
    expect(planWaypointPath([yard, chambers], [], 'wp_missing', 'wp_missing')).toEqual({
      status: 'unknown_waypoint',
      path: [],
    });
    expect(planWaypointPath([yard, chambers], [], 'wp_lane', 'wp_missing')).toEqual({
      status: 'unknown_waypoint',
      path: [],
    });
  });

  it('uses a declaration-order chain only when no neighbor list is authored', () => {
    const chained = room('space_chain', [
      { id: 'wp_a', position: [0, 0, 0] },
      { id: 'wp_b', position: [1, 0, 0] },
      { id: 'wp_c', position: [2, 0, 0] },
    ]);
    const forward = planWaypointPath([chained], [], 'wp_a', 'wp_c');
    const backward = planWaypointPath([chained], [], 'wp_c', 'wp_a');
    expect(forward.path.map((entry) => entry.waypointId)).toEqual(['wp_b', 'wp_c']);
    expect(backward.path.map((entry) => entry.waypointId)).toEqual(['wp_b', 'wp_a']);
  });

  it('does not fall back to a chain when any neighbor list is explicit', () => {
    const lane = room('space_lane', [
      { id: 'wp_a', position: [0, 0, 0], neighborWaypointIds: ['wp_c'] },
      { id: 'wp_b', position: [1, 0, 0] },
      { id: 'wp_c', position: [2, 0, 0] },
    ]);
    expect(
      planWaypointPath([lane], [], 'wp_a', 'wp_c').path.map((entry) => entry.waypointId),
    ).toEqual(['wp_c']);
    expect(planWaypointPath([lane], [], 'wp_a', 'wp_b').status).toBe('blocked');
    expect(planWaypointPath([lane], [], 'wp_b', 'wp_c').status).toBe('blocked');
  });

  it('walks a one-sided neighbor listing in both directions', () => {
    const pair = room('space_pair', [
      { id: 'wp_left', position: [0, 0, 0], neighborWaypointIds: ['wp_right'] },
      { id: 'wp_right', position: [1, 0, 0] },
    ]);
    expect(
      planWaypointPath([pair], [], 'wp_right', 'wp_left').path.map((entry) => entry.waypointId),
    ).toEqual(['wp_left']);
  });

  it('expands equal-length branches in ascending waypoint-id order', () => {
    const fork = room('space_fork', [
      { id: 'wp_s', position: [0, 0, 0], neighborWaypointIds: ['wp_b', 'wp_a'] },
      { id: 'wp_b', position: [1, 0, 1], neighborWaypointIds: ['wp_goal'] },
      { id: 'wp_a', position: [1, 0, -1], neighborWaypointIds: ['wp_goal'] },
      { id: 'wp_goal', position: [2, 0, 0] },
    ]);
    const plan = planWaypointPath([fork], [], 'wp_s', 'wp_goal');
    expect(plan.path.map((entry) => entry.waypointId)).toEqual(['wp_a', 'wp_goal']);
    expect(planWaypointPath([fork], [], 'wp_s', 'wp_goal')).toEqual(plan);
  });

  it('does not bridge two spaces through a duplicated waypoint id', () => {
    const first = room('space_a', [
      { id: 'wp_1', position: [0, 0, 0] },
      { id: 'wp_2', position: [1, 0, 0] },
    ]);
    const chainedDuplicate = room('space_b', [
      { id: 'wp_2', position: [2, 0, 0] },
      { id: 'wp_3', position: [3, 0, 0] },
    ]);
    const explicitDuplicate = room('space_b', [
      { id: 'wp_2', position: [2, 0, 0], neighborWaypointIds: ['wp_3'] },
      { id: 'wp_3', position: [3, 0, 0], neighborWaypointIds: ['wp_2'] },
    ]);
    expect(planWaypointPath([first, chainedDuplicate], [], 'wp_1', 'wp_3').status).toBe('blocked');
    expect(planWaypointPath([first, explicitDuplicate], [], 'wp_1', 'wp_3').status).toBe('blocked');
  });

  it('ignores a hinge that has portal state and no target waypoint', () => {
    const hinge: PortalGate = { nearWaypointId: 'wp_door', portalState: 'open' };
    const plan = planWaypointPath([yard, chambers], [hinge], 'wp_lane', 'wp_inside');
    expect(plan.status).toBe('blocked');
  });
});

describe('truncatePathAtClosedPortals', () => {
  const farSide = target('wp_inside', 'space_chambers', [6, 1, 2]);
  const nearSide = target('wp_door', 'space_yard', [4, 0, 0]);
  const beyond = target('wp_hearth', 'space_chambers', [8, 1, 2]);

  it('clears a far-side hop when the entity is already on the near waypoint', () => {
    for (const portalState of ['closed', 'barred'] as const) {
      const path = truncatePathAtClosedPortals('wp_door', [farSide], [door(portalState)]);
      expect(path).toEqual([]);
    }
  });

  it('keeps the near side and drops the far side and everything after it', () => {
    const path = truncatePathAtClosedPortals(
      'wp_lane',
      [nearSide, farSide, beyond],
      [door('barred')],
    );
    expect(path.map((entry) => entry.waypointId)).toEqual(['wp_door']);
  });

  it('leaves an open crossing and same-space hops unchanged', () => {
    const crossing = [nearSide, farSide];
    expect(truncatePathAtClosedPortals('wp_lane', crossing, [door('open')])).toBe(crossing);
    expect(truncatePathAtClosedPortals('wp_lane', crossing, [door('ajar')])).toBe(crossing);
    const indoor = [target('wp_b', 'space_chain', [1, 0, 0])];
    expect(truncatePathAtClosedPortals('wp_a', indoor, [door('barred')])).toBe(indoor);
  });

  it('keeps a crossing when another portal on the same pair is still passable', () => {
    const crossing = [farSide];
    const portals: readonly PortalGate[] = [door('barred'), door('open')];
    expect(truncatePathAtClosedPortals('wp_door', crossing, portals)).toBe(crossing);
    const plan: WaypointPlan = planWaypointPath([yard, chambers], portals, 'wp_lane', 'wp_inside');
    expect(plan.status).toBe('path');
  });

  it('does not confuse portal pairs whose ids contain a separator', () => {
    const hop = [target('c', 'space_far', [1, 0, 0])];
    const unrelated = truncatePathAtClosedPortals('a\0b', hop, [
      { nearWaypointId: 'a', farWaypointId: 'b\0c', portalState: 'barred' },
    ]);
    expect(unrelated).toBe(hop);
    expect(
      truncatePathAtClosedPortals('a\0b', hop, [
        { nearWaypointId: 'a', farWaypointId: 'b\0c', portalState: 'open' },
        { nearWaypointId: 'a\0b', farWaypointId: 'c', portalState: 'barred' },
      ]),
    ).toEqual([]);
  });
});
