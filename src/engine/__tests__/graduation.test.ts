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

import {
  graduateToHousehold,
  graduateToTier,
  type GraduationRolesRow,
  type GraduationTierRow,
  type HouseholdRolesTable,
} from '@/engine/graduation';

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
  fold_position: 0,
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

/* ---- graduateToTier: content-driven org + town ---------------------------- */

// Content-shaped tier rows (tiers.json5 values, engine-pure literals here).
const HOUSEHOLD_CONTENT_ROW: GraduationTierRow = {
  id: 'household',
  index: 1,
  roster_size: { min: 3, max: 8 },
  member_unit: 'person',
  unlock_milestone: 'unlock-household',
};

const ORG_ROW: GraduationTierRow = {
  id: 'org',
  index: 2,
  roster_size: { min: 2, max: 12 },
  member_unit: 'household',
  unlock_milestone: 'unlock-org',
};

const TOWN_ROW: GraduationTierRow = {
  id: 'town',
  index: 3,
  roster_size: { min: 3, max: 24 },
  member_unit: 'household',
  unlock_milestone: 'unlock-town',
};

const ORG_ROLES: GraduationRolesRow = {
  roles: ['steward', 'brewer'],
  names: ['Auntie Ji', 'Foreman Ku'],
  policy: 'policy:household-base',
};

function householdSession(): StudioSession {
  return graduateToHousehold(baseSession(), ROLES, createRng(101n));
}

describe('graduateToTier (org, member-bearing)', () => {
  it('seeds roster_size.min autonomous members with tier-prefixed ids and the roles-row policy', () => {
    const out = graduateToTier(householdSession(), 'org', ORG_ROW, ORG_ROLES, createRng(601n));

    const org = out.tiers['org'];
    expect(org?.unlocked).toBe(true);
    const members = org?.roster.members ?? [];
    expect(members.map((m) => m.id)).toEqual(['org-m1', 'org-m2']);
    for (const member of members) {
      expect(ORG_ROLES.roles).toContain(member.role);
      expect(ORG_ROLES.names).toContain(member.name);
      expect(member.policy).toBe('policy:household-base');
      expect(member.embodied).toBe(false);
      expect(Number.isInteger(member.seed)).toBe(true);
    }
    // Member slices exist so the ladder runs these lives autonomously.
    for (const id of ['org-m1', 'org-m2']) {
      expect(out.members[id]).toBeDefined();
      expect(out.members[id]?.life.turn).toBe(0);
      expect(out.members[id]?.life.residue).toEqual([]);
      expect(out.members[id]?.practices).toEqual([]);
    }
  });

  it('opens a fresh org bench and appends unlock-org after the household milestone', () => {
    const out = graduateToTier(householdSession(), 'org', ORG_ROW, ORG_ROLES, createRng(607n));
    expect(out.benches['org']).toEqual(EMPTY_BENCH);
    expect(out.milestones_done).toEqual(['unlock-household', 'unlock-org']);
  });

  it('is deterministic: the same rng stream graduates to the same org roster', () => {
    const first = graduateToTier(householdSession(), 'org', ORG_ROW, ORG_ROLES, createRng(613n));
    const second = graduateToTier(householdSession(), 'org', ORG_ROW, ORG_ROLES, createRng(613n));
    expect(second.tiers['org']?.roster.members).toEqual(first.tiers['org']?.roster.members);
    expect(second.members).toEqual(first.members);
  });

  it('keeps member ids unique across the household and org tiers in one session', () => {
    const out = graduateToTier(householdSession(), 'org', ORG_ROW, ORG_ROLES, createRng(617n));
    const householdIds = out.tiers['household']?.roster.members.map((m) => m.id) ?? [];
    const orgIds = out.tiers['org']?.roster.members.map((m) => m.id) ?? [];
    expect(householdIds).toEqual(['m1', 'm2', 'm3']);
    expect(orgIds).toEqual(['org-m1', 'org-m2']);
    const all = [...householdIds, ...orgIds];
    expect(new Set(all).size).toBe(all.length);
    expect(Object.keys(out.members).sort()).toEqual(['m1', 'm2', 'm3', 'org-m1', 'org-m2']);
  });

  it('is idempotent: an already-graduated org returns the input by reference', () => {
    const once = graduateToTier(householdSession(), 'org', ORG_ROW, ORG_ROLES, createRng(619n));
    const again = graduateToTier(once, 'org', ORG_ROW, ORG_ROLES, createRng(631n));
    expect(again).toBe(once);
  });

  it('throws loudly when a member-bearing tier has no policy on its roles row', () => {
    const policyless: GraduationRolesRow = { roles: ['steward'], names: ['Auntie Ji'] };
    expect(() =>
      graduateToTier(householdSession(), 'org', ORG_ROW, policyless, createRng(641n)),
    ).toThrowError(/org/);
    expect(() =>
      graduateToTier(householdSession(), 'org', ORG_ROW, policyless, createRng(643n)),
    ).toThrowError(/policy/);
  });
});

describe('graduateToTier (town, unit tier)', () => {
  function orgSession(): StudioSession {
    return graduateToTier(householdSession(), 'org', ORG_ROW, ORG_ROLES, createRng(701n));
  }

  it('seeds one unit row per unlocked lower tier and creates no member slices', () => {
    const out = graduateToTier(orgSession(), 'town', TOWN_ROW, null, createRng(709n));

    const town = out.tiers['town'];
    expect(town?.unlocked).toBe(true);
    const rows = town?.roster.members ?? [];
    expect(rows.map((m) => m.id)).toEqual(['person', 'household', 'org']);
    for (const row of rows) {
      expect(row.role).toBe('unit');
      expect(row.name).toBe(row.id);
      expect(row.embodied).toBe(false);
      expect(row.seed).toBe(0);
    }
    // Unit rows carry the source tier's seated policy; person has no roster,
    // so its row carries the inert unit fallback.
    expect(rows[0]?.policy).toBe('policy:unit:person');
    expect(rows[1]?.policy).toBe('policy:household-base');
    expect(rows[2]?.policy).toBe('policy:household-base');
    // NO member slices were created — unit rows never run autonomously.
    expect(Object.keys(out.members).sort()).toEqual(['m1', 'm2', 'm3', 'org-m1', 'org-m2']);
  });

  it('opens a fresh town bench, appends unlock-town once, and is idempotent', () => {
    const out = graduateToTier(orgSession(), 'town', TOWN_ROW, null, createRng(719n));
    expect(out.benches['town']).toEqual(EMPTY_BENCH);
    expect(out.milestones_done).toEqual(['unlock-household', 'unlock-org', 'unlock-town']);
    const again = graduateToTier(out, 'town', TOWN_ROW, null, createRng(727n));
    expect(again).toBe(out);
  });
});

describe('graduateToHousehold wrapper parity', () => {
  it('produces output identical to graduateToTier on the household content row', () => {
    const viaWrapper = graduateToHousehold(baseSession(), ROLES, createRng(809n));
    const viaTier = graduateToTier(
      baseSession(),
      'household',
      HOUSEHOLD_CONTENT_ROW,
      { ...ROLES, policy: 'policy:household-base' },
      createRng(809n),
    );
    expect(viaWrapper).toEqual(viaTier);
  });

  it('honors a policy supplied on the household table (content wiring)', () => {
    const withPolicy: HouseholdRolesTable = { ...ROLES, policy: 'policy:household-base' };
    const out = graduateToHousehold(baseSession(), withPolicy, createRng(811n));
    for (const member of out.tiers['household']?.roster.members ?? []) {
      expect(member.policy).toBe('policy:household-base');
    }
  });
});
