/**
 * Campaign play session (`src/application/shell/PlaySession.ts`).
 *
 * Pure host for one launch payload: stage directory, character visuals, theme, and focus entity.
 * Each frame steps the coordinator once, pulses cognition once, then builds one render frame
 * for the resident stage. No DOM, Three.js, or content pack.
 */
import type { PortalState } from '../../domain/index.js';
import type { RenderFrame, RenderFrameBuilder } from '../rendering/RenderFrameBuilder.js';
import type {
  CharacterVisualBlueprint,
  EpochVisualTheme,
  StageSceneBlueprint,
} from '../rendering/SceneVisualBlueprints.js';
import type {
  PortalStateRequestStatus,
  SimulationCoordinator,
  WaypointMoveRequestStatus,
} from '../simulation/SimulationCoordinator.js';

/** XZ distance at which a floor point selects an authored waypoint in the active space. */
export const FLOOR_WAYPOINT_RADIUS_METERS = 1.5;

export type PlaySessionStatus =
  WaypointMoveRequestStatus | PortalStateRequestStatus | 'missing_stage' | 'ready';

export type FloorClickResult = WaypointMoveRequestStatus | 'miss';

export interface PlaySessionLaunch {
  readonly stages: ReadonlyMap<string, StageSceneBlueprint>;
  readonly characterVisuals: ReadonlyArray<CharacterVisualBlueprint>;
  readonly theme: EpochVisualTheme;
  readonly focusEntityId: string;
}

export interface PlayFrameInput {
  readonly reduceMotionAndFlashing?: boolean | undefined;
  readonly aspect?: number | undefined;
}

export interface PlayFrameResult {
  readonly renderFrame: RenderFrame | null;
  readonly status: PlaySessionStatus;
  readonly releasedStageId: string | null;
  readonly residentStage: StageSceneBlueprint | null;
}

export class PlaySession {
  private readonly coordinator: SimulationCoordinator;
  private readonly frameBuilder: RenderFrameBuilder;
  private readonly stages: ReadonlyMap<string, StageSceneBlueprint>;
  private readonly characterVisuals: ReadonlyArray<CharacterVisualBlueprint>;
  private readonly theme: EpochVisualTheme;
  private focusEntityId: string;
  private residentStage: StageSceneBlueprint | null = null;
  private status: PlaySessionStatus = 'ready';
  private reduceMotionAndFlashing = false;
  private cameraDeAnchored = false;
  private freeCamOffset: readonly [number, number, number] = [0, 0, 0];

  public constructor(
    coordinator: SimulationCoordinator,
    frameBuilder: RenderFrameBuilder,
    launch: PlaySessionLaunch,
  ) {
    const stages = new Map<string, StageSceneBlueprint>();
    for (const [spaceId, stage] of launch.stages) {
      if (stage.spaceId !== spaceId) {
        throw new Error(
          `Launch stage '${stage.stageId}' is keyed by '${spaceId}' but its spaceId is '${stage.spaceId}'`,
        );
      }
      stages.set(spaceId, stage);
    }
    this.coordinator = coordinator;
    this.frameBuilder = frameBuilder;
    this.stages = stages;
    this.characterVisuals = [...launch.characterVisuals];
    this.theme = launch.theme;
    this.focusEntityId = launch.focusEntityId;
    this.resolveResident();
  }

  public getStatus(): PlaySessionStatus {
    return this.status;
  }

  public getResidentStage(): StageSceneBlueprint | null {
    return this.residentStage;
  }

  public getFocusEntityId(): string {
    return this.focusEntityId;
  }

  public getFreeCamOffset(): readonly [number, number, number] {
    return this.freeCamOffset;
  }

  public setPaused(paused: boolean): void {
    this.coordinator.setPaused(paused);
  }

  public setCameraDeAnchored(deAnchored: boolean): void {
    this.cameraDeAnchored = deAnchored;
  }

  public setFreeCamOffset(offset: readonly [number, number, number]): void {
    this.freeCamOffset = [offset[0], offset[1], offset[2]];
  }

  public setReduceMotionAndFlashing(enabled: boolean): void {
    this.reduceMotionAndFlashing = enabled;
  }

