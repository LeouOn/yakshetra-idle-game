// TDD tests for the pure sutra-tracing (calligraphy) minigame engine.
//
// The engine is deterministic and side-effect-free: every case is an exact
// assertion with no clocks, no RNG, no mocks. A few fast-check properties guard
// the documented output ranges (score ∈ [0,100], strokes ∈ [0,1]) and the
// no-mutation contract for arbitrary input streams.

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import type { MinigameInput, TraceState } from '../types';

import { initTrace, isTraceTerminal, scoreTrace, stepTrace } from '../trace';
import type { TraceDef } from '../trace';

/** Build a schema-shaped TraceDef with `n` strokes (tolerance 0.25 each). */
const makeDef = (n = 3): TraceDef => ({
  id: 'mg.trace.demo',
  type: 'trace',
  label_sid: 'mg.trace.demo.label',
  description_sid: 'mg.trace.demo.desc',
  lens: 'joyful_effort',
  config: {
    strokes: Array.from({ length: n }, (_, i) => ({
      target_sid: `mg.trace.demo.stroke.${i}`,
      tolerance: 0.25,
    })),
  },
  rewardTiers: [{ minScore: 0, rewards: [], summary_sid: 'mg.trace.demo.summary' }],
});

const stroke = (index: number, accuracy: number): MinigameInput => ({
  type: 'STROKE',
  index,
  accuracy,
});

/** Drive a session from a fresh state by applying inputs in order. */
const play = (def: TraceDef, inputs: readonly MinigameInput[]): TraceState =>
  inputs.reduce<TraceState>((s, input) => stepTrace(def, s, input), initTrace(def));

describe('initTrace', () => {
  it('produces a fresh playing session seeded from the definition', () => {
    // Given a trace definition; When initTrace runs; Then the state is the
    // documented zero-point: playing, no strokes, awaiting stroke 0.
    const def = makeDef();
    const state = initTrace(def);
    expect(state).toEqual({
      id: 'mg.trace.demo',
      type: 'trace',
      phase: 'playing',
      tick: 0,
      strokes: [],
      nextStrokeIndex: 0,
    });
  });

  it('carries the definition id through to the state', () => {
    const def = makeDef();
    def.id = 'mg.trace.other';
    expect(initTrace(def).id).toBe('mg.trace.other');
  });

  it('returns independent state instances (no shared mutable reference)', () => {
    const def = makeDef();
    expect(initTrace(def)).not.toBe(initTrace(def));
  });
});

describe('stepTrace — STROKE', () => {
  it('records an in-order stroke and advances the next index', () => {
    // Given a fresh session; When stroke 0 with accuracy 0.9 arrives; Then it is
    // appended and nextStrokeIndex moves to 1.
    const def = makeDef();
    const next = stepTrace(def, initTrace(def), stroke(0, 0.9));
    expect(next.strokes).toEqual([0.9]);
    expect(next.nextStrokeIndex).toBe(1);
  });

  it('records successive strokes strictly in order', () => {
    const def = makeDef(3);
    const state = play(def, [stroke(0, 0.5), stroke(1, 0.8), stroke(2, 1)]);
    expect(state.strokes).toEqual([0.5, 0.8, 1]);
    expect(state.nextStrokeIndex).toBe(3);
  });

  it('ignores an out-of-sequence stroke index (no-op, no desync)', () => {
    // Given a fresh session awaiting stroke 0; When stroke 1 arrives; Then the
    // state is returned unchanged so a dropped/duplicated event cannot corrupt.
    const def = makeDef();
    const initial = initTrace(def);
    const next = stepTrace(def, initial, stroke(1, 0.9));
    expect(next).toBe(initial);
    expect(next.strokes).toEqual([]);
    expect(next.nextStrokeIndex).toBe(0);
  });

  it('ignores a duplicate of the current stroke index', () => {
    const def = makeDef();
    const after = stepTrace(def, initTrace(def), stroke(0, 0.5));
    // A second stroke 0 (already consumed) is now out of sequence.
    const dup = stepTrace(def, after, stroke(0, 0.9));
    expect(dup).toBe(after);
    expect(dup.strokes).toEqual([0.5]);
  });

  it('clamps accuracy below 0 to 0', () => {
    const def = makeDef();
    expect(stepTrace(def, initTrace(def), stroke(0, -0.4)).strokes).toEqual([0]);
    expect(stepTrace(def, initTrace(def), stroke(0, -100)).strokes).toEqual([0]);
  });

  it('clamps accuracy above 1 to 1', () => {
    const def = makeDef();
    expect(stepTrace(def, initTrace(def), stroke(0, 1.5)).strokes).toEqual([1]);
    expect(stepTrace(def, initTrace(def), stroke(0, 99)).strokes).toEqual([1]);
  });

  it('collapses non-finite accuracy (NaN, ±Infinity) to 0', () => {
    const def = makeDef();
    expect(stepTrace(def, initTrace(def), stroke(0, Number.NaN)).strokes).toEqual([0]);
    expect(stepTrace(def, initTrace(def), stroke(0, Number.POSITIVE_INFINITY)).strokes).toEqual([
      0,
    ]);
    expect(stepTrace(def, initTrace(def), stroke(0, Number.NEGATIVE_INFINITY)).strokes).toEqual([
      0,
    ]);
  });

  it('does not mutate the input state or its strokes array', () => {
    // Given a session with one recorded stroke; When another stroke arrives;
    // Then the original state object and its strokes array are untouched.
    const def = makeDef();
    const before = stepTrace(def, initTrace(def), stroke(0, 0.5));
    const strokesRef = before.strokes;
    const next = stepTrace(def, before, stroke(1, 0.7));
    expect(before.strokes).toBe(strokesRef); // same array reference, not replaced
    expect(before.strokes).toEqual([0.5]); // contents unchanged
    expect(next).not.toBe(before); // new state object
    expect(next.strokes).not.toBe(before.strokes); // new strokes array
  });
});

