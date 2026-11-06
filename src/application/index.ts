/**
 * Application Layer Barrel (`src/application/`)
 *
 * Use-case orchestration, tick coordination, and pure RenderFrameBuilder.
 * Depends inward on `src/domain/` only.
 */
export { DOMAIN_LAYER_ID } from '../domain/index.js';
export const APPLICATION_LAYER_ID = 'application' as const;
export {
  type CognitivePulseOptions,
  type CognitivePulseResult,
  type ConsumedStimulusRecord,
  type DispatchEffectsOptions,
  MAX_FRAME_DT_SECONDS,
  SimulationCoordinator,
  type SimulationCoordinatorOptions,
} from './simulation/SimulationCoordinator.js';
