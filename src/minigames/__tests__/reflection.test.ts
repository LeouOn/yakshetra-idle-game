// TDD tests for the pure karma-reflection minigame engine (`../reflection`).
//
// The reflection minigame is a deterministic choice-tree: from a root node the
// player picks an option, collects that option's insight, and either advances
// to the option's `next` node or terminates (`next === null`). Every case below
// is an exact assertion against the documented behaviour — no clocks, no RNG,
// no mocks — mirroring the purity fence the rest of the `@yakshetra/minigames`
// package uses. A pair of fast-check properties guards the score range and the
// purity (same inputs ⇒ same output, input never mutated).

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import type { MinigameDef } from '@/content/minigame-schema';

import {
  initReflection,
  isReflectionTerminal,
  scoreReflection,
  stepReflection,
} from '../reflection';
import type { ReflectionState } from '../types';

/* -------------------------------------------------------------------------------------------------
 * Fixture: a tiny two-node reflection tree
 *   n_root ──go_deeper──▶ n_mid ──finish──▶ (terminal)
 *          └──stop_early──▶ (terminal)
 *   total options across the whole tree = 2 + 1 = 3  (the score denominator)
 * -----------------------------------------------------------------------------------------------*/

const makeDef = (): MinigameDef & { type: 'reflection' } => ({
  id: 'mg_reflect',
  type: 'reflection',
  label_sid: 'mg.reflection.label',
  description_sid: 'mg.reflection.desc',
  lens: 'discernment',
  config: {
    root_node: 'n_root',
    nodes: [
      {
        id: 'n_root',
        prompt_sid: 'mg.reflection.n_root.prompt',
        options: [
          {
            id: 'go_deeper',
            label_sid: 'mg.reflection.go_deeper',
            intent_root: 'care',
            insight_sid: 'ins_root_deeper',
            next: 'n_mid',
          },
          {
            id: 'stop_early',
            label_sid: 'mg.reflection.stop_early',
            intent_root: 'delusion',
            insight_sid: 'ins_root_stop',
            next: null,
          },
        ],
      },
      {
        id: 'n_mid',
        prompt_sid: 'mg.reflection.n_mid.prompt',
        options: [
          {
            id: 'finish',
            label_sid: 'mg.reflection.finish',
            intent_root: 'care',
            insight_sid: 'ins_mid_finish',
            next: null,
          },
        ],
      },
    ],
  },
  rewardTiers: [{ minScore: 0, rewards: [], summary_sid: 'mg.reflection.summary' }],
});

describe('initReflection', () => {
  it('seeds a fresh playing session rooted at config.root_node with an empty insight/path ledger', () => {
    const def = makeDef();
    expect(initReflection(def)).toEqual({
      id: 'mg_reflect',
      type: 'reflection',
      phase: 'playing',
      tick: 0,
      currentNodeId: 'n_root',
      insightsCollected: [],
      path: ['n_root'],
    });
  });

  it('echoes the definition id and uses only the root_node (not the first node entry) as the cursor', () => {
    const def = makeDef();
    def.id = 'mg_other';
    def.config.root_node = 'n_mid';
    const s = initReflection(def);
    expect(s.id).toBe('mg_other');
    expect(s.currentNodeId).toBe('n_mid');
    expect(s.path).toEqual(['n_mid']);
  });
});

