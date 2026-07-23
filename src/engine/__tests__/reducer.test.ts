import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';

import {
  advanceTurn,
  applyChoice,
  applyEffect,
  applyEvent,
  createLifeState,
  createRng,
  evaluatePredicate,
} from '../';
import type {
  Choice,
  EffectOp,
  EraRules,
  Event,
  LifeState,
  Predicate,
  ResourceId,
  SocialIdentity,
} from '../';

const SEED = 0x12345678_9abcdef0_deadbeef_cafebaben;

const IDENTITY: SocialIdentity = {
  gender: 'woman',
  social_class: 'merchant',
  family_wealth_at_birth: 'modest',
  caste_status: 'common',
  disability_status: 'none',
};

function makeLife(overrides: Partial<LifeState> = {}): LifeState {
  const base = createLifeState({
    id: 'life-1' as LifeState['id'],
    era: 'era-test@0.1.0' as LifeState['era'],
    role: 'role-test' as LifeState['role'],
    identity: IDENTITY,
  });
  return { ...base, ...overrides, identity: IDENTITY };
}

function choice(
  id: string,
  effects: readonly EffectOp[],
  requires: readonly Predicate[] = [],
  forbidden = false,
): Choice {
  return { id, label_sid: `${id}_sid`, requires: [...requires], effects: [...effects], forbidden };
}

/* ---------------------------------------------------------------------------------------------- *
 * (a) round-trip on a trivial choice sequence — deterministic given a fixed seed
 * ---------------------------------------------------------------------------------------------- */

function buildSequence(): {
  choices: Choice[];
  event: Event;
} {
  const choices: Choice[] = [
    choice('c1', [
      { op: 'add_resource', key: 'energy', delta: 5 },
      { op: 'set_intent_root', intent_root: 'care' },
    ]),
    choice('c2', [{ op: 'add_skill', key: 'weaving' }]),
    choice('c3', [{ op: 'add_flag', key: 'vow:honesty' }]),
    choice('c4', [{ op: 'add_relationship', target: 'aunt', delta: 2 }]),
    choice('c5', [{ op: 'narrative_card', card_sid: 'card_dawn_sid' }]),
    choice('c6', [{ op: 'add_resource', key: 'provisions', delta: -3 }]),
    choice('c7', [{ op: 'set_intent_root', intent_root: 'care' }]),
    choice('c8', [{ op: 'modify_event_weight', event_id: 'e_market', multiplier: 1.5 }]),
    choice('c9', [{ op: 'trigger_event', event_id: 'e_festival' }]),
    choice('c10', [{ op: 'remove_flag', key: 'vow:honesty' }]),
  ];
  const event: Event = {
    id: 'e_intro',
    weight: 1,
    cooldown_turns: 2,
    once_per_run: false,
    choices: [choice('e_intro_default', [{ op: 'add_resource', key: 'trust', delta: 1 }])],
    content_warnings: [],
  };
  return { choices, event };
}

function runSequence(life: LifeState): LifeState {
  const rng = createRng(SEED);
  const { choices, event } = buildSequence();
  let s = life;
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    if (c === undefined) throw new Error('missing choice');
    s = applyChoice(s, c, rng);
    s = applyEvent(s, event, rng);
    s = advanceTurn(s, rng);
  }
  return s;
}

describe('reducer round-trip (group a)', () => {
  it('produces identical state across two runs from the same seed', () => {
    const runA = runSequence(makeLife());
    const runB = runSequence(makeLife());
    expect(runA).toEqual(runB);
  });

  it('records all ten player choices to history and advances the turn each step', () => {
    const final = runSequence(makeLife());
    const choiceIds = buildSequence().choices.map((c) => c.id);
    for (const id of choiceIds) {
      expect(final.history).toContain(id);
    }
    expect(final.turn).toBe(10);
  });

  it('does not mutate the input life (purity)', () => {
    const original = makeLife();
    const snapshot = structuredCloneSnapshot(original);
    runSequence(original);
    expect(original.history).toEqual(snapshot.history);
    expect(original.turn).toBe(snapshot.turn);
    expect(original.resources.time).toBe(snapshot.resources.time);
    expect([...original.flags]).toEqual([...snapshot.flags]);
  });
});

/* ---------------------------------------------------------------------------------------------- *
 * (b) predicate evaluation — every Predicate variant
 * ---------------------------------------------------------------------------------------------- */

