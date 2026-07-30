// Unit + edge-case tests for the pure scoring helpers in `../scoring`.
//
// Each helper is deterministic and side-effect-free, so every case is an
// exact-value assertion (no clocks, no RNG, no mocks). A small set of
// fast-check properties guards the documented output ranges — clamp01 ∈ [0,1],
// timingAccuracy ∈ [0,1], fairnessScore ∈ [0,100] — for any input.

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import type { RewardTier } from '@/content/minigame-schema';

import { clamp01, fairnessScore, mean, pickRewardTier, timingAccuracy, variance } from '../scoring';

/** Build a minimal but schema-shaped RewardTier; only `minScore` is exercised. */
const tier = (minScore: number): RewardTier => ({
  minScore,
  rewards: [],
  summary_sid: 'mg.summary.test',
});

describe('clamp01', () => {
  it('returns the input unchanged inside [0, 1]', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0.25)).toBe(0.25);
  });

  it('clamps negatives to 0', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(-1e-9)).toBe(0);
    expect(clamp01(-1000)).toBe(0);
  });

  it('clamps values above 1 to 1', () => {
    expect(clamp01(2)).toBe(1);
    expect(clamp01(1.0000001)).toBe(1);
    expect(clamp01(1000)).toBe(1);
  });

  it('collapses non-finite values to 0', () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clamp01(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('always yields a finite value in [0, 1] (property)', () => {
    fc.assert(
      fc.property(fc.float({ noNaN: false }), (n) => {
        const out = clamp01(n);
        return Number.isFinite(out) && out >= 0 && out <= 1;
      }),
      { numRuns: 500 },
    );
  });

  it('is idempotent: clamp01(clamp01(n)) === clamp01(n) (property)', () => {
    fc.assert(
      fc.property(fc.float({ noNaN: false }), (n) => {
        const once = clamp01(n);
        return clamp01(once) === once;
      }),
      { numRuns: 500 },
    );
  });
});

describe('mean', () => {
  it('returns 0 for an empty array', () => {
    expect(mean([])).toBe(0);
  });

  it('returns the single element for a one-element array', () => {
    expect(mean([5])).toBe(5);
    expect(mean([-3])).toBe(-3);
    expect(mean([0])).toBe(0);
  });

  it('returns the arithmetic mean for typical arrays', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([10, 20, 30, 40, 50])).toBe(30);
  });

  it('handles negatives and cancellation', () => {
    expect(mean([-1, 1])).toBe(0);
    expect(mean([-2, -4, -6])).toBe(-4);
  });

  it('does not mutate its input', () => {
    const xs = [1, 2, 3];
    const snapshot = xs.slice();
    mean(xs);
    expect(xs).toEqual(snapshot);
  });
});

describe('variance', () => {
  it('returns 0 for an empty array', () => {
    expect(variance([])).toBe(0);
  });

  it('returns 0 for a single element (no spread)', () => {
    expect(variance([42])).toBe(0);
  });

  it('returns 0 for a constant array (no spread)', () => {
    expect(variance([7, 7, 7, 7])).toBe(0);
  });

  it('matches the population-variance definition', () => {
    // mean=2.5, deviations²=(2.25,0.25,0.25,2.25)=5, /4 = 1.25
    expect(variance([1, 2, 3, 4])).toBeCloseTo(1.25, 10);
    // mean=2, deviations²=(1,0,1)=2, /3 ≈ 0.6667
    expect(variance([1, 2, 3])).toBeCloseTo(2 / 3, 10);
  });

  it('is always non-negative (property)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noDefaultInfinity: true, noNaN: true }), {
          minLength: 0,
          maxLength: 20,
        }),
        (xs) => variance(xs) >= 0,
      ),
      { numRuns: 200 },
    );
  });
});

