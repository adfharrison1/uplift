/**
 * Content Layer Barrel (`src/content/`)
 *
 * Declarative plug-and-play content modules (Eras, Characters, Behaviors, World Topology, Props, Mechanics, and Scene Visuals).
 * Domain content modules depend only on `src/domain/` contracts; presentation scene blueprints live in `src/content/scene/`.
 */
export { DOMAIN_LAYER_ID } from '../domain/index.js';
export const CONTENT_LAYER_ID = 'content' as const;
export {
  DEFAULT_CHARNEL_STAIRS_STAGE_BLUEPRINT,
  DEFAULT_HIGHGLASS_CHARACTER_VISUALS,
  DEFAULT_HIGHGLASS_VISUAL_THEME,
} from './scene/defaultStageContent.js';
export { STARTER_HOLD_CHAMBERS_STAGE, STARTER_HOLD_YARD_STAGE } from './scene/starterHoldStages.js';
export { STARTER_HOLD_PACK } from './worlds/starterHoldPack.js';
