import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
  DEFAULT_HIGHGLASS_CHARACTER_VISUALS,
} from '../../../src/content/index.js';
import {
  FileSaveSlotRepository,
  NdjsonSessionTelemetry,
} from '../../../src/infrastructure/index.js';
import {
  handleLocalDiskBridgeRequest,
  isBridgeApiUrl,
  MAX_BRIDGE_BODY_BYTES,
} from '../../../src/interfaces/index.js';

describe('Vite Local Disk Bridge /api/scene-blueprints and /api/character-visuals endpoints', () => {
  let tempDir = '';
  let telemetry: NdjsonSessionTelemetry;
  let saves: FileSaveSlotRepository;
  let sceneBlueprintsDir = '';
  let characterVisualsDir = '';

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'uplift-scene-bridge-'));
    telemetry = new NdjsonSessionTelemetry(join(tempDir, 'logs'));
    saves = new FileSaveSlotRepository(join(tempDir, 'saves'));
    sceneBlueprintsDir = join(tempDir, 'stages');
    characterVisualsDir = join(tempDir, 'characters');
  });

  afterEach(() => {
    if (tempDir.length > 0) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('persists and loads valid StageSceneBlueprint and CharacterVisualBlueprint JSON atomically via PUT and GET while preserving existing telemetry/saves routes', () => {
    expect(isBridgeApiUrl('/api/scene-blueprints/stage_charnel_stairs')).toBe(true);
    expect(isBridgeApiUrl('/api/character-visuals/sorrel')).toBe(true);
    expect(isBridgeApiUrl('/other/route')).toBe(false);

    const putStageRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/scene-blueprints/stage_charnel_stairs',
        rawBody: JSON.stringify(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT),
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(putStageRes.statusCode).toBe(200);
    expect(putStageRes.body['blueprint']).toEqual(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT);

    const stageDiskFile = join(sceneBlueprintsDir, 'stage_charnel_stairs.json');
    expect(existsSync(stageDiskFile)).toBe(true);
    expect(readFileSync(stageDiskFile, 'utf8').endsWith('\n')).toBe(true);
    expect(readdirSync(sceneBlueprintsDir)).toEqual(['stage_charnel_stairs.json']);

    const getStageRes = handleLocalDiskBridgeRequest(
      {
        method: 'GET',
        url: '/api/scene-blueprints/stage_charnel_stairs',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(getStageRes.statusCode).toBe(200);
    expect(getStageRes.body['blueprint']).toEqual(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT);

    const sorrelVisual = DEFAULT_HIGHGLASS_CHARACTER_VISUALS.find(
      (v) => v.characterId === 'sorrel',
    );
    expect(sorrelVisual).toBeDefined();

    const putCharRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/character-visuals/sorrel',
        rawBody: JSON.stringify(sorrelVisual),
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(putCharRes.statusCode).toBe(200);
    expect(putCharRes.body['visual']).toEqual(sorrelVisual);

    const getCharRes = handleLocalDiskBridgeRequest(
      {
        method: 'GET',
        url: '/api/character-visuals/sorrel',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(getCharRes.statusCode).toBe(200);
    expect(getCharRes.body['visual']).toEqual(sorrelVisual);

    // Backwards compatibility with existing 3-arg call signature on /api/saves
    const listSavesRes = handleLocalDiskBridgeRequest(
      {
        method: 'GET',
        url: '/api/saves',
      },
      telemetry,
      saves,
    );
    expect(listSavesRes.statusCode).toBe(200);
  });

  it('rejects missing assets (404), unsupported methods (405), path traversal (400), URL/payload ID mismatches (400), malformed JSON/schemas (400), and oversized bodies (413) with zero disk writes', () => {
    const missingStageRes = handleLocalDiskBridgeRequest(
      {
        method: 'GET',
        url: '/api/scene-blueprints/missing_stage',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(missingStageRes.statusCode).toBe(404);

    const missingCharRes = handleLocalDiskBridgeRequest(
      {
        method: 'GET',
        url: '/api/character-visuals/missing_char',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(missingCharRes.statusCode).toBe(404);

    // Unsupported HTTP methods return 405
    const deleteStageRes = handleLocalDiskBridgeRequest(
      {
        method: 'DELETE',
        url: '/api/scene-blueprints/stage_charnel_stairs',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(deleteStageRes.statusCode).toBe(405);

    const postCharRes = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/character-visuals/sorrel',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(postCharRes.statusCode).toBe(405);

    // Path traversal (literal %2e%2e and ../secret)
    const percentTraversalRes = handleLocalDiskBridgeRequest(
      {
        method: 'GET',
        url: '/api/scene-blueprints/%2e%2e',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(percentTraversalRes.statusCode).toBe(400);

    const slashTraversalRes = handleLocalDiskBridgeRequest(
      {
        method: 'GET',
        url: '/api/character-visuals/../secret',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(slashTraversalRes.statusCode).toBe(400);

    // URL stageId or characterId does not match body
    const stageIdMismatchRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/scene-blueprints/different_stage_id',
        rawBody: JSON.stringify(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT),
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(stageIdMismatchRes.statusCode).toBe(400);

    const sorrelVisual = DEFAULT_HIGHGLASS_CHARACTER_VISUALS.find(
      (v) => v.characterId === 'sorrel',
    );
    const charIdMismatchRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/character-visuals/ellin_quell',
        rawBody: JSON.stringify(sorrelVisual),
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(charIdMismatchRes.statusCode).toBe(400);

    // Malformed JSON and invalid schema payload
    const malformedJsonRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/scene-blueprints/stage_charnel_stairs',
        rawBody: '{bad_json',
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(malformedJsonRes.statusCode).toBe(400);

    const badSchemaRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/character-visuals/sorrel',
        rawBody: JSON.stringify({ characterId: 'sorrel', invalid: true }),
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(badSchemaRes.statusCode).toBe(400);

    // Oversized body (>256 KiB)
    const oversizedRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/scene-blueprints/stage_charnel_stairs',
        bodyByteLength: MAX_BRIDGE_BODY_BYTES + 1,
      },
      telemetry,
      saves,
      MAX_BRIDGE_BODY_BYTES,
      { sceneBlueprintsDir, characterVisualsDir },
    );
    expect(oversizedRes.statusCode).toBe(413);

    // Zero disk files written after all rejected requests
    expect(existsSync(sceneBlueprintsDir)).toBe(false);
    expect(existsSync(characterVisualsDir)).toBe(false);
  });
});
