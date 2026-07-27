// Full-chain integration test: Tang life -> death -> bardo echoes -> Fantasy life.
//
// Exercises the complete playable path the turn screen now wires up:
//   1. The real loader (loadEraPack) merges events.json5 + endings.json5 into
//      the Tang pack and validates the result.
//   2. A Tang life plays through real authored events via the engine reducer
//      (applyChoice + advanceTurn), advancing 6 turns until the time resource
//      depletes and the life ends.
//   3. summarizeLife produces echoes from the lived history.
//   4. mergeKarma + applyEchoesToNextLife project those echoes into a Fantasy
//      NextLifeSeed.
//   5. A Fantasy life is created from that seed, and the no-karma-to-identity
//      invariant is re-asserted at the full-chain level.
//
// Unlike echo-integration.test.ts (which builds a synthetic LifeState fixture
// to exercise all 4 echo types at once), this test drives the REAL content
// loader and the REAL engine reducer turn loop — it is the end-to-end
// "playable game" smoke test.
//
// Plan reference: T12 + T13 loader/turn-screen integration.

import { describe, expect, it } from 'vitest';

import { loadEraPack } from '@/content/loader';
import {
  advanceTurn,
  applyChoice,
  applyEchoesToNextLife,
  createLifeState,
  createRng,
  emptyKarma,
  mergeKarma,
  summarizeLife,
} from '@/engine';
import type {
  EraId,
  IntentRoot,
  LifeId,
  LifeState,
  ResourceId,
  RoleId,
  SocialIdentity,
} from '@/engine';

// ---------------------------------------------------------------------------
// Fixtures
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

/** Canonical starting lifespan (mirrors reducer.BASE_RESOURCES.time). */
const BASE_TIME = 100;

/**
 * Identity-shaped field names the NextLifeSeed invariant forbids. The same
 * closed list echo-integration.test.ts asserts against; duplicated here so
 * the full-chain test is self-contained.
 */
