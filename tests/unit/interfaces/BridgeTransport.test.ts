import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, createServer, type ViteDevServer } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
  STARTER_HOLD_CHARACTER_VISUALS,
} from '../../../src/content/index.js';
import {
  FileSaveSlotRepository,
  NdjsonSessionTelemetry,
} from '../../../src/infrastructure/index.js';
import {
  createBridgeSaveTransport,
  readBridgeToken,
} from '../../../src/interfaces/composition/bridgeTransport.js';
import {
  createStageLab,
  type BlueprintSaveRequest,
} from '../../../src/interfaces/composition/stageLabPanel.js';
import {
  InMemoryDomAttributeSink,
  StageInspectorDomMirror,
} from '../../../src/interfaces/hud/StageInspectorDomMirror.js';
import {
  handleLocalDiskBridgeRequest,
  localDiskBridgePlugin,
} from '../../../src/interfaces/vite/localDiskBridgePlugin.js';

const token = 'a'.repeat(64);
const request: BlueprintSaveRequest = {
  method: 'PUT',
  url: '/api/scene-blueprints/stage_test',
  rawBody: '{}',
};

function tokenFromHtml(html: string): string {
  const tag = html.match(/<meta\b[^>]*name="uplift-bridge-token"[^>]*>/)?.[0];
  const value = tag?.match(/content="([a-f0-9]{64})"/)?.[1];
  if (value === undefined) throw new Error('Dev HTML has no bridge token');
  return value;
}

describe('dev-page bridge token lifecycle', () => {
  it('injects a stable 256-bit token per dev run, renews on restart, and omits it from production HTML', async () => {
    const base = mkdtempSync(join(tmpdir(), 'uplift-bridge-token-'));
    const html = '<!doctype html><html><head></head><body>Local page</body></html>';
    writeFileSync(join(base, 'index.html'), html);
    const plugin = localDiskBridgePlugin({
      logsDir: join(base, 'logs'),
      savesDir: join(base, 'saves'),
    });
    let server: ViteDevServer | undefined;
    try {
      server = await createServer({
        configFile: false,
        root: base,
        logLevel: 'silent',
        server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false, watch: null },
        optimizeDeps: { noDiscovery: true },
        plugins: [plugin],
      });
      await server.listen();
      const first = tokenFromHtml(await server.transformIndexHtml('/', html));
      expect(first).toMatch(/^[a-f0-9]{64}$/);
      expect(tokenFromHtml(await server.transformIndexHtml('/', html))).toBe(first);
      await server.restart();
      const second = tokenFromHtml(await server.transformIndexHtml('/', html));
      expect(second).not.toBe(first);
      expect(tokenFromHtml(await server.transformIndexHtml('/', html))).toBe(second);
      const output = await build({
        configFile: false,
        root: base,
        logLevel: 'silent',
        plugins: [plugin],
        build: { write: false },
      });
      const bundles = Array.isArray(output) ? output : [output];
      const assets = bundles.flatMap((bundle) => ('output' in bundle ? bundle.output : []));
      const builtHtml = assets.find(
        (asset) => asset.type === 'asset' && asset.fileName === 'index.html',
      );
      if (builtHtml?.type !== 'asset') throw new Error('Missing production HTML');
      expect(String(builtHtml.source)).not.toContain('uplift-bridge-token');
      expect(String(builtHtml.source)).not.toContain(first);
      expect(String(builtHtml.source)).not.toContain(second);
      expect(readFileSync(join(base, 'index.html'), 'utf8')).toBe(html);
    } finally {
      try {
        await server?.close();
      } finally {
        rmSync(base, { recursive: true, force: true });
      }
    }
  });
});

