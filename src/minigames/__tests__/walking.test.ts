// TDD tests for the walking-meditation pure engine in `../walking`.
//
// The walking minigame records step ticks and scores them by cadence
// *consistency*: low variance of inter-step intervals (relative to the target
// cadence) is rewarded, not raw speed or accuracy to an absolute beat. Every
// case is an exact-value assertion against a fully-deterministic engine, plus a
// fast-check property guarding the documented score range [0, 100].

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import type { MinigameDef } from '@/content/minigame-schema';
import type { MinigameInput, WalkingState } from '../types';

import { initWalking, isWalkingTerminal, scoreWalking, stepWalking } from '../walking';

/** A schema-shaped walking definition. targetCadence=10 makes the cadence²
 *  normalisation scale 100, so the formula reads cleanly in the tests below. */
const walkingDef: MinigameDef & { type: 'walking' } = {
  id: 'walk_test',
  type: 'walking',
  label_sid: 'mg.walk.label',
  description_sid: 'mg.walk.desc',
  lens: 'patient_courage',
  config: { targetCadence: 10, requiredSteps: 5, window: 3 },
  rewardTiers: [{ minScore: 0, rewards: [], summary_sid: 'mg.walk.summary' }],
};

/** Build a walking state in the `playing` phase with the given recorded steps. */
const playing = (steps: readonly number[]): WalkingState => ({
  ...initWalking(walkingDef),
  steps,
});

describe('initWalking', () => {
  it('seeds a fresh `playing` state from the definition', () => {
    expect(initWalking(walkingDef)).toEqual({
      id: 'walk_test',
      type: 'walking',
      phase: 'playing',
      tick: 0,
      steps: [],
    });
  });

  it('starts with no recorded steps', () => {
    expect(initWalking(walkingDef).steps).toEqual([]);
  });

  it('returns an independent object on every call (no shared state)', () => {
    const a = initWalking(walkingDef);
    const b = initWalking(walkingDef);
    expect(a).not.toBe(b);
    expect(a.steps).not.toBe(b.steps);
  });
});

describe('stepWalking', () => {
  it('appends the step tick on a STEP input', () => {
    expect(
      stepWalking(walkingDef, initWalking(walkingDef), { type: 'STEP', nowTick: 12 }).steps,
    ).toEqual([12]);
  });

  it('preserves previously recorded steps', () => {
    const s = stepWalking(walkingDef, playing([10]), { type: 'STEP', nowTick: 20 });
    expect(s.steps).toEqual([10, 20]);
  });

  it('advances the virtual clock on a TICK input', () => {
    const s1 = stepWalking(walkingDef, initWalking(walkingDef), { type: 'TICK', dt: 16 });
    expect(s1.tick).toBe(16);
    const s2 = stepWalking(walkingDef, s1, { type: 'TICK', dt: 4 });
    expect(s2.tick).toBe(20);
  });

  it('leaves the recorded steps untouched on a TICK', () => {
    const s = stepWalking(walkingDef, playing([10, 20]), { type: 'TICK', dt: 5 });
    expect(s.steps).toEqual([10, 20]);
  });

  it('moves to the aborted phase on an ABORT input', () => {
    expect(stepWalking(walkingDef, initWalking(walkingDef), { type: 'ABORT' }).phase).toBe(
      'aborted',
    );
  });

  it('ignores inputs unrelated to walking and returns the state unchanged', () => {
    const s0 = initWalking(walkingDef);
    const irrelevant: MinigameInput[] = [
      { type: 'START' },
      { type: 'COUNT' },
      { type: 'LAPSE' },
      { type: 'TAP', nowTick: 5 },
      { type: 'STROKE', index: 0, accuracy: 1 },
      { type: 'ALLOCATE', allocations: {} },
      { type: 'CHOOSE', nodeId: 'n', optionId: 'o' },
    ];
    for (const input of irrelevant) {
      expect(stepWalking(walkingDef, s0, input)).toBe(s0); // same reference, untouched
    }
  });

  it('does not mutate the incoming state when recording a step', () => {
    const s0 = initWalking(walkingDef);
    const snapshot = { ...s0, steps: [...s0.steps] };
    stepWalking(walkingDef, s0, { type: 'STEP', nowTick: 9 });
    expect(s0).toEqual(snapshot);
  });

  it('is a no-op once the session has been aborted', () => {
    const aborted: WalkingState = { ...initWalking(walkingDef), phase: 'aborted', steps: [5] };
    expect(stepWalking(walkingDef, aborted, { type: 'STEP', nowTick: 99 })).toBe(aborted);
    expect(stepWalking(walkingDef, aborted, { type: 'TICK', dt: 99 })).toBe(aborted);
    expect(stepWalking(walkingDef, aborted, { type: 'ABORT' })).toBe(aborted);
  });
});

