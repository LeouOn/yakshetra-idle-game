import { describe, expect, it } from 'vitest';

import {
  applyEchoesToNextLife,
  assertSeedTouchesNoIdentity,
  mergeKarma,
  summarizeLife,
} from '../echo';
import { createRng } from '../rng';
import type {
  Echo,
  EraId,
  IntentRoot,
  KarmaState,
  LifeId,
  LifeState,
  ResourceId,
  RoleId,
  SocialIdentity,
} from '../types';

// ---------------------------------------------------------------------------
// Branded-string constructors (tests are the trust boundary for fixtures).
// ---------------------------------------------------------------------------

const lifeId = (s: string): LifeId => s as LifeId;
const eraId = (s: string): EraId => s as EraId;
const roleId = (s: string): RoleId => s as RoleId;

const NEUTRAL_IDENTITY: SocialIdentity = {
  gender: 'unspecified',
  social_class: 'unspecified',
  family_wealth_at_birth: 'unspecified',
  caste_status: 'unspecified',
  disability_status: 'unspecified',
};

/** A minimal valid LifeState; tests override the fields they care about. */
function makeLife(
  overrides: Partial<LifeState> & Pick<LifeState, 'intent_root_history'>,
): LifeState {
  const resources: Record<ResourceId, number> = {
    time: 0,
    energy: 0,
    provisions: 0,
    trust: 0,
    skill: 0,
    obligation: 0,
  };
  return {
    identity: NEUTRAL_IDENTITY,
    id: lifeId('life-1'),
    era: eraId('era:test'),
    role: roleId('role:test'),
    age: 0,
    turn: 0,
    resources,
    skills: {},
    relationships: {},
    flags: new Set<string>(),
    chosen_lens: null,
    alive: true,
    last_narrative_sid: null,
    event_weights: {},
    cooldowns: {},
    history: [],
    fired_once_per_run: new Set<string>(),
    pending_events: [],
    schedule_id: null,
    practice_override_id: null,
    ...overrides,
  };
}

const ZERO_ROOTS: Record<IntentRoot, number> = { care: 0, greed: 0, aversion: 0, delusion: 0 };

