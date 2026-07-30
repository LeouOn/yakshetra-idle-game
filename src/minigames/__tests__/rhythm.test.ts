// Unit + edge-case tests for the pure mantra rhythm engine in `../rhythm`.
//
// The engine is fully deterministic: it consumes caller-supplied virtual
// ticks (never wall-clock) and records no RNG state. Every case below is an
// exact-value assertion. A small fast-check property guards the documented
// `scoreRhythm` output range [0, 100] for any sequence of in-window hits and
// a determinism property asserts that identical inputs yield identical state
// transitions (the purity contract this package is built on).

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import type { MinigameDef, RhythmConfig } from '@/content/minigame-schema';
import type { RhythmState } from '../types';

import { initRhythm, stepRhythm, isRhythmTerminal, scoreRhythm } from '../rhythm';

/** Narrowed def type for readability. */
type RhythmDef = MinigameDef & { type: 'rhythm' };

/** Build a schema-shaped rhythm def with an overridable config. */
const makeDef = (over: Partial<RhythmConfig> = {}): RhythmDef => ({
  id: 'mg.rhythm.test',
  type: 'rhythm',
  label_sid: 'mg.rhythm.label',
  description_sid: 'mg.rhythm.desc',
  lens: 'collected_attention',
  config: { beats: [10, 20, 30], window: 3, mantra_id: 'mantra.om', ...over },
  rewardTiers: [{ minScore: 0, rewards: [], summary_sid: 'mg.rhythm.tier0' }],
});

/** Convenience: tap at `nowTick` against the current beat. */
const tap = (nowTick: number) => ({ type: 'TAP' as const, nowTick });

describe('initRhythm', () => {
  it('produces a fresh playing state with empty hits and a zero cursor', () => {
    const s = initRhythm(makeDef());
    expect(s).toEqual({
      id: 'mg.rhythm.test',
      type: 'rhythm',
      phase: 'playing',
      tick: 0,
      hits: [],
      nextBeatIndex: 0,
    });
  });

  it('does not depend on the beat layout (config is ignored at init)', () => {
    // A def with a single beat and a different window yields the same shape.
    const s = initRhythm(makeDef({ beats: [7], window: 99 }));
    expect(s.nextBeatIndex).toBe(0);
    expect(s.hits).toEqual([]);
    expect(s.phase).toBe('playing');
  });

  it('returns a distinct object on each call (no shared mutable state)', () => {
    const a = initRhythm(makeDef());
    const b = initRhythm(makeDef());
    expect(a).not.toBe(b);
    expect(a.hits).not.toBe(b.hits);
  });
});

describe('stepRhythm — TAP', () => {
  it('records a perfect hit (accuracy 1) and advances the cursor', () => {
    const def = makeDef();
    const next = stepRhythm(def, initRhythm(def), tap(10)); // beat 0 at tick 10
    expect(next.hits).toEqual([1]);
    expect(next.nextBeatIndex).toBe(1);
  });

  it('records a linearly-ramped accuracy for an off-centre hit', () => {
    const def = makeDef({ window: 4 }); // delta 1 of 4 -> 0.75
    const next = stepRhythm(def, initRhythm(def), tap(11)); // beat 10, +1
    expect(next.hits).toHaveLength(1);
    expect(next.hits[0]).toBeCloseTo(0.75, 10);
    expect(next.nextBeatIndex).toBe(1);
  });

  it('is symmetric: an equally-early hit scores the same as a late one', () => {
    const def = makeDef({ window: 4 });
    const early = stepRhythm(def, initRhythm(def), tap(9)); // beat 10, -1
    const late = stepRhythm(def, initRhythm(def), tap(11)); // beat 10, +1
    expect(early.hits[0]).toBeCloseTo(late.hits[0] as number, 10);
  });

  it('ignores an out-of-window miss: no hit recorded, cursor unchanged', () => {
    const def = makeDef(); // window 3, beat 0 = 10
    const s0 = initRhythm(def);
    const next = stepRhythm(def, s0, tap(14)); // delta 4 > window -> accuracy 0
    expect(next.hits).toEqual([]);
    expect(next.nextBeatIndex).toBe(0);
  });

  it('treats the window boundary as a miss (delta === window -> 0)', () => {
    const def = makeDef(); // window 3
    const next = stepRhythm(def, initRhythm(def), tap(13)); // delta 3 == window
    expect(next.hits).toEqual([]);
    expect(next.nextBeatIndex).toBe(0);
  });

  it('always targets the cursor beat, not the nearest beat', () => {
    // Tap near beat 1 (tick 20) while the cursor still points at beat 0 (10):
    // the window centred on 10 makes tick 20 a clean miss (delta 10 > 3).
    const def = makeDef();
    const next = stepRhythm(def, initRhythm(def), tap(20));
    expect(next.hits).toEqual([]);
    expect(next.nextBeatIndex).toBe(0);
  });

  it('advances beat-by-beat across the full sequence', () => {
    const def = makeDef(); // beats [10, 20, 30]
    let s = initRhythm(def);
    s = stepRhythm(def, s, tap(10));
    s = stepRhythm(def, s, tap(20));
    s = stepRhythm(def, s, tap(30));
    expect(s.hits).toEqual([1, 1, 1]);
    expect(s.nextBeatIndex).toBe(3);
  });

  it('stops advancing once every beat is consumed', () => {
    const def = makeDef(); // 3 beats
    let s = initRhythm(def);
    for (const b of [10, 20, 30]) s = stepRhythm(def, s, tap(b));
    const consumed = s;
    // Further taps are a no-op (cursor past the last beat).
    const after = stepRhythm(def, consumed, tap(10));
    expect(after).toBe(consumed);
  });
});

