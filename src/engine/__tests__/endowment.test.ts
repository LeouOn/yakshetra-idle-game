// Endowment — permanent card → bench modifier conversion (Phase 2 Task 1).
//
// Covers: modifier sums with global stacking, slot capacity (including the
// slot_cost 2 row), the requires-gate, the archive/pin/focus cascade with
// exactOptionalPropertyTypes key omission, double-endow rejection,
// effectiveAwayCap math, and the additive visitor_ticks tier-state default.

import { describe, expect, it } from 'vitest';

// Type-only (erased at runtime): the content rows must stay structurally
// assignable to the engine's EndowmentTrackLike view — no runtime dependency
// from src/engine on src/content (same pattern as milestones.test.ts).
import type { EndowmentTrack, Tier } from '@/content/progression/schema';

import { MANIFEST_SCHEMA_VERSION, TABLE_FILL_REVISION } from '@/engine/manifest';
import {
  StudioSessionSchema,
  emptyHydratedSession,
  parseStudioSession,
  snapshotStudioSession,
  type BenchState,
  type StudioSession,
} from '@/engine/studio-session';
import {
  TIER_STATE_VERSION,
  TierStateSchema,
  createTierState,
  type TierState,
} from '@/engine/tier-state';
import {
  BASE_AWAY_CAP,
  EMPTY_BENCH_MODIFIERS,
  canEndow,
  computeBenchModifiers,
  effectiveAwayCap,
  endowManifest,
  endowableSlots,
  type BenchModifiers,
  type EndowmentTrackLike,
} from '@/engine/endowment';

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

function pinOf(id: string): NonNullable<BenchState['pinned']> {
  return { id, name: `Card ${id}`, kind: 'person', one_liner: 'A fixture one-liner.' };
}

function makeBench(pinned: BenchState['pinned']): BenchState {
  return {
    residue: [],
    last_harvest_index: -1,
    bay: null,
    quality_tier: 0,
    harvest_count: 0,
    play_import: null,
    pinned,
    surplus: 0,
    fold_position: 0,
  };
}

function makeTier(
  tier: string,
  parts: {
    focusIds?: readonly (string | undefined)[];
    unlocked?: boolean;
    endowed?: readonly string[];
  } = {},
): TierState {
  return {
    schema_version: TIER_STATE_VERSION,
    tier,
    unlocked: parts.unlocked ?? true,
    roster: {
      tier,
      members: (parts.focusIds ?? []).map((focus_id, index) => ({
        id: `${tier}-member-${index}`,
        name: `Member ${index}`,
        role: 'keeper',
        policy: 'policy/v0',
        embodied: false,
        ...(focus_id === undefined ? {} : { focus_id }),
        seed: index,
      })),
    },
    endowed: [...(parts.endowed ?? [])],
    active_visitor: null,
    visitor_ticks: 0,
  };
}

function makeSession(parts: {
  archive?: readonly SessionCard[];
  benches?: Readonly<Record<string, BenchState>>;
  tiers?: Readonly<Record<string, TierState>>;
  milestonesDone?: readonly string[];
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
    ...(parts.milestonesDone === undefined ? {} : { milestones_done: [...parts.milestonesDone] }),
  };
}

/* ---- tracks + tier rows --------------------------------------------------- */

// The four shipped base rows, verbatim shapes (content-typed to prove the
// structural assignability to the engine view at compile time).
const SWIFT_COOK: EndowmentTrack = {
  schema_version: 'endowment/v0',
  id: 'endow/person/swift-cook',
  tier: 'person',
  requires: null,
  slot_cost: 1,
  effects: [{ op: 'add_resource', key: 'cook_speed', delta: 1 }],
};
const DEEP_WINDOW: EndowmentTrack = {
  schema_version: 'endowment/v0',
  id: 'endow/person/deep-window',
  tier: 'person',
  requires: null,
  slot_cost: 1,
  effects: [{ op: 'add_resource', key: 'window_min', delta: 1 }],
};
const HEARTH_SURPLUS: EndowmentTrack = {
  schema_version: 'endowment/v0',
  id: 'endow/household/hearth-surplus',
  tier: 'household',
  requires: 'unlock-household',
  slot_cost: 1,
  effects: [{ op: 'add_resource', key: 'surplus_rate', delta: 1 }],
};
const LONG_ABSENCE: EndowmentTrack = {
  schema_version: 'endowment/v0',
  id: 'endow/household/long-absence',
  tier: 'household',
  requires: 'unlock-household',
  slot_cost: 2,
  effects: [{ op: 'add_resource', key: 'offline_cap', delta: 120 }],
};

