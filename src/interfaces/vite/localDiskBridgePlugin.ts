import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Connect, CorsOptions, CorsOrigin, Plugin } from 'vite';
import { z } from 'zod';
import {
  CharacterVisualBlueprintSchema,
  StageSceneBlueprintSchema,
} from '../../application/index.js';
import {
  SaveSlotWriteInputSchema,
  TelemetryEventInputSchema,
  validateSaveSlotId,
} from '../../domain/index.js';
import {
  FileSaveSlotRepository,
  NdjsonSessionTelemetry,
  safeParseJsonWithSchema,
} from '../../infrastructure/index.js';
import {
  createSafeLocalFiles,
  UnsafeLocalPathError,
  type LocalFileOptions,
} from '../../infrastructure/persistence/safeLocalFiles.js';

import {
  SessionStorageError,
  TelemetryStorageUnavailableError,
  type SessionStorageOptions,
} from '../../infrastructure/telemetry/NdjsonSessionTelemetry.js';

const policyBrand: unique symbol = Symbol('local-bridge-policy');
interface PolicyState {
  port: number | undefined;
  run?: symbol;
}
const policyStates = new WeakMap<LocalBridgeAccessPolicy, PolicyState>();

export interface LocalBridgeAccessPolicy {
  readonly [policyBrand]: true;
  readonly cors: Readonly<CorsOptions>;
  readonly allowsOrigin: (origin: string) => boolean;
  readonly allowsHost: (host: string) => boolean;
}

/** One immutable policy shared by CORS and the bridge; only server lifecycle binds its port. */
export function createLocalBridgeAccessPolicy(): LocalBridgeAccessPolicy {
  const state: PolicyState = { port: undefined };
  const allowsHost = (host: string): boolean =>
    state.port !== undefined &&
    (host === `localhost:${state.port}` || host === `127.0.0.1:${state.port}`);
  const allowsOrigin = (origin: string): boolean =>
    origin.startsWith('http://') && allowsHost(origin.slice(7));
  // Vite types its Node-style callback error as non-nullable; CORS requires null on success.
  const cors: Readonly<CorsOptions> = Object.freeze({
    origin: (origin: string | undefined, callback: (error: Error, allow: CorsOrigin) => void) =>
      callback(null as unknown as Error, origin !== undefined && allowsOrigin(origin)),
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,X-Uplift-Bridge-Token',
    credentials: false,
    optionsSuccessStatus: 204,
  });
  const policy: LocalBridgeAccessPolicy = Object.freeze({
    [policyBrand]: true as const,
    cors,
    allowsOrigin,
    allowsHost,
  });
  policyStates.set(policy, state);
  return policy;
}

class InvalidBridgeRequestError extends Error {}

function errorResponse(statusCode: number): BridgeHttpResponse {
  const messages: Readonly<Record<number, string>> = {
    400: 'Invalid bridge request',
    403: 'Bridge request forbidden',
    404: 'Bridge resource not found',
    405: 'Method not allowed',
    413: 'Bridge payload too large',
    415: 'JSON content type required',
    500: 'Bridge storage operation failed',
    503: 'Bridge storage unavailable',
  };
  return { statusCode, body: { error: messages[statusCode] ?? messages[500] } };
}

function storageErrorResponse(error: unknown): BridgeHttpResponse {
  const cause = error instanceof SessionStorageError ? error.cause : error;
  if (cause instanceof UnsafeLocalPathError)
    return { statusCode: 400, body: { error: 'Unsafe storage path' } };
  if (error instanceof InvalidBridgeRequestError) return errorResponse(400);
  if (error instanceof TelemetryStorageUnavailableError) return errorResponse(503);
  return errorResponse(500);
}

export const MAX_BRIDGE_BODY_BYTES = 256 * 1024; // 256 KiB

const SAFE_ASSET_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const StartSessionRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export const TelemetryBatchRequestSchema = z.object({
  events: z.array(TelemetryEventInputSchema),
});

