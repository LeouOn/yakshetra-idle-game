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