describe('stepTrace — TICK', () => {
  it('advances the virtual clock by dt', () => {
    const def = makeDef();
    const state = stepTrace(def, initTrace(def), { type: 'TICK', dt: 16 });
    expect(state.tick).toBe(16);
  });

  it('accumulates successive ticks', () => {
    const def = makeDef();
    const state = play(def, [
      { type: 'TICK', dt: 16 },
      { type: 'TICK', dt: 16 },
      { type: 'TICK', dt: 2 },
    ]);
    expect(state.tick).toBe(34);
  });

  it('preserves recorded strokes across ticks', () => {
    const def = makeDef();
    const state = play(def, [stroke(0, 0.9), { type: 'TICK', dt: 5 }]);
    expect(state.strokes).toEqual([0.9]);
    expect(state.tick).toBe(5);
  });

  it('does not mutate the input state', () => {
    const def = makeDef();
    const before = initTrace(def);
    stepTrace(def, before, { type: 'TICK', dt: 10 });
    expect(before.tick).toBe(0);
  });
});

describe('stepTrace — ABORT', () => {
  it('transitions a playing session to the aborted phase', () => {
    const def = makeDef();
    const state = stepTrace(def, initTrace(def), { type: 'ABORT' });
    expect(state.phase).toBe('aborted');
  });

  it('preserves strokes recorded before the abort', () => {
    const def = makeDef(3);
    const state = play(def, [stroke(0, 0.6), stroke(1, 0.4), { type: 'ABORT' }]);
    expect(state.strokes).toEqual([0.6, 0.4]);
    expect(state.phase).toBe('aborted');
  });
});

describe('stepTrace — phase guard', () => {
  it('returns the state unchanged once aborted (even for STROKE)', () => {
    const def = makeDef();
    const aborted = play(def, [{ type: 'ABORT' }]);
    expect(stepTrace(def, aborted, stroke(0, 0.9))).toBe(aborted);
  });

  it('returns the state unchanged once resolved', () => {
    const def = makeDef();
    const resolved: TraceState = { ...initTrace(def), phase: 'resolved' };
    expect(stepTrace(def, resolved, stroke(0, 0.9))).toBe(resolved);
  });
});

describe('stepTrace — shared inputs are ignored', () => {
  // MinigameInput is a union shared across every minigame type; the trace
  // engine must no-op the variants that belong to other engines.
  const ignored: readonly MinigameInput[] = [
    { type: 'START' },
    { type: 'COUNT' },
    { type: 'LAPSE' },
    { type: 'TAP', nowTick: 5 },
    { type: 'STEP', nowTick: 6 },
    { type: 'ALLOCATE', allocations: { a: 1 } },
    { type: 'CHOOSE', nodeId: 'n', optionId: 'o' },
  ];

  it.each(ignored)('leaves state untouched for input %s', (input) => {
    const def = makeDef();
    const state = initTrace(def);
    // Same reference returned — the reducer made no copy because nothing changed.
    expect(stepTrace(def, state, input)).toBe(state);
  });
});