export const CompactRequestSchema = z.object({
  retentionWindowMs: z.number().nonnegative().optional(),
});

export const SaveSlotPutRequestSchema = SaveSlotWriteInputSchema.omit({ slotId: true });

export const LocalDiskBridgeOptionsSchema = z.object({
  logsDir: z.string().default(() => resolve(process.cwd(), 'logs')),
  savesDir: z.string().default(() => resolve(process.cwd(), 'saves')),
  sceneBlueprintsDir: z.string().default(() => resolve(process.cwd(), 'src/content/scene/stages')),
  characterVisualsDir: z
    .string()
    .default(() => resolve(process.cwd(), 'src/content/scene/characters')),
  maxPreviousSessions: z.number().int().positive().default(3),
  maxBodyBytes: z.number().int().positive().default(MAX_BRIDGE_BODY_BYTES),
});
export type LocalDiskBridgeOptions = z.input<typeof LocalDiskBridgeOptionsSchema>;

export interface BridgeVisualAssetDirectories {
  readonly sceneBlueprintsDir?: string | undefined;
  readonly characterVisualsDir?: string | undefined;
}

export interface BridgeHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly rawBody?: string | undefined;
  readonly bodyByteLength?: number | undefined;
}

export interface BridgeHttpResponse {
  readonly statusCode: number;
  readonly body: Readonly<Record<string, unknown>>;
}

function extractSafeSlotIdFromPath(pathname: string): string {
  const rawSegment = pathname.slice('/api/saves/'.length);
  if (rawSegment.includes('%') || rawSegment.includes('/') || rawSegment.includes('\\')) {
    throw new InvalidBridgeRequestError(`Invalid save slot id in URL path: '${rawSegment}'`);
  }
  try {
    return validateSaveSlotId(rawSegment);
  } catch {
    throw new InvalidBridgeRequestError();
  }
}

function extractSafeAssetIdFromPath(pathname: string, routePrefix: string): string {
  const rawSegment = pathname.slice(routePrefix.length);
  if (rawSegment.includes('%') || rawSegment.includes('/') || rawSegment.includes('\\')) {
    throw new InvalidBridgeRequestError(`Invalid asset id in URL path: '${rawSegment}'`);
  }
  if (!SAFE_ASSET_ID_PATTERN.test(rawSegment)) {
    throw new InvalidBridgeRequestError(
      `Invalid asset id '${rawSegment}': must match /^[a-z0-9][a-z0-9_-]{0,63}$/`,
    );
  }
  return rawSegment;
}

export function isBridgeApiUrl(url: string): boolean {
  return url === '/api' || url.startsWith('/api/') || url.startsWith('/api?');
}

/**
 * In-process I/O dispatcher for:
 * - `/api/telemetry/*`
 * - `/api/saves/*`
 * - `/api/scene-blueprints/:stageId`
 * - `/api/character-visuals/:characterId`
 *
 * Uses Zod `safeParseJsonWithSchema` for all JSON-to-TypeScript conversions and validation.
 * Filesystem dependencies are trusted caller inputs, never request payload fields.
 * This dispatcher performs disk I/O and is not an HTTP trust boundary.
 */
