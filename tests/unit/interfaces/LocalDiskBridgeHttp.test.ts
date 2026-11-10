import {
  createServer as createHttpServer,
  request as httpRequest,
  IncomingMessage,
  ServerResponse,
  type IncomingHttpHeaders,
} from 'node:http';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type Connect, type Plugin, type ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import configFactory from '../../../vite.config.js';
import {
  DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
  STARTER_HOLD_CHARACTER_VISUALS,
} from '../../../src/content/index.js';
import { nodeLocalFileOps } from '../../../src/infrastructure/persistence/safeLocalFiles.js';
import {
  parseNdjsonLines,
  SessionStorageError,
} from '../../../src/infrastructure/telemetry/NdjsonSessionTelemetry.js';
import {
  createBridgeSaveTransport,
  readBridgeToken,
} from '../../../src/interfaces/composition/bridgeTransport.js';
import { executeLogQuery } from '../../../src/interfaces/cli/queryLogs.js';
import { createStageLab } from '../../../src/interfaces/composition/stageLabPanel.js';
import {
  InMemoryDomAttributeSink,
  StageInspectorDomMirror,
} from '../../../src/interfaces/hud/StageInspectorDomMirror.js';
import {
  createLocalBridgeAccessPolicy,
  handleLocalDiskBridgeRequest,
  localDiskBridgePlugin,
  type LocalDiskBridgeDependencies,
  type LocalDiskBridgeOptions,
} from '../../../src/interfaces/vite/localDiskBridgePlugin.js';

interface HttpResult {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly text: string;
  readonly body: unknown;
}
const roots = ['logs', 'saves', 'stages', 'characters'];
const event = {
  epochId: 'test',
  worldTick: 1,
  level: 'info',
  category: 'system',
  actorId: 'test',
  action: 'record',
  message: 'evidence',
};
const save = { epochId: 'test', worldTick: 9, rngState: 42, stateSlices: { test: 3 } };
const active = 'current-session.jsonl';

function snapshot(base: string, entries: readonly string[] = roots): Record<string, string> {
  const files: Record<string, string> = {};
  const visit = (path: string): void => {
    const full = join(base, path);
    let stat;
    try {
      stat = lstatSync(full);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')
        return;
      throw error;
    }
    if (stat.isSymbolicLink()) files[path] = `link:${readlinkSync(full)}`;
    else if (stat.isDirectory()) {
      files[path] = 'directory';
      for (const name of readdirSync(full).sort()) visit(`${path}/${name}`);
    } else files[path] = readFileSync(full).toString('base64');
  };
  entries.forEach(visit);
  return files;
}

function rawRequest(
  port: number,
  path: string,
  method: string,
  headers: Record<string, string> | string[],
  body = '',
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { hostname: '127.0.0.1', port, path, method, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let body: unknown;
          try {
            body = JSON.parse(text);
          } catch {
            body = null;
          }
          resolve({ status: res.statusCode ?? 0, headers: res.headers, text, body });
        });
      },
    );
    req.on('error', reject);
    if (body !== '' && !req.hasHeader('content-length') && !req.hasHeader('transfer-encoding'))
      req.setHeader('Content-Length', String(Buffer.byteLength(body)));
    req.end(body);
  });
}