describe('isTraceTerminal', () => {
  it('is false while strokes remain to be traced', () => {
    const def = makeDef(3);
    const state = play(def, [stroke(0, 0.9)]);
    expect(isTraceTerminal(state, def.config)).toBe(false);
  });

  it('is false at the very start', () => {
    const def = makeDef(3);
    expect(isTraceTerminal(initTrace(def), def.config)).toBe(false);
  });

  it('is true once every configured stroke is recorded', () => {
    const def = makeDef(3);
    const state = play(def, [stroke(0, 0.9), stroke(1, 0.8), stroke(2, 0.7)]);
    expect(isTraceTerminal(state, def.config)).toBe(true);
  });

  it('is true for a single-stroke definition once that stroke lands', () => {
    const def = makeDef(1);
    const state = play(def, [stroke(0, 1)]);
    expect(isTraceTerminal(state, def.config)).toBe(true);
  });

  it('is true on abort even when strokes remain', () => {
    const def = makeDef(3);
    const state = play(def, [stroke(0, 0.5), { type: 'ABORT' }]);
    expect(isTraceTerminal(state, def.config)).toBe(true);
  });

  it('is true on abort before any stroke', () => {
    const def = makeDef(3);
    const state = play(def, [{ type: 'ABORT' }]);
    expect(isTraceTerminal(state, def.config)).toBe(true);
  });
});

describe('scoreTrace', () => {
  it('scores the mean stroke accuracy scaled to 100', () => {
    const def = makeDef(3);
    const state = play(def, [stroke(0, 1), stroke(1, 0.8), stroke(2, 0.6)]);
    // mean([1, 0.8, 0.6]) = 0.8 → 80
    expect(scoreTrace(def, state).score).toBeCloseTo(80, 10);
  });

  it('scores 0 when no strokes were recorded', () => {
    const def = makeDef(3);
    expect(scoreTrace(def, initTrace(def)).score).toBe(0);
  });

  it('scores 100 for a perfect single stroke', () => {
    const def = makeDef(1);
    const state = play(def, [stroke(0, 1)]);
    expect(scoreTrace(def, state).score).toBe(100);
  });

  it('scores 100 for all-perfect strokes', () => {
    const def = makeDef(4);
    const state = play(def, [stroke(0, 1), stroke(1, 1), stroke(2, 1), stroke(3, 1)]);
    expect(scoreTrace(def, state).score).toBe(100);
  });

  it('reflects clamped accuracy (over-scope stroke scores as 1)', () => {
    const def = makeDef(1);
    const state = play(def, [stroke(0, 2.5)]); // clamped to 1
    expect(scoreTrace(def, state).score).toBe(100);
  });

  it('returns only the score field (no tier/rewards/summary)', () => {
    const def = makeDef(1);
    const state = play(def, [stroke(0, 0.5)]);
    expect(scoreTrace(def, state)).toEqual({ score: 50 });
  });

  it('yields a finite score in [0, 100] for any accuracy stream (property)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -5, max: 5, noNaN: false }), { maxLength: 12 }),
        (accs) => {
          const def = makeDef(Math.max(1, accs.length));
          let s = initTrace(def);
          for (const [i, a] of accs.entries()) s = stepTrace(def, s, stroke(i, a));
          const { score } = scoreTrace(def, s);
          return Number.isFinite(score) && score >= 0 && score <= 100;
        },
      ),
      { numRuns: 300 },
    );
  });

  it('always records clamped strokes in [0, 1] (property)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: false }), { maxLength: 12 }),
        (accs) => {
          const def = makeDef(Math.max(1, accs.length));
          let s = initTrace(def);
          for (const [i, a] of accs.entries()) s = stepTrace(def, s, stroke(i, a));
          return s.strokes.every((v) => v >= 0 && v <= 1 && Number.isFinite(v));
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe('trace determinism', () => {
  it('replaying the same input stream yields an identical state', () => {
    const def = makeDef(3);
    const inputs: readonly MinigameInput[] = [
      stroke(0, 0.5),
      { type: 'TICK', dt: 4 },
      stroke(1, 0.9),
      stroke(2, 0.1),
    ];
    expect(play(def, inputs)).toEqual(play(def, inputs));
  });
});
