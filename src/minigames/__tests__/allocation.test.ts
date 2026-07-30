// TDD tests for the alms allocation minigame engine in `../allocation`.
//
// The engine is pure & deterministic: no clocks, RNG, mocks, or I/O. So every
// case is an exact-value or structural assertion. Coverage:
//   - initAllocation seeds the documented initial state
//   - stepAllocation applies ALLOCATE / TICK / ABORT and ignores everything else
//   - isAllocationTerminal flips on submit or abort
//   - scoreAllocation delegates to fairnessScore and returns ONLY `{ score }`
//   - purity (no input mutation) + determinism (same args ⇒ same output),
//     guarded by fast-check properties

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import type { AllocationState, MinigameInput } from '../types';
import type { MinigameDef } from '@/content/minigame-schema';

import {
  initAllocation,
  isAllocationTerminal,
  scoreAllocation,
  stepAllocation,
} from '../allocation';

/* -----------------------------------------------------------------------------------------------
 * Fixtures
 * ---------------------------------------------------------------------------------------------*/

/** Schema-shaped allocation minigame definition. Three recipients share a 100
 *  budget; total need (40+40+20) equals the budget so a perfect split scores 100. */
const def: MinigameDef & { type: 'allocation' } = {
  id: 'mg.alloc.alms',
  type: 'allocation',
  label_sid: 'mg.label.alms',
  description_sid: 'mg.desc.alms',
  lens: 'generosity',
  config: {
    budget: 100,
    recipients: [
      { id: 'monks', label_sid: 'rec.monks', need: 40 },
      { id: 'poor', label_sid: 'rec.poor', need: 40 },
      { id: 'sick', label_sid: 'rec.sick', need: 20 },
    ],
  },
  rewardTiers: [
    { minScore: 0, rewards: [], summary_sid: 'mg.tier.bronze' },
    { minScore: 75, rewards: [], summary_sid: 'mg.tier.silver' },
    { minScore: 95, rewards: [], summary_sid: 'mg.tier.gold' },
  ],
};

/** All MinigameInput variants the allocation engine must NOT act on. */
const IGNORED_INPUTS: readonly MinigameInput[] = [
  { type: 'START' },
  { type: 'COUNT' },
  { type: 'LAPSE' },
  { type: 'TAP', nowTick: 5 },
  { type: 'STEP', nowTick: 6 },
  { type: 'STROKE', index: 0, accuracy: 0.9 },
  { type: 'CHOOSE', nodeId: 'n1', optionId: 'o1' },
];

/* -----------------------------------------------------------------------------------------------
 * initAllocation
 * ---------------------------------------------------------------------------------------------*/

describe('initAllocation', () => {
  it('seeds a playing, un-submitted session at tick 0 with no allocations', () => {
    const s = initAllocation(def);
    expect(s).toEqual({
      id: 'mg.alloc.alms',
      type: 'allocation',
      phase: 'playing',
      tick: 0,
      allocations: {},
      submitted: false,
    });
  });

  it('echoes the definition id', () => {
    expect(initAllocation(def).id).toBe(def.id);
  });

  it('returns a fresh object each call (no shared mutable state)', () => {
    const a = initAllocation(def);
    const b = initAllocation(def);
    expect(a).not.toBe(b);
    expect(a.allocations).not.toBe(b.allocations);
  });
});

/* -----------------------------------------------------------------------------------------------
 * stepAllocation
 * ---------------------------------------------------------------------------------------------*/

describe('stepAllocation — ALLOCATE', () => {
  it('stores the allocations and marks the session submitted', () => {
    const next = stepAllocation(def, initAllocation(def), {
      type: 'ALLOCATE',
      allocations: { monks: 40, poor: 40, sick: 20 },
    });
    expect(next.allocations).toEqual({ monks: 40, poor: 40, sick: 20 });
    expect(next.submitted).toBe(true);
  });

  it('keeps phase "playing" (terminal detection is via `submitted`)', () => {
    const next = stepAllocation(def, initAllocation(def), {
      type: 'ALLOCATE',
      allocations: { monks: 10 },
    });
    expect(next.phase).toBe('playing');
  });

  it('replaces rather than merges prior allocations', () => {
    const first = stepAllocation(def, initAllocation(def), {
      type: 'ALLOCATE',
      allocations: { monks: 10, poor: 10 },
    });
    const second = stepAllocation(def, first, { type: 'ALLOCATE', allocations: { sick: 20 } });
    expect(second.allocations).toEqual({ sick: 20 });
  });

  it('does not mutate the incoming state', () => {
    const s = initAllocation(def);
    const snapshot: AllocationState = { ...s, allocations: { ...s.allocations } };
    stepAllocation(def, s, { type: 'ALLOCATE', allocations: { monks: 5 } });
    expect(s).toEqual(snapshot);
  });
});