describe('summarizeLife / mergeKarma / applyEchoesToNextLife', () => {
  it('emits a tendency echo when aversion is >= 60% of intent roots', () => {
    // Given: 10 roots, 6 aversion (60%) + 4 care — no other signals.
    const life = makeLife({
      id: lifeId('life-aversion'),
      intent_root_history: [
        'aversion',
        'aversion',
        'aversion',
        'aversion',
        'aversion',
        'aversion',
        'care',
        'care',
        'care',
        'care',
      ],
    });

    const karma = summarizeLife(life);

    // Then: exactly one tendency echo keyed on aversion, weight = -share.
    const tendency = karma.echoes.find((e) => e.type === 'tendency');
    expect(tendency).toBeDefined();
    expect(tendency?.key).toBe('aversion');
    expect(tendency?.weight).toBeCloseTo(-0.6, 10);
    expect(tendency?.source_life_id).toBe('life-aversion');

    // And: the intent-root tally is aggregated.
    expect(karma.accumulated_intent_roots).toEqual({
      ...ZERO_ROOTS,
      aversion: 6,
      care: 4,
    });
    expect(karma.vows).toEqual({});
  });

  it('emits a vow echo from a declared-then-broken vow flag', () => {
    // Given: a single broken-vow flag (declared implicitly, then broken).
    const life = makeLife({
      id: lifeId('life-vow'),
      intent_root_history: ['care', 'care', 'care', 'care'],
      flags: new Set<string>(['vow:silence:broken']),
    });

    const karma = summarizeLife(life);

    // Then: one vow echo for silence, broken, with a negative weight.
    const vow = karma.echoes.find((e) => e.type === 'vow');
    expect(vow).toBeDefined();
    expect(vow?.key).toBe('silence');
    expect(vow?.weight).toBe(-0.6);
    expect(karma.vows).toEqual({ silence: 'broken' });
  });

  it('emits an unresolved_attachment echo from an open attachment:daughter flag', () => {
    // Given: an attachment flag that was never cleared.
    const life = makeLife({
      id: lifeId('life-attach'),
      intent_root_history: ['care', 'care'],
      flags: new Set<string>(['attachment:daughter']),
    });

    const karma = summarizeLife(life);

    const attachment = karma.echoes.find((e) => e.type === 'unresolved_attachment');
    expect(attachment).toBeDefined();
    expect(attachment?.key).toBe('daughter');
    expect(attachment?.weight).toBe(-0.4);

    // Sanity: a cleared attachment produces no echo.
    const cleared = summarizeLife(
      makeLife({
        flags: new Set<string>(['attachment:daughter', 'attachment:daughter:cleared']),
        intent_root_history: ['care'],
      }),
    );
    expect(cleared.echoes.find((e) => e.type === 'unresolved_attachment')).toBeUndefined();
  });

  it('emits a pattern_break echo from sustained care after prior aversion', () => {
    // Given: aversion early, then a run of 5 care turns (>= 5).
    const life = makeLife({
      id: lifeId('life-pattern'),
      intent_root_history: ['aversion', 'aversion', 'care', 'care', 'care', 'care', 'care'],
    });

    const karma = summarizeLife(life);

    const patternBreak = karma.echoes.find((e) => e.type === 'pattern_break');
    expect(patternBreak).toBeDefined();
    expect(patternBreak?.key).toBe('care_after_aversion');
    expect(patternBreak?.weight).toBe(0.5);

    // Sanity: 5 care turns WITHOUT prior aversion is not a pattern break.
    const noPriorAversion = summarizeLife(
      makeLife({ intent_root_history: ['care', 'care', 'care', 'care', 'care'] }),
    );
    expect(noPriorAversion.echoes.find((e) => e.type === 'pattern_break')).toBeUndefined();
  });

  it('mergeKarma concatenates echoes and caps the result at 6 (weakest pruned)', () => {
    // Given: prev holds 4 echoes (|weight| 0.9, 0.8, 0.3, 0.2),
    // lifeSummary holds 4 echoes (|weight| 0.7, 0.6, 0.5, 0.1).
    const mkEcho = (key: string, weight: number): Echo => ({
      type: 'vow',
      key,
      weight,
      source_life_id: lifeId('life-x'),
      narrative_sid: `echo:vow:${key}`,
    });
    const prev: KarmaState = {
      echoes: [mkEcho('a', 0.9), mkEcho('b', 0.8), mkEcho('c', 0.3), mkEcho('d', 0.2)],
      accumulated_intent_roots: { ...ZERO_ROOTS, care: 10, aversion: 2 },
      vows: { silence: 'declared' },
    };
    const lifeSummary: KarmaState = {
      echoes: [mkEcho('e', 0.7), mkEcho('f', 0.6), mkEcho('g', 0.5), mkEcho('h', 0.1)],
      accumulated_intent_roots: { ...ZERO_ROOTS, care: 5, greed: 1 },
      vows: { silence: 'broken' },
    };

    const merged = mergeKarma(prev, lifeSummary);

    // Then: exactly 6 echoes; the two weakest (0.1, 0.2) are pruned.
    expect(merged.echoes).toHaveLength(6);
    const keys = merged.echoes.map((e) => e.key).sort();
    expect(keys).toEqual(['a', 'b', 'c', 'e', 'f', 'g']);

    // And: intent-root counts are summed across the two states.
    expect(merged.accumulated_intent_roots).toEqual({
      ...ZERO_ROOTS,
      care: 15,
      aversion: 2,
      greed: 1,
    });
    // And: the life summary's vow state overrides the chain's.
    expect(merged.vows).toEqual({ silence: 'broken' });
  });

  it('applyEchoesToNextLife produces no identity field and the assertion fires when poisoned', () => {
    const rng = createRng(1n);
    const karma: KarmaState = {
      echoes: [
        {
          type: 'tendency',
          key: 'aversion',
          weight: -0.6,
          source_life_id: lifeId('life-prev'),
          narrative_sid: 'echo:tendency:aversion',
        },
      ],
      accumulated_intent_roots: { ...ZERO_ROOTS, aversion: 6, care: 4 },
      vows: {},
    };

    const seed = applyEchoesToNextLife(karma, eraId('era:next'), rng);

    // Given the happy path: no identity field, the assertion passes, and the
    // aversion tendency projects a time penalty plus a narrative beat.
    expect(Object.prototype.hasOwnProperty.call(seed, 'social_identity')).toBe(false);
    expect(() => assertSeedTouchesNoIdentity(seed)).not.toThrow();
    expect(seed.starting_resources_modifier.time).toBe(-5);
    expect(seed.narrative_seed_events.length).toBeGreaterThan(0);

    // When a forbidden field is injected into the seed shape: the assertion
    // throws immediately.
    const poisoned = { ...seed, social_identity: { x: 'leaked' } } as unknown as typeof seed;
    expect(() => assertSeedTouchesNoIdentity(poisoned)).toThrow(/social identity/);
  });
});
