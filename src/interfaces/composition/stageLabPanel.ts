/**
 * Paused stage lab (`src/interfaces/composition/stageLabPanel.ts`).
 *
 * Picks update the existing inspector mirror. Saves go through the scene-blueprint
 * and character-visual disk routes after the existing Zod parsers.
 */
import {
  type CharacterVisualBlueprint,
  CharacterVisualBlueprintSchema,
  type StageSceneBlueprint,
  StageSceneBlueprintSchema,
} from '../../application/index.js';
import type { PortalState } from '../../domain/index.js';
import type { StageInspectorDomMirror } from '../hud/StageInspectorDomMirror.js';

const PORTAL_STATES = ['open', 'ajar', 'closed', 'barred'] as const;

export interface BlueprintSaveRequest {
  readonly method: 'PUT';
  readonly url: string;
  readonly rawBody: string;
}

export interface StageLabPanel {
  pick(semanticId: string, cameraMode: 'tracking_volume' | 'debug_free_cam'): void;
  saveStage(): void;
  saveVisual(characterId: string): void;
  requestSelectedPortal(portalState: PortalState): string | null;
  selection(): string | null;
  attach(panel: HTMLElement): void;
}

export interface StageLabOptions {
  readonly mirror: StageInspectorDomMirror;
  readonly isPaused: () => boolean;
  readonly getStage: () => StageSceneBlueprint | null;
  readonly getVisuals: () => readonly CharacterVisualBlueprint[];
  readonly requestPortal: (propId: string, portalState: PortalState) => string;
  readonly transport: (request: BlueprintSaveRequest) => void;
}

export function createStageLab(options: StageLabOptions): StageLabPanel {
  let selectedSemanticId: string | null = null;

  const selectedPortalId = (): string | null => {
    const stage = options.getStage();
    if (stage === null || selectedSemanticId === null) {
      return null;
    }
    return (
      stage.props.find((prop) => prop.semanticId === selectedSemanticId && prop.isPortal === true)
        ?.propId ?? null
    );
  };

  const lab: StageLabPanel = {
    pick(semanticId: string, cameraMode: 'tracking_volume' | 'debug_free_cam'): void {
      if (!options.isPaused()) {
        return;
      }
      const stage = options.getStage();
      if (stage === null) {
        return;
      }
      selectedSemanticId = semanticId;
      options.mirror.syncMirrorState(
        {
          activeSpaceId: stage.spaceId,
          hoveredSemanticId: semanticId,
          selectedSemanticId: semanticId,
          cameraMode,
          debugPaused: true,
        },
        stage,
        options.getVisuals(),
      );
    },
    saveStage(): void {
      const stage = options.getStage();
      if (stage === null) {
        return;
      }
      const parsed = StageSceneBlueprintSchema.parse(stage);
      options.transport({
        method: 'PUT',
        url: `/api/scene-blueprints/${parsed.stageId}`,
        rawBody: JSON.stringify(parsed),
      });
    },
    saveVisual(characterId: string): void {
      const visual = options
        .getVisuals()
        .find((candidate) => candidate.characterId === characterId);
      if (visual === undefined) {
        return;
      }
      const parsed = CharacterVisualBlueprintSchema.parse(visual);
      options.transport({
        method: 'PUT',
        url: `/api/character-visuals/${parsed.characterId}`,
        rawBody: JSON.stringify(parsed),
      });
    },
    selection(): string | null {
      return selectedSemanticId;
    },
    requestSelectedPortal(portalState: PortalState): string | null {
      const propId = selectedPortalId();
      if (propId === null) {
        return null;
      }
      return options.requestPortal(propId, portalState);
    },
    attach(panel: HTMLElement): void {
      const save = panel.ownerDocument.createElement('button');
      save.type = 'button';
      save.textContent = 'Save stage';
      save.addEventListener('click', () => {
        lab.saveStage();
      });
      panel.append(save);
      for (const portalState of PORTAL_STATES) {
        const button = panel.ownerDocument.createElement('button');
        button.type = 'button';
        button.textContent = portalState;
        button.addEventListener('click', () => {
          lab.requestSelectedPortal(portalState);
        });
        panel.append(button);
      }
    },
  };

  return lab;
}