describe('stepReflection — CHOOSE', () => {
  it('advances to a non-terminal option’s next node and records its insight + the chosen option id', () => {
    const def = makeDef();
    const s0 = initReflection(def);
    const s1 = stepReflection(def, s0, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'go_deeper' });

    expect(s1.phase).toBe('playing');
    expect(s1.currentNodeId).toBe('n_mid');
    expect(s1.insightsCollected).toEqual(['ins_root_deeper']);
    // path is the root node followed by the sequence of chosen option ids.
    expect(s1.path).toEqual(['n_root', 'go_deeper']);
  });

  it('resolves the session when the chosen option is terminal (next === null)', () => {
    const def = makeDef();
    const s0 = initReflection(def);
    const s1 = stepReflection(def, s0, {
      type: 'CHOOSE',
      nodeId: 'n_root',
      optionId: 'stop_early',
    });

    expect(s1.phase).toBe('resolved');
    expect(s1.insightsCollected).toEqual(['ins_root_stop']);
    expect(s1.path).toEqual(['n_root', 'stop_early']);
    // currentNodeId is left untouched — there is no next node to move to.
    expect(s1.currentNodeId).toBe('n_root');
  });

  it('walks a multi-hop path root → mid → terminal, accumulating insights and option ids in order', () => {
    const def = makeDef();
    let s = initReflection(def);
    s = stepReflection(def, s, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'go_deeper' });
    s = stepReflection(def, s, { type: 'CHOOSE', nodeId: 'n_mid', optionId: 'finish' });

    expect(s.phase).toBe('resolved');
    expect(s.currentNodeId).toBe('n_mid');
    expect(s.insightsCollected).toEqual(['ins_root_deeper', 'ins_mid_finish']);
    expect(s.path).toEqual(['n_root', 'go_deeper', 'finish']);
  });

  it('returns the identical state object when the nodeId is unknown (no node found)', () => {
    const def = makeDef();
    const s0 = initReflection(def);
    const s1 = stepReflection(def, s0, {
      type: 'CHOOSE',
      nodeId: 'does_not_exist',
      optionId: 'go_deeper',
    });
    expect(s1).toBe(s0);
  });

  it('returns the identical state object when the optionId is unknown for the node', () => {
    const def = makeDef();
    const s0 = initReflection(def);
    const s1 = stepReflection(def, s0, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'nope' });
    expect(s1).toBe(s0);
  });

  it('resolves the choice against input.nodeId, not state.currentNodeId (caller controls the cursor)', () => {
    // After advancing to n_mid, choosing a n_root option still resolves against
    // n_root — the engine trusts the caller to send the node it means to act on.
    const def = makeDef();
    let s = initReflection(def);
    s = stepReflection(def, s, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'go_deeper' });
    expect(s.currentNodeId).toBe('n_mid');
    s = stepReflection(def, s, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'stop_early' });
    expect(s.phase).toBe('resolved');
    expect(s.insightsCollected).toEqual(['ins_root_deeper', 'ins_root_stop']);
  });

  it('does not mutate the input state (returns a fresh object with fresh arrays)', () => {
    const def = makeDef();
    const s0 = initReflection(def);
    const frozenInsights = [...s0.insightsCollected];
    const frozenPath = [...s0.path];

    stepReflection(def, s0, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'go_deeper' });

    expect(s0.insightsCollected).toEqual(frozenInsights);
    expect(s0.path).toEqual(frozenPath);
    expect(s0.phase).toBe('playing');
  });
});

describe('stepReflection — TICK', () => {
  it('advances the virtual clock by dt and leaves everything else unchanged', () => {
    const def = makeDef();
    const s0 = initReflection(def);
    const s1 = stepReflection(def, s0, { type: 'TICK', dt: 16 });

    expect(s1.tick).toBe(16);
    expect(s1.phase).toBe('playing');
    expect(s1.currentNodeId).toBe('n_root');
    expect(s1.insightsCollected).toEqual([]);
  });

  it('accumulates dt across successive ticks', () => {
    const def = makeDef();
    let s = initReflection(def);
    s = stepReflection(def, s, { type: 'TICK', dt: 16 });
    s = stepReflection(def, s, { type: 'TICK', dt: 9 });
    expect(s.tick).toBe(25);
  });
});

describe('stepReflection — ABORT', () => {
  it('transitions to the aborted phase, preserving the rest of the state', () => {
    const def = makeDef();
    const s0 = initReflection(def);
    const s1 = stepReflection(def, s0, { type: 'ABORT' });

    expect(s1.phase).toBe('aborted');
    expect(s1.currentNodeId).toBe('n_root');
    expect(s1.insightsCollected).toEqual([]);
    expect(s1.path).toEqual(['n_root']);
  });
});

describe('stepReflection — terminal guard', () => {
  it('is a no-op (identity) for every input once the session is resolved', () => {
    const def = makeDef();
    let resolved = initReflection(def);
    resolved = stepReflection(def, resolved, {
      type: 'CHOOSE',
      nodeId: 'n_root',
      optionId: 'stop_early',
    });
    expect(resolved.phase).toBe('resolved');

    expect(
      stepReflection(def, resolved, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'go_deeper' }),
    ).toBe(resolved);
    expect(stepReflection(def, resolved, { type: 'TICK', dt: 99 })).toBe(resolved);
    expect(stepReflection(def, resolved, { type: 'ABORT' })).toBe(resolved);
  });

  it('is a no-op (identity) for every input once the session is aborted', () => {
    const def = makeDef();
    let aborted = initReflection(def);
    aborted = stepReflection(def, aborted, { type: 'ABORT' });
    expect(aborted.phase).toBe('aborted');

    expect(
      stepReflection(def, aborted, { type: 'CHOOSE', nodeId: 'n_root', optionId: 'go_deeper' }),
    ).toBe(aborted);
    expect(stepReflection(def, aborted, { type: 'TICK', dt: 7 })).toBe(aborted);
  });
});

