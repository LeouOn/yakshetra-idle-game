import { describe, expect, it } from 'vitest';

// Type-only (erased at runtime): locks the direction rule. The content-side
// ArchivePredicate must stay structurally assignable to the engine's
// re-declared union — src/engine takes no runtime dependency on src/content.
import type { ArchivePredicate } from '@/content/progression/schema';

import {
  MANIFEST_SCHEMA_VERSION,
  TABLE_FILL_REVISION,
  type ManifestRarity,
} from '@/engine/manifest';
import {
  emptyHydratedSession,
  snapshotStudioSession,
  type BenchState,
  type StudioSession,
} from '@/engine/studio-session';
import { TIER_STATE_VERSION, type TierState } from '@/engine/tier-state';

import {
  computeArchiveStats,
  evaluateArchivePredicate,
  validateArchivePredicateKeys,
  type ArchivePredicateLike,
  type ArchiveStats,
} from '@/engine/archive-stats';

/* ---- fixtures ------------------------------------------------------------ */

/** The archive element type sessions actually carry (zod-inferred shape). */
type SessionCard = NonNullable<StudioSession['archive'][number]>;

let cardSeq = 0;

function card(id: string, kind: string, rarity: ManifestRarity = 'common'): SessionCard {
  cardSeq += 1;
  return {
    schema_version: MANIFEST_SCHEMA_VERSION,
    id,
    rng_seed: `seed-${cardSeq}`,
    brief: null,
    residue_window_id: 'w-1-3-1',
    kind,
    scale: 'person',
    name: `Card ${id}`,
    one_liner: 'A fixture one-liner.',
    subject: 'a fixture subject',
    detail: 'Fixture detail.',
    tags: ['fixture'],
    rarity,
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: TABLE_FILL_REVISION },
  };
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

function pinOf(id: string, kind: 'person' | 'place'): NonNullable<BenchState['pinned']> {
  return { id, name: `Card ${id}`, kind, one_liner: 'A fixture one-liner.' };
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

/* ---- computeArchiveStats -------------------------------------------------- */

describe('computeArchiveStats', () => {
  it('counts pinned by kind from bench pins', () => {
    const session = makeSession({
      archive: [card('m-1', 'person'), card('m-2', 'place')],
      benches: {
        person: makeBench(pinOf('m-1', 'person')),
        household: makeBench(pinOf('m-2', 'place')),
      },
    });
    expect(computeArchiveStats(session).pinned).toEqual({ person: 1, place: 1 });
  });

  it('counts pinned by kind from roster member focus_id, resolving the archive card kind', () => {
    const session = makeSession({
      archive: [card('m-1', 'tradition'), card('m-2', 'person')],
      tiers: { person: makeTier('person', ['m-1', 'm-2', undefined]) },
    });
    expect(computeArchiveStats(session).pinned).toEqual({ tradition: 1, person: 1 });
  });

  it('ignores focus_ids that reference no archive card', () => {
    const session = makeSession({
      archive: [card('m-1', 'person')],
      tiers: { person: makeTier('person', ['m-missing']) },
    });
    expect(computeArchiveStats(session).pinned).toEqual({});
  });

  it('counts distinct cards once across bench pins and focus_ids', () => {
    const session = makeSession({
      archive: [card('m-1', 'person')],
      benches: { person: makeBench(pinOf('m-1', 'person')) },
      tiers: { person: makeTier('person', ['m-1', 'm-1']) },
    });
    expect(computeArchiveStats(session).pinned).toEqual({ person: 1 });
  });

  it('reads world drafts from the parameter: total plus per-scale counts', () => {
    const stats = computeArchiveStats(makeSession({}), [
      { scale: 'person' },
      { scale: 'household' },
      { scale: 'household' },
    ]);
    expect(stats.world_drafts).toEqual({ total: 3, person: 1, household: 2 });
  });

  it('defaults world_drafts.total to 0 when no drafts are supplied', () => {
    expect(computeArchiveStats(makeSession({})).world_drafts).toEqual({ total: 0 });
  });

  it('counts harvests by rarity over the archive', () => {
    const session = makeSession({
      archive: [
        card('m-1', 'person', 'common'),
        card('m-2', 'person', 'common'),
        card('m-3', 'person', 'uncommon'),
        card('m-4', 'person', 'rare'),
      ],
    });
    expect(computeArchiveStats(session).harvests).toEqual({ common: 2, uncommon: 1, rare: 1 });
  });

  it('returns zeroed stats for an empty session', () => {
    const stats = computeArchiveStats(makeSession({}));
    expect(stats.pinned).toEqual({});
    expect(stats.world_drafts).toEqual({ total: 0 });
    expect(stats.harvests).toEqual({ common: 0, uncommon: 0, rare: 0 });
  });
});

/* ---- evaluateArchivePredicate ---------------------------------------------- */

const STATS: ArchiveStats = {
  pinned: { person: 3 },
  world_drafts: { total: 1, household: 2 },
  harvests: { common: 5, uncommon: 1, rare: 0 },
};

describe('evaluateArchivePredicate', () => {
  it('compares with gte, gt, and eq', () => {
    expect(evaluateArchivePredicate(STATS, { op: 'gte', key: 'pinned.person', value: 3 })).toBe(
      true,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'gte', key: 'pinned.person', value: 4 })).toBe(
      false,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'gt', key: 'pinned.person', value: 3 })).toBe(
      false,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'gt', key: 'pinned.person', value: 2 })).toBe(
      true,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'eq', key: 'harvests.uncommon', value: 1 })).toBe(
      true,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'eq', key: 'harvests.rare', value: 0 })).toBe(
      true,
    );
  });

  it('treats missing or unknown keys as 0', () => {
    expect(evaluateArchivePredicate(STATS, { op: 'gte', key: 'pinned.tradition', value: 1 })).toBe(
      false,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'eq', key: 'pinned.tradition', value: 0 })).toBe(
      true,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'gte', key: 'karma.total', value: 1 })).toBe(
      false,
    );
    expect(evaluateArchivePredicate(STATS, { op: 'eq', key: 'pinned', value: 0 })).toBe(true);
  });

  it('evaluates and/or junctions and not', () => {
    const both: ArchivePredicateLike = {
      op: 'and',
      operands: [
        { op: 'gte', key: 'world_drafts.total', value: 1 },
        { op: 'gte', key: 'pinned.person', value: 3 },
      ],
    };
    expect(evaluateArchivePredicate(STATS, both)).toBe(true);
    expect(
      evaluateArchivePredicate(STATS, {
        op: 'and',
        operands: [
          { op: 'gte', key: 'world_drafts.total', value: 1 },
          { op: 'gt', key: 'pinned.person', value: 3 },
        ],
      }),
    ).toBe(false);

    expect(
      evaluateArchivePredicate(STATS, {
        op: 'or',
        operands: [
          { op: 'gte', key: 'harvests.rare', value: 1 },
          { op: 'gte', key: 'harvests.uncommon', value: 1 },
        ],
      }),
    ).toBe(true);
    expect(
      evaluateArchivePredicate(STATS, {
        op: 'or',
        operands: [
          { op: 'gte', key: 'harvests.rare', value: 1 },
          { op: 'gt', key: 'harvests.uncommon', value: 1 },
        ],
      }),
    ).toBe(false);

    expect(
      evaluateArchivePredicate(STATS, {
        op: 'not',
        operand: { op: 'gt', key: 'pinned.person', value: 3 },
      }),
    ).toBe(true);
  });

  it('accepts the content ArchivePredicate shape structurally', () => {
    const contentPredicate: ArchivePredicate = {
      op: 'and',
      operands: [
        { op: 'gte', key: 'world_drafts.total', value: 1 },
        { op: 'not', operand: { op: 'gt', key: 'pinned.person', value: 3 } },
      ],
    };
    const engineView: ArchivePredicateLike = contentPredicate;
    expect(evaluateArchivePredicate(STATS, engineView)).toBe(true);
  });
});