describe('stepAllocation — TICK', () => {
  it('advances the virtual clock by dt', () => {
    const next = stepAllocation(def, initAllocation(def), { type: 'TICK', dt: 16 });
    expect(next.tick).toBe(16);
  });

  it('accumulates across consecutive ticks', () => {
    const s0 = initAllocation(def);
    const s1 = stepAllocation(def, s0, { type: 'TICK', dt: 10 });
    const s2 = stepAllocation(def, s1, { type: 'TICK', dt: 7 });
    expect(s2.tick).toBe(17);
  });

  it('preserves allocations across ticks', () => {
    const allocated = stepAllocation(def, initAllocation(def), {
      type: 'ALLOCATE',
      allocations: { monks: 1 },
    });
    const ticked = stepAllocation(def, allocated, { type: 'TICK', dt: 5 });
    expect(ticked.allocations).toEqual({ monks: 1 });
    expect(ticked.tick).toBe(5);
  });
});

describe('stepAllocation — ABORT', () => {
  it('transitions phase to "aborted"', () => {
    const next = stepAllocation(def, initAllocation(def), { type: 'ABORT' });
    expect(next.phase).toBe('aborted');
  });

  it('leaves submitted false (abort is distinct from submit)', () => {
    const next = stepAllocation(def, initAllocation(def), { type: 'ABORT' });
    expect(next.submitted).toBe(false);
  });
});

describe('stepAllocation — terminal guard & unknown inputs', () => {
  it('is a no-op once aborted (ALLOCATE/TICK ignored)', () => {
    const aborted = stepAllocation(def, initAllocation(def), { type: 'ABORT' });
    expect(stepAllocation(def, aborted, { type: 'ALLOCATE', allocations: { monks: 9 } })).toBe(
      aborted,
    );
    expect(stepAllocation(def, aborted, { type: 'TICK', dt: 3 })).toBe(aborted);
  });

  it('guards on phase only: a TICK after ALLOCATE still advances (submit keeps phase "playing")', () => {
    const submitted = stepAllocation(def, initAllocation(def), {
      type: 'ALLOCATE',
      allocations: { monks: 1 },
    });
    expect(submitted.phase).toBe('playing'); // submit does not change phase
    const ticked = stepAllocation(def, submitted, { type: 'TICK', dt: 99 });
    expect(ticked.tick).toBe(99); // not blocked — only phase guards stepAllocation
    expect(ticked.allocations).toEqual({ monks: 1 });
  });

  it.each(IGNORED_INPUTS)('returns the state unchanged for non-allocation input %j', (input) => {
    const s = initAllocation(def);
    expect(stepAllocation(def, s, input)).toBe(s);
  });
});

/* -----------------------------------------------------------------------------------------------
 * isAllocationTerminal
 * ---------------------------------------------------------------------------------------------*/

describe('isAllocationTerminal', () => {
  it('is false for a freshly initialised session', () => {
    expect(isAllocationTerminal(initAllocation(def))).toBe(false);
  });

  it('is false after ticks alone (still playing, not submitted)', () => {
    const ticked = stepAllocation(def, initAllocation(def), { type: 'TICK', dt: 50 });
    expect(isAllocationTerminal(ticked)).toBe(false);
  });

  it('is true after an ALLOCATE', () => {
    const submitted = stepAllocation(def, initAllocation(def), {
      type: 'ALLOCATE',
      allocations: { monks: 1 },
    });
    expect(isAllocationTerminal(submitted)).toBe(true);
  });

  it('is true after an ABORT', () => {
    const aborted = stepAllocation(def, initAllocation(def), { type: 'ABORT' });
    expect(isAllocationTerminal(aborted)).toBe(true);
  });
});