describe('stepRhythm — TICK', () => {
  it('advances the virtual clock by dt', () => {
    const def = makeDef();
    const next = stepRhythm(def, initRhythm(def), { type: 'TICK', dt: 7 });
    expect(next.tick).toBe(7);
  });

  it('accumulates across successive ticks', () => {
    const def = makeDef();
    let s = initRhythm(def);
    s = stepRhythm(def, s, { type: 'TICK', dt: 5 });
    s = stepRhythm(def, s, { type: 'TICK', dt: 5 });
    s = stepRhythm(def, s, { type: 'TICK', dt: 10 });
    expect(s.tick).toBe(20);
  });

  it('does not touch hits or the beat cursor', () => {
    const def = makeDef();
    const next = stepRhythm(def, initRhythm(def), { type: 'TICK', dt: 100 });
    expect(next.hits).toEqual([]);
    expect(next.nextBeatIndex).toBe(0);
  });
});

describe('stepRhythm — ABORT', () => {
  it('flips the phase to aborted while preserving history', () => {
    const def = makeDef();
    let s = initRhythm(def);
    s = stepRhythm(def, s, tap(10)); // one hit
    const aborted = stepRhythm(def, s, { type: 'ABORT' });
    expect(aborted.phase).toBe('aborted');
    expect(aborted.hits).toEqual([1]);
    expect(aborted.nextBeatIndex).toBe(1);
    expect(aborted.tick).toBe(s.tick);
  });

  it('makes the state ignore all further inputs', () => {
    const def = makeDef();
    let s = stepRhythm(def, initRhythm(def), { type: 'ABORT' });
    const frozen = s;
    s = stepRhythm(def, s, tap(10));
    s = stepRhythm(def, s, { type: 'TICK', dt: 50 });
    expect(s).toBe(frozen);
  });
});

describe('stepRhythm — irrelevant inputs', () => {
  it('returns the state unchanged for inputs it does not handle', () => {
    const def = makeDef();
    const s0 = initRhythm(def);
    for (const input of [
      { type: 'START' },
      { type: 'COUNT' },
      { type: 'LAPSE' },
      { type: 'STEP', nowTick: 10 },
      { type: 'STROKE', index: 0, accuracy: 1 },
      { type: 'ALLOCATE', allocations: {} },
      { type: 'CHOOSE', nodeId: 'n', optionId: 'o' },
    ] as const) {
      expect(stepRhythm(def, s0, input)).toBe(s0);
    }
  });
});

describe('stepRhythm — purity / immutability', () => {
  it('never mutates the input state or its hits array', () => {
    const def = makeDef();
    const s0 = initRhythm(def);
    const hitsSnapshot = s0.hits.slice();
    stepRhythm(def, s0, tap(10));
    expect(s0.hits).toEqual(hitsSnapshot);
    expect(s0.nextBeatIndex).toBe(0);
    expect(s0.phase).toBe('playing');
  });

  it('is deterministic and never mutates its input (property)', () => {
    const def = makeDef({ window: 6 });
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40 }), (nowTick) => {
        const input = tap(nowTick);
        const s0 = initRhythm(def);
        const before = JSON.stringify(s0);
        // Two transitions from the SAME seed state must yield equal results.
        // We compare by value, not reference: a hit returns a new object, a
        // miss returns the input by reference — both are pure.
        const a = stepRhythm(def, s0, input);
        const b = stepRhythm(def, s0, input);
        return JSON.stringify(s0) === before && JSON.stringify(a) === JSON.stringify(b);
      }),
      { numRuns: 200 },
    );
  });
});

