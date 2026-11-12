import { beforeEach, describe, expect, it } from 'vitest';
import { makeStageBlueprint } from '../../../support/makeStageBlueprint.js';
import { event, rawRequest, save, snapshot, start } from './harness.js';

describe('real loopback bridge authorization', () => {
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
    const stage = makeStageBlueprint('room_http_auth');
    for (const [path, method, body] of [
      ['/api/telemetry/session', 'POST', '{"sessionId":"denied"}'],
      ['/api/telemetry/batch', 'POST', JSON.stringify({ events: [event] })],
      ['/api/telemetry/compact', 'POST', '{}'],
      ['/api/saves/slot', 'PUT', JSON.stringify(save)],
      ['/api/saves/slot', 'DELETE', ''],
      [`/api/scene-blueprints/${stage.stageId}`, 'PUT', JSON.stringify(stage)],
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
    const stage = makeStageBlueprint('room_http_auth');
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
      ['/api/scene-blueprints/different', JSON.stringify(stage)],
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
