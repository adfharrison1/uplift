/**
 * Content Layer Barrel (`src/content/`)
 *
 * Declarative plug-and-play content modules (Eras, Characters, Behaviors, World Topology, Props, Mechanics).
 * Domain content modules depend only on `src/domain/` contracts.
 */
export { DOMAIN_LAYER_ID } from '../domain/index.js';
export const CONTENT_LAYER_ID = 'content' as const;