const servers = new Set<ViteDevServer>();
const directories = new Set<string>();
function tempRoot(): string {
  const base = mkdtempSync(join(tmpdir(), 'uplift-http-'));
  directories.add(base);
  return base;
}
async function start(
  base = tempRoot(),
  options: LocalDiskBridgeOptions = {},
  dependencies: LocalDiskBridgeDependencies = {},
  extraPlugins: Plugin[] = [],
) {
  writeFileSync(
    join(base, 'index.html'),
    '<!doctype html><html><head></head><body>Local test</body></html>',
  );
  const policy = createLocalBridgeAccessPolicy();
  const dispatch = vi.fn(handleLocalDiskBridgeRequest);
  const server = await createServer({
    configFile: false,
    root: base,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: true,
      hmr: false,
      watch: null,
      cors: policy.cors,
    },
    optimizeDeps: { noDiscovery: true },
    plugins: [
      localDiskBridgePlugin(
        {
          logsDir: join(base, 'logs'),
          savesDir: join(base, 'saves'),
          sceneBlueprintsDir: join(base, 'stages'),
          characterVisualsDir: join(base, 'characters'),
          ...options,
        },
        policy,
        { dispatch, onDiagnostic: () => undefined, ...dependencies },
      ),
      ...extraPlugins,
    ],
  });
  servers.add(server);
  await server.listen();
  const address = server.httpServer?.address();
  if (address === null || address === undefined || typeof address === 'string')
    throw new Error('No TCP port');
  const port = address.port;
  const origin = `http://127.0.0.1:${port}`;
  const html = await (await fetch(origin)).text();
  const token = html.match(
    /<meta\b[^>]*name="uplift-bridge-token"[^>]*content="([a-f0-9]{64})"/,
  )?.[1];
  if (token === undefined) throw new Error('No served token');
  const headers = (overrides: Record<string, string | null> = {}): Record<string, string> => {
    const values: Record<string, string> = {
      host: `127.0.0.1:${port}`,
      origin,
      'content-type': 'application/json',
      'x-uplift-bridge-token': token,
    };
    return Object.fromEntries(
      Object.entries({ ...values, ...overrides }).filter(
        (entry): entry is [string, string] => entry[1] !== null,
      ),
    );
  };
  return {
    base,
    port,
    origin,
    token,
    policy,
    dispatch,
    server,
    headers,
    send: (
      path: string,
      method = 'GET',
      body = '',
      overrides: Record<string, string | null> = {},
    ) => rawRequest(port, path, method, headers(overrides), body),
    close: async () => {
      await server.close();
      servers.delete(server);
    },
  };
}

afterEach(async () => {
  try {
    await Promise.all([...servers].map((server) => server.close()));
  } finally {
    servers.clear();
    for (const base of directories) rmSync(base, { recursive: true, force: true });
    directories.clear();
  }
});