// Synthetic person-tier track: two offline_cap effects that must SUM inside
// one track, plus a non-add_resource op the engine must ignore.
const STEADY_HEARTH: EndowmentTrackLike = {
  id: 'endow/person/steady-hearth',
  tier: 'person',
  requires: null,
  slot_cost: 1,
  effects: [
    { op: 'add_resource', key: 'offline_cap', delta: 60 },
    { op: 'add_resource', key: 'offline_cap', delta: 45 },
    { op: 'add_skill', key: 'unrelated' },
  ],
};
// Off-vocabulary key: the engine must ignore it, the content lint must
// reject it (see progression lint tests).
const FOREIGN_KEY_TRACK: EndowmentTrackLike = {
  id: 'endow/person/foreign-key',
  tier: 'person',
  requires: null,
  slot_cost: 1,
  effects: [{ op: 'add_resource', key: 'juice_rate', delta: 9 }],
};

const CONTENT_TRACKS: readonly EndowmentTrackLike[] = [
  SWIFT_COOK,
  DEEP_WINDOW,
  HEARTH_SURPLUS,
  LONG_ABSENCE,
];

// Content-typed tier rows (compile-time structural proof for TierSlotsLike).
const TIER_ROWS: readonly Tier[] = [
  {
    schema_version: 'tier/v0',
    id: 'person',
    scale: 'person',
    index: 0,
    roster_size: { min: 1, max: 1 },
    member_unit: 'life',
    role_table_ref: 'roles/person',
    unlock_milestone: null,
    fold_cadence: 4,
    endowment_slots: 2,
    visitor_table_ref: 'visitors/person',
  },
  {
    schema_version: 'tier/v0',
    id: 'household',
    scale: 'household',
    index: 1,
    roster_size: { min: 3, max: 8 },
    member_unit: 'person',
    role_table_ref: 'roles/household',
    unlock_milestone: 'unlock-household',
    fold_cadence: 4,
    endowment_slots: 2,
    visitor_table_ref: 'visitors/household',
  },
];

const HOUSEHOLD_UNLOCKED = { person: makeTier('person'), household: makeTier('household') };

/* ---- computeBenchModifiers ------------------------------------------------ */

describe('computeBenchModifiers', () => {
  it('sums the tier endowed tracks deltas per key', () => {
    const session = makeSession({
      tiers: {
        person: makeTier('person', {
          endowed: ['endow/person/swift-cook', 'endow/person/deep-window'],
        }),
      },
    });
    expect(computeBenchModifiers('person', session, CONTENT_TRACKS)).toEqual({
      cookSpeed: 1,
      windowMin: 1,
      surplusRate: 0,
      offlineCap: 0,
      endowmentSlots: 0,
    });
  });

  it('stacks global modifiers on top', () => {
    const session = makeSession({
      tiers: {
        person: makeTier('person', {
          endowed: ['endow/person/swift-cook', 'endow/person/deep-window'],
        }),
      },
    });
    const global: BenchModifiers = { ...EMPTY_BENCH_MODIFIERS, cookSpeed: 2, offlineCap: 5 };
    expect(computeBenchModifiers('person', session, CONTENT_TRACKS, global)).toEqual({
      cookSpeed: 3,
      windowMin: 1,
      surplusRate: 0,
      offlineCap: 5,
      endowmentSlots: 0,
    });
  });

  it('reads only the requested tier endowed list', () => {
    const session = makeSession({
      tiers: {
        person: makeTier('person'),
        household: makeTier('household', { endowed: ['endow/household/hearth-surplus'] }),
      },
    });
    expect(computeBenchModifiers('person', session, CONTENT_TRACKS)).toEqual(EMPTY_BENCH_MODIFIERS);
    expect(computeBenchModifiers('household', session, CONTENT_TRACKS).surplusRate).toBe(1);
  });

  it('sums repeated keys inside one track and ignores other ops and unknown keys', () => {
    const session = makeSession({
      tiers: {
        person: makeTier('person', {
          endowed: ['endow/person/steady-hearth', 'endow/person/foreign-key'],
        }),
      },
    });
    const mods = computeBenchModifiers('person', session, [
      ...CONTENT_TRACKS,
      STEADY_HEARTH,
      FOREIGN_KEY_TRACK,
    ]);
    expect(mods.offlineCap).toBe(105);
    expect(mods.cookSpeed).toBe(0);
    expect(mods.endowmentSlots).toBe(0);
  });

  it('returns the global view for an unknown tier id', () => {
    const session = makeSession({});
    const global: BenchModifiers = { ...EMPTY_BENCH_MODIFIERS, cookSpeed: 2 };
    expect(computeBenchModifiers('ghost', session, CONTENT_TRACKS, global)).toEqual(global);
  });
});