/* ---- validateArchivePredicateKeys ------------------------------------------ */

describe('validateArchivePredicateKeys', () => {
  it('returns an empty list for the shipped key vocabulary', () => {
    const predicate: ArchivePredicateLike = {
      op: 'and',
      operands: [
        { op: 'gte', key: 'pinned.person', value: 3 },
        { op: 'gte', key: 'world_drafts.total', value: 1 },
        { op: 'gte', key: 'world_drafts.household', value: 1 },
        { op: 'gte', key: 'harvests.rare', value: 1 },
        { op: 'gte', key: 'pinned.anything-at-all', value: 1 },
      ],
    };
    expect(validateArchivePredicateKeys(predicate)).toEqual([]);
  });

  it('surfaces unknown sections, scales, and rarities', () => {
    expect(validateArchivePredicateKeys({ op: 'gte', key: 'karma.total', value: 1 })).toEqual([
      'karma.total',
    ]);
    expect(
      validateArchivePredicateKeys({ op: 'gte', key: 'world_drafts.galaxy', value: 1 }),
    ).toEqual(['world_drafts.galaxy']);
    expect(
      validateArchivePredicateKeys({ op: 'gte', key: 'harvests.legendary', value: 1 }),
    ).toEqual(['harvests.legendary']);
  });

  it('flags malformed keys without a section or tail', () => {
    expect(validateArchivePredicateKeys({ op: 'gte', key: 'pinned', value: 1 })).toEqual([
      'pinned',
    ]);
    expect(validateArchivePredicateKeys({ op: 'gte', key: 'harvests.', value: 1 })).toEqual([
      'harvests.',
    ]);
  });

  it('collects unknown keys nested under junctions and negation, deduped', () => {
    const predicate: ArchivePredicateLike = {
      op: 'not',
      operand: {
        op: 'or',
        operands: [
          { op: 'gte', key: 'karma.total', value: 1 },
          {
            op: 'and',
            operands: [
              { op: 'gte', key: 'karma.total', value: 2 },
              { op: 'gte', key: 'enlightenment.score', value: 3 },
            ],
          },
        ],
      },
    };
    expect(validateArchivePredicateKeys(predicate)).toEqual(['karma.total', 'enlightenment.score']);
  });
});
