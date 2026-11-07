import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SimulationCoordinator } from '../../../src/application/index.js';
import {
  STARTER_HOLD_CHAMBERS_STAGE,
  STARTER_HOLD_CHARACTER_VISUALS,
  STARTER_HOLD_PACK,
  STARTER_HOLD_STAGE_DIRECTORY,
  STARTER_HOLD_YARD_STAGE,
} from '../../../src/content/index.js';
import {
  EpochModuleRegistry,
  FAST_EVAL_PACING_CONFIG,
  planWaypointPath,
  type TelemetryClock,
} from '../../../src/domain/index.js';
import {
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../src/infrastructure/index.js';

const HIGHGLASS_IDS = [
  'space_glass_yard',
  'space_player_chambers',
  'char_yard_walker',
  'char_player_operative',
  'prop_chambers_door',
] as const;

function createClock(): TelemetryClock {
  return {
    nowIso(): string {
      return '2026-11-07T20:00:00.000Z';
    },
    elapsedSessionMs(): number {
      return 0;
    },
  };
}

function coordinator(): SimulationCoordinator {
  const registry = new EpochModuleRegistry();
  registry.registerPack(STARTER_HOLD_PACK);
  return new SimulationCoordinator({
    epochId: STARTER_HOLD_PACK.epochId,
    registry,
    telemetry: new InMemorySessionTelemetry('session_starter_hold', createClock()),
    saveRepository: new InMemorySaveSlotRepository(),
    clock: createClock(),
    pacingConfig: FAST_EVAL_PACING_CONFIG,
  });
}

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
      continue;
    }
    if (path.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

describe('starter hold pack and stages', () => {
  it('registers the yard, the chambers, the open door, and exactly two characters', () => {
    const registry = new EpochModuleRegistry();
    registry.registerPack(STARTER_HOLD_PACK);

    expect(registry.getSpace('space_glass_yard').kind).toBe('outdoor_area');
    expect(registry.getSpace('space_player_chambers').kind).toBe('indoor_room');
    const door = registry.getProp('prop_chambers_door');
    expect(door.portalState).toBe('open');
    expect(door.portalTargetWaypointId).toBe('wp_player_chambers_threshold');
    expect(registry.getWaypoint('wp_player_chambers_threshold').spaceId).toBe(
      'space_player_chambers',
    );
    expect(
      registry
        .getAllCharacters()
        .map((character) => character.id)
        .sort(),
    ).toEqual(['char_player_operative', 'char_yard_walker']);
    expect(STARTER_HOLD_PACK.offices).toBeUndefined();
    expect(STARTER_HOLD_PACK.rivals).toBeUndefined();
    expect(STARTER_HOLD_PACK.threads).toBeUndefined();
  });

  it('gives every pack character a visual with the same id and resolves both stages', () => {
    const characters = STARTER_HOLD_PACK.characters ?? [];
    expect(characters.length).toBeGreaterThan(0);
    for (const character of characters) {
      const matches = STARTER_HOLD_CHARACTER_VISUALS.filter(
        (visual) => visual.characterId === character.id,
      );
      expect(matches).toEqual([
        expect.objectContaining({
          characterId: character.id,
          lineageId: character.lineageId,
        }),
      ]);
    }
    expect(Object.keys(STARTER_HOLD_STAGE_DIRECTORY).sort()).toEqual(
      STARTER_HOLD_PACK.spaces.map((space) => space.id).sort(),
    );
    for (const space of STARTER_HOLD_PACK.spaces) {
      expect(STARTER_HOLD_STAGE_DIRECTORY[space.id]?.spaceId).toBe(space.id);
    }
  });

  it('poses the chambers door as a portal on the yard stage', () => {
    expect(STARTER_HOLD_YARD_STAGE.spaceId).toBe(STARTER_HOLD_PACK.spaces[0]?.id);
    expect(STARTER_HOLD_CHAMBERS_STAGE.spaceId).toBe(STARTER_HOLD_PACK.spaces[1]?.id);
    expect(
      STARTER_HOLD_YARD_STAGE.props.find((prop) => prop.propId === 'prop_chambers_door')?.isPortal,
    ).toBe(true);
  });

  it('keeps the Highglass ids out of domain and application source', () => {
    const sources = [...sourceFiles('src/domain'), ...sourceFiles('src/application')];
    const combined = sources.map((path) => readFileSync(path, 'utf8')).join('\n');
    for (const id of HIGHGLASS_IDS) {
      expect(combined).not.toContain(id);
    }
  });

  it('walks the yard character through the open door and plans the return', () => {
    const sim = coordinator();
    expect(sim.requestWaypointMove('char_yard_walker', 'wp_player_chambers_threshold')).toBe(
      'path',
    );
    const step = sim.stepFrame(10);
    const walker = step.state.entities['char_yard_walker'];
    expect(walker?.spaceId).toBe('space_player_chambers');
    expect(step.arrivals.some((event) => event.waypointId === 'wp_player_chambers_threshold')).toBe(
      true,
    );

    const door = step.state.props['prop_chambers_door'];
    const plan = planWaypointPath(
      sim.getRegistry().getAllSpaces(),
      [
        {
          nearWaypointId: 'wp_glass_yard_threshold',
          farWaypointId: 'wp_player_chambers_threshold',
          ...(door?.portalState !== undefined ? { portalState: door.portalState } : {}),
        },
      ],
      'wp_player_chambers_threshold',
      'wp_glass_yard_threshold',
    );
    expect(plan.status).toBe('path');
  });

  it('refuses the yard crossing when the door is barred', () => {
    const sim = coordinator();
    expect(sim.requestSetPortalState('prop_chambers_door', 'barred')).toBe('updated');
    expect(sim.requestWaypointMove('char_yard_walker', 'wp_player_chambers_threshold')).toBe(
      'blocked',
    );
    expect(sim.getWorldState().entities['char_yard_walker']?.spaceId).toBe('space_glass_yard');
  });
});
