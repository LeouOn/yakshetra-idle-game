import { describe, expect, it } from 'vitest';

// Type-only (erased at runtime): the content Milestone row must stay
// structurally assignable to the engine's MilestoneLike view — no runtime
// dependency from src/engine on src/content.
import type { Milestone } from '@/content/progression/schema';

import { MANIFEST_SCHEMA_VERSION, TABLE_FILL_REVISION } from '@/engine/manifest';
import {
  emptyHydratedSession,
  snapshotStudioSession,
  type StudioSession,
} from '@/engine/studio-session';

import { validateArchivePredicateKeys } from '@/engine/archive-stats';
import { checkMilestones, type MilestoneLike } from '@/engine/milestones';

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

function makeSession(parts: {
  archive?: readonly SessionCard[];
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
    ...(parts.milestonesDone === undefined ? {} : { milestones_done: [...parts.milestonesDone] }),
  };
}

const UNLOCK_HOUSEHOLD: MilestoneLike = {
  id: 'unlock-household',
  predicate: {
    op: 'and',
    operands: [
      { op: 'gte', key: 'archived.person', value: 3 },
      { op: 'gte', key: 'world_drafts.total', value: 1 },
    ],
  },
};

/** Three archived persons — the pre-roster gate needs no pins or focus_ids. */
function crossedSession(): StudioSession {
  return makeSession({
    archive: [personCard('m-1'), personCard('m-2'), personCard('m-3')],
    milestonesDone: [],
  });
}

/* ---- checkMilestones ------------------------------------------------------ */

describe('checkMilestones', () => {
  it('fires unlock-household when archived.person >= 3 and world_drafts.total >= 1', () => {
    const fired = checkMilestones(crossedSession(), [{ scale: 'person' }], [UNLOCK_HOUSEHOLD]);
    expect(fired).toEqual(['unlock-household']);
  });

  it('fires a crossing milestone exactly once: done ids never re-fire', () => {
    const session = crossedSession();
    const first = checkMilestones(session, [{ scale: 'person' }], [UNLOCK_HOUSEHOLD]);
    expect(first).toEqual(['unlock-household']);

    const after = { ...session, milestones_done: [...session.milestones_done, ...first] };
    expect(checkMilestones(after, [{ scale: 'person' }], [UNLOCK_HOUSEHOLD])).toEqual([]);
  });

  it('does not fire below the archived threshold', () => {
    const session = makeSession({
      archive: [personCard('m-1'), personCard('m-2')],
    });
    expect(checkMilestones(session, [{ scale: 'person' }], [UNLOCK_HOUSEHOLD])).toEqual([]);
  });

  it('does not fire without a world draft', () => {
    expect(checkMilestones(crossedSession(), [], [UNLOCK_HOUSEHOLD])).toEqual([]);
  });

  it('dedupes repeated milestone rows with the same id', () => {
    const fired = checkMilestones(
      crossedSession(),
      [{ scale: 'person' }],
      [UNLOCK_HOUSEHOLD, UNLOCK_HOUSEHOLD],
    );
    expect(fired).toEqual(['unlock-household']);
  });

  it('fires only satisfied milestones, preserving input order', () => {
    const session = crossedSession(); // archive of 3 common persons, one draft
    const milestones: readonly MilestoneLike[] = [
      { id: 'a', predicate: { op: 'gte', key: 'harvests.common', value: 1 } },
      { id: 'b', predicate: { op: 'gte', key: 'harvests.rare', value: 1 } },
      { id: 'c', predicate: { op: 'gte', key: 'world_drafts.total', value: 1 } },
    ];
    expect(checkMilestones(session, [{ scale: 'person' }], milestones)).toEqual(['a', 'c']);
  });

  it('never fires an unknown-key predicate and validation surfaces the key', () => {
    const weird: MilestoneLike = {
      id: 'weird',
      predicate: { op: 'gte', key: 'karma.total', value: 1 },
    };
    expect(checkMilestones(crossedSession(), [], [weird])).toEqual([]);
    expect(validateArchivePredicateKeys(weird.predicate)).toEqual(['karma.total']);
  });

  it('accepts the content Milestone row structurally', () => {
    const contentRow: Milestone = {
      schema_version: 'milestone/v0',
      id: 'unlock-household',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'world_drafts.total', value: 1 },
          { op: 'gte', key: 'archived.person', value: 3 },
        ],
      },
      grants: { tier: 'household', ceremony_sid: 'graduation.household' },
    };
    expect(checkMilestones(crossedSession(), [{ scale: 'person' }], [contentRow])).toEqual([
      'unlock-household',
    ]);
  });
});