export function handleLocalDiskBridgeRequest(
  req: BridgeHttpRequest,
  telemetry: NdjsonSessionTelemetry,
  saves: FileSaveSlotRepository,
  maxBodyBytes: number = MAX_BRIDGE_BODY_BYTES,
  visualDirs?: BridgeVisualAssetDirectories,
  visualFileOptions: LocalFileOptions = {},
): BridgeHttpResponse {
  const measuredBytes = req.rawBody !== undefined ? Buffer.byteLength(req.rawBody, 'utf8') : 0;
  const bodyBytes = Math.max(measuredBytes, req.bodyByteLength ?? 0);

  if (bodyBytes > maxBodyBytes) {
    return errorResponse(413);
  }

  const pathname = (req.url.split('?')[0] ?? '/').trim();
  const method = req.method.toUpperCase();
  const defaultDirs = LocalDiskBridgeOptionsSchema.parse({});
  const sceneBlueprintsDir = visualDirs?.sceneBlueprintsDir ?? defaultDirs.sceneBlueprintsDir;
  const characterVisualsDir = visualDirs?.characterVisualsDir ?? defaultDirs.characterVisualsDir;

  try {
    const routeError = checkRoute(pathname, method);
    if (routeError !== undefined) return routeError;
    if (pathname === '/api/telemetry/session') {
      if (method !== 'POST') {
        return errorResponse(405);
      }
      const parsed = safeParseJsonWithSchema(req.rawBody ?? '', StartSessionRequestSchema);
      if (!parsed.success) {
        return errorResponse(400);
      }
      telemetry.startNewSession(parsed.data.sessionId);
      return {
        statusCode: 200,
        body: { sessionId: telemetry.getSessionId() },
      };
    }

    if (pathname === '/api/telemetry/batch') {
      if (method !== 'POST') {
        return errorResponse(405);
      }
      const parsed = safeParseJsonWithSchema(req.rawBody ?? '', TelemetryBatchRequestSchema);
      if (!parsed.success) {
        return errorResponse(400);
      }
      const recorded = telemetry.recordBatch(parsed.data.events);
      return {
        statusCode: 200,
        body: { recordedCount: recorded.length },
      };
    }

    if (pathname === '/api/telemetry/compact') {
      if (method !== 'POST') {
        return errorResponse(405);
      }
      const rawJson =
        req.rawBody !== undefined && req.rawBody.trim().length > 0 ? req.rawBody : '{}';
      const parsed = safeParseJsonWithSchema(rawJson, CompactRequestSchema);
      if (!parsed.success) {
        return errorResponse(400);
      }
      telemetry.compact(parsed.data.retentionWindowMs);
      return {
        statusCode: 200,
        body: { compacted: true },
      };
    }

    if (pathname === '/api/saves') {
      if (method !== 'GET') {
        return errorResponse(405);
      }
      return {
        statusCode: 200,
        body: { slots: saves.listSlots() },
      };
    }

    if (pathname.startsWith('/api/saves/')) {
      const slotId = extractSafeSlotIdFromPath(pathname);

      if (method === 'GET') {
        try {
          const envelope = saves.loadSlot(slotId);
          return { statusCode: 200, body: { envelope } };
        } catch (error) {
          if (error instanceof Error && error.message === `Save slot '${slotId}' does not exist`)
            return errorResponse(404);
          return storageErrorResponse(error);
        }
      }

      if (method === 'PUT') {
        const parsed = safeParseJsonWithSchema(req.rawBody ?? '', SaveSlotPutRequestSchema);
        if (!parsed.success) {
          return errorResponse(400);
        }
        const envelope = saves.saveSlot({
          slotId,
          ...parsed.data,
        });
        return { statusCode: 200, body: { envelope } };
      }

      if (method === 'DELETE') {
        return {
          statusCode: 200,
          body: { deleted: saves.deleteSlot(slotId) },
        };
      }

      return errorResponse(405);
    }

    if (pathname.startsWith('/api/scene-blueprints/')) {
      const stageId = extractSafeAssetIdFromPath(pathname, '/api/scene-blueprints/');
      const fileName = `${stageId}.json`;

      if (method === 'GET') {
        const files = createSafeLocalFiles(sceneBlueprintsDir, visualFileOptions);
        const stat = files.stat(fileName);
        if (stat === undefined) {
          return errorResponse(404);
        }
        if (stat.size > maxBodyBytes) {
          return errorResponse(413);
        }
        const raw = files.read(fileName) ?? '';
        const parsed = safeParseJsonWithSchema(raw, StageSceneBlueprintSchema);
        if (!parsed.success) {
          return errorResponse(400);
        }
        return { statusCode: 200, body: { blueprint: parsed.data } };
      }

      if (method === 'PUT') {
        const parsed = safeParseJsonWithSchema(req.rawBody ?? '', StageSceneBlueprintSchema);
        if (!parsed.success) {
          return errorResponse(400);
        }
        if (parsed.data.stageId !== stageId) {
          return errorResponse(400);
        }
        const serialized = `${JSON.stringify(parsed.data, null, 2)}\n`;
        createSafeLocalFiles(sceneBlueprintsDir, visualFileOptions).writeAtomic(
          fileName,
          serialized,
        );
        return { statusCode: 200, body: { blueprint: parsed.data } };
      }

      return errorResponse(405);
    }

    if (pathname.startsWith('/api/character-visuals/')) {
      const characterId = extractSafeAssetIdFromPath(pathname, '/api/character-visuals/');
      const fileName = `${characterId}.json`;

      if (method === 'GET') {
        const files = createSafeLocalFiles(characterVisualsDir, visualFileOptions);
        const stat = files.stat(fileName);
        if (stat === undefined) {
          return errorResponse(404);
        }
        if (stat.size > maxBodyBytes) {
          return errorResponse(413);
        }
        const raw = files.read(fileName) ?? '';
        const parsed = safeParseJsonWithSchema(raw, CharacterVisualBlueprintSchema);
        if (!parsed.success) {
          return errorResponse(400);
        }
        return { statusCode: 200, body: { visual: parsed.data } };
      }

      if (method === 'PUT') {
        const parsed = safeParseJsonWithSchema(req.rawBody ?? '', CharacterVisualBlueprintSchema);
        if (!parsed.success) {
          return errorResponse(400);
        }
        if (parsed.data.characterId !== characterId) {
          return errorResponse(400);
        }
        const serialized = `${JSON.stringify(parsed.data, null, 2)}\n`;
        createSafeLocalFiles(characterVisualsDir, visualFileOptions).writeAtomic(
          fileName,
          serialized,
        );
        return { statusCode: 200, body: { visual: parsed.data } };
      }

      return errorResponse(405);
    }

    return errorResponse(404);
  } catch (error) {
    return storageErrorResponse(error);
  }
}

