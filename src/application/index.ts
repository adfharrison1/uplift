/**
 * Application Layer Barrel (`src/application/`)
 *
 * Use-case orchestration, tick coordination, and pure RenderFrameBuilder.
 * Depends inward on `src/domain/` only.
 */
export { DOMAIN_LAYER_ID } from '../domain/index.js';
export const APPLICATION_LAYER_ID = 'application' as const;
