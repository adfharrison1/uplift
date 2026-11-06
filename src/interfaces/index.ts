/**
 * Interfaces & Composition Layer Barrel (`src/interfaces/`)
 *
 * Outer adapter shell: CLI log query tools, Vite local disk bridge, Three.js 60 FPS renderer,
 * HUD, and dependency composition root.
 */
export { APPLICATION_LAYER_ID } from '../application/index.js';
export const INTERFACES_LAYER_ID = 'interfaces' as const;

export { executeLogQuery, type ParsedLogQueryCliArgs, parseQueryCliArgs } from './cli/queryLogs.js';
