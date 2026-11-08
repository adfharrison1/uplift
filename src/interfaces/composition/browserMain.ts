/**
 * Campaign page entry (`src/interfaces/composition/browserMain.ts`).
 *
 * One canvas, one renderer, one animation frame. The boot loop takes a launch payload.
 * The proving-slice pack is the payload passed at startup.
 */
import * as THREE from 'three';
import {
  type CharacterVisualBlueprint,
  type EpochVisualTheme,
  PlaySession,
  RenderFrameBuilder,
  type StageSceneBlueprint,
  SimulationCoordinator,
} from '../../application/index.js';
import {
  DEFAULT_HIGHGLASS_VISUAL_THEME,
  STARTER_HOLD_CHARACTER_VISUALS,
  STARTER_HOLD_PACK,
  STARTER_HOLD_STAGE_DIRECTORY,
} from '../../content/index.js';
import {
  EpochModuleRegistry,
  type EpochModulePackInput,
  SAVE_SLOT_SCHEMA_VERSION,
  type SaveSlotEnvelope,
  SaveSlotEnvelopeSchema,
  type SaveSlotMetadata,
  type SaveSlotRepositoryPort,
  type SaveSlotWriteInput,
  type SessionTelemetryPort,
  type TelemetryClock,
  type TelemetryEntry,
  TelemetryEventInputSchema,
  type TelemetryEventInput,
  type TelemetryQueryFilter,
  type TelemetryStreamRecord,
  validateSaveSlotId,
} from '../../domain/index.js';
import {
  type DomAttributeSink,
  InMemoryDomAttributeSink,
  StageInspectorDomMirror,
} from '../hud/StageInspectorDomMirror.js';
import {
  applyRenderFrameToScene,
  type BuiltStageScene,
  buildStageSceneGraph,
  disposeSceneGraph,
  resolveSemanticIdFromObject,
} from '../three/ChiaroscuroStageRenderer.js';
import { createPlayInput } from './playInput.js';
import { createResidentPlayLists } from './residentPlayLists.js';
import {
  cappedDevicePixelRatio,
  createCampaignShell,
  prefersReducedMotion,
} from './shellDocument.js';
import { createStageLab } from './stageLabPanel.js';

const TELEMETRY_ENTRY_CAP = 2048;

export interface CampaignLaunch {
  readonly pack: EpochModulePackInput;
  readonly stages: ReadonlyMap<string, StageSceneBlueprint>;
  readonly characterVisuals: ReadonlyArray<CharacterVisualBlueprint>;
  readonly theme: EpochVisualTheme;
  readonly focusEntityId: string;
}