describe('isRhythmTerminal', () => {
  const cfg = (): RhythmConfig => ({ beats: [10, 20, 30], window: 3, mantra_id: null });

  it('is true once aborted', () => {
    const def = makeDef();
    const aborted = stepRhythm(def, initRhythm(def), { type: 'ABORT' });
    expect(isRhythmTerminal(aborted, cfg())).toBe(true);
  });

  it('is true when every beat has been consumed', () => {
    const def = makeDef();
    let s = initRhythm(def);
    for (const b of [10, 20, 30]) s = stepRhythm(def, s, tap(b));
    expect(s.nextBeatIndex).toBe(3);
    expect(isRhythmTerminal(s, cfg())).toBe(true);
  });

  it('is true once the clock passes the last beat + window', () => {
    const def = makeDef();
    let s = initRhythm(def);
    // lastBeat 30 + window 3 = 33; tick 34 > 33.
    s = stepRhythm(def, s, { type: 'TICK', dt: 34 });
    expect(isRhythmTerminal(s, cfg())).toBe(true);
  });

  it('is NOT terminal exactly at the boundary (strict > )', () => {
    const def = makeDef();
    let s = initRhythm(def);
    s = stepRhythm(def, s, { type: 'TICK', dt: 33 }); // tick == lastBeat + window
    expect(isRhythmTerminal(s, cfg())).toBe(false);
  });

  it('is false mid-sequence with time remaining', () => {
    const def = makeDef();
    let s = initRhythm(def);
    s = stepRhythm(def, s, tap(10)); // one hit, cursor at 1
    s = stepRhythm(def, s, { type: 'TICK', dt: 5 });
    expect(isRhythmTerminal(s, cfg())).toBe(false);
  });

  it('treats a single-beat sequence as terminal only after the one hit', () => {
    const single: RhythmConfig = { beats: [8], window: 2, mantra_id: null };
    const def = makeDef(single);
    expect(isRhythmTerminal(initRhythm(def), single)).toBe(false);
    const done = stepRhythm(def, initRhythm(def), tap(8));
    expect(isRhythmTerminal(done, single)).toBe(true);
  });
});

describe('scoreRhythm', () => {
  it('scores an empty history as 0', () => {
    const def = makeDef();
    expect(scoreRhythm(def, initRhythm(def)).score).toBe(0);
  });

  it('scores a flawless run as 100', () => {
    const def = makeDef();
    let s = initRhythm(def);
    for (const b of [10, 20, 30]) s = stepRhythm(def, s, tap(b));
    expect(scoreRhythm(def, s).score).toBe(100);
  });

  it('is mean(hits) * 100, scaled by each hit accuracy', () => {
    // Two perfect (1) and one half-accuracy hit -> mean 0.8333 -> ~83.33.
    const def = makeDef({ window: 2 }); // beat 0 at 10: tap 11 -> 0.5; beats 1,2 perfect
    let s = initRhythm(def);
    s = stepRhythm(def, s, tap(11)); // accuracy 1 - 1/2 = 0.5
    s = stepRhythm(def, s, tap(20)); // 1
    s = stepRhythm(def, s, tap(30)); // 1
    expect(scoreRhythm(def, s).score).toBeCloseTo(((0.5 + 1 + 1) / 3) * 100, 6);
  });

  it('returns only { score } — no tier/rewards/summary fields', () => {
    const def = makeDef();
    const result = scoreRhythm(def, initRhythm(def));
    expect(Object.keys(result)).toEqual(['score']);
  });

  it('always yields a finite score in [0, 100] (property)', () => {
    const def = makeDef({ window: 10 });
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 40 }), { maxLength: 8 }), (ticks) => {
        let s: RhythmState = initRhythm(def);
        for (const t of ticks) s = stepRhythm(def, s, tap(t));
        const { score } = scoreRhythm(def, s);
        return Number.isFinite(score) && score >= 0 && score <= 100;
      }),
      { numRuns: 200 },
    );
  });
});
