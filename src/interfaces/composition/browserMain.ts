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
  applyRenderFrameToScene,
  type BuiltStageScene,
  buildStageSceneGraph,
  disposeSceneGraph,
} from '../three/ChiaroscuroStageRenderer.js';
import {
  cappedDevicePixelRatio,
  createCampaignShell,
  prefersReducedMotion,
} from './shellDocument.js';

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
  const session = new PlaySession(
    new SimulationCoordinator({
      epochId: launch.pack.epochId,
      registry,
      telemetry: new BrowserSessionTelemetry(clock),
      saveRepository: new BrowserSaveRepository(clock),
      clock,
    }),
    new RenderFrameBuilder(),
    {
      stages: launch.stages,
      characterVisuals: launch.characterVisuals,
      theme: launch.theme,
      focusEntityId: launch.focusEntityId,
    },
  );

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

  let previousMs = ownerWindow.performance.now();
  const onFrame = (nowMs: number): void => {
    const dtSeconds = Math.max(0, (nowMs - previousMs) / 1000);
    previousMs = nowMs;
    const result = session.frame(dtSeconds, {
      reduceMotionAndFlashing: prefersReducedMotion((query) => ownerWindow.matchMedia(query)),
      aspect: ownerWindow.innerHeight > 0 ? ownerWindow.innerWidth / ownerWindow.innerHeight : 1,
    });
    if (result.releasedStageId !== null && built !== null) {
      disposeSceneGraph(built.scene);
      built = null;
    }
    if (built === null && result.residentStage !== null) {
      mountStage(result.residentStage);
    }
    if (built !== null && result.renderFrame !== null) {
      applyRenderFrameToScene(built, result.renderFrame, launch.theme);
      renderer.render(built.scene, built.camera);
    }
    ownerWindow.requestAnimationFrame(onFrame);
  };
  ownerWindow.requestAnimationFrame(onFrame);
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
