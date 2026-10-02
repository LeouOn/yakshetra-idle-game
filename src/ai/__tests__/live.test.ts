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

/** Network calls, not unit tests: never inherit vitest's 5s default. */
const LIVE_TIMEOUT_MS = 60_000;

describe.skipIf(process.env.ZAI_API_KEY === undefined)('live zai round-trip', () => {
  it(
    'resolves to a JSON object',
    async () => {
      const completer = createManifestCompleter('zai', process.env.ZAI_API_KEY ?? '');
      const raw = await completer(REQUEST);
      expect(typeof raw).toBe('object');
    },
    // A real provider round-trip. Vitest's 5s default timeout is shorter than
    // the provider's own p50, so this test was a coin flip for anyone holding
    // a key: observed 4.7s pass and 5.0s timeout on consecutive runs.
    LIVE_TIMEOUT_MS,
  );
});

describe.skipIf(process.env.MINIMAX_API_KEY === undefined)('live minimax round-trip', () => {
  it(
    'resolves to a JSON object',
    async () => {
      const completer = createManifestCompleter('minimax', process.env.MINIMAX_API_KEY ?? '');
      const raw = await completer(REQUEST);
      expect(typeof raw).toBe('object');
    },
    LIVE_TIMEOUT_MS,
  );
});