/* ---- endowableSlots ------------------------------------------------------- */

describe('endowableSlots', () => {
  it('starts at the tier row capacity', () => {
    const session = makeSession({ tiers: HOUSEHOLD_UNLOCKED });
    expect(endowableSlots('person', session, CONTENT_TRACKS, TIER_ROWS)).toBe(2);
  });

  it('subtracts endowed slot costs, reaching zero', () => {
    const one = makeSession({
      tiers: { person: makeTier('person', { endowed: ['endow/person/swift-cook'] }) },
    });
    expect(endowableSlots('person', one, CONTENT_TRACKS, TIER_ROWS)).toBe(1);
    const two = makeSession({
      tiers: {
        person: makeTier('person', {
          endowed: ['endow/person/swift-cook', 'endow/person/deep-window'],
        }),
      },
    });
    expect(endowableSlots('person', two, CONTENT_TRACKS, TIER_ROWS)).toBe(0);
  });

  it('accounts for the slot_cost 2 row', () => {
    const hearth = makeSession({
      tiers: { household: makeTier('household', { endowed: ['endow/household/hearth-surplus'] }) },
    });
    expect(endowableSlots('household', hearth, CONTENT_TRACKS, TIER_ROWS)).toBe(1);
    const long = makeSession({
      tiers: { household: makeTier('household', { endowed: ['endow/household/long-absence'] }) },
    });
    expect(endowableSlots('household', long, CONTENT_TRACKS, TIER_ROWS)).toBe(0);
  });

  it('adds the compendium slot bonus from global', () => {
    const session = makeSession({
      tiers: { person: makeTier('person', { endowed: ['endow/person/swift-cook'] }) },
    });
    const global: BenchModifiers = { ...EMPTY_BENCH_MODIFIERS, endowmentSlots: 1 };
    expect(endowableSlots('person', session, CONTENT_TRACKS, TIER_ROWS, global)).toBe(2);
  });

  it('is 0 for an unknown tier id', () => {
    const session = makeSession({});
    expect(endowableSlots('ghost', session, CONTENT_TRACKS, TIER_ROWS)).toBe(0);
  });
});

/* ---- canEndow ------------------------------------------------------------- */

describe('canEndow', () => {
  it('approves a card, track and tier that line up', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(canEndow(session, 'person', SWIFT_COOK, 'm-1', CONTENT_TRACKS, TIER_ROWS)).toEqual({
      ok: true,
      reason: null,
    });
  });

  it('rejects when the requires milestone is not done', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      tiers: HOUSEHOLD_UNLOCKED,
      milestonesDone: [],
    });
    expect(
      canEndow(session, 'household', HEARTH_SURPLUS, 'm-1', CONTENT_TRACKS, TIER_ROWS),
    ).toEqual({
      ok: false,
      reason: 'requires-unmet',
    });
  });

  it('passes the requires-gate once the milestone is done', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      tiers: HOUSEHOLD_UNLOCKED,
      milestonesDone: ['unlock-household'],
    });
    expect(
      canEndow(session, 'household', HEARTH_SURPLUS, 'm-1', CONTENT_TRACKS, TIER_ROWS).ok,
    ).toBe(true);
  });

  it('rejects when slot capacity runs out (slot_cost 2 row)', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      tiers: {
        household: makeTier('household', { endowed: ['endow/household/hearth-surplus'] }),
      },
      milestonesDone: ['unlock-household'],
    });
    expect(canEndow(session, 'household', LONG_ABSENCE, 'm-1', CONTENT_TRACKS, TIER_ROWS)).toEqual({
      ok: false,
      reason: 'no-slots',
    });
  });

  it('admits the slot_cost 2 row when the compendium bonus adds capacity', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      tiers: {
        household: makeTier('household', { endowed: ['endow/household/hearth-surplus'] }),
      },
      milestonesDone: ['unlock-household'],
    });
    const global: BenchModifiers = { ...EMPTY_BENCH_MODIFIERS, endowmentSlots: 1 };
    expect(
      canEndow(session, 'household', LONG_ABSENCE, 'm-1', CONTENT_TRACKS, TIER_ROWS, global).ok,
    ).toBe(true);
  });

  it('rejects a second endowment of the same track', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      tiers: { person: makeTier('person', { endowed: ['endow/person/swift-cook'] }) },
    });
    expect(canEndow(session, 'person', SWIFT_COOK, 'm-1', CONTENT_TRACKS, TIER_ROWS)).toEqual({
      ok: false,
      reason: 'already-endowed',
    });
  });

  it('rejects a card that is not in the archive', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(canEndow(session, 'person', SWIFT_COOK, 'm-gone', CONTENT_TRACKS, TIER_ROWS)).toEqual({
      ok: false,
      reason: 'card-missing',
    });
  });

  it('rejects a locked tier', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      tiers: { household: makeTier('household', { unlocked: false }) },
    });
    expect(
      canEndow(session, 'household', HEARTH_SURPLUS, 'm-1', CONTENT_TRACKS, TIER_ROWS),
    ).toEqual({
      ok: false,
      reason: 'tier-locked',
    });
  });

  it('rejects a track that belongs to another tier', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(canEndow(session, 'person', HEARTH_SURPLUS, 'm-1', CONTENT_TRACKS, TIER_ROWS)).toEqual({
      ok: false,
      reason: 'track-tier-mismatch',
    });
  });

  it('rejects an unknown tier id', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(canEndow(session, 'ghost', SWIFT_COOK, 'm-1', CONTENT_TRACKS, TIER_ROWS)).toEqual({
      ok: false,
      reason: 'tier-missing',
    });
  });
});