const IDENTITY_FIELDS: readonly string[] = [
  'gender',
  'social_class',
  'family_wealth_at_birth',
  'caste_status',
  'disability_status',
  'social_identity',
  'caste',
  'race',
  'wealth',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('full-chain integration: Tang life -> bardo -> Fantasy life', () => {
  it('plays a Tang life through real events, dies, and seeds a Fantasy life', () => {
    // ---------------------------------------------------------------------
    // 1. The loader merges real events + endings into both packs.
    // ---------------------------------------------------------------------
    const tang = loadEraPack('tang-china');
    const fantasy = loadEraPack('fantasy-mahayana');

    expect(tang.events.length).toBe(7);
    expect(tang.endings.length).toBe(4);
    expect(fantasy.events.length).toBe(7);
    expect(fantasy.endings.length).toBe(4);

    // ---------------------------------------------------------------------
    // 2. Create a Tang life with a short 6-turn lifespan (time resource).
    // ---------------------------------------------------------------------
    const rng = createRng(0x5eed_1234n);
    let life = createLifeState({
      id: lifeId('life-tang-1'),
      era: eraId('tang-china'),
      role: roleId('wanderer'),
      identity: NEUTRAL_IDENTITY,
      resources: { time: 6 } as Partial<Record<ResourceId, number>>,
    });

    expect(life.alive).toBe(true);
    expect(life.turn).toBe(0);
    expect(life.resources.time).toBe(6);

    // Pick the grain-requisition "comply" choice: intent_root=care, -3 provisions.
    const grainEvent = tang.events.find((e) => e.id === 'event:tang/grain-requisition');
    expect(grainEvent, 'grain-requisition event must be in the loaded pack').toBeDefined();
    const complyChoice = grainEvent?.choices.find((c) => c.id === 'comply');
    expect(complyChoice, 'comply choice must exist').toBeDefined();
    if (complyChoice === undefined) return; // narrows control flow for TS

    // ---------------------------------------------------------------------
    // 3. Advance 6 turns: pick the choice, advance the turn, check death.
    //    Mirrors useEngineReducer's ADVANCE_TURN death gate (time <= 0).
    // ---------------------------------------------------------------------
    const initialProvisions = life.resources.provisions ?? 0;
    for (let turn = 0; turn < 6; turn++) {
      life = applyChoice(life, complyChoice, rng);
      life = advanceTurn(life, rng);
      // The UI reducer sets alive=false when time depletes; replicate that
      // gate here so the engine-level test exercises the death transition.
      if ((life.resources.time ?? 0) <= 0) {
        life = { ...life, alive: false };
      }
      // Verify state changes each turn: turn counter ticks up.
      expect(life.turn, `turn ${turn} counter`).toBe(turn + 1);
    }

    // ---------------------------------------------------------------------
    // 4. The life ended: time resource is the lifespan counter.
    // ---------------------------------------------------------------------
    expect(life.alive, 'life must end when time reaches 0').toBe(false);
    expect(life.turn).toBe(6);
    expect(life.resources.time).toBe(0);
    expect(life.intent_root_history).toHaveLength(6);
    expect(life.intent_root_history.every((r) => r === 'care')).toBe(true);
    // Each "comply" applies provisions -3, clamped at 0.
    expect(life.resources.provisions ?? 0).toBeLessThan(initialProvisions);

    // ---------------------------------------------------------------------
    // 5. summarizeLife produces echoes from the lived history.
    //    6/6 care turns -> 100% share -> tendency:care echo.
    // ---------------------------------------------------------------------
    const summary = summarizeLife(life);
    expect(summary.echoes.length, 'a lived life must produce at least one echo').toBeGreaterThan(0);

    const tendency = summary.echoes.find((e) => e.type === 'tendency');
    expect(tendency, 'a 100%-care life must produce a tendency echo').toBeDefined();
    expect(tendency?.key).toBe('care');
    expect(tendency?.weight).toBeGreaterThan(0);

    // ---------------------------------------------------------------------
    // 6. Fold into chain karma + project into the Fantasy NextLifeSeed.
    // ---------------------------------------------------------------------
    const karma = mergeKarma(emptyKarma(), summary);
    const seed = applyEchoesToNextLife(karma, eraId('fantasy-mahayana'), rng);

    expect(seed.narrative_seed_events.length).toBeGreaterThan(0);
    for (const evt of seed.narrative_seed_events) {
      expect(evt.startsWith('fantasy-mahayana:')).toBe(true);
    }
    // Care tendency grants trust +5 (echo.ts TENDENCY_RESOURCE_DELTA).
    expect(seed.starting_resources_modifier.trust).toBe(5);
    expect(seed.permitted_imagery_tag).toBe('lotus');

    // ---------------------------------------------------------------------
    // 7. Create a Fantasy life from the seed.
    // ---------------------------------------------------------------------
    const fantasyRole = fantasy.starting_roles?.find((r) => r.id === 'newly-arrived-soul');
    expect(fantasyRole, 'newly-arrived-soul must be a starting role').toBeDefined();

    const fantasyLife = createLifeState({
      id: lifeId('life-fantasy-1'),
      era: eraId('fantasy-mahayana'),
      role: roleId('newly-arrived-soul'),
      // Identity is set INDEPENDENTLY of the seed — the fence.
      identity: NEUTRAL_IDENTITY,
      resources: seed.starting_resources_modifier,
    });

    expect(fantasyLife.era).toBe('fantasy-mahayana');
    expect(fantasyLife.alive).toBe(true);
    // The seed's starting_resources_modifier is applied via createLifeState's
    // resource-spread (overrides the base). Care tendency produces trust: +5;
    // createLifeState treats the modifier as an override, so the Fantasy life
    // starts with trust=5 (the seed's value), not base+5. The UI layer is
    // responsible for layering the modifier on top of the role's starting
    // resources; the engine only carries the modifier through.
    expect(fantasyLife.resources.trust).toBe(5);

    // ---------------------------------------------------------------------
    // 8. CRITICAL INVARIANT: the seed touched no SocialIdentity field.
    // ---------------------------------------------------------------------
    for (const field of IDENTITY_FIELDS) {
      expect(
        Object.prototype.hasOwnProperty.call(seed, field),
        `seed must not carry identity field "${field}"`,
      ).toBe(false);
    }
    for (const key of Object.keys(seed)) {
      expect(
        /social_identity|caste|gender|race|disability|wealth/i.test(key),
        `seed key "${key}" looks identity-shaped`,
      ).toBe(false);
    }
  });

  it('all 4 echo types flow through the chain when a life produces them', () => {
    // A complementary test: construct a completed Tang life whose history
    // yields all 4 echo types at once (the same fixture shape
    // echo-integration.test.ts uses), then verify the full chain carries
    // them into the Fantasy seed — using the REAL loaded pack to assert the
    // integration target exists.
    const tang = loadEraPack('tang-china');
    const fantasy = loadEraPack('fantasy-mahayana');
    // Assert endings are attached (loader merges them as a sibling field).
    expect(tang.endings.length).toBeGreaterThanOrEqual(1);
    expect(fantasy.endings.length).toBeGreaterThanOrEqual(1);

    const rng = createRng(0x9876_5432n);

    // 9 aversion + 6 care = tendency:aversion (60%) + pattern_break.
    const aversionRun: IntentRoot[] = Array.from({ length: 9 }, () => 'aversion');
    const careRun: IntentRoot[] = Array.from({ length: 6 }, () => 'care');

    const resources: Record<ResourceId, number> = {
      time: 0,
      energy: 0,
      provisions: 0,
      trust: 0,
      skill: 0,
      obligation: 0,
    };
    const life: LifeState = {
      identity: NEUTRAL_IDENTITY,
      id: lifeId('life-tang-echoes'),
      era: eraId('tang-china'),
      role: roleId('wanderer'),
      age: 60,
      turn: 15,
      resources,
      skills: {},
      relationships: {},
      flags: new Set<string>(['vow:protect-family:broken', 'attachment:daughter']),
      intent_root_history: [...aversionRun, ...careRun],
      chosen_lens: null,
      alive: false,
      last_narrative_sid: null,
      event_weights: {},
      cooldowns: {},
      history: [],
      fired_once_per_run: new Set<string>(),
      pending_events: [],
      schedule_id: null,
      practice_override_id: null,
    };

    const summary = summarizeLife(life);
    const types = new Set(summary.echoes.map((e) => e.type));
    expect(types.has('tendency')).toBe(true);
    expect(types.has('vow')).toBe(true);
    expect(types.has('unresolved_attachment')).toBe(true);
    expect(types.has('pattern_break')).toBe(true);

    const karma = mergeKarma(emptyKarma(), summary);
    const seed = applyEchoesToNextLife(karma, eraId('fantasy-mahayana'), rng);

    // Aversion tendency depletes time (-5) and selects the "smoke" imagery.
    expect(seed.starting_resources_modifier.time).toBe(-5);
    expect(seed.permitted_imagery_tag).toBe('smoke');

    // Every seed event is namespaced to the Fantasy era.
    expect(seed.narrative_seed_events.length).toBeGreaterThan(0);
    for (const evt of seed.narrative_seed_events) {
      expect(evt.startsWith('fantasy-mahayana:')).toBe(true);
    }

    // Invariant: no identity-shaped keys on the seed.
    for (const field of IDENTITY_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(seed, field)).toBe(false);
    }
  });

  it('the turn-loop death gate fires at the documented resource threshold', () => {
    // Regression guard for the turn screen's ADVANCE_TURN case: the `time`
    // resource is the lifespan counter, decremented once per turn by
    // advanceTurn, and the UI reducer sets alive=false when it hits 0.
    // This test pins the threshold so a future change to either side of the
    // gate is caught at the integration level.
    const rng = createRng(0xdead_beefn);
    const life = createLifeState({
      id: lifeId('life-threshold'),
      era: eraId('tang-china'),
      role: roleId('wanderer'),
      identity: NEUTRAL_IDENTITY,
      resources: { time: 3 } as Partial<Record<ResourceId, number>>,
    });

    // Two turns: time goes 3 -> 2 -> 1, still alive.
    let afterTwo = advanceTurn(advanceTurn(life, rng), rng);
    expect(afterTwo.resources.time).toBe(1);
    expect(afterTwo.alive).toBe(true);

    // Third turn: time goes 1 -> 0. The UI reducer's death gate fires.
    let afterThree = advanceTurn(afterTwo, rng);
    expect(afterThree.resources.time).toBe(0);
    expect(afterThree.alive, 'engine advanceTurn does not itself clear alive').toBe(true);
    // Mirrors useEngineReducer ADVANCE_TURN: time <= 0 -> alive = false.
    afterThree = { ...afterThree, alive: (afterThree.resources.time ?? 0) > 0 };
    expect(afterThree.alive).toBe(false);

    // Sanity: the base lifespan (no resource override) is the documented 100.
    const defaults = createLifeState({
      id: lifeId('life-default'),
      era: eraId('tang-china'),
      role: roleId('wanderer'),
      identity: NEUTRAL_IDENTITY,
    });
    expect(defaults.resources.time).toBe(BASE_TIME);
  });
});
