// Property test: cross-platform byte-identical state determinism (plan todo 9).
//
// The load-bearing claim this test enforces: given the same RNG seed and the
// same fixed event/choice sequence, the engine MUST converge to a state whose
// canonical JSON encoding — and therefore its SHA-256 — is bit-for-bit
// identical on every run. Any drift (a `Date.now()` sneaking into `advanceTurn`,
// a `Math.random()` in an effect, key-order dependence in a serializer) makes
// the digest move and fails the property.
//
// Four layers:
//   (1) `canonicalStringify` unit cases prove the serializer is order- and
//       container-independent (key sort, Set sort, Map→object, BigInt encoding,
//       undefined dropped).
//   (2) A literal "100 reruns of one seed → one digest" test, matching the
//       plan's acceptance criterion word-for-word.
//   (3) A fast-check sweep over 100 random non-zero bigint seeds, asserting
//       hash(seed) is stable across two independent runs each.
//   (4) A golden-fixture replay against `chain_hash_v1.txt`: any engine logic
//       change that moves the digest MUST update the fixture and the change
//       must be reviewed. A non-vacuous probe proves the fixture check would
//       actually catch a change.

import * as fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  advanceTurn,
  applyChoice,
  applyEchoesToNextLife,
  applyEvent,
  canonicalStringify,
  createLifeState,
  createRng,
  emptyKarma,
  mergeKarma,
  sha256,
  summarizeLife,
} from '../';
import type {
  Choice,
  EffectOp,
  EraId,
  Event,
  KarmaState,
  LifeId,
  LifeState,
  NextLifeSeed,
  RoleId,
  SocialIdentity,
} from '../';

// ---------------------------------------------------------------------------
// Fixed scenario inputs
// ---------------------------------------------------------------------------

const SCENARIO_IDENTITY: SocialIdentity = {
  gender: 'woman',
  social_class: 'merchant',
  family_wealth_at_birth: 'modest',
  caste_status: 'common',
  disability_status: 'none',
};

const SCENARIO_ERA = 'era-test@0.1.0' as EraId;
const SCENARIO_ROLE = 'role:wanderer' as RoleId;
const SCENARIO_LIFE_ID = 'life:det-1' as LifeId;

function choice(id: string, effects: readonly EffectOp[], forbidden = false): Choice {
  return {
    id,
    label_sid: `${id}_sid`,
    requires: [],
    effects: [...effects],
    forbidden,
  };
}

/**
 * Ten fixed player choices exercising every EffectOp path the engine models:
 * resources, skills, flags (add/remove), relationships, event-weight mul,
 * triggered pending events, intent roots, and narrative cards. Order is fixed
 * so the replay is identical run-to-run.
 */
const SCENARIO_CHOICES: readonly Choice[] = [
  choice('c:practice', [
    { op: 'add_resource', key: 'energy', delta: 3 },
    { op: 'add_skill', key: 'meditation' },
    { op: 'set_intent_root', intent_root: 'care' },
  ]),
  choice('c:alms', [
    { op: 'add_resource', key: 'provisions', delta: -2 },
    { op: 'set_intent_root', intent_root: 'care' },
  ]),
  choice('c:rest', [{ op: 'add_resource', key: 'energy', delta: 5 }]),
  choice('c:vow', [{ op: 'add_flag', key: 'vow:honesty' }]),
  choice('c:break_vow', [{ op: 'remove_flag', key: 'vow:honesty' }]),
  choice('c:kinsman', [{ op: 'add_relationship', target: 'aunt', delta: 2 }]),
  choice('c:market', [{ op: 'modify_event_weight', event_id: 'e:gossip', multiplier: 1.5 }]),
  choice('c:festival', [{ op: 'trigger_event', event_id: 'e:gossip' }]),
  choice('c:reflect', [{ op: 'narrative_card', card_sid: 'card_dawn_sid' }]),
  choice('c:anger', [
    { op: 'add_resource', key: 'time', delta: -1 },
    { op: 'set_intent_root', intent_root: 'aversion' },
  ]),
];

const SCENARIO_EVENT: Event = {
  id: 'e:gossip',
  weight: 1,
  cooldown_turns: 2,
  once_per_run: false,
  choices: [
    choice('e:gossip:listen', [{ op: 'set_intent_root', intent_root: 'delusion' }]),
    choice('e:gossip:leave', [{ op: 'add_resource', key: 'trust', delta: 1 }]),
  ],
  content_warnings: [],
};

// ---------------------------------------------------------------------------
// The deterministic scenario itself
// ---------------------------------------------------------------------------

interface ScenarioSnapshot {
  life: LifeState;
  karma: KarmaState;
  nextSeed: NextLifeSeed;
}

/**
 * Run the fixed 50-turn scenario for `seed` and return the final life state
 * plus the cross-life karma projection. Pure and fully determined by `seed`:
 * the RNG is created fresh from the seed, and every choice/event/turn consumes
 * the same stream in the same order. No `Date`, no `Math.random`.
 */
function runDeterminismScenario(seed: bigint, turns = 50): ScenarioSnapshot {
  const rng = createRng(seed);
  const life = createLifeState({
    id: SCENARIO_LIFE_ID,
    era: SCENARIO_ERA,
    role: SCENARIO_ROLE,
    identity: SCENARIO_IDENTITY,
  });

  let s = life;
  for (let i = 0; i < turns; i++) {
    const c = SCENARIO_CHOICES[i % SCENARIO_CHOICES.length];
    if (c === undefined) throw new Error('scenario choice missing');
    s = applyChoice(s, c, rng);
    s = applyEvent(s, SCENARIO_EVENT, rng);
    s = advanceTurn(s, rng);
  }

  const lifeSummary = summarizeLife(s);
  const karma = mergeKarma(emptyKarma(), lifeSummary);
  const nextSeed = applyEchoesToNextLife(karma, SCENARIO_ERA, rng);

  return { life: s, karma, nextSeed };
}

