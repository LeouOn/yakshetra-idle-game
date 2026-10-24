import { describe, expect, it, vi } from 'vitest';

import { lintPack } from '../lint';
import { loadEraPack } from '../loader';

// vitest hoists this above the imports, so the loader sees the spy.
vi.mock('../lint', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lint')>();
  return { ...real, lintPack: vi.fn(real.lintPack) };
});

// Ending triggers are covered by the predicate-key rule only if the loader hands the lint the
// pack's endings; nothing else exercises that wiring.
describe('loadEraPack lints the pack together with its endings', () => {
  it.each(['tang-china', 'fantasy-mahayana'])('%s', (era) => {
    const pack = loadEraPack(era);
    expect(pack.endings.length).toBeGreaterThan(0);
    const call = vi.mocked(lintPack).mock.calls.at(-1);
    expect(call?.[4]).toHaveLength(pack.endings.length);
  });
});
