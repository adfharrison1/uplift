import type { BlueprintSaveRequest } from './stageLabPanel.js';

export interface BridgeSaveTransportOptions {
  readonly getToken: () => string | null;
  readonly fetch: (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status'>>;
  readonly setStatus: (message: string) => void;
}

/** Read from the served page at save time so an explicit retry can use updated metadata. */
export function readBridgeToken(ownerDocument: {
  querySelector(selector: string): Pick<Element, 'getAttribute'> | null;
}): string | null {
  return (
    ownerDocument
      .querySelector('meta[name="uplift-bridge-token"]')
      ?.getAttribute('content')
      ?.trim() || null
  );
}

const RELOAD_MESSAGE =
  'Save failed. Reload the dev page before saving again. Your edit is still in memory.';
const NETWORK_MESSAGE =
  'Save failed. Check the local server, then try again. Your edit is still in memory.';
const SAVE_PATH = /^\/api\/(?:scene-blueprints|character-visuals)\/[a-z0-9][a-z0-9_-]{0,63}$/;

/** Preserve the lab's void callback contract; each explicit save is sent once, in order. */
export function createBridgeSaveTransport(
  options: BridgeSaveTransportOptions,
): (request: BlueprintSaveRequest) => void {
  let pending: Promise<void> = Promise.resolve();
  let latestAttempt = 0;
  return (request): void => {
    const attempt = ++latestAttempt;
    options.setStatus('Saving');
    const report = (message: string): void => {
      if (attempt === latestAttempt) options.setStatus(message);
    };
    pending = pending
      .then(async () => {
        if (!SAVE_PATH.test(request.url)) {
          report('Save failed: invalid destination. Your edit is still in memory.');
          return;
        }
        const token = options.getToken()?.trim();
        if (!token) {
          report(RELOAD_MESSAGE);
          return;
        }
        const response = await options.fetch(request.url, {
          method: request.method,
          headers: { 'Content-Type': 'application/json', 'X-Uplift-Bridge-Token': token },
          body: request.rawBody,
          mode: 'same-origin',
          redirect: 'error',
        });
        if (!response.ok) {
          report(
            response.status === 403
              ? RELOAD_MESSAGE
              : `Save failed (HTTP ${response.status}). Your edit is still in memory. Try saving again.`,
          );
          return;
        }
        report('Saved');
      })
      .catch(() => {
        report(NETWORK_MESSAGE);
      });
  };
}