/** Canonical-JSON SHA-256 of the full scenario result (life + karma + nextSeed). */
function chainHash(seed: bigint, turns = 50): string {
  return sha256(canonicalStringify(runDeterminismScenario(seed, turns)));
}

// ---------------------------------------------------------------------------
// (1) canonicalStringify unit cases — the serializer is the foundation
// ---------------------------------------------------------------------------

describe('canonicalStringify (determinism foundation)', () => {
  it('object key insertion order does not change the output', () => {
    const a = canonicalStringify({ b: 2, a: 1, c: 3 });
    const b = canonicalStringify({ c: 3, a: 1, b: 2 });
    expect(a).toBe('{"a":1,"b":2,"c":3}');
    expect(a).toBe(b);
  });

  it('nested objects are sorted at every depth', () => {
    const a = canonicalStringify({ outer: { z: 1, a: 2 } });
    const b = canonicalStringify({ outer: { a: 2, z: 1 } });
    expect(a).toBe('{"outer":{"a":2,"z":1}}');
    expect(a).toBe(b);
  });

  it('Set is emitted as a sorted array (iteration-order independent)', () => {
    const a = canonicalStringify(new Set(['flag:b', 'flag:a', 'flag:c']));
    const b = canonicalStringify(new Set(['flag:c', 'flag:a', 'flag:b']));
    expect(a).toBe(b);
    expect(a).toBe('["flag:a","flag:b","flag:c"]');
  });

  it('Map is emitted as a sorted-key object', () => {
    const m1 = new Map([
      ['b', 2],
      ['a', 1],
    ]);
    const m2 = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    expect(canonicalStringify(m1)).toBe(canonicalStringify(m2));
    expect(canonicalStringify(m1)).toBe('{"a":1,"b":2}');
  });

  it('bigint is encoded deterministically (JSON.stringify would throw)', () => {
    expect(canonicalStringify(0xdeadbeefcafebaben)).toBe('{"__bigint":"16045690984503098046"}');
    // bigint inside a structure, independent of insertion order:
    const a = canonicalStringify({ seed: 5n, name: 'x' });
    const b = canonicalStringify({ name: 'x', seed: 5n });
    expect(a).toBe(b);
  });

  it('undefined values are dropped (parity with JSON.stringify)', () => {
    expect(canonicalStringify({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
  });

  it('NaN / Infinity collapse to null (parity with JSON.stringify)', () => {
    expect(canonicalStringify(NaN)).toBe('null');
    expect(canonicalStringify(Infinity)).toBe('null');
    expect(canonicalStringify(-Infinity)).toBe('null');
  });
});

// ---------------------------------------------------------------------------
// (2) 100 reruns of one seed — the plan's literal acceptance criterion
// ---------------------------------------------------------------------------

/**
 * Fixed NON-ZERO seed for the rerun sweep. xoshiro128** rejects the all-zero
 * seed (decomposes to zero state, throws RangeError), so any non-zero value is
 * required; this one is arbitrary and pinned for review.
 */
const RERUN_SEED = 0x1234_5678_9abc_def0n;

describe('cross-platform determinism (plan todo 9)', () => {
  it('produces an identical SHA-256 across 100 reruns of the same seed', () => {
    const hashes = Array.from({ length: 100 }, () => chainHash(RERUN_SEED));
    const first = hashes[0];
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    for (const h of hashes) expect(h).toBe(first);
  });

  // (3) fast-check sweep over random non-zero bigint seeds
  it('for any non-zero seed, two independent runs produce the same digest (100 random seeds)', () => {
    const seedArb = fc.bigInt({ min: 1n, max: 1n << 127n });
    fc.assert(
      fc.property(seedArb, (seed) => {
        return chainHash(seed) === chainHash(seed);
      }),
      { numRuns: 100 },
    );
  });

  // (4) golden-fixture replay
  it('matches the committed chain_hash_v1.txt fixture for the canonical seed', () => {
    const CANONICAL_SEED = 0xdead_beef_cafe_baben;
    const fixturePath = resolve(__dirname, 'chain_hash_v1.txt');
    const expected = readFileSync(fixturePath, 'utf8').trim();
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
    const actual = chainHash(CANONICAL_SEED);
    expect(actual).toBe(expected);
  });

  // Non-vacuous probe: prove the fixture/rerun checks actually feel a change.
  it('is non-vacuous: a single-bit state change moves the digest', () => {
    const a = runDeterminismScenario(RERUN_SEED).life;
    const b: LifeState = {
      ...a,
      resources: { ...a.resources, trust: (a.resources.trust ?? 0) + 1 },
    };
    const ha = sha256(canonicalStringify(a));
    const hb = sha256(canonicalStringify(b));
    expect(ha).not.toBe(hb);
  });

  it('is non-vacuous: key insertion order in the hashed object is irrelevant', () => {
    const snap = runDeterminismScenario(RERUN_SEED);
    const reordered = { nextSeed: snap.nextSeed, karma: snap.karma, life: snap.life };
    expect(canonicalStringify(reordered)).toBe(canonicalStringify(snap));
  });
});
