import { describe, expect, it } from 'vitest';

// Type-only (erased at runtime): the content CompendiumEntry row must stay
// structurally assignable to the engine's CompendiumEntryLike view — no
// runtime dependency from src/engine on src/content (same pattern as
// milestones.test.ts).
import type { CompendiumEntry } from '@/content/progression/schema';

import { MANIFEST_SCHEMA_VERSION, TABLE_FILL_REVISION } from '@/engine/manifest';
import {
  emptyHydratedSession,
  snapshotStudioSession,
  type BenchState,
  type StudioSession,
} from '@/engine/studio-session';
import { TIER_STATE_VERSION, type TierState } from '@/engine/tier-state';

import {
  EMPTY_BENCH_MODIFIERS,
  endowableSlots,
  type BenchModifiers,
  type EndowmentTrackLike,
  type TierSlotsLike,
} from '@/engine/endowment';
import {
  computeGlobalRewards,
  grantCompendium,
  type CompendiumEntryLike,
} from '@/engine/compendium';

/* ---- fixtures ------------------------------------------------------------ */

/** The archive element type sessions actually carry (zod-inferred shape). */
type SessionCard = NonNullable<StudioSession['archive'][number]>;

let cardSeq = 0;

function personCard(id: string): SessionCard {
  cardSeq += 1;
  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    id,
    rng_seed: `seed-${cardSeq}`,
    brief: null,
    residue_window_id: 'w-1-3-1',
    kind: 'person',
    scale: 'person',
    name: `Card ${id}`,
    one_liner: 'A fixture one-liner.',
    subject: 'a fixture subject',
    detail: 'Fixture detail.',
    tags: ['fixture'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: TABLE_FILL_REVISION },
  };
}

function makeTier(tier: string, focusIds: readonly (string | undefined)[]): TierState {
  return {
    schema_version: TIER_STATE_VERSION,
    tier,
    unlocked: true,
    roster: {
      tier,
      members: focusIds.map((focus_id, index) => ({
        id: `${tier}-member-${index}`,
        name: `Member ${index}`,
        role: 'keeper',
        policy: 'policy/v0',
        embodied: false,
        ...(focus_id === undefined ? {} : { focus_id }),
        seed: index,
      })),
    },
    endowed: [],
    active_visitor: null,
    visitor_ticks: 0,
  };
}

function makeSession(parts: {
  archive?: readonly SessionCard[];
  benches?: Readonly<Record<string, BenchState>>;
  tiers?: Readonly<Record<string, TierState>>;
  compendiumDone?: readonly string[];
}): StudioSession {
  const hydrated = emptyHydratedSession();
  const base = snapshotStudioSession(
    hydrated.studio,
    hydrated.idle,
    hydrated.life,
    hydrated.practices,
  );
  return {
    ...base,
    ...(parts.archive === undefined ? {} : { archive: [...parts.archive] }),
    ...(parts.benches === undefined ? {} : { benches: { ...parts.benches } }),
    ...(parts.tiers === undefined ? {} : { tiers: { ...parts.tiers } }),
    ...(parts.compendiumDone === undefined ? {} : { compendium_done: [...parts.compendiumDone] }),
  };
}

/* ---- canonical compendium row fixtures ----------------------------------- */

const FIRST_HARVEST: CompendiumEntryLike = {
  id: 'compendium/first-harvest',
  predicate: { op: 'gte', key: 'harvests.common', value: 1 },
  reward: { effects: [{ op: 'add_resource', key: 'offline_cap', delta: 30 }] },
};

const FIRST_WORLD: CompendiumEntryLike = {
  id: 'compendium/first-world',
  predicate: { op: 'gte', key: 'world_drafts.total', value: 1 },
  reward: { unlock: 'title/worldwright' },
};

const THREE_PINS: CompendiumEntryLike = {
  id: 'compendium/three-pins',
  predicate: { op: 'gte', key: 'pinned.person', value: 3 },
  reward: { unlock: 'title/keeper-of-three' },
};

const FIVE_HARVESTS: CompendiumEntryLike = {
  id: 'compendium/five-harvests',
  predicate: { op: 'gte', key: 'harvests.common', value: 5 },
  reward: { effects: [{ op: 'add_resource', key: 'endowment_slots', delta: 1 }] },
};

const HOUSEHELD: CompendiumEntryLike = {
  id: 'compendium/househeld',
  predicate: { op: 'gte', key: 'archived.tradition', value: 1 },
  reward: { effects: [{ op: 'add_resource', key: 'offline_cap', delta: 60 }] },
};

