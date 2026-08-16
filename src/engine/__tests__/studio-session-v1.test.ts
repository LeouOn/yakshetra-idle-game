import { describe, expect, it } from 'vitest';

import { createStudioState } from '@/engine/operations';
import {
  defaultProgression,
  emptyHydratedSession,
  hydrateStudioSession,
  parseStudioSession,
  snapshotStudioSession,
} from '@/engine/studio-session';

const V0_SESSION = {
  schema_version: 'studio_session/v0',
  studio: {
    residue: [
      { tick: 1, type: 'practice_tick', ids: ['p:zazen'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['p:walking'], numbers: {} },
    ],
    last_harvest_index: -1,
    bay: null,
    archive: [
      {
        schema_version: 'manifest/v0',
        id: 'm-0-1',
        rng_seed: '42',
        brief: null,
        residue_window_id: 'w-1-3-3',
        kind: 'person',
        name: 'The night clerk',
        one_liner: 'Remembers what you owe before you do.',
        subject: 'a keeper of small debts',
        detail: 'The ledger stays open at strange hours.',
        tags: ['clerk'],
        rarity: 'common',
        fill_status: 'table',
        quality_tier: 0,
        provenance: { source: 'table', revision: 'table/v0' },
      },
    ],
    quality_tier: 0,
    harvest_count: 1,
  },
  idle: { mode: 'idle', last_simulated_tick: '0', total_idle_ticks: '0' },
  life: { turn: 0, resources: {}, skills: {}, residue: [] },
  practices: [],
} as const;

describe('parseStudioSession v0 migration', () => {
  it('wraps the v0 bay as the person bench', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.schema_version).toBe('studio_session/v1');
    expect(session.benches['person']?.harvest_count).toBe(1);
    expect(session.benches['person']?.residue).toHaveLength(2);
  });

  it('hoists the archive and migrates its manifests to v1', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.archive).toHaveLength(1);
    expect(session.archive[0]?.schema_version).toBe('manifest/v1');
    expect(session.archive[0]?.scale).toBe('person');
  });

  it('seeds the person tier state and empty progression', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.tiers['person']?.unlocked).toBe(true);
    expect(session.tiers['person']?.roster.members).toEqual([]);
    expect(session.milestones_done).toEqual([]);
    expect(session.compendium_done).toEqual([]);
    expect(session.embodied_member).toBeNull();
  });

  it('hydrates a migrated session into today’s runtime shape', () => {
    const session = parseStudioSession(V0_SESSION);
    const hydrated = hydrateStudioSession(session, emptyHydratedSession().life, []);
    expect(hydrated.studio.harvest_count).toBe(1);
    expect(hydrated.studio.archive).toHaveLength(1);
    expect(hydrated.studio.residue).toHaveLength(2);
    expect(hydrated.progression.tiers['person']?.unlocked).toBe(true);
  });

  it('migrates absent optional bench fields to their v1 defaults', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.benches['person']?.play_import).toBeNull();
    expect(session.benches['person']?.pinned).toBeNull();
    expect(session.benches['person']?.surplus).toBe(0);
  });
});

describe('v1 round-trip', () => {
  it('snapshot -> parse -> hydrate preserves the bench and archive', () => {
    const base = emptyHydratedSession();
    const snapshot = snapshotStudioSession(base.studio, base.idle, base.life, base.practices);
    expect(snapshot.schema_version).toBe('studio_session/v1');
    const parsed = parseStudioSession(JSON.parse(JSON.stringify(snapshot)));
    const hydrated = hydrateStudioSession(parsed, base.life, []);
    expect(hydrated.studio).toEqual(createStudioState());
    expect(hydrated.progression).toEqual(defaultProgression());
  });
});

describe('v1.1 additive — members slice + world drafts', () => {
  const V1_0_PAYLOAD = {
    schema_version: 'studio_session/v1',
    benches: {
      person: {
        residue: [],
        last_harvest_index: -1,
        bay: null,
        quality_tier: 0,
        harvest_count: 0,
        play_import: null,
        pinned: null,
        surplus: 0,
      },
    },
    archive: [],
    tiers: {},
    milestones_done: [],
    compendium_done: [],
    embodied_member: null,
    idle: { mode: 'idle', last_simulated_tick: '0', total_idle_ticks: '0' },
    life: { turn: 0, resources: {}, skills: {}, residue: [] },
    practices: [],
  } as const;

  it('parses a v1.0 payload (no members, no world_drafts) with both defaulted', () => {
    const session = parseStudioSession(V1_0_PAYLOAD);
    expect(session.members).toEqual({});
    expect(session.world_drafts).toEqual([]);
  });

  it('snapshot -> parse -> hydrate preserves members and world_drafts', () => {
    const base = emptyHydratedSession();
    const members = {
      'member:chen': {
        life: { turn: 3, resources: { gold: 5 }, skills: { fishing: 1 }, residue: [] },
        practices: [{ id: 'p:zazen', currentProgress: 0.5, level: 1 }],
      },
    };
    const world_drafts = [{ scale: 'street' }, { scale: 'household' }];
    const snapshot = snapshotStudioSession(
      base.studio,
      base.idle,
      base.life,
      base.practices,
      undefined,
      defaultProgression(),
      { members, world_drafts },
    );
    const parsed = parseStudioSession(JSON.parse(JSON.stringify(snapshot)));
    const hydrated = hydrateStudioSession(parsed, base.life, []);
    expect(parsed.members).toEqual(members);
    expect(parsed.world_drafts).toEqual(world_drafts);
    expect(hydrated.members).toEqual(members);
    expect(hydrated.world_drafts).toEqual(world_drafts);
  });

  it('v0 migration yields empty members and empty world_drafts', () => {
    const session = parseStudioSession(V0_SESSION);
    expect(session.members).toEqual({});
    expect(session.world_drafts).toEqual([]);
  });
});