/* ---- endowManifest -------------------------------------------------------- */

describe('endowManifest', () => {
  function cascadeSession(): StudioSession {
    return makeSession({
      archive: [personCard('m-1'), personCard('m-2')],
      benches: {
        person: makeBench(pinOf('m-1')),
        household: makeBench(pinOf('m-2')),
      },
      tiers: {
        person: makeTier('person', { focusIds: ['m-1', 'm-2'] }),
        household: makeTier('household', { focusIds: ['m-1'] }),
      },
    });
  }

  it('cascades: card leaves the archive, pins clear, focus_id keys are omitted, track is endowed', () => {
    const session = cascadeSession();
    const after = endowManifest(
      session,
      'person',
      'endow/person/swift-cook',
      'm-1',
      CONTENT_TRACKS,
    );

    expect(after.archive.map((card) => card.id)).toEqual(['m-2']);
    expect(after.benches.person?.pinned).toBeNull();
    // A pin on ANOTHER bench that points at a different card survives.
    expect(after.benches.household?.pinned).toEqual(pinOf('m-2'));

    // Key omission, not undefined assignment (exactOptionalPropertyTypes).
    const personMember = after.tiers.person?.roster.members[0];
    const householdMember = after.tiers.household?.roster.members[0];
    expect(personMember && 'focus_id' in personMember).toBe(false);
    expect(householdMember && 'focus_id' in householdMember).toBe(false);
    // A focus on a different card survives.
    expect(after.tiers.person?.roster.members[1]?.focus_id).toBe('m-2');

    expect(after.tiers.person?.endowed).toEqual(['endow/person/swift-cook']);
    // The result is still a valid session.
    expect(() => StudioSessionSchema.parse(after)).not.toThrow();
  });

  it('is pure: the input session is untouched', () => {
    const session = cascadeSession();
    endowManifest(session, 'person', 'endow/person/swift-cook', 'm-1', CONTENT_TRACKS);
    expect(session.archive.length).toBe(2);
    expect(session.benches.person?.pinned).toEqual(pinOf('m-1'));
    expect(session.tiers.person?.roster.members[0]?.focus_id).toBe('m-1');
    expect(session.tiers.person?.endowed).toEqual([]);
  });

  it('throws on double endow', () => {
    const session = makeSession({
      archive: [personCard('m-1')],
      tiers: { person: makeTier('person', { endowed: ['endow/person/swift-cook'] }) },
    });
    expect(() =>
      endowManifest(session, 'person', 'endow/person/swift-cook', 'm-1', CONTENT_TRACKS),
    ).toThrow('already-endowed');
  });

  it('throws when the card is not in the archive', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(() =>
      endowManifest(session, 'person', 'endow/person/swift-cook', 'm-gone', CONTENT_TRACKS),
    ).toThrow('card-missing');
  });

  it('throws on an unknown track id', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(() =>
      endowManifest(session, 'person', 'endow/person/ghost', 'm-1', CONTENT_TRACKS),
    ).toThrow('unknown endowment track');
  });

  it('throws when the requires milestone is unmet', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(() =>
      endowManifest(session, 'household', 'endow/household/hearth-surplus', 'm-1', CONTENT_TRACKS),
    ).toThrow('requires-unmet');
  });

  it('throws when the track belongs to another tier', () => {
    const session = makeSession({ archive: [personCard('m-1')], tiers: HOUSEHOLD_UNLOCKED });
    expect(() =>
      endowManifest(session, 'person', 'endow/household/hearth-surplus', 'm-1', CONTENT_TRACKS),
    ).toThrow('track-tier-mismatch');
  });
});

