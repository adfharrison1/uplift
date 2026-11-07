/**
 * 2D spatial hash for embodied entity positions (`src/domain/simulation/SpatialHashGrid.ts`).
 *
 * Cells are 2 meters on XZ. A 0.75 meter query reads the 3×3 neighborhood and
 * returns ids in ascending order. Off-stage bodies are left out of the grid.
 */
import type { SpaceKind } from '../registries/EpochBlueprints.js';

export const SPATIAL_HASH_CELL_METERS = 2;

export interface EmbodiedHashBody {
  readonly entityId: string;
  readonly spaceId: string;
  readonly x: number;
  readonly z: number;
}

interface HashedBody {
  readonly entityId: string;
  readonly x: number;
  readonly z: number;
}

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function cellIndex(coord: number): number {
  return Math.floor(coord / SPATIAL_HASH_CELL_METERS);
}

function cellKey(ix: number, iz: number): string {
  return `${String(ix)},${String(iz)}`;
}

export class SpatialHashGrid {
  private readonly cells = new Map<string, HashedBody[]>();
  private readonly ids = new Set<string>();

  public has(entityId: string): boolean {
    return this.ids.has(entityId);
  }

  public insert(entityId: string, x: number, z: number): void {
    if (this.ids.has(entityId)) {
      return;
    }
    this.ids.add(entityId);
    const key = cellKey(cellIndex(x), cellIndex(z));
    const bucket = this.cells.get(key);
    const body: HashedBody = { entityId, x, z };
    if (bucket === undefined) {
      this.cells.set(key, [body]);
      return;
    }
    bucket.push(body);
  }

  /** Ids within `radiusMeters` on XZ, drawn from the 3×3 cells around `x`,`z`, sorted ascending. */
  public query(x: number, z: number, radiusMeters: number): readonly string[] {
    const cx = cellIndex(x);
    const cz = cellIndex(z);
    const radiusSq = radiusMeters * radiusMeters;
    const found: string[] = [];
    for (let iz = cz - 1; iz <= cz + 1; iz += 1) {
      for (let ix = cx - 1; ix <= cx + 1; ix += 1) {
        const bucket = this.cells.get(cellKey(ix, iz));
        if (bucket === undefined) {
          continue;
        }
        for (const body of bucket) {
          const dx = body.x - x;
          const dz = body.z - z;
          if (dx * dx + dz * dz <= radiusSq) {
            found.push(body.entityId);
          }
        }
      }
    }
    found.sort(compareCodeUnits);
    return found;
  }
}

/** Index every body whose space is not `off_stage_region`. An omitted directory embodies every body. */
export function insertEmbodiedBodies(
  bodies: ReadonlyArray<EmbodiedHashBody>,
  spaceKinds?: ReadonlyMap<string, SpaceKind> | undefined,
): SpatialHashGrid {
  const grid = new SpatialHashGrid();
  for (const body of bodies) {
    if (spaceKinds !== undefined && spaceKinds.get(body.spaceId) === 'off_stage_region') {
      continue;
    }
    grid.insert(body.entityId, body.x, body.z);
  }
  return grid;
}
