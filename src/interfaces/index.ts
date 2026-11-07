/**
 * Interfaces & Composition Layer Barrel (`src/interfaces/`)
 *
 * Outer adapter shell: CLI log query tools, Vite local disk bridge, Three.js 60 FPS renderer,
 * and F3 Stage/Wardrobe Inspector DOM Mirror.
 */
export { APPLICATION_LAYER_ID } from '../application/index.js';
export const INTERFACES_LAYER_ID = 'interfaces' as const;

export { executeLogQuery, type ParsedLogQueryCliArgs, parseQueryCliArgs } from './cli/queryLogs.js';
export {
  buildInspectableTargetCatalog,
  type DomAttributeSink,
  InMemoryDomAttributeSink,
  type InspectableSemanticTarget,
  removeWallSegmentMotif,
  StageInspectorDomMirror,
  updateCameraVolumeFraming,
  updateCharacterVisualSlot,
  updateEpochVisualTheme,
  updateStageLight,
  type UpliftStageInspectorGlobal,
  upsertWallSegmentMotif,
} from './hud/StageInspectorDomMirror.js';
export {
  applyRenderFrameToScene,
  type BuiltStageScene,
  buildStageSceneGraph,
  type DisposeSceneGraphOptions,
  disposeSceneGraph,
  findObjectBySemanticId,
  resolveSemanticIdFromObject,
} from './three/ChiaroscuroStageRenderer.js';
export {
  buildCharacterKitbashGroup,
  buildStagePropGroup,
  buildWallMotifGroup,
  computeChiaroscuroColor,
  createChiaroscuroToonMaterial,
  disposeSharedChiaroscuroGradientMap,
  getSharedChiaroscuroGradientMap,
  resolveSurfaceMaterialHex,
} from './three/StageKitbashBuilders.js';
export {
  type BridgeHttpRequest,
  type BridgeHttpResponse,
  type BridgeVisualAssetDirectories,
  handleLocalDiskBridgeRequest,
  isBridgeApiUrl,
  type LocalDiskBridgeOptions,
  localDiskBridgePlugin,
  MAX_BRIDGE_BODY_BYTES,
} from './vite/localDiskBridgePlugin.js';
