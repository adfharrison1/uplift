/**
 * Campaign document (`src/interfaces/composition/shellDocument.ts`).
 *
 * One stack: viewport, diegetic layer, dev HUD. The diegetic layer starts empty.
 * A repeated dev-HUD panel id is rejected and the first panel stays mounted.
 */

export const SHELL_LAYER_ORDER = ['viewport', 'diegetic', 'dev-hud'] as const;
export type ShellLayerId = (typeof SHELL_LAYER_ORDER)[number];

export interface ShellElementPlan {
  readonly tag: 'div' | 'canvas';
  readonly layerId: ShellLayerId | null;
  readonly panelId: string | null;
  readonly children: readonly ShellElementPlan[];
}

export interface CampaignShell {
  elementPlan(): readonly ShellElementPlan[];
  registerDevHudPanel(id: string): void;
  mount(ownerDocument: Document, parent: ParentNode): { readonly canvas: HTMLCanvasElement };
}

export function cappedDevicePixelRatio(devicePixelRatio: number): number {
  return Math.min(devicePixelRatio, 1);
}

export function prefersReducedMotion(
  matchMedia: (query: string) => { readonly matches: boolean },
): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createCampaignShell(): CampaignShell {
  const panels: string[] = [];
  let mountedHud: HTMLElement | null = null;
  let ownerDocument: Document | null = null;

  const shell: CampaignShell = {
    elementPlan(): readonly ShellElementPlan[] {
      return [
        {
          tag: 'div',
          layerId: 'viewport',
          panelId: null,
          children: [{ tag: 'canvas', layerId: null, panelId: null, children: [] }],
        },
        {
          tag: 'div',
          layerId: 'diegetic',
          panelId: null,
          children: [],
        },
        {
          tag: 'div',
          layerId: 'dev-hud',
          panelId: null,
          children: panels.map((panelId) => ({
            tag: 'div' as const,
            layerId: null,
            panelId,
            children: [],
          })),
        },
      ];
    },
    registerDevHudPanel(id: string): void {
      const trimmed = id.trim();
      if (trimmed.length === 0) {
        throw new Error('Dev HUD panel id must be non-empty');
      }
      if (panels.includes(trimmed)) {
        throw new Error(`Dev HUD panel '${trimmed}' is already registered`);
      }
      panels.push(trimmed);
      if (mountedHud !== null && ownerDocument !== null) {
        mountedHud.append(createShellElement(ownerDocument, panelElement(trimmed)));
      }
    },
    mount(nextDocument: Document, parent: ParentNode): { readonly canvas: HTMLCanvasElement } {
      ownerDocument = nextDocument;
      let canvas: HTMLCanvasElement | null = null;
      for (const node of shell.elementPlan()) {
        const element = createShellElement(nextDocument, node);
        if (node.layerId === 'dev-hud') {
          mountedHud = element;
        }
        if (node.layerId === 'viewport') {
          const found = element.querySelector('canvas');
          if (found instanceof HTMLCanvasElement) {
            canvas = found;
          }
        }
        parent.append(element);
      }
      if (canvas === null) {
        throw new Error('Campaign shell viewport has no canvas');
      }
      return { canvas };
    },
  };

  return shell;
}

function panelElement(panelId: string): ShellElementPlan {
  return { tag: 'div', layerId: null, panelId, children: [] };
}

function createShellElement(ownerDocument: Document, node: ShellElementPlan): HTMLElement {
  const element = ownerDocument.createElement(node.tag);
  if (node.layerId !== null) {
    element.dataset['shellLayer'] = node.layerId;
  }
  if (node.panelId !== null) {
    element.dataset['devHudPanel'] = node.panelId;
  }
  if (node.tag === 'canvas') {
    element.setAttribute('aria-label', 'Uplift');
  }
  for (const child of node.children) {
    element.append(createShellElement(ownerDocument, child));
  }
  return element;
}
