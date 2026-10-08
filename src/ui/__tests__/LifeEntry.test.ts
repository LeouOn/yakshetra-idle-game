// Life-route entry decision — the second life must be a NEW life.
//
// A life ends, the bardo offers the other era, and the player picks a role.
// The route has to open a fresh life in that era and append it to the chain.
// Before this seam existed the route resumed whatever life sat in the current
// slot, so the player re-entered their own corpse and died again on arrival.
//
// Pure-function test: `resolveLifeEntry` is exported from the route file
// (the same seam the default export's effect calls) so no router is needed.

import { describe, expect, it, vi } from 'vitest';

import { createLifeState, snapshotLifeChain, startNextLife } from '@/engine';
import type { EraId, LifeId, LifeState, RoleId, SaveBlob, StudioSession } from '@/engine';

import { resolveLifeEntry } from '../../../app/life/[lifeId]';

// The route module imports expo-router at module scope; mock it before import.
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ lifeId: 'pending' }),
  useRouter: () => ({ push: vi.fn() }),
}));

function makeLife(id: string, era: string, role: string, alive = true): LifeState {
  return createLifeState({
    id: id as LifeId,
    era: era as EraId,
    role: role as RoleId,
    identity: {
      gender: 'unset',
      social_class: 'unset',
      family_wealth_at_birth: 'unset',
      caste_status: 'unset',
      disability_status: 'unset',
    },
    ...(alive ? {} : { age: 41 }),
  });
}

function dead(over: Partial<LifeState> = {}): LifeState {
  return { ...makeLife('life-1', 'tang-china', 'peasant'), alive: false, ...over };
}

const NONE: StudioSession | null = null;

describe('resolveLifeEntry', () => {
  it('resumes the life in progress when the chain still has one', () => {
    const prior = snapshotLifeChain(makeLife('life-1', 'tang-china', 'peasant'), null, 10);
    const entry = resolveLifeEntry({
      prior,
      era: 'fantasy-mahayana',
      roleId: 'newly-arrived-soul',
      studio: NONE,
    });
    expect(entry.isNewLife).toBe(false);
    expect(entry.life.id).toBe('life-1');
    expect(entry.prior).toBe(prior);
  });

  it('opens a new life in the chosen era once the current life has ended', () => {
    const prior = snapshotLifeChain(dead(), null, 10);
    const entry = resolveLifeEntry({
      prior,
      era: 'fantasy-mahayana',
      roleId: 'newly-arrived-soul',
      studio: NONE,
    });
    expect(entry.isNewLife).toBe(true);
    expect(entry.life.alive).toBe(true);
    expect(entry.life.era).toBe('fantasy-mahayana');
    expect(entry.life.role).toBe('newly-arrived-soul');
    // The new life is named for its place in the chain, so it can never
    // collide with the life that ended.
    expect(String(entry.life.id)).toBe('life-2');
    // The finished life is still in the chain behind the new one.
    expect(entry.prior?.chain.life_states).toHaveLength(1);
  });

  it('falls back to the era default when the route params are absent or unusable', () => {
    const prior: SaveBlob | null = null;
    const fallback = resolveLifeEntry({
      prior,
      era: 'not-an-era',
      roleId: 'not a role id',
      studio: NONE,
    });
    expect(fallback.life.era).toBe('tang-china');
    expect(fallback.life.role).toBe('peasant');
    expect(fallback.isNewLife).toBe(true);
  });

  it('names the first life of an empty chain life-1', () => {
    const entry = resolveLifeEntry({
      prior: null,
      era: 'tang-china',
      roleId: 'peasant',
      studio: NONE,
    });
    expect(String(entry.life.id)).toBe('life-1');
  });

  it('starts a fresh chain once the old one has spent its lives', () => {
    let chain: SaveBlob | null = null;
    for (const id of ['life-1', 'life-2']) {
      chain = startNextLife(chain, dead({ id: id as LifeState['id'] }), 10);
    }
    const closed = chain as SaveBlob;
    expect(closed.chain.life_states).toHaveLength(2);

    const entry = resolveLifeEntry({
      prior: closed,
      era: 'tang-china',
      roleId: 'peasant',
      studio: NONE,
    });
    expect(entry.isNewLife).toBe(true);
    // No prior blob to append to: the next life opens a new chain rather than
    // a third life in a chain that already closed.
    expect(entry.prior).toBeNull();
    expect(String(entry.life.id)).toBe('life-1');
    expect(startNextLife(entry.prior, entry.life, 20).chain.life_states).toHaveLength(1);
  });

  it('keeps a well-formed role id from the era the player picked', () => {
    const entry = resolveLifeEntry({
      prior: null,
      era: 'fantasy-mahayana',
      roleId: 'newly-arrived-soul',
      studio: NONE,
    });
    expect(entry.life.role).toBe('newly-arrived-soul');
  });

  it('carries bench ties onto a new life, never onto a resumed one', () => {
    const prior = snapshotLifeChain(dead(), null, 10);
    const studio = {
      benches: {
        person: {
          residue: [],
          last_harvest_index: -1,
          bay: null,
          quality_tier: 0,
          harvest_count: 0,
          play_import: null,
          pinned: {
            id: 'card-1',
            name: 'The night clerk',
            kind: 'person' as const,
            one_liner: 'Kept the lamp.',
          },
          surplus: 0,
          fold_position: 0,
        },
      },
      archive: [],
      tiers: {},
      milestones_done: [],
      compendium_done: [],
      embodied_member: null,
      idle: { mode: 'away' as const, last_simulated_tick: '0', total_idle_ticks: '0' },
      life: { turn: 0, resources: {}, skills: {}, residue: [] },
      practices: [],
      members: {},
      world_drafts: [],
    } as unknown as StudioSession;

    const fresh = resolveLifeEntry({
      prior,
      era: 'fantasy-mahayana',
      roleId: 'newly-arrived-soul',
      studio,
    });
    expect(fresh.life.flags.has('pin:card-1')).toBe(true);
    expect(fresh.life.relationships['card-1']).toBeDefined();

    const resumed = resolveLifeEntry({
      prior: snapshotLifeChain(makeLife('life-9', 'tang-china', 'peasant'), null, 1),
      era: 'tang-china',
      roleId: 'peasant',
      studio,
    });
    expect(resumed.life.flags.has('pin:card-1')).toBe(false);
  });
});
