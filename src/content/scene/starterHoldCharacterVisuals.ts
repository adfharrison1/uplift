/**
 * Visible bodies for the Epoch 1 starter hold (`src/content/scene/starterHoldCharacterVisuals.ts`).
 *
 * Each `characterId` matches a character in the starter hold pack. A pose with
 * no matching visual produces no mesh.
 */
import {
  type CharacterVisualBlueprint,
  CharacterVisualBlueprintSchema,
} from '../../interfaces/three/StageKitbashBuilders.js';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export const STARTER_HOLD_CHARACTER_VISUALS: ReadonlyArray<CharacterVisualBlueprint> = deepFreeze([
  CharacterVisualBlueprintSchema.parse({
    characterId: 'char_player_operative',
    lineageId: 'lineage_player_operative',
    heightScale: 1.02,
    shoulderWidth: 0.52,
    spinePitchRadians: 0.04,
    gaitStyle: 'measured',
    headgear: 'none',
    cloak: 'waxed_mantle',
    heldPropLeft: 'none',
    heldPropRight: 'ledger_book',
    primaryColorHex: '#2c3138',
    accentColorHex: '#c4a574',
    mudLevel: 0.12,
    sootLevel: 0.08,
  }),
  CharacterVisualBlueprintSchema.parse({
    characterId: 'char_yard_walker',
    lineageId: 'lineage_yard_walker',
    heightScale: 1.06,
    shoulderWidth: 0.64,
    spinePitchRadians: 0.08,
    gaitStyle: 'brisk',
    headgear: 'none',
    cloak: 'waxed_mantle',
    heldPropLeft: 'none',
    heldPropRight: 'none',
    primaryColorHex: '#3d342c',
    accentColorHex: '#6b5a45',
    mudLevel: 0.48,
    sootLevel: 0.16,
  }),
]);