describe('real loopback bridge HTTP boundary', () => {
  let app: Awaited<ReturnType<typeof start>>;
  beforeEach(async () => {
    app = await start();
  });

  it('rejects a foreign simple POST before dispatch or session rotation', async () => {
    const before = snapshot(app.base);
    const response = await app.send(
      '/api/telemetry/session',
      'POST',
      JSON.stringify({ sessionId: 'unauthorized' }),
      {
        origin: 'http://foreign.example',
        'content-type': 'text/plain',
        'x-uplift-bridge-token': null,
      },
    );
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Bridge request forbidden' });
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(snapshot(app.base)).toEqual(before);
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

  it('accepts both exact loopback aliases and the narrow absent-Origin fallback', async () => {
    for (const host of [`localhost:${app.port}`, `127.0.0.1:${app.port}`]) {
      for (const origin of [`http://localhost:${app.port}`, app.origin])
        expect((await app.send('/api/saves', 'GET', '', { host, origin })).status).toBe(200);
    }
    for (const site of ['same-origin', 'none'])
      expect(
        (
          await app.send('/api/telemetry/compact', 'POST', '', {
            origin: null,
            'sec-fetch-site': site,
          })
        ).status,
      ).toBe(200);
    expect(
      (
        await app.send('/api/telemetry/compact', 'POST', '', {
          'content-type': 'application/json; charset=UTF-8',
        })
      ).status,
    ).toBe(200);
  });

  it('rejects unapproved provenance, tokens and media types before dispatch with no disk mutation', async () => {
    const cases: { headers: Record<string, string | null>; status: number }[] = [
      { headers: { host: `localhost:${app.port + 1}` }, status: 403 },
      { headers: { host: `localhost.evil:${app.port}` }, status: 403 },
      { headers: { host: `127.0.0.2:${app.port}` }, status: 403 },
      { headers: { host: `localhost:${app.port}@foreign.example` }, status: 403 },
      { headers: { host: `localhost:${app.port}, localhost:${app.port}` }, status: 403 },
      { headers: { host: 'localhost' }, status: 403 },
      { headers: { host: `LOCALHOST:${app.port}` }, status: 403 },
      { headers: { origin: `http://localhost:${app.port + 1}` }, status: 403 },
      { headers: { origin: 'null' }, status: 403 },
      { headers: { origin: `${app.origin}/` }, status: 403 },
      { headers: { origin: `http://localhost.evil:${app.port}` }, status: 403 },
      { headers: { origin: `https://localhost:${app.port}` }, status: 403 },
      { headers: { origin: `${app.origin}, ${app.origin}` }, status: 403 },
      { headers: { origin: null }, status: 403 },
      { headers: { origin: null, 'sec-fetch-site': 'same-site' }, status: 403 },
      { headers: { origin: null, 'sec-fetch-site': 'cross-site' }, status: 403 },
      {
        headers: {
          origin: 'http://foreign.example',
          'x-forwarded-host': `localhost:${app.port}`,
          'x-forwarded-proto': 'http',
        },
        status: 403,
      },
      { headers: { 'x-uplift-bridge-token': null }, status: 403 },
      { headers: { 'x-uplift-bridge-token': 'wrong' }, status: 403 },
      { headers: { 'content-type': null }, status: 415 },
      { headers: { 'content-type': 'text/plain' }, status: 415 },
      { headers: { 'content-type': 'application/x-www-form-urlencoded' }, status: 415 },
      { headers: { 'content-type': 'application/json; charset=latin1' }, status: 415 },
    ];
    const before = snapshot(app.base);
    for (const scenario of cases) {
      const result = await app.send(
        '/api/telemetry/session',
        'POST',
        '{"sessionId":"denied"}',
        scenario.headers,
      );
      expect(result.status, JSON.stringify(scenario.headers)).toBe(scenario.status);
    }
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(snapshot(app.base)).toEqual(before);
  });

  it('rejects duplicate security headers even when Node would merge or discard them', async () => {
    const before = snapshot(app.base);
    for (const name of [
      'host',
      'origin',
      'sec-fetch-site',
      'x-uplift-bridge-token',
      'content-type',
    ]) {
      const headers = Object.entries(app.headers({ 'sec-fetch-site': 'same-origin' })).flatMap(
        ([key, value]) => [key, value],
      );
      headers.push(name, app.headers({ 'sec-fetch-site': 'same-origin' })[name] ?? 'same-origin');
      const response = await rawRequest(app.port, '/api/telemetry/compact', 'POST', headers);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(snapshot(app.base)).toEqual(before);
  });

  it('requires authorization for every mutation method and provenance for reads', async () => {
    const before = snapshot(app.base);
    for (const [path, method, body] of [
      ['/api/telemetry/session', 'POST', '{"sessionId":"denied"}'],
      ['/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] })],
      ['/api/telemetry/compact', 'POST', '{}'],
      ['/api/saves/slot', 'PUT', JSON.stringify(save)],
      ['/api/saves/slot', 'DELETE', ''],
      [
        '/api/scene-blueprints/stage_charnel_stairs',
        'PUT',
        JSON.stringify(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT),
      ],
      ['/api/character-visuals/char_player_operative', 'PUT', '{}'],
    ] as const)
      expect((await app.send(path, method, body, { 'x-uplift-bridge-token': null })).status).toBe(
        403,
      );
    expect((await app.send('/api/saves/slot', 'DELETE', '', { 'content-type': null })).status).toBe(
      415,
    );
    expect(
      (await app.send('/api/saves', 'GET', '', { origin: 'http://foreign.example' })).status,
    ).toBe(403);
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(snapshot(app.base)).toEqual(before);
  });

  it('enforces the route/method/ID allowlist before dispatch and validates complete bodies before mutation', async () => {
    const before = snapshot(app.base);
    for (const [path, method, status] of [
      ['/api/unknown', 'POST', 404],
      ['/api/telemetry/session/extra', 'POST', 404],
      ['/api/saves', 'POST', 405],
      ['/api/telemetry/batch', 'GET', 405],
      ['/api/scene-blueprints/stage', 'DELETE', 405],
      ['/api/character-visuals/char', 'PATCH', 405],
      ['/api/saves/../outside', 'GET', 400],
      ['/api/saves/%2e%2e', 'GET', 400],
      ['/api/scene-blueprints/a%2fb', 'PUT', 400],
      ['/api/character-visuals/a\\b', 'PUT', 400],
    ] as const)
      expect(
        (await app.send(path, method, method === 'GET' ? '' : '{}')).status,
        `${method} ${path}`,
      ).toBe(status);
    expect(app.dispatch).not.toHaveBeenCalled();
    for (const [path, body] of [
      ['/api/telemetry/session', '{bad'],
      ['/api/telemetry/batch', JSON.stringify({ events: [event, { worldTick: -1 }] })],
      ['/api/scene-blueprints/different', JSON.stringify(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT)],
      ['/api/character-visuals/missing', '{}'],
    ] as const) {
      const response = await app.send(
        path,
        path.startsWith('/api/telemetry') ? 'POST' : 'PUT',
        body,
      );
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid bridge request' });
    }
    expect(snapshot(app.base)).toEqual(before);
  });

  it('authorizes only the exact bound origins for preflight and still guards the actual request', async () => {
    const before = snapshot(app.base);
    for (const origin of [app.origin, `http://localhost:${app.port}`]) {
      const response = await app.send('/api/saves/slot', 'OPTIONS', '', {
        origin,
        'x-uplift-bridge-token': null,
        'access-control-request-method': 'PUT',
        'access-control-request-headers': 'Content-Type,X-Uplift-Bridge-Token',
      });
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['vary']).toContain('Origin');
      expect(response.headers['access-control-allow-methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe(
        'Content-Type,X-Uplift-Bridge-Token',
      );
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    }
    for (const origin of ['http://foreign.example', `http://localhost:${app.port + 1}`])
      expect(
        (
          await app.send('/api/saves/slot', 'OPTIONS', '', {
            origin,
            'access-control-request-method': 'PUT',
          })
        ).headers['access-control-allow-origin'],
      ).toBeUndefined();
    expect(
      (
        await app.send('/api/saves/slot', 'PUT', JSON.stringify(save), {
          'x-uplift-bridge-token': null,
        })
      ).status,
    ).toBe(403);
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(snapshot(app.base)).toEqual(before);
  });
});

describe('HTTP stream and storage failure containment', () => {
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

  it('rebinds after restart, renews the served token and denies the old token', async () => {
    const app = await start();
    await app.server.restart();
    const address = app.server.httpServer?.address();
    if (address === null || address === undefined || typeof address === 'string')
      throw new Error('Missing restart port');
    const origin = `http://127.0.0.1:${address.port}`;
    expect(app.policy.allowsOrigin(origin)).toBe(true);
    const html = await (await fetch(origin)).text();
    const token = html.match(/content="([a-f0-9]{64})"/)?.[1];
    expect(token).toBeDefined();
    expect(token).not.toBe(app.token);
    const headers = app.headers({ host: `127.0.0.1:${address.port}`, origin });
    expect((await rawRequest(address.port, '/api/telemetry/compact', 'POST', headers)).status).toBe(
      403,
    );
    expect(
      (
        await rawRequest(address.port, '/api/telemetry/compact', 'POST', {
          ...headers,
          'x-uplift-bridge-token': token ?? '',
        })
      ).status,
    ).toBe(200);
    await app.close();
    expect(app.policy.allowsOrigin(origin)).toBe(false);
  });

  it('refuses a partial request from the retired server before it can write into the new session', async () => {
    let configurations = 0;
    let releaseRequest: (() => void) | undefined;
    const holdRestart: Plugin = {
      name: 'observe-bridge-restart',
      async configureServer() {
        configurations += 1;
        if (configurations === 2) {
          if (releaseRequest === undefined) throw new Error('Missing pending request');
          releaseRequest();
          await pendingResponse;
        }
      },
    };
    const app = await start(undefined, {}, {}, [holdRestart]);
    let observed: (() => void) | undefined;
    const received = new Promise<void>((done) => {
      observed = done;
    });
    app.server.httpServer?.once('request', (incoming: IncomingMessage) =>
      incoming.once('data', () => observed?.()),
    );
    const pendingResponse = new Promise<number>((done, reject) => {
      const request = httpRequest(
        {
          hostname: '127.0.0.1',
          port: app.port,
          path: '/api/telemetry/batch',
          method: 'POST',
          headers: app.headers({ 'transfer-encoding': 'chunked' }),
          agent: false,
        },
        (response) => {
          response.resume();
          response.once('end', () => done(response.statusCode ?? 0));
        },
      );
      request.once('error', reject);
      request.setTimeout(1500, () =>
        request.destroy(new Error('Restart request did not complete')),
      );
      releaseRequest = () => {
        request.end(`${JSON.stringify([event])}}`);
      };
      request.write('{"events":');
    });
    await received;
    await app.server.restart();
    expect(await pendingResponse).toBe(503);
    expect(app.dispatch).not.toHaveBeenCalled();
    expect(executeLogQuery(join(app.base, 'logs'))).toEqual([]);
    expect(
      readFileSync(join(app.base, 'logs', 'prev', 'session-0000000000000001', active), 'utf8'),
    ).toBe('');
  });

  it('archives each actual Vite restart and keeps current queries separate with retention one', async () => {
    const app = await start(undefined, { maxPreviousSessions: 1 });
    for (let run = 1; run <= 3; run += 1) {
      const address = app.server.httpServer?.address();
      if (address === null || address === undefined || typeof address === 'string')
        throw new Error('Missing TCP address');
      const origin = `http://127.0.0.1:${address.port}`;
      const html = await (await fetch(origin)).text();
      const token = html.match(/content="([a-f0-9]{64})"/)?.[1];
      if (token === undefined) throw new Error('Missing served token');
      const response = await rawRequest(
        address.port,
        '/api/telemetry/batch',
        'POST',
        app.headers({ host: `127.0.0.1:${address.port}`, origin, 'x-uplift-bridge-token': token }),
        JSON.stringify({ events: [{ ...event, worldTick: run }] }),
      );
      expect(response.status).toBe(200);
      const previous = readFileSync(join(app.base, 'logs', active), 'utf8');
      expect(executeLogQuery(join(app.base, 'logs'))).toMatchObject([
        { worldTick: run, sequence: 1 },
      ]);
      await app.server.restart();
      expect(executeLogQuery(join(app.base, 'logs'))).toEqual([]);
      const group = `session-${String(run).padStart(16, '0')}`;
      expect(readdirSync(join(app.base, 'logs', 'prev'))).toEqual([group]);
      expect(readFileSync(join(app.base, 'logs', 'prev', group, active), 'utf8')).toBe(previous);
      expect(readFileSync(join(app.base, 'logs', active), 'utf8')).toBe('');
    }
  });

  it.each([
    ['successful replacement', false, false, false],
    ['failed replacement and retry', true, false, false],
    ['concurrent replacements', false, true, false],
    ['concurrent replacements after an earlier restart', false, true, true],
  ] as const)(
    'retires in-flight requests across fresh config policies: %s',
    async (_scenario, failReplacement, concurrentRestart, earlierRestart) => {
      const base = tempRoot();
      const logs = join(base, 'logs');
      const configFile = join(base, 'vite.config.mjs');
      const pluginPath = fileURLToPath(
        new URL('../../../src/interfaces/vite/localDiskBridgePlugin.ts', import.meta.url),
      );
      writeFileSync(join(base, 'index.html'), '<html><head></head></html>');
      writeFileSync(
        configFile,
        `import { createLocalBridgeAccessPolicy, localDiskBridgePlugin } from ${JSON.stringify(pluginPath)};
export default () => {
  const policy = createLocalBridgeAccessPolicy();
  return {
    server: { cors: policy.cors },
    plugins: [localDiskBridgePlugin(${JSON.stringify({ logsDir: logs, savesDir: join(base, 'saves') })}, policy)],
  };
};`,
      );
      const initialConfigurations = earlierRestart ? 2 : 1;
      let configurations = 0;
      let releaseRequest: (() => void) | undefined;
      let concurrentStatus: number | undefined;
      const server = await createServer({
        configFile,
        root: base,
        logLevel: 'silent',
        server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false, watch: null },
        optimizeDeps: { noDiscovery: true },
        plugins: [
          {
            name: 'hold-fresh-config-restart',
            async configureServer(configuredServer) {
              servers.add(configuredServer);
              configurations += 1;
              if (configurations === initialConfigurations + 2 && concurrentRestart) {
                concurrentStatus = await probeRetiredRun();
              }
              if (configurations !== initialConfigurations + 1) return;
              if (releaseRequest === undefined) throw new Error('Missing pending request');
              releaseRequest();
              await pendingResponse;
              if (failReplacement) throw new Error('Injected replacement setup failure');
            },
          },
        ],
      });
      await server.listen();
      if (earlierRestart) await server.restart();
      const address = server.httpServer?.address();
      if (address === undefined || address === null || typeof address === 'string')
        throw new Error('Missing TCP address');
      const origin = `http://127.0.0.1:${address.port}`;
      const html = await (await fetch(origin)).text();
      const token = html.match(/content="([a-f0-9]{64})"/)?.[1];
      if (token === undefined) throw new Error('Missing served token');
      const headers = {
        host: `127.0.0.1:${address.port}`,
        origin,
        'content-type': 'application/json',
        'x-uplift-bridge-token': token,
      };
      const probeRetiredRun = async (): Promise<number> =>
        (await rawRequest(address.port, '/api/saves', 'GET', headers)).status;
      let observed: (() => void) | undefined;
      const received = new Promise<void>((done) => {
        observed = done;
      });
      server.httpServer?.once('request', (incoming: IncomingMessage) =>
        incoming.once('data', () => observed?.()),
      );
      const pendingResponse = new Promise<number>((done, reject) => {
        const request = httpRequest(
          {
            hostname: '127.0.0.1',
            port: address.port,
            path: '/api/telemetry/batch',
            method: 'POST',
            headers: { ...headers, 'transfer-encoding': 'chunked' },
            agent: false,
          },
          (response) => {
            response.resume();
            response.once('end', () => done(response.statusCode ?? 0));
          },
        );
        request.once('error', reject);
        request.setTimeout(1500, () => request.destroy(new Error('Restart request timed out')));
        releaseRequest = () => request.end(`${JSON.stringify([event])}}`);
        request.write('{"events":');
      });
      await received;
      const restart = server.restart();
      await Promise.all([restart, ...(concurrentRestart ? [server.restart()] : [])]);
      expect(configurations).toBe(initialConfigurations + (concurrentRestart ? 2 : 1));
      if (concurrentRestart) expect(concurrentStatus).toBe(503);
      expect(await pendingResponse).toBe(503);
      expect(executeLogQuery(logs)).toEqual([]);
      expect(
        readFileSync(
          join(logs, 'prev', `session-${String(initialConfigurations).padStart(16, '0')}`, active),
          'utf8',
        ),
      ).toBe('');
      if (failReplacement) {
        expect((await rawRequest(address.port, '/api/saves', 'GET', headers)).status).toBe(503);
        await server.restart();
        expect(configurations).toBe(initialConfigurations + 2);
      }
      const renewedHtml = await (await fetch(origin)).text();
      const renewedToken = renewedHtml.match(/content="([a-f0-9]{64})"/)?.[1];
      if (renewedToken === undefined) throw new Error('Missing restarted token');
      expect(renewedToken).not.toBe(token);
      expect(
        (
          await rawRequest(
            address.port,
            '/api/telemetry/batch',
            'POST',
            { ...headers, 'x-uplift-bridge-token': renewedToken },
            JSON.stringify({ events: [event] }),
          )
        ).status,
      ).toBe(200);
      expect(executeLogQuery(logs)).toMatchObject([{ sequence: 1 }]);
    },
  );

  it.each(['root', 'parent', 'active', 'compacted', 'prev'] as const)(
    'rejects unsafe session-start %s paths with 400, disables writes, and permits explicit recovery',
    async (kind) => {
      const base = tempRoot();
      const parent = join(base, 'storage');
      const logs = join(parent, 'logs');
      const app = await start(base, { logsDir: logs });
      expect(
        (await app.send('/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] })))
          .status,
      ).toBe(200);
      const before = readFileSync(join(logs, active), 'utf8');
      const sentinel = join(base, 'sentinel');
      writeFileSync(sentinel, 'keep');
      const target =
        kind === 'parent'
          ? parent
          : kind === 'root'
            ? logs
            : join(
                logs,
                kind === 'active'
                  ? active
                  : kind === 'compacted'
                    ? 'current-session.compacted.jsonl'
                    : 'prev',
              );
      const backup = `${target}-backup`;
      const existed = existsSync(target);
      if (existed) renameSync(target, backup);
      symlinkSync(sentinel, target);
      const snap = snapshot(base, ['storage', 'storage-backup', 'sentinel']);
      const response = await app.send('/api/telemetry/session', 'POST', '{"sessionId":"blocked"}');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Unsafe storage path' });
      expect(snapshot(base, ['storage', 'storage-backup', 'sentinel'])).toEqual(snap);
      expect(
        (await app.send('/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] })))
          .status,
      ).toBe(503);
      expect((await app.send('/api/telemetry/compact', 'POST')).status).toBe(503);
      rmSync(target);
      if (existed) renameSync(backup, target);
      expect(readFileSync(join(logs, active), 'utf8')).toBe(before);
      expect(
        (await app.send('/api/telemetry/session', 'POST', '{"sessionId":"recovered"}')).status,
      ).toBe(200);
      expect(
        (await app.send('/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] })))
          .status,
      ).toBe(200);
      expect(executeLogQuery(logs)).toMatchObject([{ sessionId: 'recovered', sequence: 1 }]);
      expect(readFileSync(sentinel, 'utf8')).toBe('keep');
    },
  );

  it('threads retention 1 through repeated starts and rejects previous-run tokens', async () => {
    const base = tempRoot();
    let previousToken = '';
    for (let index = 0; index < 3; index += 1) {
      const app = await start(base, { maxPreviousSessions: 1 });
      if (previousToken)
        expect(
          (
            await app.send('/api/telemetry/compact', 'POST', '', {
              'x-uplift-bridge-token': previousToken,
            })
          ).status,
        ).toBe(403);
      expect(
        (
          await app.send(
            '/api/telemetry/batch',
            'POST',
            JSON.stringify({ events: [{ ...event, worldTick: index }] }),
          )
        ).status,
      ).toBe(200);
      previousToken = app.token;
      await app.close();
    }
    const groups = readdirSync(join(base, 'logs', 'prev'));
    expect(groups).toEqual(['session-0000000000000002']);
    expect(
      parseNdjsonLines(
        readFileSync(join(base, 'logs', 'prev', 'session-0000000000000002', active), 'utf8'),
      ),
    ).toMatchObject([{ worldTick: 1 }]);
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
      for (const [root, path, method, body] of [
        ['logs', '/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] })],
        ['saves', '/api/saves/slot', 'PUT', JSON.stringify(save)],
        [
          'stages',
          `/api/scene-blueprints/${DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT.stageId}`,
          'PUT',
          JSON.stringify(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT),
        ],
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
    for (const [root, path, method, body, file] of [
      ['saves', '/api/saves/slot', 'PUT', JSON.stringify(save), 'slot.json'],
      [
        'stages',
        '/api/scene-blueprints/stage_charnel_stairs',
        'PUT',
        JSON.stringify(DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT),
        'stage_charnel_stairs.json',
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

it('shares the normal config policy at port 5173 without binding that port, then resets on close', async () => {
  const base = tempRoot();
  // Defaults resolve while constructing config; no process directory or real project data changes.
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(base);
  let config;
  try {
    config = await configFactory({ command: 'serve', mode: 'test' });
  } finally {
    cwd.mockRestore();
  }
  expect(config.server).toMatchObject({ host: '127.0.0.1', port: 5173, strictPort: true });
  const candidate = config.plugins?.[0];
  if (candidate === null || typeof candidate !== 'object' || !('name' in candidate))
    throw new Error('Missing configured bridge');
  const plugin = candidate as Plugin;
  const cors = config.server?.cors;
  if (cors === undefined || typeof cors === 'boolean' || typeof cors.origin !== 'function')
    throw new Error('Missing CORS policy');
  const originAllowed = (origin: string): Promise<unknown> =>
    new Promise((resolve, reject) => {
      if (typeof cors.origin !== 'function') throw new Error('Missing CORS callback');
      cors.origin(origin, (error, value) => (error ? reject(error) : resolve(value)));
    });
  expect(await originAllowed('http://localhost:5173')).toBe(false);
  const server = createHttpServer();
  vi.spyOn(server, 'address').mockReturnValue({ address: '127.0.0.1', family: 'IPv4', port: 5173 });
  const hook = plugin.configureServer;
  if (typeof hook !== 'function') throw new Error('Missing configure hook');
  Reflect.apply(hook, {}, [{ httpServer: server, middlewares: { use: () => undefined } }]);
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173'])
    expect(await originAllowed(origin)).toBe(true);
  for (const origin of [
    'http://localhost:5174',
    'http://localhost.evil:5173',
    'http://127.0.0.1:5173/',
  ])
    expect(await originAllowed(origin)).toBe(false);
  server.emit('close');
  expect(await originAllowed('http://localhost:5173')).toBe(false);
  const fresh = await configFactory({ command: 'serve', mode: 'test' });
  expect(fresh.server?.cors).not.toBe(cors);
  const policy = createLocalBridgeAccessPolicy();
  expect(Object.isFrozen(policy)).toBe(true);
  expect(Object.isFrozen(policy.cors)).toBe(true);
});

it('fails closed before listening and after closing, and refuses unsupported hosting without storage writes', async () => {
  const base = tempRoot();
  const policy = createLocalBridgeAccessPolicy();
  const dispatch = vi.fn(handleLocalDiskBridgeRequest);
  const plugin = localDiskBridgePlugin(
    { logsDir: join(base, 'logs'), savesDir: join(base, 'saves') },
    policy,
    { dispatch },
  );
  const hook = plugin.configureServer;
  if (typeof hook !== 'function') throw new Error('Missing configure hook');
  const server = createHttpServer();
  let middleware: Connect.NextHandleFunction | undefined;
  Reflect.apply(hook, {}, [
    {
      httpServer: server,
      middlewares: {
        use: (handler: Connect.NextHandleFunction) => {
          middleware = handler;
        },
      },
    },
  ]);
  const before = snapshot(base);
  const probe = async (): Promise<ServerResponse> => {
    if (middleware === undefined) throw new Error('Missing middleware');
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.url = '/api/saves';
    req.method = 'GET';
    req.rawHeaders = ['Host', 'localhost:5173', 'Origin', 'http://localhost:5173'];
    const res = new ServerResponse(req);
    const next = vi.fn();
    middleware(req, res, next);
    req.emit('end');
    await Promise.resolve();
    socket.destroy();
    expect(next).not.toHaveBeenCalled();
    return res;
  };
  expect((await probe()).statusCode).toBe(503);
  expect(dispatch).not.toHaveBeenCalled();
  expect(snapshot(base)).toEqual(before);
  const address = vi
    .spyOn(server, 'address')
    .mockReturnValue({ address: '127.0.0.1', family: 'IPv4', port: 5173 });
  server.emit('listening');
  expect((await probe()).statusCode).toBe(200);
  expect(dispatch).toHaveBeenCalledOnce();
  server.emit('close');
  expect((await probe()).statusCode).toBe(503);
  expect(dispatch).toHaveBeenCalledOnce();
  expect(policy.allowsHost('localhost:5173')).toBe(false);
  address.mockRestore();
  for (const httpServer of [null, server]) {
    if (httpServer !== null)
      vi.spyOn(httpServer, 'address').mockReturnValue('/tmp/unsupported.sock');
    const empty = tempRoot();
    const unsupported = localDiskBridgePlugin({
      logsDir: join(empty, 'logs'),
      savesDir: join(empty, 'saves'),
    });
    const configure = unsupported.configureServer;
    if (typeof configure !== 'function') throw new Error('Missing configure hook');
    expect(() =>
      Reflect.apply(configure, {}, [{ httpServer, middlewares: { use: () => undefined } }]),
    ).toThrow('TCP dev server');
    expect(snapshot(empty)).toEqual({});
  }
});
