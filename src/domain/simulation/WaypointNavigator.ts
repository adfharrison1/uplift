/**
 * Deterministic waypoint planning and portal truncation
 * (`src/domain/simulation/WaypointNavigator.ts`).
 *
 * Breadth-first routes across same-space neighbor edges and passable portals.
 * An in-flight path is cut once, before kinematics, when a hop would cross a
 * closed or barred portal. No portal state is read while a frame is integrating.
 */
import type { PortalState, SpaceNodeBlueprint } from '../registries/EpochBlueprints.js';
import type { WaypointTarget } from './WorldState.js';

export interface PortalGate {
  readonly nearWaypointId: string;
  /** Absent when the prop is hinge/acoustic only and adds no graph edge. */
  readonly farWaypointId?: string | undefined;
  readonly portalState?: PortalState | undefined;
}

export interface WaypointPlan {
  readonly status: 'path' | 'already_there' | 'blocked' | 'unknown_waypoint';
  readonly path: ReadonlyArray<WaypointTarget>;
}

interface GraphNode {
  readonly spaceId: string;
  readonly position: readonly [number, number, number];
}

const EMPTY_PATH: readonly [] = [];

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function rememberPair(pairs: Map<string, Set<string>>, left: string, right: string): void {
  let fromLeft = pairs.get(left);
  if (fromLeft === undefined) {
    fromLeft = new Set();
    pairs.set(left, fromLeft);
  }
  fromLeft.add(right);
  let fromRight = pairs.get(right);
  if (fromRight === undefined) {
    fromRight = new Set();
    pairs.set(right, fromRight);
  }
  fromRight.add(left);
}

function hasPair(
  pairs: ReadonlyMap<string, ReadonlySet<string>>,
  left: string,
  right: string,
): boolean {
  return pairs.get(left)?.has(right) === true;
}

function nodeInSpace(
  nodes: ReadonlyMap<string, GraphNode>,
  waypointId: string,
  spaceId: string,
): boolean {
  return nodes.get(waypointId)?.spaceId === spaceId;
}

function isPassable(portalState: PortalState | undefined): boolean {
  return portalState === 'open' || portalState === 'ajar';
}

function link(adjacency: Map<string, Set<string>>, left: string, right: string): void {
  if (left === right) {
    return;
  }
  let leftNeighbors = adjacency.get(left);
  if (leftNeighbors === undefined) {
    leftNeighbors = new Set();
    adjacency.set(left, leftNeighbors);
  }
  let rightNeighbors = adjacency.get(right);
  if (rightNeighbors === undefined) {
    rightNeighbors = new Set();
    adjacency.set(right, rightNeighbors);
  }
  leftNeighbors.add(right);
  rightNeighbors.add(left);
}

function buildGraph(
  spaces: ReadonlyArray<SpaceNodeBlueprint>,
  portals: ReadonlyArray<PortalGate>,
): {
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly neighbors: ReadonlyMap<string, readonly string[]>;
} {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, Set<string>>();

  for (const space of spaces) {
    for (const waypoint of space.waypoints) {
      if (!nodes.has(waypoint.id)) {
        nodes.set(waypoint.id, { spaceId: space.id, position: waypoint.position });
      }
    }

    const explicit = space.waypoints.some(
      (waypoint) => (waypoint.neighborWaypointIds?.length ?? 0) > 0,
    );
    if (explicit) {
      for (const waypoint of space.waypoints) {
        for (const neighborId of waypoint.neighborWaypointIds ?? []) {
          if (
            !nodeInSpace(nodes, waypoint.id, space.id) ||
            !nodeInSpace(nodes, neighborId, space.id)
          ) {
            continue;
          }
          link(adjacency, waypoint.id, neighborId);
        }
      }
      continue;
    }

    for (let index = 1; index < space.waypoints.length; index += 1) {
      const previous = space.waypoints[index - 1];
      const current = space.waypoints[index];
      if (
        previous === undefined ||
        current === undefined ||
        !nodeInSpace(nodes, previous.id, space.id) ||
        !nodeInSpace(nodes, current.id, space.id)
      ) {
        continue;
      }
      link(adjacency, previous.id, current.id);
    }
  }

  for (const portal of portals) {
    const farWaypointId = portal.farWaypointId;
    if (farWaypointId === undefined || !isPassable(portal.portalState)) {
      continue;
    }
    if (!nodes.has(portal.nearWaypointId) || !nodes.has(farWaypointId)) {
      continue;
    }
    link(adjacency, portal.nearWaypointId, farWaypointId);
  }

  const neighbors = new Map<string, readonly string[]>();
  for (const [waypointId, neighborIds] of adjacency) {
    neighbors.set(waypointId, [...neighborIds].sort(compareCodeUnits));
  }
  return { nodes, neighbors };
}