describe('evaluatePredicate (group b)', () => {
  const life = makeLife({
    resources: { time: 50, energy: 5, provisions: 10, trust: 7, skill: 0, obligation: 0 },
    skills: { weaving: 3 },
    flags: new Set(['vow:honesty']),
    intent_root_history: ['care', 'care', 'greed'],
    chosen_lens: 'generosity',
  });

  it('gte / lte / gt / lt compare a numeric resource or skill', () => {
    expect(evaluatePredicate(life, { op: 'gte', key: 'energy', value: 5 })).toBe(true);
    expect(evaluatePredicate(life, { op: 'gte', key: 'energy', value: 6 })).toBe(false);
    expect(evaluatePredicate(life, { op: 'lte', key: 'weaving', value: 3 })).toBe(true);
    expect(evaluatePredicate(life, { op: 'gt', key: 'weaving', value: 3 })).toBe(false);
    expect(evaluatePredicate(life, { op: 'lt', key: 'time', value: 50 })).toBe(false);
  });

  it('eq matches string or number values', () => {
    expect(evaluatePredicate(life, { op: 'eq', key: 'chosen_lens', value: 'generosity' })).toBe(
      true,
    );
    expect(evaluatePredicate(life, { op: 'eq', key: 'energy', value: 5 })).toBe(true);
    expect(evaluatePredicate(life, { op: 'eq', key: 'energy', value: 6 })).toBe(false);
  });

  it('in tests membership in a string list', () => {
    expect(
      evaluatePredicate(life, { op: 'in', key: 'chosen_lens', values: ['generosity', 'care'] }),
    ).toBe(true);
    expect(evaluatePredicate(life, { op: 'in', key: 'chosen_lens', values: ['care'] })).toBe(false);
  });

  it('and / or / not compose recursively', () => {
    expect(
      evaluatePredicate(life, {
        op: 'and',
        operands: [
          { op: 'gte', key: 'energy', value: 5 },
          { op: 'has_flag', key: 'vow:honesty' },
        ],
      }),
    ).toBe(true);
    expect(
      evaluatePredicate(life, {
        op: 'or',
        operands: [
          { op: 'gte', key: 'energy', value: 99 },
          { op: 'has_flag', key: 'vow:honesty' },
        ],
      }),
    ).toBe(true);
    expect(
      evaluatePredicate(life, { op: 'not', operand: { op: 'has_flag', key: 'vow:other' } }),
    ).toBe(true);
  });

  it('has_flag / has_skill / has_resource test presence', () => {
    expect(evaluatePredicate(life, { op: 'has_flag', key: 'vow:honesty' })).toBe(true);
    expect(evaluatePredicate(life, { op: 'has_flag', key: 'vow:other' })).toBe(false);
    expect(evaluatePredicate(life, { op: 'has_skill', key: 'weaving' })).toBe(true);
    expect(evaluatePredicate(life, { op: 'has_skill', key: 'farming' })).toBe(false);
    expect(evaluatePredicate(life, { op: 'has_resource', key: 'time' })).toBe(true);
    expect(evaluatePredicate(life, { op: 'has_resource', key: 'alms' })).toBe(false);
  });

  it('intent_root_gte compares the dominant intent-root share', () => {
    // history is [care, care, greed] -> dominant share 2/3 ~ 0.667
    expect(evaluatePredicate(life, { op: 'intent_root_gte', value: 0.5 })).toBe(true);
    expect(evaluatePredicate(life, { op: 'intent_root_gte', value: 0.7 })).toBe(false);
  });
});

/* ---------------------------------------------------------------------------------------------- *
 * (c) effect application — every EffectOp variant
 * ---------------------------------------------------------------------------------------------- */

