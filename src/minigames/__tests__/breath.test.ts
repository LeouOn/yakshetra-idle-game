// Unit + edge-case tests for the pure breath-counting engine in `../breath`.
//
// The engine is fully deterministic (no wall-clock, no global RNG, no platform
// APIs — see the package purity-fence test in types.test.ts). Every case is an
// exact-value assertion against the documented state transitions. Inputs are
// applied as pure folds over an immutable state; no mocks are needed or used.

import { describe, expect, it } from 'vitest';

import type { MinigameDef } from '@/content/minigame-schema';
import type { BreathCountState } from '../types';

import {
  initBreathCount,
  isBreathCountTerminal,
  scoreBreathCount,
  stepBreathCount,
} from '../breath';

/**
 * Minimal schema-shaped breath_count definition. Only `config` is exercised by
 * the engine; the descriptive SIDs/lens/rewardTiers exist to satisfy the type.
 */
const def: MinigameDef & { type: 'breath_count' } = {
  id: 'mg-breath',
  type: 'breath_count',
  label_sid: 'mg.breath.label',
  description_sid: 'mg.breath.desc',
  lens: 'collected_attention',
  config: { target: 3, maxInputs: 6 },
  rewardTiers: [{ minScore: 0, rewards: [], summary_sid: 'mg.breath.summary' }],
};

/** Apply `n` COUNT inputs as a pure fold, returning each successive state. */
function count(state: BreathCountState, n: number): BreathCountState {
  let s = state;
  for (let i = 0; i < n; i++) s = stepBreathCount(def, s, { type: 'COUNT' });
  return s;
}

describe('initBreathCount', () => {
  it('returns the documented zeroed initial state in the playing phase', () => {
    const state = initBreathCount(def);
    expect(state).toEqual({
      id: 'mg-breath',
      type: 'breath_count',
      phase: 'playing',
      tick: 0,
      count: 0,
      lapses: 0,
      cycles: 0,
      inputsUsed: 0,
    });
  });

  it('does not read or echo back config fields into state', () => {
    // The initial state carries no trace of target/maxInputs — those live on the
    // def and are consulted only by step/score/terminal, never stored on state.
    const state = initBreathCount(def);
    expect(state).not.toHaveProperty('target');
    expect(state).not.toHaveProperty('maxInputs');
  });
});

describe('stepBreathCount — COUNT', () => {
  it('increments the breath count by one and consumes one input', () => {
    const before = initBreathCount(def);
    const after = stepBreathCount(def, before, { type: 'COUNT' });
    expect(after.count).toBe(1);
    expect(after.inputsUsed).toBe(1);
    expect(after.tick).toBe(0);
    expect(after.lapses).toBe(0);
    expect(after.cycles).toBe(0);
  });

  it('counts up to target - 1 without cycling', () => {
    // target=3: COUNT twice reaches 2 (the last in-cycle count), no cycle yet.
    const state = count(initBreathCount(def), 2);
    expect(state.count).toBe(2);
    expect(state.cycles).toBe(0);
    expect(state.inputsUsed).toBe(2);
  });

  it('resets the count to 0 and increments cycles when the count reaches target', () => {
    // The 3rd COUNT makes newCount=3 >= target=3 → cycle completes.
    const state = count(initBreathCount(def), 3);
    expect(state.count).toBe(0);
    expect(state.cycles).toBe(1);
    expect(state.inputsUsed).toBe(3);
  });

  it('completes a second cycle independently of the first', () => {
    // 6 COUNTs at target=3 → exactly 2 full cycles, count back at 0.
    const state = count(initBreathCount(def), 6);
    expect(state.count).toBe(0);
    expect(state.cycles).toBe(2);
    expect(state.inputsUsed).toBe(6);
  });
});

describe('stepBreathCount — LAPSE', () => {
  it('resets the count to 0 and records a lapse, consuming one input', () => {
    // Given an in-progress count of 2, a LAPSE zeroes the count.
    const before = count(initBreathCount(def), 2);
    const after = stepBreathCount(def, before, { type: 'LAPSE' });
    expect(after.count).toBe(0);
    expect(after.lapses).toBe(1);
    expect(after.inputsUsed).toBe(3);
    expect(after.cycles).toBe(0);
  });

  it('keeps the count at 0 when a lapse happens on a fresh count', () => {
    const after = stepBreathCount(def, initBreathCount(def), { type: 'LAPSE' });
    expect(after.count).toBe(0);
    expect(after.lapses).toBe(1);
    expect(after.inputsUsed).toBe(1);
  });
});