function toTarget(waypointId: string, node: GraphNode): WaypointTarget {
  return {
    waypointId,
    spaceId: node.spaceId,
    position: [node.position[0], node.position[1], node.position[2]],
  };
}

function reconstructPath(
  parent: ReadonlyMap<string, string>,
  fromWaypointId: string,
  toWaypointId: string,
  nodes: ReadonlyMap<string, GraphNode>,
): ReadonlyArray<WaypointTarget> | undefined {
  const waypointIds: string[] = [];
  let cursor: string | undefined = toWaypointId;
  while (cursor !== undefined && cursor !== fromWaypointId) {
    waypointIds.push(cursor);
    cursor = parent.get(cursor);
  }
  if (cursor !== fromWaypointId) {
    return undefined;
  }
  waypointIds.reverse();
  const path: WaypointTarget[] = [];
  for (const waypointId of waypointIds) {
    const node = nodes.get(waypointId);
    if (node === undefined) {
      return undefined;
    }
    path.push(toTarget(waypointId, node));
  }
  return path;
}

/**
 * Plan from `fromWaypointId` to `toWaypointId`. The path omits the start and
 * includes the destination. Neighbor ids expand in ascending id order.
 */
export function planWaypointPath(
  spaces: ReadonlyArray<SpaceNodeBlueprint>,
  portals: ReadonlyArray<PortalGate>,
  fromWaypointId: string,
  toWaypointId: string,
): WaypointPlan {
  const { nodes, neighbors } = buildGraph(spaces, portals);
  if (!nodes.has(fromWaypointId) || !nodes.has(toWaypointId)) {
    return { status: 'unknown_waypoint', path: EMPTY_PATH };
  }
  if (fromWaypointId === toWaypointId) {
    return { status: 'already_there', path: EMPTY_PATH };
  }

  const parent = new Map<string, string>();
  const queue: string[] = [fromWaypointId];
  const seen = new Set<string>([fromWaypointId]);
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (current === undefined) {
      break;
    }
    for (const nextId of neighbors.get(current) ?? []) {
      if (seen.has(nextId)) {
        continue;
      }
      seen.add(nextId);
      parent.set(nextId, current);
      if (nextId === toWaypointId) {
        const path = reconstructPath(parent, fromWaypointId, toWaypointId, nodes);
        if (path === undefined) {
          return { status: 'blocked', path: EMPTY_PATH };
        }
        return { status: 'path', path };
      }
      queue.push(nextId);
    }
  }
  return { status: 'blocked', path: EMPTY_PATH };
}

/**
 * Drop the first hop that crosses a `closed` or `barred` portal, and every
 * target after it. The first hop is `currentWaypointId` to `activePath[0]`.
 * Returns the same array when nothing is removed.
 */
export function truncatePathAtClosedPortals(
  currentWaypointId: string,
  activePath: ReadonlyArray<WaypointTarget>,
  portals: ReadonlyArray<PortalGate>,
): ReadonlyArray<WaypointTarget> {
  if (activePath.length === 0) {
    return activePath;
  }

  const passable = new Map<string, Set<string>>();
  const closed = new Map<string, Set<string>>();
  for (const portal of portals) {
    const farWaypointId = portal.farWaypointId;
    if (farWaypointId === undefined || farWaypointId === portal.nearWaypointId) {
      continue;
    }
    if (isPassable(portal.portalState)) {
      rememberPair(passable, portal.nearWaypointId, farWaypointId);
    } else if (portal.portalState === 'closed' || portal.portalState === 'barred') {
      rememberPair(closed, portal.nearWaypointId, farWaypointId);
    }
  }

  let previousWaypointId = currentWaypointId;
  for (let index = 0; index < activePath.length; index += 1) {
    const entry = activePath[index];
    if (entry === undefined) {
      return activePath.slice(0, index);
    }
    if (
      hasPair(closed, previousWaypointId, entry.waypointId) &&
      !hasPair(passable, previousWaypointId, entry.waypointId)
    ) {
      return activePath.slice(0, index);
    }
    previousWaypointId = entry.waypointId;
  }
  return activePath;
}
