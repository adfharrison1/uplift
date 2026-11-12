import { encodeWorldState } from '../../src/domain/persistence/WorldStateCodec.js';
import { makeWorldState } from './makeWorldState.js';

/** Wraps a direct-save fixture's custom slices in a valid world envelope. */
export function withSaveSnapshot<
  T extends {
    readonly epochId: string;
    readonly worldTick: number;
    readonly stateSlices: Readonly<Record<string, unknown>>;
  },
>(input: T): Omit<T, 'stateSlices'> & { readonly stateSlices: Readonly<Record<string, unknown>> } {
  const { stateSlices, ...rest } = input;
  const world = makeWorldState({ epochId: input.epochId });
  return {
    ...rest,
    stateSlices: {
      __upliftWorldStateSnapshot: encodeWorldState({ ...world, worldTick: input.worldTick }),
      __upliftCustomSlicesSnapshot: stateSlices,
      __upliftCustomSliceVersions: {},
    },
  };
}
