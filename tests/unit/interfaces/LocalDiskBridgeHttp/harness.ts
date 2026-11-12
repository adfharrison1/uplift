import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Plugin, type ViteDevServer } from 'vite';
import { afterEach, vi } from 'vitest';
import {
  createLocalBridgeAccessPolicy,
  handleLocalDiskBridgeRequest,
  localDiskBridgePlugin,
  type LocalDiskBridgeDependencies,
  type LocalDiskBridgeOptions,
} from '../../../../src/interfaces/vite/localDiskBridgePlugin.js';

interface HttpResult {
  readonly status: number;
  readonly headers: IncomingHttpHeaders;
  readonly text: string;
  readonly body: unknown;
}
const roots = ['logs', 'saves', 'stages', 'characters'];
export const event = {
  epochId: 'test',
  worldTick: 1,
  level: 'info',
  category: 'system',
  actorId: 'test',
  action: 'record',
  message: 'evidence',
};
export const save = { epochId: 'test', worldTick: 9, rngState: 42, stateSlices: { test: 3 } };
export const active = 'current-session.jsonl';

export function snapshot(base: string, entries: readonly string[] = roots): Record<string, string> {
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

export function rawRequest(
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
export function trackServer(server: ViteDevServer): void {
  servers.add(server);
}
export function tempRoot(): string {
  const base = mkdtempSync(join(tmpdir(), 'uplift-http-'));
  directories.add(base);
  return base;
}
export async function start(
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