  public setFocusEntity(entityId: string): string | null {
    const world = this.coordinator.getWorldState();
    if (world.entities[entityId] === undefined) {
      this.status = 'unknown_entity';
      return null;
    }
    this.focusEntityId = entityId;
    return this.resolveResident();
  }

  public requestMove(waypointId: string): WaypointMoveRequestStatus {
    const status = this.coordinator.requestWaypointMove(this.focusEntityId, waypointId);
    this.status = status;
    return status;
  }

  public requestPortalState(propId: string, portalState: PortalState): PortalStateRequestStatus {
    const status = this.coordinator.requestSetPortalState(propId, portalState);
    this.status = status;
    return status;
  }

  /**
   * Selects the nearest authored waypoint in the focus entity's space when the
   * point is within `FLOOR_WAYPOINT_RADIUS_METERS` on XZ. Paused sessions do not
   * query the coordinator.
   */
  public clickFloor(x: number, z: number): FloorClickResult {
    if (this.coordinator.getWorldState().paused) {
      this.status = 'paused';
      return 'paused';
    }
    const waypointId = this.nearestActiveWaypoint(x, z);
    if (waypointId === null) {
      return 'miss';
    }
    return this.requestMove(waypointId);
  }

  public frame(dtSeconds: number, input?: PlayFrameInput): PlayFrameResult {
    if (input?.reduceMotionAndFlashing !== undefined) {
      this.reduceMotionAndFlashing = input.reduceMotionAndFlashing;
    }
    this.coordinator.stepFrame(dtSeconds);
    this.coordinator.pulseCognitiveScheduler();
    const releasedStageId = this.resolveResident();
    const residentStage = this.residentStage;
    if (residentStage === null) {
      return {
        renderFrame: null,
        status: this.status,
        releasedStageId,
        residentStage: null,
      };
    }
    const renderFrame = this.frameBuilder.buildFrame({
      worldState: this.coordinator.getWorldState(),
      theme: this.theme,
      stage: residentStage,
      characterVisuals: this.characterVisuals,
      focusEntityId: this.focusEntityId,
      dtSeconds,
      ...(input?.aspect !== undefined && Number.isFinite(input.aspect) && input.aspect > 0
        ? { aspect: input.aspect }
        : {}),
      cameraDeAnchored: this.cameraDeAnchored,
      freeCamOffset: this.freeCamOffset,
      reduceMotionAndFlashing: this.reduceMotionAndFlashing,
    });
    return {
      renderFrame,
      status: this.status,
      releasedStageId,
      residentStage,
    };
  }

  private nearestActiveWaypoint(x: number, z: number): string | null {
    const entity = this.coordinator.getWorldState().entities[this.focusEntityId];
    if (entity === undefined) {
      return null;
    }
    const space = this.coordinator
      .getRegistry()
      .getAllSpaces()
      .find((candidate) => candidate.id === entity.spaceId);
    if (space === undefined) {
      return null;
    }
    let nearestId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const waypoint of space.waypoints) {
      const distance = Math.hypot(waypoint.position[0] - x, waypoint.position[2] - z);
      if (distance > FLOOR_WAYPOINT_RADIUS_METERS) {
        continue;
      }
      if (
        nearestId === null ||
        distance < nearestDistance ||
        (distance === nearestDistance && waypoint.id < nearestId)
      ) {
        nearestId = waypoint.id;
        nearestDistance = distance;
      }
    }
    return nearestId;
  }

  /** Looks up the focus entity's space before replacing the resident stage. */
  private resolveResident(): string | null {
    const entity = this.coordinator.getWorldState().entities[this.focusEntityId];
    const next = entity === undefined ? undefined : this.stages.get(entity.spaceId);
    if (next === undefined) {
      this.status = 'missing_stage';
      return null;
    }
    if (this.status === 'missing_stage') {
      this.status = 'ready';
    }
    if (this.residentStage?.spaceId === next.spaceId) {
      return null;
    }
    const releasedStageId = this.residentStage?.stageId ?? null;
    this.residentStage = next;
    return releasedStageId;
  }
}
