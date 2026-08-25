// One optional live round-trip per provider, skipped without its key.
// CI never needs a key; the mock suite above is the contract.

import { describe, expect, it } from 'vitest';

import { compileRequestFromBay } from '@/engine/fill-adapter';

import { createManifestCompleter } from '../manifest-completer';

const BAY = {
  residue_window_id: 'w-live-1-1-1',
  residue: [
    {
      tick: 1,
      type: 'practice_tick' as const,
      ids: ['p:tang/nianfo-recitation'],
      numbers: { progress: 1 },
    },
  ],
  brief: null,
  rng_seed: 'live-seed',
};
const REQUEST = compileRequestFromBay(BAY, 0, 0);

describe.skipIf(process.env.ZAI_API_KEY === undefined)('live zai round-trip', () => {
  it('resolves to a JSON object', async () => {
    const completer = createManifestCompleter('zai', process.env.ZAI_API_KEY ?? '');
    const raw = await completer(REQUEST);
    expect(typeof raw).toBe('object');
  });
});

describe.skipIf(process.env.MINIMAX_API_KEY === undefined)('live minimax round-trip', () => {
  it('resolves to a JSON object', async () => {
    const completer = createManifestCompleter('minimax', process.env.MINIMAX_API_KEY ?? '');
    const raw = await completer(REQUEST);
    expect(typeof raw).toBe('object');
  });
});