describe('isReflectionTerminal', () => {
  const def = makeDef();

  it('is false while playing', () => {
    expect(isReflectionTerminal(initReflection(def))).toBe(false);
  });

  it('is false in the intro phase', () => {
    const intro: ReflectionState = { ...initReflection(def), phase: 'intro' };
    expect(isReflectionTerminal(intro)).toBe(false);
  });

  it('is true once resolved', () => {
    const resolved = stepReflection(def, initReflection(def), {
      type: 'CHOOSE',
      nodeId: 'n_root',
      optionId: 'stop_early',
    });
    expect(isReflectionTerminal(resolved)).toBe(true);
  });

  it('is true once aborted', () => {
    const aborted = stepReflection(def, initReflection(def), { type: 'ABORT' });
    expect(isReflectionTerminal(aborted)).toBe(true);
  });
});

describe('scoreReflection', () => {
  const def = makeDef();
  // total options across both nodes = 3 → the score denominator.

  it('returns only { score } (no tierIndex / rewards / summary_sid)', () => {
    const result = scoreReflection(def, initReflection(def));
    expect(result).toEqual({ score: 0 });
    expect(Object.keys(result).sort()).toEqual(['score']);
  });

  it('scores 0 when no insights have been collected', () => {
    expect(scoreReflection(def, initReflection(def)).score).toBe(0);
  });

  it('scores insightsCollected.length / totalOptions * 100', () => {
    const one = stepReflection(def, initReflection(def), {
      type: 'CHOOSE',
      nodeId: 'n_root',
      optionId: 'go_deeper',
    });
    expect(scoreReflection(def, one).score).toBeCloseTo((1 / 3) * 100, 10);

    let two = one;
    two = stepReflection(def, two, { type: 'CHOOSE', nodeId: 'n_mid', optionId: 'finish' });
    expect(scoreReflection(def, two).score).toBeCloseTo((2 / 3) * 100, 10);
  });

  it('counts the denominator over ALL options in the tree, not just the chosen path', () => {
    // stop_early collects 1 insight yet only reaches 1/3 — the untouched
    // go_deeper + finish options still count against the total.
    const stopped = stepReflection(def, initReflection(def), {
      type: 'CHOOSE',
      nodeId: 'n_root',
      optionId: 'stop_early',
    });
    expect(scoreReflection(def, stopped).score).toBeCloseTo((1 / 3) * 100, 10);
  });

  it('clamps the score into [0, 100] even if more insights were recorded than the tree holds', () => {
    // Fabricate an over-collected state (caller bug / replay) — score must not
    // exceed 100 and must not go negative.
    const over: ReflectionState = {
      ...initReflection(def),
      insightsCollected: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
    };
    expect(scoreReflection(def, over).score).toBe(100);

    const none: ReflectionState = { ...initReflection(def), insightsCollected: [] };
    expect(scoreReflection(def, none).score).toBe(0);
  });

  it('always yields a finite score in [0, 100] (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 25 }), (collected) => {
        const state: ReflectionState = {
          ...initReflection(def),
          insightsCollected: Array.from({ length: collected }, (_, i) => `ins_${i}`),
        };
        const { score } = scoreReflection(def, state);
        return Number.isFinite(score) && score >= 0 && score <= 100;
      }),
      { numRuns: 200 },
    );
  });
});

describe('stepReflection — determinism (purity property)', () => {
  const def = makeDef();

  it('identical inputs always yield identical output, and the input is never mutated (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 8 }), (seed) => {
        const base = initReflection(def);
        // Apply a deterministic prefix of ticks seeded by the arbitrary so the
        // starting state varies across runs without involving any RNG.
        let s = base;
        for (let i = 0; i < seed; i++) s = stepReflection(def, s, { type: 'TICK', dt: 1 });
        const snapshot = JSON.stringify(s);

        const a = stepReflection(def, s, {
          type: 'CHOOSE',
          nodeId: 'n_root',
          optionId: 'go_deeper',
        });
        const b = stepReflection(def, s, {
          type: 'CHOOSE',
          nodeId: 'n_root',
          optionId: 'go_deeper',
        });

        return JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(s) === snapshot;
      }),
      { numRuns: 100 },
    );
  });
});
