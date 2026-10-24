import { describe, expect, it } from 'vitest';

import { DEFAULT_BENCH_ERA, resolveBenchEra } from '../bench-era';

describe('resolveBenchEra', () => {
  it('keeps the era of a real pack', () => {
    expect(resolveBenchEra('tang-china')).toBe('tang-china');
    expect(resolveBenchEra('fantasy-mahayana')).toBe('fantasy-mahayana');
  });

  it('gives a studio-only player, or a stale or build-internal id, the default era', () => {
    expect(DEFAULT_BENCH_ERA).toBe('tang-china');
    for (const recorded of [
      undefined,
      null,
      '',
      'atlantis',
      'studio-bench@0.1.0',
      'roster@0.1.0',
    ]) {
      expect(resolveBenchEra(recorded), String(recorded)).toBe(DEFAULT_BENCH_ERA);
    }
  });
});