describe('timingAccuracy', () => {
  it('returns 1 for an exact hit', () => {
    expect(timingAccuracy(100, 100, 5)).toBe(1);
    expect(timingAccuracy(0, 0, 10)).toBe(1);
  });

  it('returns 0 for a non-positive window', () => {
    expect(timingAccuracy(100, 100, 0)).toBe(0);
    expect(timingAccuracy(100, 100, -5)).toBe(0);
    expect(timingAccuracy(100, 105, 0)).toBe(0);
  });

  it('returns 0 once the miss reaches or exceeds the window', () => {
    expect(timingAccuracy(105, 100, 5)).toBe(0); // delta === window
    expect(timingAccuracy(106, 100, 5)).toBe(0); // delta > window
    expect(timingAccuracy(94, 100, 5)).toBe(0); // delta === window (early)
    expect(timingAccuracy(93, 100, 5)).toBe(0); // delta > window (early)
  });

  it('ramps linearly: half-window miss → 0.5', () => {
    expect(timingAccuracy(102, 100, 4)).toBeCloseTo(0.5, 10); // delta=2 of 4
    expect(timingAccuracy(98, 100, 4)).toBeCloseTo(0.5, 10); // symmetric early side
  });

  it('ramps linearly: quarter-window miss → 0.75', () => {
    expect(timingAccuracy(101, 100, 4)).toBeCloseTo(0.75, 10); // delta=1 of 4
  });

  it('is symmetric in the sign of the miss', () => {
    // Same absolute delta on either side of the target yields the same accuracy.
    expect(timingAccuracy(103, 100, 5)).toBeCloseTo(timingAccuracy(97, 100, 5), 10);
  });

  it('always yields a finite value in [0, 1] (property)', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.integer({ min: -10, max: 50 }),
        (hit, target, w) => {
          const out = timingAccuracy(hit, target, w);
          return Number.isFinite(out) && out >= 0 && out <= 1;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('fairnessScore', () => {
  const recips = [
    { id: 'a', need: 10 },
    { id: 'b', need: 10 },
  ] as const;

  it('returns 0 when there are no recipients', () => {
    expect(fairnessScore({}, [], 100)).toBe(0);
  });

  it('returns 0 when the budget is non-positive', () => {
    expect(fairnessScore({ a: 10 }, recips, 0)).toBe(0);
    expect(fairnessScore({ a: 10 }, recips, -5)).toBe(0);
  });

  it('returns 100 for a perfect, on-budget allocation', () => {
    // Each recipient gets exactly their need, total equals the budget.
    expect(fairnessScore({ a: 10, b: 10 }, recips, 20)).toBe(100);
    expect(
      fairnessScore(
        { a: 5, b: 5 },
        [
          { id: 'a', need: 5 },
          { id: 'b', need: 5 },
        ],
        10,
      ),
    ).toBe(100);
  });

  it('returns 100 when total need is zero (nothing is needed)', () => {
    expect(
      fairnessScore(
        { a: 2, b: 2 },
        [
          { id: 'a', need: 0 },
          { id: 'b', need: 0 },
        ],
        5,
      ),
    ).toBe(100);
  });

  it('scales linearly with coverage when within budget', () => {
    // Half the need met, fully within budget → 50.
    expect(fairnessScore({ a: 5, b: 5 }, recips, 20)).toBeCloseTo(50, 10);
  });

  it('penalises over-spend proportionally (withinBudget = budget/allocated)', () => {
    // Allocate 20 to a (need 10) with budget 5: coverage=1, withinBudget=5/20=0.25 → 25.
    expect(fairnessScore({ a: 20 }, [{ id: 'a', need: 10 }], 5)).toBeCloseTo(25, 10);
    // Coverage 0.5 * withinBudget 0.75 (15/20) → 37.5.
    expect(fairnessScore({ a: 20, b: 0 }, recips, 15)).toBeCloseTo(37.5, 10);
  });

  it('counts need beyond what is requested as unsatisfied (no over-credit)', () => {
    // Allocating more than need to one recipient does not raise coverage.
    expect(fairnessScore({ a: 100 }, recips, 200)).toBeCloseTo(50, 10); // only a's need 10 of 20 covered
  });

  it('clamps negative allocations to 0', () => {
    expect(fairnessScore({ a: -100 }, recips, 20)).toBe(0);
    expect(fairnessScore({ a: -5, b: 15 }, recips, 20)).toBeCloseTo(50, 10); // a→0, b→10 of 20
  });

  it('treats missing recipient ids as 0 allocation', () => {
    expect(fairnessScore({}, recips, 20)).toBe(0);
    expect(fairnessScore({ b: 10 }, recips, 20)).toBeCloseTo(50, 10);
  });

  it('ignores allocations to ids not present among recipients', () => {
    // c is unknown → its 50 is neither counted as allocated nor as satisfied.
    expect(fairnessScore({ c: 50 }, recips, 20)).toBe(0);
  });

  it('always yields a finite value in [0, 100] (property)', () => {
    fc.assert(
      fc.property(
        fc.record({
          a: fc.double({ min: -50, max: 100, noNaN: true, noDefaultInfinity: true }),
          b: fc.double({ min: -50, max: 100, noNaN: true, noDefaultInfinity: true }),
        }),
        fc.double({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true }),
        (allocs, budget) => {
          const out = fairnessScore(allocs, recips, budget);
          return Number.isFinite(out) && out >= 0 && out <= 100;
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('pickRewardTier', () => {
  const tiers = [tier(0), tier(50), tier(90)];

  it('returns -1 for an empty tier list', () => {
    expect(pickRewardTier([], 100)).toBe(-1);
  });

  it('returns -1 when the score is below every tier threshold', () => {
    expect(pickRewardTier([tier(50)], 10)).toBe(-1);
    expect(pickRewardTier([tier(0)], -1)).toBe(-1);
  });

  it('picks the single tier when its threshold is met', () => {
    expect(pickRewardTier([tier(0)], 0)).toBe(0);
    expect(pickRewardTier([tier(0)], 50)).toBe(0);
    expect(pickRewardTier([tier(50)], 50)).toBe(0);
  });

  it('picks the highest tier reached (ascending thresholds)', () => {
    expect(pickRewardTier(tiers, 0)).toBe(0);
    expect(pickRewardTier(tiers, 49)).toBe(0);
    expect(pickRewardTier(tiers, 50)).toBe(1);
    expect(pickRewardTier(tiers, 89)).toBe(1);
    expect(pickRewardTier(tiers, 90)).toBe(2);
    expect(pickRewardTier(tiers, 100)).toBe(2);
  });

  it('treats minScore as an inclusive lower bound', () => {
    // Score exactly equal to a threshold reaches that tier.
    expect(pickRewardTier(tiers, 50)).toBe(1);
    expect(pickRewardTier(tiers, 90)).toBe(2);
  });

  it('returns the last matching tier when thresholds are tied', () => {
    const tied = [tier(0), tier(0), tier(0)];
    expect(pickRewardTier(tied, 5)).toBe(2); // last index wins
  });
});
