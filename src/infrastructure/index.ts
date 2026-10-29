/**
 * Infrastructure Layer Barrel (`src/infrastructure/`)
 *
 * Concrete adapters implementing domain ports (local ONNX Web Worker, lexical parser, persistence).
 * Depends inward on `src/domain/` only.
 */
export { DOMAIN_LAYER_ID } from '../domain/index.js';
export const INFRASTRUCTURE_LAYER_ID = 'infrastructure' as const;
