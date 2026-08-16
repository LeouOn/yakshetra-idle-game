import { describe, expect, it } from 'vitest';

import type { RolesFile } from '@/content/progression/schema';

import { createRng } from '@/engine/rng';
import {
  emptyHydratedSession,
  snapshotStudioSession,
  StudioSessionSchema,
  type BenchState,
  type MemberSlice,
  type StudioSession,
} from '@/engine/studio-session';
import { TIER_STATE_VERSION } from '@/engine/tier-state';

import { graduateToHousehold, type HouseholdRolesTable } from '@/engine/graduation';

/* ---- fixtures ------------------------------------------------------------ */

const ROLES: HouseholdRolesTable = {
  roles: ['elder', 'cook', 'runner'],
  names: ['Second Aunt', 'Old Wen', 'Little Shu'],
};

function baseSession(): StudioSession {
  const hydrated = emptyHydratedSession();
  return snapshotStudioSession(hydrated.studio, hydrated.idle, hydrated.life, hydrated.practices);
}

const EMPTY_BENCH: BenchState = {
  residue: [],
  last_harvest_index: -1,
  bay: null,
  quality_tier: 0,
  harvest_count: 0,
  play_import: null,
  pinned: null,
  surplus: 0,
};

/* ---- graduateToHousehold -------------------------------------------------- */

describe('graduateToHousehold', () => {
  it('seeds the household tier, bench, roster, and member slices in one pass', () => {
    const out = graduateToHousehold(baseSession(), ROLES, createRng(101n));

    const household = out.tiers['household'];
    expect(household).toBeDefined();
    expect(household?.schema_version).toBe(TIER_STATE_VERSION);
    expect(household?.unlocked).toBe(true);
    expect(household?.roster.tier).toBe('household');

    const members = household?.roster.members ?? [];
    expect(members.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    for (const member of members) {
      expect(ROLES.roles).toContain(member.role);
      expect(ROLES.names).toContain(member.name);
      expect(member.policy).toBe('policy:household-base');
      expect(member.embodied).toBe(false);
      expect(Number.isInteger(member.seed)).toBe(true);
    }

    expect(out.benches['household']).toEqual(EMPTY_BENCH);
    for (const id of ['m1', 'm2', 'm3']) {
      const slice: MemberSlice | undefined = out.members[id];
      expect(slice).toBeDefined();
      expect(slice?.life.turn).toBe(0);
      expect(slice?.life.residue).toEqual([]);
      expect(slice?.practices).toEqual([]);
    }
  });

  it('gives every member a distinct integer seed from the same graduation', () => {
    const out = graduateToHousehold(baseSession(), ROLES, createRng(103n));
    const seeds = out.tiers['household']?.roster.members.map((m) => m.seed) ?? [];
    expect(seeds).toHaveLength(3);
    expect(seeds.every((seed) => Number.isInteger(seed))).toBe(true);
    expect(new Set(seeds).size).toBe(3);
  });

  it('is deterministic: the same rng seed graduates to the same roster', () => {
    const first = graduateToHousehold(baseSession(), ROLES, createRng(211n));
    const second = graduateToHousehold(baseSession(), ROLES, createRng(211n));
    expect(second.tiers['household']?.roster.members).toEqual(
      first.tiers['household']?.roster.members,
    );
    expect(second.members).toEqual(first.members);
  });

  it('picks roles and names from the supplied tables', () => {
    const pinned: HouseholdRolesTable = {
      roles: ['cook'],
      names: ['Old Wen'],
    };
    const out = graduateToHousehold(baseSession(), pinned, createRng(307n));
    for (const member of out.tiers['household']?.roster.members ?? []) {
      expect(member.role).toBe('cook');
      expect(member.name).toBe('Old Wen');
    }
  });

  it('records the unlock-household milestone exactly once', () => {
    const once = graduateToHousehold(baseSession(), ROLES, createRng(401n));
    expect(once.milestones_done).toEqual(['unlock-household']);
    const twice = graduateToHousehold(once, ROLES, createRng(409n));
    expect(twice.milestones_done).toEqual(['unlock-household']);
  });

  it('is idempotent: an already-unlocked session returns unchanged', () => {
    const graduated = graduateToHousehold(baseSession(), ROLES, createRng(503n));
    const again = graduateToHousehold(graduated, ROLES, createRng(509n));
    expect(again).toBe(graduated);
  });

  it('leaves the person bench and archive untouched', () => {
    const base = baseSession();
    const out = graduateToHousehold(base, ROLES, createRng(601n));
    expect(out.benches['person']).toEqual(base.benches['person']);
    expect(out.archive).toEqual(base.archive);
    expect(out.tiers['person']).toEqual(base.tiers['person']);
    expect(out.life).toEqual(base.life);
    expect(out.idle).toEqual(base.idle);
  });

  it('accepts the content roles file structurally and round-trips the schema', () => {
    const contentRoles: RolesFile['household'] = {
      roles: ['elder'],
      names: ['Second Aunt'],
    };
    const out = graduateToHousehold(baseSession(), contentRoles, createRng(701n));
    expect(() => StudioSessionSchema.parse(out)).not.toThrow();
    expect(StudioSessionSchema.parse(out).tiers['household']?.unlocked).toBe(true);
  });
});
