// Next-action derivation — pure, no React/DOM.
//
// Covers each rule's fire + the first-match-wins priority order + the
// null-when-nothing case. The fixtures are hand-built: the real progression
// registries are loaded once, and each session is shaped so only the rule
// under test is true (or the priority order under test is observable).

import { describe, expect, it } from 'vitest';

import { loadProgression } from '@/content/progression/loader';
import { MANIFEST_SCHEMA_VERSION, TABLE_FILL_REVISION } from '@/engine/manifest';
import {
  createTierState,
  emptyHydratedSession,
  snapshotStudioSession,
  type BenchState,
  type StudioSession,
  type WorldDraftReference,
} from '@/engine';

import { nextAction } from '../next-action';

const registries = loadProgression();

/* ---- fixtures ------------------------------------------------------------ */

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

function traditionCard(id: string): SessionCard {
  return { ...personCard(id), kind: 'tradition', scale: 'household' };
}

function readyBench(): BenchState {
  return {
    residue: [],
    last_harvest_index: -1,
    bay: {
      id: 'op-fixture',
      type: 'develop_from_residue',
      residue_window_id: 'w-1-3-1',
      residue: [],
      brief: null,
      cook_ticks_total: 6,
      cook_ticks_done: 6,
      status: 'ready',
      rng_seed: '1',
      focus: null,
    },
    quality_tier: 0,
    harvest_count: 0,
    play_import: null,
    pinned: null,
    surplus: 0,
    fold_position: 0,
  };
}

function personBenchWithPending(count: number): BenchState {
  const residue = Array.from({ length: count }, (_, index) => ({
    tick: index + 1,
    type: 'practice_tick' as const,
    ids: ['practice.test'],
    numbers: { progress: 2 },
  }));
  return {
    residue,
    last_harvest_index: -1,
    bay: null,
    quality_tier: 0,
    harvest_count: 0,
    play_import: null,
    pinned: null,
    surplus: 0,
    fold_position: 0,
  };
}

function makeSession(parts: {
  archive?: readonly SessionCard[];
  benches?: Readonly<Record<string, BenchState>>;
  tiers?: Readonly<Record<string, StudioSession['tiers'][string]>>;
  milestonesDone?: readonly string[];
  worldDrafts?: readonly WorldDraftReference[];
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
    ...(parts.worldDrafts === undefined ? {} : { world_drafts: [...parts.worldDrafts] }),
  };
}

/* ---- tests --------------------------------------------------------------- */