export function bootCampaignPage(
  ownerDocument: Document,
  ownerWindow: Window,
  launch: CampaignLaunch,
): void {
  const shell = createCampaignShell();
  shell.registerDevHudPanel('stage');
  const { canvas } = shell.mount(ownerDocument, ownerDocument.body);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  const resize = (): void => {
    renderer.setPixelRatio(cappedDevicePixelRatio(ownerWindow.devicePixelRatio));
    renderer.setSize(ownerWindow.innerWidth, ownerWindow.innerHeight, false);
  };
  resize();
  ownerWindow.addEventListener('resize', resize);

  const registry = new EpochModuleRegistry();
  registry.registerPack(launch.pack);
  const clock = browserClock(ownerWindow);
  const coordinator = new SimulationCoordinator({
    epochId: launch.pack.epochId,
    registry,
    telemetry: new BrowserSessionTelemetry(clock),
    saveRepository: new BrowserSaveRepository(clock),
    clock,
  });
  const session = new PlaySession(coordinator, new RenderFrameBuilder(), {
    stages: launch.stages,
    characterVisuals: launch.characterVisuals,
    theme: launch.theme,
    focusEntityId: launch.focusEntityId,
  });

  let built: BuiltStageScene | null = null;
  const mountStage = (stage: StageSceneBlueprint): void => {
    built = buildStageSceneGraph({
      theme: launch.theme,
      stage,
      characterVisuals: launch.characterVisuals,
    });
  };
  const initialStage = session.getResidentStage();
  if (initialStage !== null) {
    mountStage(initialStage);
  }
  const applyStage = (
    releasedStageId: string | null,
    residentStage: StageSceneBlueprint | null,
  ): void => {
    if (releasedStageId !== null && built !== null) {
      disposeSceneGraph(built.scene);
      built = null;
    }
    if (built === null && residentStage !== null) {
      mountStage(residentStage);
    }
  };

  const stagePanel = ownerDocument.querySelector('[data-dev-hud-panel="stage"]');
  const mirror = new StageInspectorDomMirror(
    stagePanel instanceof HTMLElement
      ? elementAttributeSink(stagePanel)
      : new InMemoryDomAttributeSink(),
  );
  const lab = createStageLab({
    mirror,
    isPaused: () => coordinator.getWorldState().paused,
    getStage: () => session.getResidentStage(),
    getVisuals: () => launch.characterVisuals,
    requestPortal: (propId, portalState) => input.requestPortal(propId, portalState),
    transport: (request) => {
      void ownerWindow.fetch(request.url, {
        method: request.method,
        headers: { 'content-type': 'application/json' },
        body: request.rawBody,
      });
    },
  });
  let pointer = { x: 0, y: 0 };
  const playLists = createResidentPlayLists({
    focusSpaceId: () => coordinator.getWorldState().entities[session.getFocusEntityId()]?.spaceId,
    entities: () => coordinator.getWorldState().entities,
    waypointIds: (spaceId) =>
      registry
        .getAllSpaces()
        .find((space) => space.id === spaceId)
        ?.waypoints.map((waypoint) => waypoint.id),
  });
  const input = createPlayInput({
    session,
    isPaused: () => coordinator.getWorldState().paused,
    waypointIds: () => playLists.waypointIds(),
    entityIds: () => playLists.entityIds(),
    readPortalState: (propId) => coordinator.getWorldState().props[propId]?.portalState,
    raycastFloor: () => raycastFloor(pointer, canvas, built),
    raycastPortal: () => raycastPortal(pointer, canvas, built, session.getResidentStage()),
    raycastPick: () => raycastPick(pointer, canvas, built),
    onPick: (semanticId) => {
      lab.pick(
        semanticId,
        coordinator.getWorldState().paused ? 'debug_free_cam' : 'tracking_volume',
      );
    },
    onFocusStage: (releasedStageId) => {
      applyStage(releasedStageId, session.getResidentStage());
    },
  });
  if (stagePanel instanceof HTMLElement) {
    input.attach(stagePanel);
    lab.attach(stagePanel);
  }
  canvas.addEventListener('pointerdown', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    input.pointerDown();
  });
  ownerWindow.addEventListener('keydown', (event) => {
    input.keyDown(event.key, event.repeat);
  });

  let previousMs = ownerWindow.performance.now();
  const onFrame = (nowMs: number): void => {
    const dtSeconds = Math.max(0, (nowMs - previousMs) / 1000);
    previousMs = nowMs;
    const result = session.frame(dtSeconds, {
      reduceMotionAndFlashing: prefersReducedMotion((query) => ownerWindow.matchMedia(query)),
      aspect: ownerWindow.innerHeight > 0 ? ownerWindow.innerWidth / ownerWindow.innerHeight : 1,
    });
    applyStage(result.releasedStageId, result.residentStage);
    if (built !== null && result.renderFrame !== null) {
      const selection = lab.selection();
      applyRenderFrameToScene(
        built,
        {
          ...result.renderFrame,
          domMirror: {
            ...result.renderFrame.domMirror,
            hoveredSemanticId: selection,
            selectedSemanticId: selection,
          },
        },
        launch.theme,
      );
      renderer.render(built.scene, built.camera);
    }
    input.sync();
    ownerWindow.requestAnimationFrame(onFrame);
  };
  ownerWindow.requestAnimationFrame(onFrame);
}