/* ---- effectiveAwayCap ----------------------------------------------------- */

describe('effectiveAwayCap', () => {
  it('is the base cap with nothing endowed', () => {
    const session = makeSession({ tiers: HOUSEHOLD_UNLOCKED });
    expect(BASE_AWAY_CAP).toBe(240);
    expect(effectiveAwayCap(session, CONTENT_TRACKS)).toBe(240);
  });

  it('sums person-tier offline_cap deltas (repeated keys inside a track)', () => {
    const session = makeSession({
      tiers: { person: makeTier('person', { endowed: ['endow/person/steady-hearth'] }) },
    });
    expect(effectiveAwayCap(session, [...CONTENT_TRACKS, STEADY_HEARTH])).toBe(240 + 60 + 45);
  });

  it('stacks the global offline cap on top', () => {
    const session = makeSession({
      tiers: { person: makeTier('person', { endowed: ['endow/person/steady-hearth'] }) },
    });
    const global: BenchModifiers = { ...EMPTY_BENCH_MODIFIERS, offlineCap: 30 };
    expect(effectiveAwayCap(session, [...CONTENT_TRACKS, STEADY_HEARTH], global)).toBe(
      240 + 105 + 30,
    );
  });

  it('counts an unlocked household tier offline_cap endowment (long-absence bites)', () => {
    const session = makeSession({
      tiers: {
        person: makeTier('person'),
        household: makeTier('household', { endowed: ['endow/household/long-absence'] }),
      },
    });
    expect(effectiveAwayCap(session, CONTENT_TRACKS)).toBe(240 + 120);
  });

  it('skips a locked household tier offline_cap endowment', () => {
    // Constructed session: endowing requires an unlocked tier, but the cap
    // must still skip a locked tier's endowed list rather than read it.
    const session = makeSession({
      tiers: {
        person: makeTier('person'),
        household: makeTier('household', {
          unlocked: false,
          endowed: ['endow/household/long-absence'],
        }),
      },
    });
    expect(effectiveAwayCap(session, CONTENT_TRACKS)).toBe(240);
  });

  it('adds the global offline cap exactly once with two unlocked tiers endowed', () => {
    const session = makeSession({
      tiers: {
        person: makeTier('person', { endowed: ['endow/person/steady-hearth'] }),
        household: makeTier('household', { endowed: ['endow/household/long-absence'] }),
      },
    });
    const global: BenchModifiers = { ...EMPTY_BENCH_MODIFIERS, offlineCap: 30 };
    expect(effectiveAwayCap(session, [...CONTENT_TRACKS, STEADY_HEARTH], global)).toBe(
      240 + 105 + 120 + 30,
    );
  });
});

/* ---- visitor_ticks tier-state default ------------------------------------- */

describe('TierStateSchema visitor_ticks', () => {
  const baseRow = {
    schema_version: TIER_STATE_VERSION,
    tier: 'person',
    unlocked: true,
    roster: { tier: 'person', members: [] },
    endowed: [],
    active_visitor: null,
  };

  it('defaults to 0 when the key is absent', () => {
    expect(TierStateSchema.parse(baseRow).visitor_ticks).toBe(0);
  });

  it('preserves a present value', () => {
    expect(TierStateSchema.parse({ ...baseRow, visitor_ticks: 7 }).visitor_ticks).toBe(7);
  });

  it('rejects negative values', () => {
    expect(TierStateSchema.safeParse({ ...baseRow, visitor_ticks: -1 }).success).toBe(false);
  });

  it('ships 0 from createTierState', () => {
    expect(createTierState('person', true).visitor_ticks).toBe(0);
  });

  it('defaults legacy sessions through parseStudioSession', () => {
    const session = makeSession({ tiers: { person: makeTier('person') } });
    const raw = JSON.parse(JSON.stringify(session)) as {
      tiers: { person: Record<string, unknown> };
    };
    delete raw.tiers.person['visitor_ticks'];
    const parsed = parseStudioSession(raw);
    expect(parsed.tiers.person?.visitor_ticks).toBe(0);
  });
});