/** A session that satisfies first-harvest + five-harvests + househeld (one archived tradition). */
function crossedHouseheldAndFive(): StudioSession {
  const traditionCard: SessionCard = {
    ...personCard('t-1'),
    kind: 'tradition',
    scale: 'household',
  };
  return makeSession({
    archive: [
      personCard('m-1'),
      personCard('m-2'),
      personCard('m-3'),
      personCard('m-4'),
      personCard('m-5'),
      traditionCard,
    ],
    tiers: { person: makeTier('person', []) },
  });
}

/* ---- grantCompendium ----------------------------------------------------- */

describe('grantCompendium', () => {
  it('grants a crossing entry whose predicate flips true over real archive stats', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      // 1 common harvest → first-harvest fires.
    });
    const { granted, session: next } = grantCompendium(session, [], [FIRST_HARVEST]);
    expect(granted).toEqual(['compendium/first-harvest']);
    expect(next.compendium_done).toEqual(['compendium/first-harvest']);
    // Input preserved-by-reference for granted set, mutated only on append:
    // the function returns the new id in BOTH the granted list and the new
    // compendium_done — caller treats `session` as immutable.
    expect(session.compendium_done).toEqual([]);
  });

  it('re-runs on a granted session to produce an empty grant list (exactly-once)', () => {
    const first = grantCompendium(
      makeSession({ archive: [personCard('m-1')] }),
      [],
      [FIRST_HARVEST],
    );
    expect(first.granted).toEqual(['compendium/first-harvest']);
    const second = grantCompendium(first.session, [], [FIRST_HARVEST]);
    expect(second.granted).toEqual([]);
    expect(second.session.compendium_done).toEqual(['compendium/first-harvest']);
  });

  it('reads world_drafts.total from the worldDrafts argument (passed in, not on session)', () => {
    const session = makeSession({});
    const { granted } = grantCompendium(session, [{ scale: 'person' }], [FIRST_WORLD]);
    expect(granted).toEqual(['compendium/first-world']);
  });

  it('does not grant an entry whose predicate stays false', () => {
    const session = makeSession({ archive: [] });
    const { granted, session: next } = grantCompendium(session, [], [FIVE_HARVESTS]);
    expect(granted).toEqual([]);
    expect(next.compendium_done).toEqual([]);
  });

  it('dedupes repeated entries with the same id inside one call', () => {
    const session = makeSession({ archive: [personCard('m-1')] });
    const { granted } = grantCompendium(session, [], [FIRST_HARVEST, FIRST_HARVEST]);
    expect(granted).toEqual(['compendium/first-harvest']);
  });

  it('preserves input order across mixed grants and skips unsatisfied rows', () => {
    const session = crossedHouseheldAndFive();
    // 5 common harvests → first-harvest + five-harvests; archived.tradition ≥1 → househeld.
    const entries: readonly CompendiumEntryLike[] = [
      FIRST_HARVEST,
      FIRST_WORLD, // no draft in this session
      THREE_PINS, // pinned.person is 1 (focus only) — below
      FIVE_HARVESTS,
      HOUSEHELD,
    ];
    const { granted } = grantCompendium(session, [], entries);
    expect(granted).toEqual([
      'compendium/first-harvest',
      'compendium/five-harvests',
      'compendium/househeld',
    ]);
  });

  it('with empty entries returns an empty grant list and preserves the session', () => {
    const session = makeSession({ archive: [personCard('m-1')] });
    const { granted, session: next } = grantCompendium(session, [], []);
    expect(granted).toEqual([]);
    expect(next.compendium_done).toEqual([]);
  });

  it('does not double-grant an entry whose id is already in compendium_done', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      compendiumDone: ['compendium/first-harvest'],
    });
    const { granted, session: next } = grantCompendium(session, [], [FIRST_HARVEST]);
    expect(granted).toEqual([]);
    expect(next.compendium_done).toEqual(['compendium/first-harvest']);
  });

  it('appends granted ids to existing compendium_done without disturbing earlier ids', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      compendiumDone: ['compendium/first-world'],
    });
    const { session: next } = grantCompendium(session, [], [FIRST_HARVEST]);
    expect(next.compendium_done).toEqual(['compendium/first-world', 'compendium/first-harvest']);
  });

  it('accepts the content CompendiumEntry row structurally', () => {
    const contentRow: CompendiumEntry = {
      schema_version: 'compendium/v0',
      id: 'compendium/first-harvest',
      predicate: { op: 'gte', key: 'harvests.common', value: 1 },
      reward: { effects: [{ op: 'add_resource', key: 'offline_cap', delta: 30 }] },
      sid_ns: 'compendium.first_harvest',
    };
    const { granted } = grantCompendium(
      makeSession({ archive: [personCard('m-1')] }),
      [],
      [contentRow],
    );
    expect(granted).toEqual(['compendium/first-harvest']);
  });
});

