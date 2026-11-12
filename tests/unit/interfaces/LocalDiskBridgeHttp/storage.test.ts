import { request as httpRequest, type IncomingMessage } from 'node:http';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationCoordinator } from '../../../../src/application/index.js';
import {
  DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
  STARTER_HOLD_CHARACTER_VISUALS,
} from '../../../../src/content/index.js';
import { nodeLocalFileOps } from '../../../../src/infrastructure/persistence/safeLocalFiles.js';
import {
  defineStateSlice,
  type SaveSlotRepositoryPort,
  SeededRandom,
  StateSliceRegistry,
} from '../../../../src/domain/index.js';
import {
  FileSaveSlotRepository,
  InMemorySaveSlotRepository,
  InMemorySessionTelemetry,
} from '../../../../src/infrastructure/index.js';
import {
  parseNdjsonLines,
  SessionStorageError,
} from '../../../../src/infrastructure/telemetry/NdjsonSessionTelemetry.js';
import {
  createBridgeSaveTransport,
  readBridgeToken,
} from '../../../../src/interfaces/composition/bridgeTransport.js';
import { executeLogQuery } from '../../../../src/interfaces/cli/queryLogs.js';
import { createStageLab } from '../../../../src/interfaces/composition/stageLabPanel.js';
import {
  InMemoryDomAttributeSink,
  StageInspectorDomMirror,
} from '../../../../src/interfaces/hud/StageInspectorDomMirror.js';
import { makeStageBlueprint } from '../../../support/makeStageBlueprint.js';
import { makeRegistry } from '../../../support/makeRegistry.js';
import { createClock } from '../../application/SimulationCoordinator/fixtures.js';
import { active, event, save, snapshot, start, tempRoot } from './harness.js';