/** Resolve only known paths, validating every ID before any request buffering. */
function checkRoute(pathname: string, method: string): BridgeHttpResponse | undefined {
  let methods: readonly string[];
  if (
    ['/api/telemetry/session', '/api/telemetry/batch', '/api/telemetry/compact'].includes(pathname)
  )
    methods = ['POST'];
  else if (pathname === '/api/saves') methods = ['GET'];
  else if (pathname.startsWith('/api/saves/')) {
    extractSafeSlotIdFromPath(pathname);
    methods = ['GET', 'PUT', 'DELETE'];
  } else if (pathname.startsWith('/api/scene-blueprints/')) {
    extractSafeAssetIdFromPath(pathname, '/api/scene-blueprints/');
    methods = ['GET', 'PUT'];
  } else if (pathname.startsWith('/api/character-visuals/')) {
    extractSafeAssetIdFromPath(pathname, '/api/character-visuals/');
    methods = ['GET', 'PUT'];
  } else return errorResponse(404);
  return methods.includes(method) ? undefined : errorResponse(405);
}

function headerValues(req: IncomingMessage, name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (req.rawHeaders[index]?.toLowerCase() === name) values.push(req.rawHeaders[index + 1] ?? '');
  }
  return values;
}

function checkAccess(
  req: IncomingMessage,
  policy: LocalBridgeAccessPolicy,
  token: string,
): BridgeHttpResponse | undefined {
  if (policyStates.get(policy)?.port === undefined) return errorResponse(503);
  const hosts = headerValues(req, 'host');
  const origins = headerValues(req, 'origin');
  const sites = headerValues(req, 'sec-fetch-site');
  if (
    hosts.length !== 1 ||
    !policy.allowsHost(hosts[0] ?? '') ||
    origins.length > 1 ||
    sites.length > 1
  )
    return errorResponse(403);
  if (
    origins.length === 1
      ? !policy.allowsOrigin(origins[0] ?? '')
      : !['same-origin', 'none'].includes(sites[0] ?? '')
  )
    return errorResponse(403);
  const routeError = checkRoute((req.url ?? '').split('?')[0] ?? '', req.method ?? '');
  if (routeError !== undefined) return routeError;
  if (req.method !== 'GET') {
    const tokens = headerValues(req, 'x-uplift-bridge-token');
    if (tokens.length !== 1 || tokens[0] !== token) return errorResponse(403);
    const types = headerValues(req, 'content-type');
    if (types.length !== 1 || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(types[0] ?? ''))
      return errorResponse(415);
  }
  return undefined;
}