describe('browser blueprint save transport', () => {
  it('looks up the served meta token and handles absent or blank content', () => {
    const lookup = (content: string | null) =>
      readBridgeToken({
        querySelector: (selector) =>
          selector === 'meta[name="uplift-bridge-token"]'
            ? { getAttribute: (name) => (name === 'content' ? content : null) }
            : null,
      });
    expect(lookup(` ${token} `)).toBe(token);
    expect(lookup('  ')).toBeNull();
    expect(lookup(null)).toBeNull();
    expect(readBridgeToken({ querySelector: () => null })).toBeNull();
  });

  it('returns void, sends JSON and the token on the same-origin request, and reports completion', async () => {
    const statuses: string[] = [];
    const calls: { url: string; init: RequestInit }[] = [];
    const transport = createBridgeSaveTransport({
      getToken: () => token,
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200 };
      },
      setStatus: (message) => {
        statuses.push(message);
      },
    });
    expect(transport(request)).toBeUndefined();
    expect(statuses).toEqual(['Saving']);
    await vi.waitFor(() => expect(statuses.at(-1)).toBe('Saved'), { interval: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(request.url);
    expect(calls[0]?.init).toMatchObject({
      method: 'PUT',
      body: '{}',
      mode: 'same-origin',
      redirect: 'error',
    });
    const headers = new Headers(calls[0]?.init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Uplift-Bridge-Token')).toBe(token);
    expect(statuses.join(' ')).not.toContain(token);
  });

  it('reports missing tokens without a request and permits an explicit retry after reload', async () => {
    let currentToken: string | null = null;
    let calls = 0;
    let status = '';
    const transport = createBridgeSaveTransport({
      getToken: () => currentToken,
      fetch: async () => {
        calls += 1;
        return { ok: true, status: 200 };
      },
      setStatus: (message) => {
        status = message;
      },
    });
    transport(request);
    await vi.waitFor(() => expect(status).toMatch(/reload/i), { interval: 1 });
    expect(calls).toBe(0);
    currentToken = token;
    transport(request);
    expect(status).toBe('Saving');
    await vi.waitFor(() => expect(status).toBe('Saved'), { interval: 1 });
    expect(calls).toBe(1);
  });

  it.each([403, 400, 500, 503])(
    'reports HTTP %s without claiming success or replaying the write',
    async (httpStatus) => {
      let status = '';
      let calls = 0;
      const transport = createBridgeSaveTransport({
        getToken: () => token,
        fetch: async () => {
          calls += 1;
          return { ok: false, status: httpStatus };
        },
        setStatus: (message) => {
          status = message;
        },
      });
      transport(request);
      await vi.waitFor(
        () => expect(status).toMatch(httpStatus === 403 ? /reload/i : /save failed/i),
        { interval: 1 },
      );
      expect(status).not.toContain(token);
      expect(calls).toBe(1);
    },
  );

  it('catches network and token-lookup failures without exposing exception text', async () => {
    for (const failedDependency of ['fetch', 'token']) {
      let status = '';
      const transport = createBridgeSaveTransport({
        getToken: () => {
          if (failedDependency === 'token') throw new Error(token);
          return token;
        },
        fetch: async () => {
          throw new Error(token);
        },
        setStatus: (message) => {
          status = message;
        },
      });
      transport(request);
      await vi.waitFor(() => expect(status).toMatch(/save failed/i), { interval: 1 });
      expect(status).not.toContain(token);
    }
  });

  it.each([
    'https://foreign.example/api/scene-blueprints/a',
    '//foreign.example/a',
    '/\\foreign.example/a',
    '/api/scene-blueprints/../secret',
  ])('never sends the token to an invalid save target %s', async (url) => {
    let calls = 0;
    let status = '';
    const transport = createBridgeSaveTransport({
      getToken: () => token,
      fetch: async () => {
        calls += 1;
        return { ok: true, status: 200 };
      },
      setStatus: (message) => {
        status = message;
      },
    });
    transport({ ...request, url });
    await vi.waitFor(() => expect(status).toMatch(/save failed/i), { interval: 1 });
    expect(calls).toBe(0);
  });

  it('sends overlapping explicit saves in order and does not let an older result replace current status', async () => {
    const replies: ((value: { ok: boolean; status: number }) => void)[] = [];
    const bodies: (BodyInit | null | undefined)[] = [];
    let status = '';
    const transport = createBridgeSaveTransport({
      getToken: () => token,
      fetch: (_url, init) => {
        bodies.push(init.body);
        return new Promise((resolve) => {
          replies.push(resolve);
        });
      },
      setStatus: (message) => {
        status = message;
      },
    });
    transport({ ...request, rawBody: 'first' });
    await vi.waitFor(() => expect(replies).toHaveLength(1), { interval: 1 });
    transport({ ...request, rawBody: 'second' });
    expect(bodies).toEqual(['first']);
    replies[0]?.({ ok: false, status: 500 });
    await vi.waitFor(() => expect(replies).toHaveLength(2), { interval: 1 });
    expect(status).toBe('Saving');
    expect(bodies).toEqual(['first', 'second']);
    replies[1]?.({ ok: true, status: 200 });
    await vi.waitFor(() => expect(status).toBe('Saved'), { interval: 1 });
  });

  it('keeps stage and character edits through failure and persists both through explicit lab retries', async () => {
    const base = mkdtempSync(join(tmpdir(), 'uplift-browser-save-'));
    try {
      const stage = { ...DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT, themeId: 'edited_theme' };
      const originalVisual = STARTER_HOLD_CHARACTER_VISUALS[0];
      if (originalVisual === undefined) throw new Error('Missing visual fixture');
      const visual = { ...originalVisual, heightScale: 1.75 };
      const snapshots = JSON.stringify({ stage, visual });
      const telemetry = new NdjsonSessionTelemetry(join(base, 'logs'));
      const saves = new FileSaveSlotRepository(join(base, 'saves'));
      const dirs = {
        sceneBlueprintsDir: join(base, 'stages'),
        characterVisualsDir: join(base, 'characters'),
      };
      let fail = true;
      let status = '';
      const transport = createBridgeSaveTransport({
        getToken: () => token,
        setStatus: (message) => {
          status = message;
        },
        fetch: async (url, init) => {
          if (fail) return { ok: false, status: 403 };
          expect(new Headers(init.headers).get('X-Uplift-Bridge-Token')).toBe(token);
          if (typeof init.body !== 'string') throw new Error('Expected JSON string');
          const response = handleLocalDiskBridgeRequest(
            { method: init.method ?? '', url, rawBody: init.body },
            telemetry,
            saves,
            undefined,
            dirs,
          );
          return { ok: response.statusCode === 200, status: response.statusCode };
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
      expect(lab.saveStage()).toBeUndefined();
      await vi.waitFor(() => expect(status).toMatch(/reload/i), { interval: 1 });
      expect(lab.saveVisual(visual.characterId)).toBeUndefined();
      await vi.waitFor(() => expect(status).toMatch(/reload/i), { interval: 1 });
      expect(JSON.stringify({ stage, visual })).toBe(snapshots);
      fail = false;
      lab.saveStage();
      await vi.waitFor(() => expect(status).toBe('Saved'), { interval: 1 });
      lab.saveVisual(visual.characterId);
      await vi.waitFor(() => expect(status).toBe('Saved'), { interval: 1 });
      expect(
        JSON.parse(readFileSync(join(dirs.sceneBlueprintsDir, `${stage.stageId}.json`), 'utf8')),
      ).toEqual(stage);
      expect(
        JSON.parse(
          readFileSync(join(dirs.characterVisualsDir, `${visual.characterId}.json`), 'utf8'),
        ),
      ).toEqual(visual);
      expect(JSON.stringify({ stage, visual })).toBe(snapshots);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