describe('isWalkingTerminal', () => {
  const config = walkingDef.config; // requiredSteps: 5

  it('is false while fewer than the required steps are taken', () => {
    expect(isWalkingTerminal(playing([0, 10, 20]), config)).toBe(false);
  });

  it('is true once the required step count is reached', () => {
    expect(isWalkingTerminal(playing([0, 10, 20, 30, 40]), config)).toBe(true);
  });

  it('treats the required count as an inclusive boundary', () => {
    expect(isWalkingTerminal(playing([0, 1, 2, 3, 4]), config)).toBe(true);
    expect(isWalkingTerminal(playing([0, 1, 2, 3]), config)).toBe(false);
  });

  it('is true when more than enough steps are taken', () => {
    expect(isWalkingTerminal(playing([0, 1, 2, 3, 4, 5, 6]), config)).toBe(true);
  });

  it('is true the moment the session is aborted, regardless of step count', () => {
    const aborted: WalkingState = { ...initWalking(walkingDef), phase: 'aborted', steps: [] };
    expect(isWalkingTerminal(aborted, config)).toBe(true);
  });
});

describe('scoreWalking', () => {
  it('scores 0 with fewer than two steps (no interval to judge)', () => {
    expect(scoreWalking(walkingDef, playing([])).score).toBe(0);
    expect(scoreWalking(walkingDef, playing([10])).score).toBe(0);
  });

  it('scores 100 for perfectly even spacing at the target cadence', () => {
    // intervals all === targetCadence (10) → variance 0 → full consistency.
    expect(scoreWalking(walkingDef, playing([0, 10, 20, 30, 40])).score).toBeCloseTo(100, 10);
  });

  it('scores 100 for any constant spacing (consistency, not cadence accuracy)', () => {
    // Even spacing at the wrong cadence is still perfectly consistent.
    expect(scoreWalking(walkingDef, playing([0, 20, 40])).score).toBeCloseTo(100, 10);
  });

  it('rewards tight spacing over erratic spacing', () => {
    const tight = playing([0, 9, 20, 31, 40]);
    const loose = playing([0, 1, 40, 41, 80]);
    expect(scoreWalking(walkingDef, tight).score).toBeGreaterThan(
      scoreWalking(walkingDef, loose).score,
    );
  });

  it('matches the documented consistency formula', () => {
    // steps [0,5,20] → intervals [5,15] → mean 10 → variance 25.
    // maxVariance = targetCadence² = 100 → consistency = 1 − 25/100 = 0.75 → 75.
    expect(scoreWalking(walkingDef, playing([0, 5, 20])).score).toBeCloseTo(75, 10);
  });

  it('clamps to 0 when variance swamps the cadence scale', () => {
    // intervals [0, 30] → mean 15 → variance 225; 1 − 225/100 < 0 → clamp 0.
    expect(scoreWalking(walkingDef, playing([0, 0, 30])).score).toBe(0);
  });

  it('returns only the `score` field (no tier/rewards/summary)', () => {
    expect(Object.keys(scoreWalking(walkingDef, playing([0, 10, 20])))).toEqual(['score']);
  });

  it('always yields a finite score in [0, 100] (property)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 0, maxLength: 20 }),
        (ticks) => {
          // Realistic sessions record monotonically non-decreasing ticks.
          const sorted = [...ticks].sort((a, b) => a - b);
          const score = scoreWalking(walkingDef, playing(sorted)).score;
          return Number.isFinite(score) && score >= 0 && score <= 100;
        },
      ),
      { numRuns: 300 },
    );
  });
});
