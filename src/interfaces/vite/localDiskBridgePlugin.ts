import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { z } from 'zod';
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

export const MAX_BRIDGE_BODY_BYTES = 256 * 1024; // 256 KiB

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
  maxBodyBytes: z.number().int().positive().default(MAX_BRIDGE_BODY_BYTES),
});
export type LocalDiskBridgeOptions = z.input<typeof LocalDiskBridgeOptionsSchema>;

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
    throw new Error(`Invalid save slot id in URL path: '${rawSegment}'`);
  }
  return validateSaveSlotId(rawSegment);
}

/**
 * Pure, deterministic HTTP request handler for `/api/telemetry/*` and `/api/saves/*`.
 * Uses Zod `safeParseJsonWithSchema` for all JSON-to-TypeScript conversions and validation.
 */
export function handleLocalDiskBridgeRequest(
  req: BridgeHttpRequest,
  telemetry: NdjsonSessionTelemetry,
  saves: FileSaveSlotRepository,
  maxBodyBytes: number = MAX_BRIDGE_BODY_BYTES,
): BridgeHttpResponse {
  const bodyBytes =
    req.bodyByteLength ?? (req.rawBody !== undefined ? Buffer.byteLength(req.rawBody, 'utf8') : 0);

  if (bodyBytes > maxBodyBytes) {
    return {
      statusCode: 413,
      body: { error: `Payload exceeds maximum size of ${String(maxBodyBytes)} bytes` },
    };
  }

  const pathname = (req.url.split('?')[0] ?? '/').trim();
  const method = req.method.toUpperCase();

  try {
    if (pathname === '/api/telemetry/session') {
      if (method !== 'POST') {
        return { statusCode: 405, body: { error: 'Method not allowed' } };
      }
      const parsed = safeParseJsonWithSchema(req.rawBody ?? '', StartSessionRequestSchema);
      if (!parsed.success) {
        return { statusCode: 400, body: { error: parsed.error.message } };
      }
      telemetry.startNewSession(parsed.data.sessionId);
      return {
        statusCode: 200,
        body: { sessionId: telemetry.getSessionId() },
      };
    }

    if (pathname === '/api/telemetry/batch') {
      if (method !== 'POST') {
        return { statusCode: 405, body: { error: 'Method not allowed' } };
      }
      const parsed = safeParseJsonWithSchema(req.rawBody ?? '', TelemetryBatchRequestSchema);
      if (!parsed.success) {
        return { statusCode: 400, body: { error: parsed.error.message } };
      }
      const recorded = telemetry.recordBatch(parsed.data.events);
      return {
        statusCode: 200,
        body: { recordedCount: recorded.length },
      };
    }

    if (pathname === '/api/telemetry/compact') {
      if (method !== 'POST') {
        return { statusCode: 405, body: { error: 'Method not allowed' } };
      }
      const rawJson =
        req.rawBody !== undefined && req.rawBody.trim().length > 0 ? req.rawBody : '{}';
      const parsed = safeParseJsonWithSchema(rawJson, CompactRequestSchema);
      if (!parsed.success) {
        return { statusCode: 400, body: { error: parsed.error.message } };
      }
      telemetry.compact(parsed.data.retentionWindowMs);
      return {
        statusCode: 200,
        body: { compacted: true },
      };
    }

    if (pathname === '/api/saves') {
      if (method !== 'GET') {
        return { statusCode: 405, body: { error: 'Method not allowed' } };
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
          const msg = error instanceof Error ? error.message : String(error);
          return {
            statusCode: msg.includes('does not exist') ? 404 : 400,
            body: { error: msg },
          };
        }
      }

      if (method === 'PUT') {
        const parsed = safeParseJsonWithSchema(req.rawBody ?? '', SaveSlotPutRequestSchema);
        if (!parsed.success) {
          return { statusCode: 400, body: { error: parsed.error.message } };
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

      return { statusCode: 405, body: { error: 'Method not allowed' } };
    }

    return { statusCode: 404, body: { error: `Unknown API route: ${pathname}` } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bad request';
    return { statusCode: 400, body: { error: message } };
  }
}

function readRequestBody(
  req: IncomingMessage,
  maxBytes: number,
): Promise<{ readonly rawBody: string; readonly byteLength: number; readonly tooLarge: boolean }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let tooLarge = false;

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        tooLarge = true;
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      resolvePromise({
        rawBody: tooLarge ? '' : Buffer.concat(chunks).toString('utf8'),
        byteLength: totalBytes,
        tooLarge,
      });
    });

    req.on('error', (err) => {
      rejectPromise(err);
    });
  });
}

function sendJsonResponse(res: ServerResponse, response: BridgeHttpResponse): void {
  res.statusCode = response.statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(response.body));
}

/**
 * Vite dev server plugin mounting `/api/telemetry/*` and `/api/saves/*` for local disk persistence.
 */
export function localDiskBridgePlugin(options: LocalDiskBridgeOptions = {}): Plugin {
  const { logsDir, savesDir, maxBodyBytes } = LocalDiskBridgeOptionsSchema.parse(options);

  let telemetry: NdjsonSessionTelemetry | undefined;
  let saves: FileSaveSlotRepository | undefined;

  return {
    name: 'uplift-local-disk-bridge',
    configureServer(server) {
      telemetry ??= new NdjsonSessionTelemetry(logsDir);
      saves ??= new FileSaveSlotRepository(savesDir);

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '/';
        if (!url.startsWith('/api/telemetry') && !url.startsWith('/api/saves')) {
          next();
          return;
        }

        void readRequestBody(req, maxBodyBytes)
          .then(({ rawBody, byteLength, tooLarge }) => {
            if (tooLarge) {
              sendJsonResponse(res, {
                statusCode: 413,
                body: { error: `Payload exceeds maximum size of ${String(maxBodyBytes)} bytes` },
              });
              return;
            }
            if (telemetry === undefined || saves === undefined) {
              sendJsonResponse(res, {
                statusCode: 500,
                body: { error: 'Bridge repositories not initialized' },
              });
              return;
            }
            const result = handleLocalDiskBridgeRequest(
              {
                method: req.method ?? 'GET',
                url,
                rawBody,
                bodyByteLength: byteLength,
              },
              telemetry,
              saves,
              maxBodyBytes,
            );
            sendJsonResponse(res, result);
          })
          .catch(() => {
            sendJsonResponse(res, {
              statusCode: 500,
              body: { error: 'Internal bridge I/O error' },
            });
          });
      });
    },
  };
}