describe('stepBreathCount — TICK', () => {
  it('advances the virtual clock by dt without consuming input budget', () => {
    const before = initBreathCount(def);
    const after = stepBreathCount(def, before, { type: 'TICK', dt: 16 });
    expect(after.tick).toBe(16);
    expect(after.inputsUsed).toBe(0); // TICK is a clock event, not a player input
    expect(after.count).toBe(0);
  });

  it('accumulates successive dt deltas', () => {
    let state = initBreathCount(def);
    state = stepBreathCount(def, state, { type: 'TICK', dt: 10 });
    state = stepBreathCount(def, state, { type: 'TICK', dt: 5 });
    expect(state.tick).toBe(15);
  });
});

describe('stepBreathCount — ABORT', () => {
  it('transitions to the aborted phase', () => {
    const before = count(initBreathCount(def), 2);
    const after = stepBreathCount(def, before, { type: 'ABORT' });
    expect(after.phase).toBe('aborted');
    // Counters are preserved on abort — only the phase changes.
    expect(after.count).toBe(2);
    expect(after.inputsUsed).toBe(2);
  });
});

describe('stepBreathCount — phase guard', () => {
  it('is a no-op once the phase has left playing (aborted)', () => {
    // Given an aborted state, any input returns the state unchanged.
    const aborted = stepBreathCount(def, initBreathCount(def), { type: 'ABORT' });
    const after = stepBreathCount(def, aborted, { type: 'COUNT' });
    expect(after).toBe(aborted);
    expect(after.phase).toBe('aborted');
    expect(after.count).toBe(0); // the COUNT did not land
  });
});

describe('isBreathCountTerminal', () => {
  it('is false at the start of a fresh game', () => {
    expect(isBreathCountTerminal(initBreathCount(def), def.config)).toBe(false);
  });

  it('is false while the input budget is unspent', () => {
    const state = count(initBreathCount(def), 5); // 5 of 6 inputs used
    expect(isBreathCountTerminal(state, def.config)).toBe(false);
  });

  it('is true once the input budget is fully spent', () => {
    // 6 COUNTs at target=3 spend exactly maxInputs=6.
    const state = count(initBreathCount(def), 6);
    expect(isBreathCountTerminal(state, def.config)).toBe(true);
  });

  it('is true when the budget is overspent (defensive upper bound)', () => {
    const state = { ...initBreathCount(def), inputsUsed: def.config.maxInputs + 1 };
    expect(isBreathCountTerminal(state, def.config)).toBe(true);
  });

  it('is true as soon as the game is aborted, regardless of budget', () => {
    const aborted = stepBreathCount(def, initBreathCount(def), { type: 'ABORT' });
    expect(isBreathCountTerminal(aborted, def.config)).toBe(true);
  });
});

describe('scoreBreathCount', () => {
  it('scores 0 when no cycles were completed', () => {
    const state = initBreathCount(def); // 0 cycles
    expect(scoreBreathCount(def, state).score).toBe(0);
  });

  it('scores 100 when every achievable cycle is completed', () => {
    // maxInputs=6 / target=3 → 2 achievable cycles; completing both → 100.
    const state = count(initBreathCount(def), 6); // 2 cycles
    expect(scoreBreathCount(def, state).score).toBe(100);
  });

  it('scales linearly: half the achievable cycles → 50', () => {
    // 1 of 2 achievable cycles → 50.
    const state = count(initBreathCount(def), 3); // 1 cycle
    expect(scoreBreathCount(def, state).score).toBeCloseTo(50, 10);
  });

  it('clamps to 100 when cycles exceed the achievable bound', () => {
    // A state with more cycles than the budget would allow (e.g. seeded by a
    // caller) must never produce a score above 100.
    const state = { ...initBreathCount(def), cycles: 99 };
    expect(scoreBreathCount(def, state).score).toBe(100);
  });

  it('scores 0 when no full cycle is achievable (target exceeds budget)', () => {
    // maxInputs=2 < target=3 → expectedCycles = floor(2/3) = 0 → score 0.
    const tightDef: MinigameDef & { type: 'breath_count' } = {
      ...def,
      config: { target: 3, maxInputs: 2 },
    };
    // Even counting twice never completes a cycle (count tops out at 2 < 3).
    let state = initBreathCount(tightDef);
    state = stepBreathCount(tightDef, state, { type: 'COUNT' });
    state = stepBreathCount(tightDef, state, { type: 'COUNT' });
    expect(scoreBreathCount(tightDef, state).score).toBe(0);
  });

  it('returns only the score field (no tierIndex/rewards/summary_sid)', () => {
    const result = scoreBreathCount(def, initBreathCount(def));
    expect(Object.keys(result)).toEqual(['score']);
  });
});