describe('applyEffect (group c)', () => {
  const rng = createRng(SEED);

  it('add_resource updates and clamps at 0', () => {
    const s = applyEffect(makeLife(), { op: 'add_resource', key: 'energy', delta: 12 }, rng);
    expect(s.resources.energy).toBe(112);
    expect(s.resources).not.toBe(makeLife().resources);
  });

  it('add_skill grants/increments a skill', () => {
    const s = applyEffect(makeLife(), { op: 'add_skill', key: 'weaving' }, rng);
    expect(s.skills.weaving).toBe(1);
  });

  it('add_flag and remove_flag toggle membership immutably', () => {
    const added = applyEffect(makeLife(), { op: 'add_flag', key: 'vow:honesty' }, rng);
    expect(added.flags.has('vow:honesty')).toBe(true);
    const removed = applyEffect(added, { op: 'remove_flag', key: 'vow:honesty' }, rng);
    expect(removed.flags.has('vow:honesty')).toBe(false);
    expect(added.flags.has('vow:honesty')).toBe(true);
  });

  it('add_relationship initializes and adjusts trust', () => {
    const s = applyEffect(makeLife(), { op: 'add_relationship', target: 'aunt', delta: 4 }, rng);
    expect(s.relationships.aunt).toEqual({ trust: 4, debt: 0, affection: 0 });
  });

  it('modify_event_weight multiplies the baseline (default 1)', () => {
    const s = applyEffect(
      makeLife(),
      { op: 'modify_event_weight', event_id: 'e_market', multiplier: 1.5 },
      rng,
    );
    expect(s.event_weights.e_market).toBe(1.5);
  });

  it('trigger_event queues an event id', () => {
    const s = applyEffect(makeLife(), { op: 'trigger_event', event_id: 'e_festival' }, rng);
    expect(s.pending_events).toEqual(['e_festival']);
  });

  it('set_intent_root appends to history', () => {
    const s = applyEffect(makeLife(), { op: 'set_intent_root', intent_root: 'care' }, rng);
    expect(s.intent_root_history).toEqual(['care']);
  });

  it('narrative_card records the last shown card sid', () => {
    const s = applyEffect(makeLife(), { op: 'narrative_card', card_sid: 'card_dawn_sid' }, rng);
    expect(s.last_narrative_sid).toBe('card_dawn_sid');
  });

  it('never mutates the input state (returns a fresh object)', () => {
    const original = makeLife();
    applyEffect(original, { op: 'add_resource', key: 'energy', delta: 1 }, rng);
    expect(original.resources.energy).toBe(100);
    expect(original.history).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- *
 * (d) advanceTurn decrements the time resource by 1 per turn
 * ---------------------------------------------------------------------------------------------- */

describe('advanceTurn time decrement (group d)', () => {
  it('reduces time by exactly 1 each turn over 5 turns', () => {
    const rng = createRng(SEED);
    let s = makeLife({
      resources: { time: 30, energy: 100, provisions: 50, trust: 10, skill: 0, obligation: 0 },
    });
    for (let i = 0; i < 5; i++) s = advanceTurn(s, rng);
    expect(s.resources.time).toBe(25);
    expect(s.turn).toBe(5);
  });

  it('ticks cooldowns down by 1 each turn', () => {
    const rng = createRng(SEED);
    let s = makeLife({ cooldowns: { e_intro: 2 } });
    s = advanceTurn(s, rng);
    expect(s.cooldowns.e_intro).toBe(1);
    s = advanceTurn(s, rng);
    expect(s.cooldowns.e_intro).toBe(0);
    s = advanceTurn(s, rng);
    expect(s.cooldowns.e_intro).toBe(0);
  });

  it('invokes the era advancePerTurn hook and merges resources without clobbering the time tick', () => {
    const rng = createRng(SEED);
    const eraRules: EraRules = {
      advancePerTurn: (state) => ({ age: state.age + 1, resources: { trust: 99 } }),
    };
    const s = advanceTurn(
      makeLife({
        resources: { time: 10, energy: 100, provisions: 50, trust: 5, skill: 0, obligation: 0 },
      }),
      rng,
      eraRules,
    );
    expect(s.resources.time).toBe(9);
    expect(s.resources.trust).toBe(99);
    expect(s.age).toBe(1);
  });

  it('never lets the era hook mutate identity', () => {
    const rng = createRng(SEED);
    const eraRules: EraRules = {
      advancePerTurn: () => ({ identity: { ...IDENTITY, gender: 'man' } }),
    };
    const s = advanceTurn(makeLife(), rng, eraRules);
    expect(s.identity).toEqual(IDENTITY);
  });
});

/* ---------------------------------------------------------------------------------------------- *
 * (e) resources cannot go below 0 (clamp at 0)
 * ---------------------------------------------------------------------------------------------- */

describe('resource clamp at 0 (group e)', () => {
  it('clamps a single large negative delta', () => {
    const s = applyEffect(
      makeLife(),
      { op: 'add_resource', key: 'energy', delta: -1000 },
      createRng(SEED),
    );
    expect(s.resources.energy).toBe(0);
  });

  it('clamps via repeated small negatives', () => {
    const rng = createRng(SEED);
    let s = makeLife({
      resources: { time: 3, energy: 100, provisions: 50, trust: 10, skill: 0, obligation: 0 },
    });
    for (let i = 0; i < 10; i++) {
      s = applyEffect(s, { op: 'add_resource', key: 'time', delta: -1 }, rng);
    }
    expect(s.resources.time).toBe(0);
  });

  it('property: add_resource never produces a negative resource value', () => {
    const resourceKeys: ResourceId[] = [
      'time',
      'energy',
      'provisions',
      'trust',
      'skill',
      'obligation',
    ];
    fc.assert(
      fc.property(
        fc.constantFrom(...resourceKeys),
        fc.integer({ min: -10000, max: 10000 }),
        (key, delta) => {
          const s = applyEffect(makeLife(), { op: 'add_resource', key, delta }, createRng(SEED));
          const value = s.resources[key] ?? 0;
          expect(value).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});

/* ---------------------------------------------------------------------------------------------- *
 * helpers
 * ---------------------------------------------------------------------------------------------- */

/** Plain structural snapshot (Sets -> arrays) for purity comparison. */
function structuredCloneSnapshot(life: LifeState): {
  history: string[];
  turn: number;
  resources: { time: number };
  flags: Set<string>;
} {
  return {
    history: [...life.history],
    turn: life.turn,
    resources: { time: life.resources.time ?? 0 },
    flags: new Set(life.flags),
  };
}
