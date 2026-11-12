import {
  createServer as createHttpServer,
  request as httpRequest,
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { Socket } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type Connect, type Plugin } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import configFactory from '../../../../vite.config.js';
import { parseNdjsonLines } from '../../../../src/infrastructure/telemetry/NdjsonSessionTelemetry.js';
import { executeLogQuery } from '../../../../src/interfaces/cli/queryLogs.js';
import {
  createLocalBridgeAccessPolicy,
  handleLocalDiskBridgeRequest,
  localDiskBridgePlugin,
} from '../../../../src/interfaces/vite/localDiskBridgePlugin.js';
import { active, event, rawRequest, snapshot, start, tempRoot, trackServer } from './harness.js';

describe('HTTP server lifecycle', () => {
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
        new URL('../../../../src/interfaces/vite/localDiskBridgePlugin.ts', import.meta.url),
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
              trackServer(configuredServer);
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
    vi.spyOn(server, 'address').mockReturnValue({
      address: '127.0.0.1',
      family: 'IPv4',
      port: 5173,
    });
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
});