describe('HTTP storage readback', () => {
  let app: Awaited<ReturnType<typeof start>>;
  beforeEach(async () => {
    app = await start();
  });

  it('carries required pack identity through guarded save PUT, GET, listing and disk', async () => {
    const identified = { ...save, packId: 'pack_http', packVersion: 4 };
    expect(
      (await app.send('/api/saves/identified', 'PUT', JSON.stringify(identified))).status,
    ).toBe(200);
    const identityFree = { ...save, packId: undefined, packVersion: undefined };
    expect(
      (await app.send('/api/saves/anonymous', 'PUT', JSON.stringify(identityFree))).status,
    ).toBe(400);
    expect((await app.send('/api/saves/identified')).body).toMatchObject({
      envelope: { packId: 'pack_http', packVersion: 4 },
    });
    expect((await app.send('/api/saves')).body).toMatchObject({
      slots: [{ slotId: 'identified', packId: 'pack_http', packVersion: 4 }],
    });
    expect((await app.send('/api/saves/anonymous')).status).toBe(404);
    const onDisk = JSON.parse(
      readFileSync(join(app.base, 'saves', 'identified.json'), 'utf8'),
    ) as unknown;
    expect(onDisk).toMatchObject({ packId: 'pack_http', packVersion: 4 });
  });

  it('returns readable and redacted unreadable save entries through guarded GET', async () => {
    expect((await app.send('/api/saves/valid', 'PUT', JSON.stringify(save))).status).toBe(200);
    const saved = JSON.parse(readFileSync(join(app.base, 'saves', 'valid.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    const slices = saved['stateSlices'] as Record<string, unknown>;
    const world = slices['__upliftWorldStateSnapshot'] as Record<string, unknown>;
    writeFileSync(join(app.base, 'saves', 'corrupt.json'), '{bad');
    writeFileSync(
      join(app.base, 'saves', 'invalid_snapshot.json'),
      JSON.stringify({
        ...saved,
        slotId: 'invalid_snapshot',
        stateSlices: { ...slices, __upliftWorldStateSnapshot: { ...world, worldTick: 10 } },
      }),
    );
    const response = await app.send('/api/saves');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      slots: [
        { slotId: 'corrupt', readable: false, reason: 'invalid_json' },
        { slotId: 'invalid_snapshot', readable: false, reason: 'invalid_snapshot' },
        { slotId: 'valid', readable: true, packId: 'test_http_pack' },
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain(app.base);
    expect(JSON.stringify(response.body)).not.toContain(app.token);
    expect((await app.send('/api/saves/valid')).status).toBe(200);
  });

  it('reports listing read faults as redacted storage failures and preserves the slot', async () => {
    let failReads = false;
    const faulting = await start(
      tempRoot(),
      {},
      {
        fileOptions: {
          fileOps: {
            ...nodeLocalFileOps,
            read: (fd) => {
              if (failReads) throw Object.assign(new Error('injected read fault'), { code: 'EIO' });
              return nodeLocalFileOps.read(fd);
            },
          },
        },
      },
    );
    expect((await faulting.send('/api/saves/valid', 'PUT', JSON.stringify(save))).status).toBe(200);
    const bytes = readFileSync(join(faulting.base, 'saves', 'valid.json'), 'utf8');
    failReads = true;
    const failed = await faulting.send('/api/saves');
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ error: 'Bridge storage operation failed' });
    expect(readFileSync(join(faulting.base, 'saves', 'valid.json'), 'utf8')).toBe(bytes);
    failReads = false;
    expect((await faulting.send('/api/saves')).body).toMatchObject({
      slots: [{ slotId: 'valid', readable: true }],
    });
  });

  it('serves a token that the real lab browser transport uses for stage and character persistence', async () => {
    const stage = { ...DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT, themeId: 'http_edited_theme' };
    const initialVisual = STARTER_HOLD_CHARACTER_VISUALS[0];
    if (initialVisual === undefined) throw new Error('Missing visual fixture');
    const visual = { ...initialVisual, heightScale: 1.75 };
    let status = '';
    const document = {
      querySelector: (selector: string) =>
        selector === 'meta[name="uplift-bridge-token"]'
          ? { getAttribute: (name: string) => (name === 'content' ? app.token : null) }
          : null,
    };
    const transport = createBridgeSaveTransport({
      getToken: () => readBridgeToken(document),
      setStatus: (message) => {
        status = message;
      },
      fetch: (url, init) => {
        // Node supplies the browser-owned provenance only; the production helper owns token/JSON headers.
        const headers = new Headers(init.headers);
        headers.set('Origin', app.origin);
        headers.set('Sec-Fetch-Site', 'same-origin');
        return fetch(new URL(url, app.origin), { ...init, headers });
      },
    });
    const lab = createStageLab({
      mirror: new StageInspectorDomMirror(new InMemoryDomAttributeSink()),
      isPaused: () => true,
      getStage: () => stage,
      getVisuals: () => [visual],
      requestPortal: () => 'ready',
      transport,
    });
    lab.saveStage();
    await vi.waitFor(() => expect(status).toBe('Saved'), { interval: 1 });
    lab.saveVisual(visual.characterId);
    await vi.waitFor(() => expect(status).toBe('Saved'), { interval: 1 });
    expect((await app.send(`/api/scene-blueprints/${stage.stageId}`)).body).toEqual({
      blueprint: stage,
    });
    expect((await app.send(`/api/character-visuals/${visual.characterId}`)).body).toEqual({
      visual,
    });
    expect(
      JSON.parse(readFileSync(join(app.base, 'stages', `${stage.stageId}.json`), 'utf8')),
    ).toEqual(stage);
    expect(
      JSON.parse(readFileSync(join(app.base, 'characters', `${visual.characterId}.json`), 'utf8')),
    ).toEqual(visual);
  });

  it('persists authenticated telemetry and save operations with readable results', async () => {
    expect(
      (await app.send('/api/telemetry/session', 'POST', '{"sessionId":"http-session"}')).status,
    ).toBe(200);
    expect(
      (await app.send('/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] }))).body,
    ).toEqual({ recordedCount: 1 });
    expect(parseNdjsonLines(readFileSync(join(app.base, 'logs', active), 'utf8'))).toMatchObject([
      { sessionId: 'http-session', action: 'record' },
    ]);
    expect((await app.send('/api/telemetry/compact', 'POST')).body).toEqual({ compacted: true });
    expect(executeLogQuery(join(app.base, 'logs'), { actorId: event.actorId })).toMatchObject([
      { sessionId: 'http-session', action: 'record', worldTick: 1 },
    ]);
    expect((await app.send('/api/saves/slot', 'PUT', JSON.stringify(save))).status).toBe(200);
    expect((await app.send('/api/saves/slot')).body).toMatchObject({ envelope: save });
    expect((await app.send('/api/saves')).body).toMatchObject({
      slots: [{ slotId: 'slot', worldTick: 9 }],
    });
    expect((await app.send('/api/saves/slot', 'DELETE')).body).toEqual({ deleted: true });
    expect((await app.send('/api/saves/slot')).status).toBe(404);
  });

  it('preserves a coordinator slice version through HTTP PUT, GET, disk and load', async () => {
    const key = defineStateSlice('plugin.http_saved', { count: 0 }, { version: 3 });
    const sliceRegistry = new StateSliceRegistry();
    sliceRegistry.register(key);
    const makeCoordinator = (saveRepository: SaveSlotRepositoryPort): SimulationCoordinator =>
      new SimulationCoordinator({
        epochId: 'epoch_sim_test',
        registry: makeRegistry(),
        telemetry: new InMemorySessionTelemetry('session_http_slices', createClock()),
        saveRepository,
        clock: createClock(),
        rng: new SeededRandom(77),
        stateSliceRegistry: sliceRegistry,
      });
    const source = makeCoordinator(new InMemorySaveSlotRepository());
    source.dispatchEffects([{ type: 'set_state_slice', sliceId: key.id, value: { count: 8 } }]);
    const produced = source.saveToSlot('slice_http');
    const write = {
      epochId: produced.epochId,
      packId: produced.packId,
      packVersion: produced.packVersion,
      worldTick: produced.worldTick,
      rngState: produced.rngState,
      savedAtIso: produced.savedAtIso,
      stateSlices: produced.stateSlices,
      legacyState: produced.legacyState,
    };

    const put = await app.send('/api/saves/slice_http', 'PUT', JSON.stringify(write));
    expect(put.status).toBe(200);
    const get = await app.send('/api/saves/slice_http');
    expect(get.status).toBe(200);
    expect(get.body).toMatchObject({
      envelope: {
        packId: 'test_simulation',
        packVersion: 1,
        stateSlices: {
          __upliftCustomSlicesSnapshot: { 'plugin.http_saved': { count: 8 } },
          __upliftCustomSliceVersions: { 'plugin.http_saved': 3 },
        },
      },
    });
    const disk = JSON.parse(
      readFileSync(join(app.base, 'saves', 'slice_http.json'), 'utf8'),
    ) as unknown;
    expect(disk).toMatchObject({
      packId: 'test_simulation',
      packVersion: 1,
      stateSlices: {
        __upliftCustomSlicesSnapshot: { 'plugin.http_saved': { count: 8 } },
        __upliftCustomSliceVersions: { 'plugin.http_saved': 3 },
      },
    });
    const restored = makeCoordinator(new FileSaveSlotRepository(join(app.base, 'saves')));
    expect(restored.loadFromSlot('slice_http').stateSlices.get(key)).toEqual({ count: 8 });
    expect(restored.getWorldState().stateSlices.toVersionMap()).toEqual({ 'plugin.http_saved': 3 });
  });
});

describe('HTTP streams and storage failures', () => {
  it('accepts exact byte limits, rejects multibyte overflow, and stops no-end streams promptly', async () => {
    const app = await start(undefined, { maxBodyBytes: 128 });
    const valid = JSON.stringify({ sessionId: 'byte-test' });
    const exact = valid.padEnd(128, ' ');
    expect((await app.send('/api/telemetry/session', 'POST', exact)).status).toBe(200);
    const before = snapshot(app.base);
    app.dispatch.mockClear();
    const multibyte = `${valid}${' '.repeat(127 - Buffer.byteLength(valid))}é`;
    expect(Buffer.byteLength(multibyte)).toBe(129);
    const declared = await app.send('/api/telemetry/session', 'POST', multibyte, {
      'content-length': '129',
    });
    expect(declared.status).toBe(413);
    for (const headers of [
      app.headers({ 'content-length': '1000' }),
      app.headers({ 'transfer-encoding': 'chunked' }),
    ]) {
      await new Promise<void>((resolve, reject) => {
        const req = httpRequest({
          hostname: '127.0.0.1',
          port: app.port,
          path: '/api/telemetry/session',
          method: 'POST',
          headers,
          agent: false,
        });
        const timeout = setTimeout(() => {
          req.destroy();
          reject(new Error('Over-cap request waited for end'));
        }, 1000);
        req.on('response', (res) => {
          if (res.statusCode !== 413)
            reject(new Error(`Unexpected overflow status ${res.statusCode}`));
          res.resume();
        });
        req.on('error', () => undefined);
        req.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
        req.write(multibyte);
        // Deliberately never end: the server must terminate consumption itself.
      });
    }
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(snapshot(app.base)).toEqual(before);
    expect((await app.send('/api/saves')).status).toBe(200);
  });

  it('never dispatches an aborted partial body and accepts a later valid request', async () => {
    const app = await start();
    const before = snapshot(app.base);
    let received = '';
    await new Promise<void>((resolve, reject) => {
      const server = app.server.httpServer;
      if (server === null) throw new Error('Missing HTTP server');
      const req = httpRequest({
        hostname: '127.0.0.1',
        port: app.port,
        path: '/api/telemetry/session',
        method: 'POST',
        headers: app.headers({ 'content-length': '100' }),
        agent: false,
      });
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('Partial body never arrived'));
      }, 1000);
      const observe = (incoming: IncomingMessage): void => {
        incoming.once('data', (chunk: Buffer) => {
          received = chunk.toString('utf8');
          incoming.once('close', () => {
            clearTimeout(timeout);
            resolve();
          });
          req.destroy();
        });
      };
      server.once('request', observe);
      req.on('error', () => undefined);
      req.once('close', () => server.off('request', observe));
      req.write('{"sessionId":');
    });
    expect(received).toBe('{"sessionId":');
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(snapshot(app.base)).toEqual(before);
    expect((await app.send('/api/telemetry/compact', 'POST')).status).toBe(200);
  });

  it('returns redacted 500 then 503 for failed initialization and allows an explicit retry', async () => {
    let fail = false;
    const app = await start(
      undefined,
      {},
      {
        fileOptions: {
          fileOps: {
            ...nodeLocalFileOps,
            rename: (from, to) => {
              if (fail) throw Object.assign(new Error(`private ${from}`), { code: 'EIO' });
              nodeLocalFileOps.rename(from, to);
            },
          },
        },
      },
    );
    expect(
      (await app.send('/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] }))).status,
    ).toBe(200);
    const old = readFileSync(join(app.base, 'logs', active), 'utf8');
    fail = true;
    const failed = await app.send('/api/telemetry/session', 'POST', '{"sessionId":"failed"}');
    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ error: 'Bridge storage operation failed' });
    const afterFailure = snapshot(app.base);
    for (const [path, body] of [
      ['/api/telemetry/batch', JSON.stringify({ events: [event] })],
      ['/api/telemetry/compact', '{}'],
    ] as const) {
      const response = await app.send(path, 'POST', body);
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ error: 'Bridge storage unavailable' });
    }
    expect(snapshot(app.base)).toEqual(afterFailure);
    expect(readFileSync(join(app.base, 'logs', active), 'utf8')).toBe(old);
    fail = false;
    expect(
      (await app.send('/api/telemetry/session', 'POST', '{"sessionId":"recovered"}')).status,
    ).toBe(200);
    expect(
      (await app.send('/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] }))).status,
    ).toBe(200);
    expect(parseNdjsonLines(readFileSync(join(app.base, 'logs', active), 'utf8'))).toMatchObject([
      { sessionId: 'recovered' },
    ]);
  });

  it.each([0, -1, 1.5, Infinity])(
    'rejects invalid retention %s before storage mutation',
    async (maxPreviousSessions) => {
      const base = tempRoot();
      await expect(start(base, { maxPreviousSessions })).rejects.toThrow('maxPreviousSessions');
      expect(snapshot(base)).toEqual({});
    },
  );

  it('aborts server construction on logger initialization failure', async () => {
    const base = tempRoot();
    await expect(
      start(
        base,
        {},
        {
          fileOptions: {
            fileOps: {
              ...nodeLocalFileOps,
              open: () => {
                throw Object.assign(new Error('private root'), { code: 'EACCES' });
              },
            },
          },
        },
      ),
    ).rejects.toThrow(SessionStorageError);
    expect(existsSync(join(base, 'logs', active))).toBe(false);
  });

  it.each(['root', 'parent', 'dangling-root', 'dangling-parent'])(
    'rejects substituted %s links over HTTP without touching outside data',
    async (kind) => {
      const base = tempRoot();
      const storage = join(base, 'storage');
      const app = await start(base, {
        logsDir: join(storage, 'logs'),
        savesDir: join(storage, 'saves'),
        sceneBlueprintsDir: join(storage, 'stages'),
        characterVisualsDir: join(storage, 'characters'),
      });
      const outside = join(base, 'outside');
      mkdirSync(outside);
      writeFileSync(join(outside, 'sentinel'), 'keep');
      const visual = STARTER_HOLD_CHARACTER_VISUALS[0];
      if (visual === undefined) throw new Error('Missing character fixture');
      const stage = makeStageBlueprint('room_http_storage');
      for (const [root, path, method, body] of [
        ['logs', '/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] })],
        ['saves', '/api/saves/slot', 'PUT', JSON.stringify(save)],
        ['stages', `/api/scene-blueprints/${stage.stageId}`, 'PUT', JSON.stringify(stage)],
        [
          'characters',
          `/api/character-visuals/${visual.characterId}`,
          'PUT',
          JSON.stringify(visual),
        ],
      ] as const) {
        mkdirSync(join(storage, root), { recursive: true });
        const linked = kind.includes('parent') ? storage : join(storage, root);
        const backup = `${linked}-backup`;
        renameSync(linked, backup);
        symlinkSync(kind.startsWith('dangling') ? join(base, 'missing') : outside, linked);
        const before = snapshot(base, ['storage', 'outside']);
        const response = await app.send(path, method, body);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unsafe storage path' });
        if (method === 'PUT') expect((await app.send(path)).status).toBe(400);
        expect(snapshot(base, ['storage', 'outside'])).toEqual(before);
        expect(existsSync(join(base, 'missing'))).toBe(false);
        rmSync(linked);
        renameSync(backup, linked);
      }
    },
  );

  it('redacts unsafe filesystem failures and keeps outside data intact for all storage families', async () => {
    const app = await start(
      undefined,
      {},
      { fileOptions: { temporaryName: () => 'candidate.tmp' } },
    );
    const sentinel = join(app.base, 'outside');
    writeFileSync(sentinel, 'keep');
    const stage = makeStageBlueprint('room_http_storage');
    for (const [root, path, method, body, file] of [
      ['saves', '/api/saves/slot', 'PUT', JSON.stringify(save), 'slot.json'],
      [
        'stages',
        `/api/scene-blueprints/${stage.stageId}`,
        'PUT',
        JSON.stringify(stage),
        `${stage.stageId}.json`,
      ],
      [
        'characters',
        '/api/character-visuals/char_player_operative',
        'PUT',
        JSON.stringify(STARTER_HOLD_CHARACTER_VISUALS[0]),
        'char_player_operative.json',
      ],
    ] as const) {
      mkdirSync(join(app.base, root), { recursive: true });
      for (const destination of [sentinel, join(app.base, 'missing')]) {
        symlinkSync(destination, join(app.base, root, file));
        const response = await app.send(path, method, body);
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unsafe storage path' });
        expect((await app.send(path)).status).toBe(400);
        if (root === 'saves') expect((await app.send(path, 'DELETE')).status).toBe(400);
        rmSync(join(app.base, root, file));
        symlinkSync(destination, join(app.base, root, 'candidate.tmp'));
        expect((await app.send(path, method, body)).body).toEqual({ error: 'Unsafe storage path' });
        rmSync(join(app.base, root, 'candidate.tmp'));
        expect(existsSync(join(app.base, 'missing'))).toBe(false);
      }
    }
    for (const destination of [sentinel, join(app.base, 'missing')]) {
      const candidate = join(app.base, 'logs', 'candidate.tmp');
      symlinkSync(destination, candidate);
      const before = snapshot(app.base);
      const response = await app.send('/api/telemetry/compact', 'POST');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Unsafe storage path' });
      expect(snapshot(app.base)).toEqual(before);
      expect(existsSync(join(app.base, 'missing'))).toBe(false);
      rmSync(candidate);
    }
    rmSync(join(app.base, 'logs', active));
    symlinkSync(sentinel, join(app.base, 'logs', active));
    expect(
      (await app.send('/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] }))).body,
    ).toEqual({ error: 'Unsafe storage path' });
    expect(readFileSync(sentinel, 'utf8')).toBe('keep');
  });
});