describe('nextAction', () => {
  it('returns null when no rule fires (empty session)', () => {
    const session = makeSession({});
    expect(nextAction(session, [], registries)).toBeNull();
  });

  it('rule a: picks the highest-index ready bench for the harvest prompt', () => {
    // Two ready benches (person index 0, household index 1) — harvest must
    // pick the household rung (the higher index).
    const session = makeSession({
      benches: {
        person: readyBench(),
        household: readyBench(),
      },
    });
    expect(nextAction(session, [], registries)).toEqual({
      sid: 'studio.next_harvest_sid',
      values: { tier: 'Household' },
    });
  });

  it('rule b: surfaces a locked rung whose gate is at 100%', () => {
    // unlock-org predicate: archived.tradition >= 2 AND world_drafts.household >= 1.
    // 2 traditions + 1 household draft → both satisfied → ratio = 1.0.
    const session = makeSession({
      archive: [traditionCard('c-1'), traditionCard('c-2')],
      milestonesDone: ['unlock-household'],
      worldDrafts: [{ scale: 'household' }],
    });
    expect(nextAction(session, [{ scale: 'household' }], registries)).toEqual({
      sid: 'studio.next_gate_sid',
      values: { name: 'Workshop', n: 2, m: 2 },
    });
  });

  it('rule b: hides below 80% (the rung is approaching, not arrived)', () => {
    // 1 of 2 traditions archived → ratio = 0.5, gate not surfaced.
    const session = makeSession({
      archive: [traditionCard('c-1')],
      milestonesDone: ['unlock-household'],
      worldDrafts: [{ scale: 'household' }],
    });
    const result = nextAction(session, [{ scale: 'household' }], registries);
    expect(result?.sid).not.toBe('studio.next_gate_sid');
  });

  it('rule c: surfaces develop when the embodied bench has enough pending residue', () => {
    // 3 pending residue (no endowment) → effective min = 3 → ready.
    const session = makeSession({
      benches: { person: personBenchWithPending(3) },
    });
    expect(nextAction(session, [], registries)).toEqual({
      sid: 'studio.next_develop_sid',
    });
  });

  it('rule c: locks develop when the pending window is below the effective minimum', () => {
    // 2 pending → below the no-endowment min of 3 → not develop.
    const session = makeSession({
      benches: { person: personBenchWithPending(2) },
    });
    // The fixture has no archive and no visitor, so the only ways a prompt
    // can surface is develop or enrich. Develop is locked, enrich is empty,
    // so the next-action is null.
    expect(nextAction(session, [], registries)).toBeNull();
  });

  it('rule d: surfaces the seated visitor prompt', () => {
    const session = makeSession({
      tiers: {
        person: {
          ...createTierState('person', true),
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 2 },
        },
      },
    });
    expect(nextAction(session, [], registries)).toEqual({
      sid: 'studio.next_visitor_sid',
      values: { name: 'The yakṣa at the gate' },
    });
  });

  it('rule e: surfaces an empty endowment slot when an archive card is available', () => {
    const session = makeSession({
      archive: [personCard('c-1')],
      tiers: { person: createTierState('person', true) },
    });
    expect(nextAction(session, [], registries)).toEqual({
      sid: 'studio.next_endow_sid',
      values: { tier: 'One life' },
    });
  });

  it('rule e: stays silent when the archive is empty', () => {
    const session = makeSession({
      tiers: { person: createTierState('person', true) },
    });
    expect(nextAction(session, [], registries)).toBeNull();
  });

  it('priority: a ready harvest beats a closing gate, a pending develop, a visitor, and an endow slot', () => {
    // Everything is true at once; the ready bench wins.
    const session = makeSession({
      archive: [personCard('c-1'), traditionCard('c-1'), traditionCard('c-2')],
      benches: { person: readyBench() },
      milestonesDone: ['unlock-household'],
      worldDrafts: [{ scale: 'household' }],
      tiers: {
        person: {
          ...createTierState('person', true),
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 1 },
        },
      },
    });
    expect(nextAction(session, [{ scale: 'household' }], registries)?.sid).toBe(
      'studio.next_harvest_sid',
    );
  });

  it('priority: a closing gate beats a develop prompt, a visitor, and an endow slot', () => {
    // No ready bench: but the gate is closing, develop is ready, a visitor
    // is seated, and an archive card is ready to endow. Gate wins.
    const session = makeSession({
      archive: [personCard('c-1'), traditionCard('c-1'), traditionCard('c-2')],
      benches: { person: personBenchWithPending(3) },
      milestonesDone: ['unlock-household'],
      worldDrafts: [{ scale: 'household' }],
      tiers: {
        person: {
          ...createTierState('person', true),
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 1 },
        },
      },
    });
    expect(nextAction(session, [{ scale: 'household' }], registries)?.sid).toBe(
      'studio.next_gate_sid',
    );
  });

  it('priority: a develop prompt beats a visitor and an endow slot', () => {
    const session = makeSession({
      archive: [personCard('c-1')],
      benches: { person: personBenchWithPending(3) },
      tiers: {
        person: {
          ...createTierState('person', true),
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 1 },
        },
      },
    });
    expect(nextAction(session, [], registries)?.sid).toBe('studio.next_develop_sid');
  });

  it('priority: a seated visitor beats an empty endowment slot', () => {
    const session = makeSession({
      archive: [personCard('c-1')],
      tiers: {
        person: {
          ...createTierState('person', true),
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 1 },
        },
      },
    });
    expect(nextAction(session, [], registries)?.sid).toBe('studio.next_visitor_sid');
  });
});
