/**
 * Campaign play input (`src/interfaces/composition/playInput.ts`).
 *
 * Waypoint commands run while paused and while unpaused. Floor and portal
 * raycasts run only while unpaused. Free-cam writes the camera offset.
 */
import type { PlaySession } from '../../application/index.js';
import type { PortalState } from '../../domain/index.js';

const PORTAL_STATES = ['open', 'ajar', 'closed', 'barred'] as const;
const FREE_CAM_STEP_METERS = 0.5;

export interface FloorPoint {
  readonly x: number;
  readonly z: number;
}

export interface PortalHit {
  readonly propId: string;
  readonly semanticId: string;
}

export interface PickHit {
  readonly semanticId: string;
}

export interface PlayBinding {
  readonly id: string;
  when(): boolean;
  /** Returns true when this binding consumed the pointer. */
  handle(): boolean;
}

export interface PlayInputController {
  readonly bindings: readonly PlayBinding[];
  waypointIds(): readonly string[];
  activateWaypoint(waypointId: string): string;
  requestPortal(propId: string, portalState: PortalState): string;
  pointerDown(): void;
  keyDown(key: string): void;
  setFocus(entityId: string): void;
  statusText(): string;
  attach(panel: HTMLElement): void;
  sync(): void;
}

export interface PlayInputOptions {
  readonly session: PlaySession;
  readonly isPaused: () => boolean;
  readonly waypointIds: () => readonly string[];
  readonly entityIds: () => readonly string[];
  readonly readPortalState: (propId: string) => PortalState | undefined;
  readonly raycastFloor: () => FloorPoint | null;
  readonly raycastPortal: () => PortalHit | null;
  readonly raycastPick: () => PickHit | null;
  readonly onPick: (semanticId: string) => void;
  readonly onFocusStage?: (releasedStageId: string | null) => void;
}

export function createPlayInput(options: PlayInputOptions): PlayInputController {
  let statusText = 'ready';
  let statusElement: HTMLElement | null = null;
  let commandList: HTMLElement | null = null;
  let focusList: HTMLElement | null = null;
  let listKey = '';
  const bindings: PlayBinding[] = [
    {
      id: 'waypoint',
      when: () => true,
      handle: () => false,
    },
    {
      id: 'portal',
      when: () => !options.isPaused(),
      handle: () => {
        const portal = options.raycastPortal();
        if (portal === null) {
          return false;
        }
        controller.requestPortal(
          portal.propId,
          nextPortalState(options.readPortalState(portal.propId)),
        );
        return true;
      },
    },
    {
      id: 'floor',
      when: () => !options.isPaused(),
      handle: () => {
        const floor = options.raycastFloor();
        if (floor === null) {
          return false;
        }
        const status = options.session.clickFloor(floor.x, floor.z);
        if (status !== 'miss') {
          setStatus(status);
        }
        return true;
      },
    },
  ];

  const setStatus = (text: string): void => {
    statusText = text;
    if (statusElement !== null) {
      statusElement.textContent = text;
    }
  };

  const controller: PlayInputController = {
    bindings,
    waypointIds: options.waypointIds,
    activateWaypoint(waypointId: string): string {
      const waypoint = bindings.find((binding) => binding.id === 'waypoint');
      if (waypoint !== undefined && !waypoint.when()) {
        return statusText;
      }
      const status = options.session.requestMove(waypointId);
      setStatus(status);
      return status;
    },
    requestPortal(propId: string, portalState: PortalState): string {
      const status = options.session.requestPortalState(propId, portalState);
      setStatus(status);
      return status;
    },
    pointerDown(): void {
      if (options.isPaused()) {
        const pick = options.raycastPick();
        if (pick !== null) {
          options.onPick(pick.semanticId);
        }
        return;
      }
      for (const binding of bindings) {
        if (binding.when() && binding.handle()) {
          return;
        }
      }
    },
    keyDown(key: string): void {
      const normalized = key === 'Backquote' ? '`' : key;
      if (normalized === 'F3' || normalized === '`') {
        const paused = !options.isPaused();
        options.session.setPaused(paused);
        options.session.setCameraDeAnchored(paused);
        setStatus(paused ? 'paused' : 'ready');
        return;
      }
      if (!options.isPaused()) {
        return;
      }
      const offset = options.session.getFreeCamOffset();
      const step = freeCamStep(normalized, offset);
      if (step !== null) {
        options.session.setFreeCamOffset(step);
      }
    },
    setFocus(entityId: string): void {
      const releasedStageId = options.session.setFocusEntity(entityId);
      options.onFocusStage?.(releasedStageId);
      controller.sync();
    },
    statusText: () => statusText,
    attach(panel: HTMLElement): void {
      panel.style.position = 'absolute';
      panel.style.top = '12px';
      panel.style.left = '12px';
      panel.style.color = '#f2efe9';
      panel.style.font = '14px sans-serif';
      statusElement = panel.ownerDocument.createElement('p');
      statusElement.dataset['playStatus'] = 'status';
      statusElement.textContent = statusText;
      commandList = panel.ownerDocument.createElement('div');
      focusList = panel.ownerDocument.createElement('div');
      panel.append(statusElement, commandList, focusList);
      listKey = '';
      controller.sync();
    },
    sync(): void {
      if (commandList === null || focusList === null) {
        return;
      }
      const waypoints = options.waypointIds();
      const entities = options.entityIds();
      const key = `${waypoints.join('\u0000')}|${entities.join('\u0000')}`;
      if (key === listKey) {
        return;
      }
      listKey = key;
      replaceButtons(commandList, waypoints, (waypointId) => {
        controller.activateWaypoint(waypointId);
      });
      replaceButtons(focusList, entities, (entityId) => {
        controller.setFocus(entityId);
      });
    },
  };

  return controller;
}

function nextPortalState(current: PortalState | undefined): PortalState {
  const index = current === undefined ? -1 : PORTAL_STATES.indexOf(current);
  const next = PORTAL_STATES[(index + 1) % PORTAL_STATES.length];
  return next ?? 'open';
}

function freeCamStep(
  key: string,
  offset: readonly [number, number, number],
): readonly [number, number, number] | null {
  if (key === 'ArrowLeft') {
    return [offset[0] - FREE_CAM_STEP_METERS, offset[1], offset[2]];
  }
  if (key === 'ArrowRight') {
    return [offset[0] + FREE_CAM_STEP_METERS, offset[1], offset[2]];
  }
  if (key === 'ArrowUp') {
    return [offset[0], offset[1], offset[2] - FREE_CAM_STEP_METERS];
  }
  if (key === 'ArrowDown') {
    return [offset[0], offset[1], offset[2] + FREE_CAM_STEP_METERS];
  }
  return null;
}

function replaceButtons(
  parent: HTMLElement,
  labels: readonly string[],
  onPress: (label: string) => void,
): void {
  parent.replaceChildren();
  for (const label of labels) {
    const button = parent.ownerDocument.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      onPress(label);
    });
    parent.append(button);
  }
}
