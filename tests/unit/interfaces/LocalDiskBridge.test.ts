import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  FileSaveSlotRepository,
  fixedTelemetryClock,
  NdjsonSessionTelemetry,
} from '../../../src/infrastructure/index.js';
import {
  handleLocalDiskBridgeRequest,
  localDiskBridgePlugin,
  MAX_BRIDGE_BODY_BYTES,
} from '../../../src/interfaces/index.js';
import { withSaveSnapshot } from '../../support/withSaveSnapshot.js';

describe('Vite Local Disk Bridge Middleware', () => {
  let tempLogsDir: string;
  let tempSavesDir: string;
  let telemetry: NdjsonSessionTelemetry;
  let saves: FileSaveSlotRepository;

  beforeEach(() => {
    tempLogsDir = mkdtempSync(join(tmpdir(), 'uplift-bridge-logs-'));
    tempSavesDir = mkdtempSync(join(tmpdir(), 'uplift-bridge-saves-'));
    telemetry = new NdjsonSessionTelemetry(
      tempLogsDir,
      'bridge-session',
      fixedTelemetryClock('2026-11-06T12:00:00.000Z', 1000),
    );
    saves = new FileSaveSlotRepository(tempSavesDir);
  });

  afterEach(() => {
    rmSync(tempLogsDir, { recursive: true, force: true });
    rmSync(tempSavesDir, { recursive: true, force: true });
  });

  it('appends valid telemetry batches, starts new sessions, and compacts via HTTP routes', () => {
    const plugin = localDiskBridgePlugin({ logsDir: tempLogsDir, savesDir: tempSavesDir });
    expect(plugin.name).toBe('uplift-local-disk-bridge');

    const sessionRes = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/telemetry/session',
        rawBody: JSON.stringify({ sessionId: 'web-session-01' }),
      },
      telemetry,
      saves,
    );
    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.body['sessionId']).toBe('web-session-01');

    const batchRes = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/telemetry/batch',
        rawBody: JSON.stringify({
          events: [
            {
              epochId: 'era_1_highglass_hold',
              worldTick: 1,
              level: 'info',
              category: 'player',
              actorId: 'player.deme',
              acteeId: 'npc.vane',
              action: 'speak',
              message: 'Greeted Steward Vane',
            },
          ],
        }),
      },
      telemetry,
      saves,
    );
    expect(batchRes.statusCode).toBe(200);
    expect(batchRes.body['recordedCount']).toBe(1);
    expect(telemetry.query()).toHaveLength(1);

    const compactRes = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/telemetry/compact',
        rawBody: JSON.stringify({ retentionWindowMs: 500 }),
      },
      telemetry,
      saves,
    );
    expect(compactRes.statusCode).toBe(200);
    expect(compactRes.body['compacted']).toBe(true);
  });

  it('handles multi-session save PUT, GET, list, and DELETE via HTTP routes', () => {
    const putRes = handleLocalDiskBridgeRequest(
      {
        method: 'PUT',
        url: '/api/saves/court-day-1',
        rawBody: JSON.stringify(
          withSaveSnapshot({
            epochId: 'era_1_highglass_hold',
            packId: 'test_bridge_pack',
            packVersion: 1,
            worldTick: 9,
            rngState: 55_555,
            stateSlices: { 'office.physician': true },
            legacyState: {
              sourceEpochId: 'era_1_highglass_hold',
              materialScars: [],
              veilScars: [],
              lineageMutations: [],
            },
          }),
        ),
      },
      telemetry,
      saves,
    );
    expect(putRes.statusCode).toBe(200);

    const listRes = handleLocalDiskBridgeRequest(
      { method: 'GET', url: '/api/saves' },
      telemetry,
      saves,
    );
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body['slots']).toHaveLength(1);

    const getRes = handleLocalDiskBridgeRequest(
      { method: 'GET', url: '/api/saves/court-day-1' },
      telemetry,
      saves,
    );
    expect(getRes.statusCode).toBe(200);

    const delRes = handleLocalDiskBridgeRequest(
      { method: 'DELETE', url: '/api/saves/court-day-1' },
      telemetry,
      saves,
    );
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body['deleted']).toBe(true);

    const missingRes = handleLocalDiskBridgeRequest(
      { method: 'GET', url: '/api/saves/court-day-1' },
      telemetry,
      saves,
    );
    expect(missingRes.statusCode).toBe(404);
  });

  it('rejects oversized bodies (413), malformed JSON (400), invalid telemetry batches (400), and path-traversal slotIds (400) with zero disk writes', () => {
    const oversizedRes = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/telemetry/batch',
        rawBody: 'x'.repeat(MAX_BRIDGE_BODY_BYTES + 10),
      },
      telemetry,
      saves,
    );
    expect(oversizedRes.statusCode).toBe(413);
    expect(telemetry.query()).toHaveLength(0);

    const malformedJsonRes = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/telemetry/batch',
        rawBody: '{bad_json',
      },
      telemetry,
      saves,
    );
    expect(malformedJsonRes.statusCode).toBe(400);
    expect(telemetry.query()).toHaveLength(0);

    // Malformed JSON on /api/telemetry/compact must also return 400 (even though retentionWindowMs is optional)
    const malformedCompactRes = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/telemetry/compact',
        rawBody: '{bad_json',
      },
      telemetry,
      saves,
    );
    expect(malformedCompactRes.statusCode).toBe(400);

    // 405 Method Not Allowed and 404 Unknown API route
    expect(
      handleLocalDiskBridgeRequest({ method: 'GET', url: '/api/telemetry/batch' }, telemetry, saves)
        .statusCode,
    ).toBe(405);
    expect(
      handleLocalDiskBridgeRequest({ method: 'GET', url: '/api/unknown' }, telemetry, saves)
        .statusCode,
    ).toBe(404);

    // Batch with one valid event and one invalid event must reject the whole batch with zero partial writes
    const partialInvalidBatch = handleLocalDiskBridgeRequest(
      {
        method: 'POST',
        url: '/api/telemetry/batch',
        rawBody: JSON.stringify({
          events: [
            {
              epochId: 'era_1',
              worldTick: 1,
              level: 'info',
              category: 'player',
              actorId: 'player.deme',
              action: 'ok',
              message: 'Valid event',
            },
            {
              epochId: 'era_1',
              worldTick: -5,
              level: 'invalid_level',
            },
          ],
        }),
      },
      telemetry,
      saves,
    );
    expect(partialInvalidBatch.statusCode).toBe(400);
    expect(telemetry.query()).toHaveLength(0);

    // Path traversal slotId rejected with 400
    for (const badUrl of [
      '/api/saves/..%2F..%2Fetc%2Fpasswd',
      '/api/saves/../../etc/passwd',
      '/api/saves/.hidden',
    ]) {
      const res = handleLocalDiskBridgeRequest({ method: 'GET', url: badUrl }, telemetry, saves);
      expect(res.statusCode).toBe(400);
    }
    expect(saves.listSlots()).toHaveLength(0);
  });
});
