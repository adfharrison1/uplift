import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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
import {
  nodeLocalFileOps,
  type LocalFileOptions,
} from '../../../src/infrastructure/persistence/safeLocalFiles.js';

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
  const character = DEFAULT_HIGHGLASS_CHARACTER_VISUALS.find(
    (visual) => visual.characterId === 'sorrel',
  );
  if (character === undefined) throw new Error('Missing character visual fixture');
  const assets = [
    {
      family: 'stage',
      prefix: '/api/scene-blueprints/',
      id: 'stage_charnel_stairs',
      payload: DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
      replacement: { ...DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT, themeId: 'alternate_theme' },
      directoryKey: 'sceneBlueprintsDir' as const,
      responseKey: 'blueprint',
    },
    {
      family: 'character',
      prefix: '/api/character-visuals/',
      id: 'sorrel',
      payload: character,
      replacement: { ...character, heightScale: 1.75 },
      directoryKey: 'characterVisualsDir' as const,
      responseKey: 'visual',
    },
  ];

  describe.each(assets)('$family filesystem confinement', (asset) => {
    const request = (
      method: string,
      root: string,
      fileOptions: LocalFileOptions = {},
      rawBody = JSON.stringify(asset.payload),
      maxBytes = MAX_BRIDGE_BODY_BYTES,
    ) =>
      handleLocalDiskBridgeRequest(
        { method, url: `${asset.prefix}${asset.id}`, ...(method === 'PUT' ? { rawBody } : {}) },
        telemetry,
        saves,
        maxBytes,
        { sceneBlueprintsDir, characterVisualsDir, [asset.directoryKey]: root },
        fileOptions,
      );

    it.each([
      'root',
      'parent',
      'destination',
      'dangling-root',
      'dangling-parent',
      'dangling-destination',
    ])('rejects a %s link on GET and PUT without reading or changing outside files', (position) => {
      const outside = join(tempDir, 'outside');
      mkdirSync(outside);
      const outsideFile = join(outside, `${asset.id}.json`);
      const original = JSON.stringify(asset.payload);
      writeFileSync(outsideFile, original);
      const root = join(tempDir, 'assets');
      let configuredRoot = root;
      let linkPath = root;
      if (position === 'root' || position === 'dangling-root') {
        symlinkSync(position === 'root' ? outside : join(tempDir, 'missing'), root, 'dir');
      } else if (position === 'parent' || position === 'dangling-parent') {
        const parent = join(tempDir, 'linked-parent');
        linkPath = parent;
        symlinkSync(position === 'parent' ? outside : join(tempDir, 'missing'), parent, 'dir');
        configuredRoot = join(parent, 'nested');
      } else {
        mkdirSync(root);
        linkPath = join(root, `${asset.id}.json`);
        symlinkSync(position === 'destination' ? outsideFile : join(outside, 'missing'), linkPath);
      }
      for (const method of ['GET', 'PUT']) {
        const response = request(method, configuredRoot);
        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'Unsafe storage path' });
      }
      expect(readFileSync(outsideFile, 'utf8')).toBe(original);
      expect(readdirSync(outside)).toEqual([`${asset.id}.json`]);
      expect(existsSync(join(tempDir, 'missing'))).toBe(false);
      expect(lstatSync(linkPath).isSymbolicLink()).toBe(true);
    });

    it.each(['link', 'dangling-link', 'occupied'])(
      'preserves a valid saved asset when its temporary candidate is %s',
      (kind) => {
        const root = join(tempDir, 'assets');
        mkdirSync(root);
        const target = join(root, `${asset.id}.json`);
        writeFileSync(target, JSON.stringify(asset.payload));
        const original = readFileSync(target, 'utf8');
        const outside = join(tempDir, 'sentinel');
        writeFileSync(outside, 'keep');
        const candidate = join(root, 'candidate.tmp');
        if (kind === 'occupied') writeFileSync(candidate, 'owned elsewhere');
        else symlinkSync(kind === 'link' ? outside : join(tempDir, 'missing'), candidate);
        const response = request('PUT', root, { temporaryName: () => 'candidate.tmp' });
        expect(response.statusCode).toBe(400);
        expect(readFileSync(target, 'utf8')).toBe(original);
        expect(readFileSync(outside, 'utf8')).toBe('keep');
        expect(existsSync(join(tempDir, 'missing'))).toBe(false);
        if (kind === 'occupied') expect(readFileSync(candidate, 'utf8')).toBe('owned elsewhere');
        else expect(lstatSync(candidate).isSymbolicLink()).toBe(true);
        expect(request('GET', root).body[asset.responseKey]).toEqual(asset.payload);
      },
    );

    it('creates safe missing directories and returns the persisted payload after replacement', () => {
      const root = join(tempDir, 'absent', 'nested', 'assets');
      expect(request('GET', root).statusCode).toBe(404);
      expect(existsSync(join(tempDir, 'absent'))).toBe(false);
      expect(request('PUT', root).statusCode).toBe(200);
      const file = join(root, `${asset.id}.json`);
      expect(readFileSync(file, 'utf8')).toBe(`${JSON.stringify(asset.payload, null, 2)}\n`);
      // A second PUT replaces the saved values and leaves no temporary artifact.
      expect(request('PUT', root, {}, JSON.stringify(asset.replacement)).statusCode).toBe(200);
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(asset.replacement);
      expect(readdirSync(root)).toEqual([`${asset.id}.json`]);
      expect(request('GET', root).body[asset.responseKey]).toEqual(
        JSON.parse(readFileSync(file, 'utf8')),
      );
    });

    it('rejects malformed on-disk JSON and directories, and checks byte limits before reading', () => {
      const root = join(tempDir, 'assets');
      mkdirSync(root);
      const target = join(root, `${asset.id}.json`);
      writeFileSync(target, '{bad_json');
      expect(request('GET', root).statusCode).toBe(400);
      writeFileSync(target, '{}');
      expect(request('GET', root).statusCode).toBe(400);
      const serialized = JSON.stringify(asset.payload);
      writeFileSync(target, serialized);
      const bytes = Buffer.byteLength(serialized, 'utf8');
      expect(request('GET', root, {}, '', bytes).statusCode).toBe(200);
      const noRead: LocalFileOptions = {
        fileOps: {
          ...nodeLocalFileOps,
          read: () => {
            throw new Error('oversized file must not be read');
          },
        },
      };
      expect(request('GET', root, noRead, '', bytes - 1).statusCode).toBe(413);
      rmSync(target);
      mkdirSync(target);
      expect(request('GET', root).statusCode).toBe(400);
      expect(request('PUT', root).statusCode).toBe(400);
      expect(readdirSync(root)).toEqual([`${asset.id}.json`]);
    });

    it('leaves existing bytes intact and removes its own temporary after replacement fails', () => {
      const root = join(tempDir, 'assets');
      expect(request('PUT', root).statusCode).toBe(200);
      const file = join(root, `${asset.id}.json`);
      const original = readFileSync(file, 'utf8');
      const fileOptions: LocalFileOptions = {
        fileOps: {
          ...nodeLocalFileOps,
          rename: () => {
            throw Object.assign(new Error('injected I/O error'), { code: 'EIO' });
          },
        },
      };
      expect(request('PUT', root, fileOptions, JSON.stringify(asset.replacement)).statusCode).toBe(
        400,
      );
      expect(readFileSync(file, 'utf8')).toBe(original);
      expect(readdirSync(root)).toEqual([`${asset.id}.json`]);
    });
  });
});
