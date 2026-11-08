import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cappedDevicePixelRatio,
  createCampaignShell,
  prefersReducedMotion,
} from '../../../src/interfaces/composition/shellDocument.js';

describe('campaign shell document', () => {
  it('stacks viewport, diegetic, and dev-hud, with one canvas and an empty diegetic layer', () => {
    const shell = createCampaignShell();
    shell.registerDevHudPanel('stage');
    const plan = shell.elementPlan();
    expect(plan.map((node) => node.layerId)).toEqual(['viewport', 'diegetic', 'dev-hud']);
    expect(plan[0]?.children.filter((child) => child.tag === 'canvas')).toHaveLength(1);
    expect(plan[1]?.children).toEqual([]);
    expect(plan[2]?.children.map((child) => child.panelId)).toEqual(['stage']);
  });

  it('rejects a second stage panel and keeps the first', () => {
    const shell = createCampaignShell();
    shell.registerDevHudPanel('stage');
    expect(() => shell.registerDevHudPanel('stage')).toThrow(/already registered/);
    expect(shell.elementPlan()[2]?.children.map((child) => child.panelId)).toEqual(['stage']);
  });

  it('caps the renderer pixel ratio at 1 and reads reduced motion from the media query', () => {
    expect(cappedDevicePixelRatio(2)).toBe(1);
    expect(cappedDevicePixelRatio(1)).toBe(1);
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });

  it('keeps a single html entry pointed at the campaign page', () => {
    const htmlFiles = readdirSync('.').filter((name) => name.endsWith('.html'));
    expect(htmlFiles).toEqual(['index.html']);
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('/src/interfaces/composition/browserMain.ts');
    expect(html.match(/<canvas/g)).toBeNull();
  });
});
