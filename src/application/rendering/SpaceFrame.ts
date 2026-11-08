/**
 * Space frame for a loaded stage (`src/application/rendering/SpaceFrame.ts`).
 *
 * Waypoints and stage props stay in world coordinates. The origin is the
 * center of one space's waypoints on X and Z, with Y left at 0. The floor,
 * the walls, and the camera volume stay centered on the stage. A point keeps
 * its authored Y, so a stair can leave the slab vertically and still cannot
 * leave it sideways.
 */

export interface StageFootprintMeters {
  readonly widthMeters: number;
  readonly depthMeters: number;
}

export function spaceOrigin(
  positions: readonly (readonly [number, number, number])[],
): readonly [number, number, number] {
  const first = positions[0];
  if (first === undefined) {
    return [0, 0, 0];
  }
  let minX = first[0];
  let maxX = first[0];
  let minZ = first[2];
  let maxZ = first[2];
  for (const position of positions) {
    minX = Math.min(minX, position[0]);
    maxX = Math.max(maxX, position[0]);
    minZ = Math.min(minZ, position[2]);
    maxZ = Math.max(maxZ, position[2]);
  }
  return [(minX + maxX) / 2, 0, (minZ + maxZ) / 2];
}

export function toLocal(
  world: readonly [number, number, number],
  origin: readonly [number, number, number],
): readonly [number, number, number] {
  return [world[0] - origin[0], world[1], world[2] - origin[2]];
}

export function toWorld(
  local: readonly [number, number, number],
  origin: readonly [number, number, number],
): readonly [number, number, number] {
  return [local[0] + origin[0], local[1], local[2] + origin[2]];
}

export function localXzInsideFootprint(
  x: number,
  z: number,
  footprint: StageFootprintMeters,
): boolean {
  return Math.abs(x) <= footprint.widthMeters / 2 && Math.abs(z) <= footprint.depthMeters / 2;
}

export function assertWaypointsOnStage(
  stage: { readonly spaceId: string; readonly footprint: StageFootprintMeters },
  waypoints: readonly {
    readonly id: string;
    readonly position: readonly [number, number, number];
  }[],
): void {
  const origin = spaceOrigin(waypoints.map((waypoint) => waypoint.position));
  for (const waypoint of waypoints) {
    const local = toLocal(waypoint.position, origin);
    if (!localXzInsideFootprint(local[0], local[2], stage.footprint)) {
      throw new Error(`Waypoint '${waypoint.id}' is outside the floor of space '${stage.spaceId}'`);
    }
  }
}