/* ---- computeGlobalRewards ----------------------------------------------- */

describe('computeGlobalRewards', () => {
  it('returns EMPTY_BENCH_MODIFIERS when no ids are granted', () => {
    expect(computeGlobalRewards([], [FIRST_HARVEST, FIVE_HARVESTS])).toEqual(EMPTY_BENCH_MODIFIERS);
  });

  it('sums a single effects reward into the global view', () => {
    const mods = computeGlobalRewards(['compendium/first-harvest'], [FIRST_HARVEST]);
    expect(mods.offlineCap).toBe(30);
    expect(mods.endowmentSlots).toBe(0);
  });

  it('sums offline_cap deltas across multiple granted effects rewards (30 + 60 = 90)', () => {
    const mods = computeGlobalRewards(
      ['compendium/first-harvest', 'compendium/househeld'],
      [FIRST_HARVEST, HOUSEHELD],
    );
    expect(mods.offlineCap).toBe(90);
  });

  it('lets endowment_slots bonus flow through endowableSlots via the global arg', () => {
    const TIER_ROWS: readonly TierSlotsLike[] = [
      {
        id: 'person',
        endowment_slots: 2,
      },
    ];
    const tracks: readonly EndowmentTrackLike[] = [
      {
        id: 'endow/person/swift-cook',
        tier: 'person',
        requires: null,
        slot_cost: 1,
        effects: [{ op: 'add_resource', key: 'cook_speed', delta: 1 }],
      },
    ];
    const sessionWithEndow: StudioSession = makeSession({
      tiers: {
        person: { ...makeTier('person', []), endowed: ['endow/person/swift-cook'] },
      },
    });
    expect(endowableSlots('person', sessionWithEndow, tracks, TIER_ROWS)).toBe(1);
    const withSlot: BenchModifiers = { ...EMPTY_BENCH_MODIFIERS, endowmentSlots: 1 };
    expect(endowableSlots('person', sessionWithEndow, tracks, TIER_ROWS, withSlot)).toBe(2);
    const fromDone = computeGlobalRewards(['compendium/five-harvests'], [FIVE_HARVESTS]);
    expect(fromDone.endowmentSlots).toBe(1);
    expect(endowableSlots('person', sessionWithEndow, tracks, TIER_ROWS, fromDone)).toBe(2);
  });

  it('ignore-unlock: unlock-type rewards contribute nothing to the global view', () => {
    const mods = computeGlobalRewards(
      ['compendium/first-world', 'compendium/three-pins'],
      [FIRST_WORLD, THREE_PINS],
    );
    expect(mods).toEqual(EMPTY_BENCH_MODIFIERS);
  });

  it('ignores entries with unknown ids (granted set can drift from content rows)', () => {
    const mods = computeGlobalRewards(
      ['compendium/ghost', 'compendium/first-harvest'],
      [FIRST_HARVEST],
    );
    expect(mods.offlineCap).toBe(30);
  });

  it('repeats a row effect when its id appears twice in done (no defensive dedupe)', () => {
    // `grantCompendium` is the only writer and never appends duplicates;
    // this locks the multiset contract so a future bug in the writer would
    // surface as an over-bonus here rather than silently passing.
    const mods = computeGlobalRewards(
      ['compendium/first-harvest', 'compendium/first-harvest'],
      [FIRST_HARVEST],
    );
    expect(mods.offlineCap).toBe(60);
  });
});

/* ---- end-to-end persistence round-trip ----------------------------------- */

describe('compendium_done round-trip', () => {
  it('a granted id survives snapshotStudioSession → parseStudioSession', async () => {
    const session = makeSession({ archive: [personCard('m-1')] });
    const { session: granted } = grantCompendium(session, [], [FIRST_HARVEST]);
    const { StudioSessionSchema } = await import('@/engine/studio-session');
    const reparsed = StudioSessionSchema.parse(granted);
    expect(reparsed.compendium_done).toEqual(['compendium/first-harvest']);
  });
});