function elementAttributeSink(element: HTMLElement): DomAttributeSink {
  return {
    setAttribute(name: string, value: string): void {
      element.setAttribute(name, value);
    },
    getAttribute(name: string): string | null {
      return element.getAttribute(name);
    },
    removeAttribute(name: string): void {
      element.removeAttribute(name);
    },
  };
}

function pointerIntersections(
  pointer: { readonly x: number; readonly y: number },
  canvas: HTMLCanvasElement,
  built: BuiltStageScene | null,
): THREE.Intersection[] {
  if (built === null) {
    return [];
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return [];
  }
  const ndc = new THREE.Vector2(
    ((pointer.x - rect.left) / rect.width) * 2 - 1,
    -((pointer.y - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, built.camera);
  return raycaster
    .intersectObject(built.stageRoot, true)
    .filter((hit) => objectIsVisible(hit.object));
}

function objectIsVisible(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current !== null) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function raycastPick(
  pointer: { readonly x: number; readonly y: number },
  canvas: HTMLCanvasElement,
  built: BuiltStageScene | null,
): { readonly semanticId: string } | null {
  for (const hit of pointerIntersections(pointer, canvas, built)) {
    const semanticId = resolveSemanticIdFromObject(hit.object);
    if (semanticId !== null) {
      return { semanticId };
    }
  }
  return null;
}

function raycastPortal(
  pointer: { readonly x: number; readonly y: number },
  canvas: HTMLCanvasElement,
  built: BuiltStageScene | null,
  stage: StageSceneBlueprint | null,
): { readonly propId: string; readonly semanticId: string } | null {
  if (stage === null) {
    return null;
  }
  for (const hit of pointerIntersections(pointer, canvas, built)) {
    const semanticId = resolveSemanticIdFromObject(hit.object);
    if (semanticId === null) {
      continue;
    }
    const prop = stage.props.find(
      (candidate) => candidate.semanticId === semanticId && candidate.isPortal,
    );
    if (prop !== undefined) {
      return { propId: prop.propId, semanticId };
    }
  }
  return null;
}

function raycastFloor(
  pointer: { readonly x: number; readonly y: number },
  canvas: HTMLCanvasElement,
  built: BuiltStageScene | null,
): { readonly x: number; readonly z: number } | null {
  for (const hit of pointerIntersections(pointer, canvas, built)) {
    const semanticId = resolveSemanticIdFromObject(hit.object);
    if (semanticId !== null && semanticId.endsWith('.floor')) {
      return { x: hit.point.x, z: hit.point.z };
    }
  }
  return null;
}

function browserClock(ownerWindow: Window): TelemetryClock {
  const startedMs = ownerWindow.performance.now();
  return {
    nowIso(): string {
      return new Date().toISOString();
    },
    elapsedSessionMs(): number {
      return Math.max(0, ownerWindow.performance.now() - startedMs);
    },
  };
}

class BrowserSessionTelemetry implements SessionTelemetryPort {
  private sessionId = 'browser-session';
  private sequence = 0;
  private readonly entries: TelemetryEntry[] = [];

  public constructor(private clock: TelemetryClock) {}

  public getSessionId(): string {
    return this.sessionId;
  }

  public startNewSession(sessionId: string, clock?: TelemetryClock): void {
    const trimmed = sessionId.trim();
    if (trimmed.length === 0) {
      throw new Error('sessionId must be a non-empty string');
    }
    this.sessionId = trimmed;
    if (clock !== undefined) {
      this.clock = clock;
    }
    this.sequence = 0;
    this.entries.length = 0;
  }

  public record(event: TelemetryEventInput): TelemetryEntry {
    const validated = TelemetryEventInputSchema.parse(event);
    this.sequence += 1;
    const entry: TelemetryEntry = {
      ...validated,
      recordType: 'event',
      sessionId: this.sessionId,
      sequence: this.sequence,
      timestampIso: this.clock.nowIso(),
      elapsedSessionMs: this.clock.elapsedSessionMs(),
    };
    this.entries.push(entry);
    if (this.entries.length > TELEMETRY_ENTRY_CAP) {
      this.entries.splice(0, this.entries.length - TELEMETRY_ENTRY_CAP);
    }
    return entry;
  }

  public compact(retentionWindowMs: number): void {
    void retentionWindowMs;
  }

  public query(filter?: TelemetryQueryFilter): ReadonlyArray<TelemetryStreamRecord> {
    if (filter === undefined) {
      return [...this.entries];
    }
    return this.entries.filter((entry) => entryMatches(entry, filter));
  }
}

function entryMatches(entry: TelemetryEntry, filter: TelemetryQueryFilter): boolean {
  if (filter.level !== undefined && entry.level !== filter.level) {
    return false;
  }
  if (filter.category !== undefined && entry.category !== filter.category) {
    return false;
  }
  if (filter.actorId !== undefined && entry.actorId !== filter.actorId) {
    return false;
  }
  if (filter.acteeId !== undefined && entry.acteeId !== filter.acteeId) {
    return false;
  }
  if (filter.action !== undefined && entry.action !== filter.action) {
    return false;
  }
  if (filter.minTick !== undefined && entry.worldTick < filter.minTick) {
    return false;
  }
  if (filter.maxTick !== undefined && entry.worldTick > filter.maxTick) {
    return false;
  }
  if (filter.hasAiReasoning === true && entry.aiReasoning === undefined) {
    return false;
  }
  if (filter.hasAiReasoning === false && entry.aiReasoning !== undefined) {
    return false;
  }
  return true;
}

class BrowserSaveRepository implements SaveSlotRepositoryPort {
  private readonly slots = new Map<string, SaveSlotEnvelope>();

  public constructor(private readonly clock: TelemetryClock) {}

  public saveSlot(input: SaveSlotWriteInput): SaveSlotEnvelope {
    const slotId = validateSaveSlotId(input.slotId);
    const envelope = SaveSlotEnvelopeSchema.parse({
      slotId,
      schemaVersion: SAVE_SLOT_SCHEMA_VERSION,
      epochId: input.epochId,
      worldTick: input.worldTick,
      rngState: input.rngState,
      stateSlices: input.stateSlices,
      ...(input.legacyState !== undefined ? { legacyState: input.legacyState } : {}),
      savedAtIso: input.savedAtIso ?? this.clock.nowIso(),
    });
    this.slots.set(slotId, envelope);
    return envelope;
  }

  public loadSlot(slotId: string): SaveSlotEnvelope {
    const validId = validateSaveSlotId(slotId);
    const envelope = this.slots.get(validId);
    if (envelope === undefined) {
      throw new Error(`Save slot '${validId}' does not exist`);
    }
    return envelope;
  }

  public listSlots(): ReadonlyArray<SaveSlotMetadata> {
    return [...this.slots.values()].map((envelope) => ({
      slotId: envelope.slotId,
      schemaVersion: envelope.schemaVersion,
      epochId: envelope.epochId,
      worldTick: envelope.worldTick,
      savedAtIso: envelope.savedAtIso,
    }));
  }

  public deleteSlot(slotId: string): boolean {
    return this.slots.delete(validateSaveSlotId(slotId));
  }
}

if (typeof document !== 'undefined') {
  bootCampaignPage(document, window, {
    pack: STARTER_HOLD_PACK,
    stages: new Map(Object.entries(STARTER_HOLD_STAGE_DIRECTORY)),
    characterVisuals: STARTER_HOLD_CHARACTER_VISUALS,
    theme: DEFAULT_HIGHGLASS_VISUAL_THEME,
    focusEntityId: 'char_player_operative',
  });
}
