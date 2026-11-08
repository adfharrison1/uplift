import { describe, expect, it } from 'vitest';
import { createResidentPlayLists } from '../../../src/interfaces/composition/residentPlayLists.js';

describe('resident play lists', () => {
  it('caches waypoint ids per space and lists only the entities in the focus space', () => {
    let focusSpaceId: string | undefined = 'space_room';
    let entities: Readonly<Record<string, { readonly spaceId: string }>> = {
      char_here: { spaceId: 'space_room' },
      char_away: { spaceId: 'space_yard' },
    };
    let waypointReads = 0;
    const lists = createResidentPlayLists({
      focusSpaceId: () => focusSpaceId,
      entities: () => entities,
      waypointIds: (spaceId) => {
        waypointReads += 1;
        return spaceId === 'space_room' ? ['wp_hearth', 'wp_door'] : ['wp_gate'];
      },
    });

    const roomWaypoints = lists.waypointIds();
    expect(lists.waypointIds()).toBe(roomWaypoints);
    expect(waypointReads).toBe(1);
    expect(roomWaypoints).toEqual(['wp_hearth', 'wp_door']);

    const roomEntities = lists.entityIds();
    expect(roomEntities).toEqual(['char_here']);
    entities = {
      char_here: { spaceId: 'space_room' },
      char_away: { spaceId: 'space_yard' },
    };
    expect(lists.entityIds()).toBe(roomEntities);

    entities = {
      char_here: { spaceId: 'space_room' },
      char_guest: { spaceId: 'space_room' },
      char_away: { spaceId: 'space_yard' },
    };
    expect(lists.entityIds()).toEqual(['char_guest', 'char_here']);

    focusSpaceId = 'space_yard';
    expect(lists.waypointIds()).toEqual(['wp_gate']);
    expect(lists.entityIds()).toEqual(['char_away']);
    expect(waypointReads).toBe(2);
    focusSpaceId = 'space_room';
    expect(lists.waypointIds()).toBe(roomWaypoints);
    expect(waypointReads).toBe(2);

    focusSpaceId = undefined;
    expect(lists.waypointIds()).toEqual([]);
    expect(lists.entityIds()).toEqual([]);
  });
});