/* -----------------------------------------------------------------------------------------------
 * scoreAllocation
 * ---------------------------------------------------------------------------------------------*/

describe('scoreAllocation', () => {
  const scoreOf = (allocations: Record<string, number>): number =>
    scoreAllocation(def, { ...initAllocation(def), allocations, submitted: true }).score;

  it('returns ONLY { score } — never tierIndex/rewards/summary_sid', () => {
    const result = scoreAllocation(def, {
      ...initAllocation(def),
      allocations: { monks: 40, poor: 40, sick: 20 },
      submitted: true,
    });
    expect(result).toEqual({ score: 100 });
    expect(Object.keys(result).sort()).toEqual(['score']);
    expect('tierIndex' in result).toBe(false);
    expect('rewards' in result).toBe(false);
    expect('summary_sid' in result).toBe(false);
  });

  it('scores a perfect on-budget allocation at 100', () => {
    expect(scoreOf({ monks: 40, poor: 40, sick: 20 })).toBe(100);
  });

  it('scales linearly with coverage when within budget (half need → 50)', () => {
    expect(scoreOf({ monks: 20, poor: 20, sick: 10 })).toBeCloseTo(50, 10);
  });

  it('caps coverage at each recipient need (no over-credit)', () => {
    // Over-funding monks (100 of its 40 need) covers only 40% of total need.
    expect(scoreOf({ monks: 100 })).toBeCloseTo(40, 10);
  });

  it('penalises over-spend proportionally', () => {
    // 200 allocated against a 100 budget: coverage 0.4 × withinBudget 0.5 → 20.
    expect(scoreOf({ monks: 200 })).toBeCloseTo(20, 10);
  });

  it('scores an empty allocation (nothing given) at 0', () => {
    expect(scoreOf({})).toBe(0);
  });

  it('scores an aborted (un-submitted, empty) session at 0', () => {
    const aborted = stepAllocation(def, initAllocation(def), { type: 'ABORT' });
    expect(scoreAllocation(def, aborted).score).toBe(0);
  });
});

/* -----------------------------------------------------------------------------------------------
 * Purity & determinism (properties)
 * ---------------------------------------------------------------------------------------------*/

describe('allocation engine purity & determinism', () => {
  it('stepAllocation is a pure function of its inputs (same args ⇒ same output)', () => {
    fc.assert(
      fc.property(
        fc.record({
          monks: fc.double({ min: 0, max: 150, noNaN: true, noDefaultInfinity: true }),
          poor: fc.double({ min: 0, max: 150, noNaN: true, noDefaultInfinity: true }),
          sick: fc.double({ min: 0, max: 150, noNaN: true, noDefaultInfinity: true }),
        }),
        (allocations) => {
          const s = initAllocation(def);
          const a = stepAllocation(def, s, { type: 'ALLOCATE', allocations });
          const b = stepAllocation(def, s, { type: 'ALLOCATE', allocations });
          expect(a).toEqual(b);
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  it('stepAllocation never mutates the input state (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (dt) => {
        const s = initAllocation(def);
        const snapshot: AllocationState = { ...s, allocations: { ...s.allocations } };
        stepAllocation(def, s, { type: 'TICK', dt });
        return JSON.stringify(s) === JSON.stringify(snapshot);
      }),
      { numRuns: 200 },
    );
  });

  it('scoreAllocation always yields a finite score in [0, 100] (property)', () => {
    fc.assert(
      fc.property(
        fc.record({
          monks: fc.double({ min: -10, max: 150, noNaN: true, noDefaultInfinity: true }),
          poor: fc.double({ min: -10, max: 150, noNaN: true, noDefaultInfinity: true }),
          sick: fc.double({ min: -10, max: 150, noNaN: true, noDefaultInfinity: true }),
        }),
        (allocations) => {
          const score = scoreAllocation(def, { ...initAllocation(def), allocations }).score;
          return Number.isFinite(score) && score >= 0 && score <= 100;
        },
      ),
      { numRuns: 300 },
    );
  });
});
