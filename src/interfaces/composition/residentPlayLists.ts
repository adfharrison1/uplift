/**
 * Resident play lists (`src/interfaces/composition/residentPlayLists.ts`).
 *
 * Waypoint ids are cached per space. Focus buttons name the entities in the
 * focus entity's space, and a new world snapshot with the same occupants
 * keeps the previous array.
 */

const EMPTY_IDS: readonly string[] = [];

export interface ResidentPlayListSource {
  focusSpaceId(): string | undefined;
  entities(): Readonly<Record<string, { readonly spaceId: string }>>;
  waypointIds(spaceId: string): readonly string[] | undefined;
}

export interface ResidentPlayLists {
  waypointIds(): readonly string[];
  entityIds(): readonly string[];
}

export function createResidentPlayLists(source: ResidentPlayListSource): ResidentPlayLists {
  const waypointsBySpace = new Map<string, readonly string[]>();
  let entitySpaceId: string | undefined;
  let entityIds: readonly string[] = EMPTY_IDS;

  return {
    waypointIds(): readonly string[] {
      const spaceId = source.focusSpaceId();
      if (spaceId === undefined) {
        return EMPTY_IDS;
      }
      const cached = waypointsBySpace.get(spaceId);
      if (cached !== undefined) {
        return cached;
      }
      const ids = source.waypointIds(spaceId) ?? EMPTY_IDS;
      waypointsBySpace.set(spaceId, ids);
      return ids;
    },
    entityIds(): readonly string[] {
      const spaceId = source.focusSpaceId();
      if (spaceId === undefined) {
        entitySpaceId = undefined;
        entityIds = EMPTY_IDS;
        return EMPTY_IDS;
      }
      const next = idsInSpace(source.entities(), spaceId);
      if (spaceId === entitySpaceId && sameIds(next, entityIds)) {
        return entityIds;
      }
      entitySpaceId = spaceId;
      entityIds = next;
      return entityIds;
    },
  };
}

function idsInSpace(
  entities: Readonly<Record<string, { readonly spaceId: string }>>,
  spaceId: string,
): readonly string[] {
  const ids: string[] = [];
  for (const id in entities) {
    if (entities[id]?.spaceId === spaceId) {
      ids.push(id);
    }
  }
  ids.sort();
  return ids;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}