type BodyResult = { readonly rawBody: string; readonly byteLength: number } | undefined;
function readRequestBody(
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes: number,
): Promise<BodyResult> {
  return new Promise((resolveBody) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;
    const finish = (result: BodyResult): void => {
      if (settled) return;
      settled = true;
      chunks.length = 0;
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('aborted', onAbort);
      req.off('close', onAbort);
      // Keep the error listener until the request is collected: late socket errors are harmless.
      resolveBody(result);
    };
    const onAbort = (): void => finish(undefined);
    const onEnd = (): void =>
      finish({ rawBody: Buffer.concat(chunks).toString('utf8'), byteLength: totalBytes });
    const onData = (chunk: Buffer): void => {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        finish(undefined);
        sendJsonResponse(res, errorResponse(413));
        req.destroy();
      } else chunks.push(chunk);
    };
    req.on('data', onData);
    req.once('end', onEnd);
    req.once('aborted', onAbort);
    req.once('close', onAbort);
    req.on('error', onAbort);
    if (req.destroyed || req.aborted) finish(undefined);
  });
}

function sendJsonResponse(res: ServerResponse, response: BridgeHttpResponse): void {
  if (res.destroyed || res.writableEnded) return;
  res.statusCode = response.statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(response.body));
}

/** Trusted executable dependencies; none can replace the HTTP access guard. */
export interface LocalDiskBridgeDependencies {
  readonly fileOptions?: LocalFileOptions;
  readonly onDiagnostic?: SessionStorageOptions['onDiagnostic'];
  readonly dispatch?: typeof handleLocalDiskBridgeRequest;
}

/** Every bridge route enters this guard before body consumption or storage dispatch. */
export function createLocalDiskBridgeMiddleware(
  policy: LocalBridgeAccessPolicy,
  token: string,
  telemetry: NdjsonSessionTelemetry,
  saves: FileSaveSlotRepository,
  options: z.output<typeof LocalDiskBridgeOptionsSchema>,
  dependencies: LocalDiskBridgeDependencies = {},
): Connect.NextHandleFunction {
  const run = policyStates.get(policy)?.run;
  const currentRun = (): boolean => {
    const state = policyStates.get(policy);
    return run !== undefined && state?.run === run && state.port !== undefined;
  };
  return (req, res, next) => {
    const url = req.url ?? '/';
    if (!isBridgeApiUrl(url)) {
      next();
      return;
    }
    try {
      const rejected = currentRun() ? checkAccess(req, policy, token) : errorResponse(503);
      if (rejected !== undefined) {
        sendJsonResponse(res, rejected);
        return;
      }
      const length = req.headers['content-length'];
      if (length !== undefined && Number(length) > options.maxBodyBytes) {
        res.setHeader('Connection', 'close');
        sendJsonResponse(res, errorResponse(413));
        // Let the small error response flush, without waiting for any request body.
        res.once('finish', () => req.destroy());
        return;
      }
    } catch (error) {
      sendJsonResponse(res, storageErrorResponse(error));
      return;
    }
    void readRequestBody(req, res, options.maxBodyBytes)
      .then((body) => {
        if (body === undefined) return;
        if (!currentRun()) {
          sendJsonResponse(res, errorResponse(503));
          return;
        }
        const result = (dependencies.dispatch ?? handleLocalDiskBridgeRequest)(
          { method: req.method ?? '', url, rawBody: body.rawBody, bodyByteLength: body.byteLength },
          telemetry,
          saves,
          options.maxBodyBytes,
          options,
          dependencies.fileOptions,
        );
        sendJsonResponse(res, result);
      })
      .catch((error: unknown) => sendJsonResponse(res, storageErrorResponse(error)));
  };
}

/** Local TCP development bridge. CORS and middleware share one lifecycle-bound policy. */
export function localDiskBridgePlugin(
  options: LocalDiskBridgeOptions = {},
  policy: LocalBridgeAccessPolicy = createLocalBridgeAccessPolicy(),
  dependencies: LocalDiskBridgeDependencies = {},
): Plugin {
  const parsed = LocalDiskBridgeOptionsSchema.parse(options);
  const state = policyStates.get(policy);
  if (state === undefined) throw new Error('Invalid local bridge policy');
  let bridgeToken: string | undefined;
  let saves: FileSaveSlotRepository | undefined;
  return {
    name: 'uplift-local-disk-bridge',
    apply: 'serve',
    transformIndexHtml(_html, context) {
      if (context.server === undefined || bridgeToken === undefined) return;
      return [
        {
          tag: 'meta',
          attrs: { name: 'uplift-bridge-token', content: bridgeToken },
          injectTo: 'head',
        },
      ];
    },
    configureServer(server) {
      const run = Symbol('bridge-run');
      state.run = run;
      state.port = undefined;
      bridgeToken = undefined;
      const http = server.httpServer;
      if (http === null) throw new Error('Local bridge requires a TCP dev server');
      const bind = (): void => {
        if (state.run !== run) return;
        const address = http.address();
        if (address === null) return;
        if (typeof address === 'string') throw new Error('Local bridge requires a TCP dev server');
        state.port = address.port;
      };
      // Refuse an already-listening non-TCP server before creating storage.
      bind();
      const telemetry = new NdjsonSessionTelemetry(
        parsed.logsDir,
        undefined,
        undefined,
        undefined,
        {
          ...dependencies.fileOptions,
          maxPreviousSessions: parsed.maxPreviousSessions,
          ...(dependencies.onDiagnostic === undefined
            ? {}
            : { onDiagnostic: dependencies.onDiagnostic }),
        },
      );
      saves ??= new FileSaveSlotRepository(parsed.savesDir, dependencies.fileOptions);
      bridgeToken = randomBytes(32).toString('hex');
      const retire = (): void => {
        if (state.run === run) {
          delete state.run;
          state.port = undefined;
          bridgeToken = undefined;
        }
      };
      const restart = server.restart;
      let restarting: Promise<void> | undefined;
      server.restart = async (forceOptimize): Promise<void> => {
        // Vite builds the replacement before closing this server, possibly with a new policy.
        // Queue concurrent calls outside Vite's internal loop so every run is retired first.
        if (restarting !== undefined) {
          await restarting;
          return server.restart(forceOptimize);
        }
        retire();
        restarting = restart.call(server, forceOptimize);
        try {
          await restarting;
        } finally {
          restarting = undefined;
        }
      };
      http.on('listening', bind);
      http.once('close', () => {
        retire();
        http.off('listening', bind);
      });
      const middleware = createLocalDiskBridgeMiddleware(
        policy,
        bridgeToken,
        telemetry,
        saves,
        parsed,
        dependencies,
      );
      // Vite installs CORS before this hook; mount before its HTML fallback rewrites API URLs.
      server.middlewares.use(middleware);
    },
  };
}
