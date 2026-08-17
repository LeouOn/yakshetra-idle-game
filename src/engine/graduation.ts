// Graduation — crossing an unlock milestone promotes the session a whole tier.
//
// One pure pass per tier: unlock the tier state, seat the founding roster,
// open a fresh bench, store starting member slices, record the milestone.
// Which roster a tier seats is content-driven (Binding Decision 4):
//   - a roles row present (registries().roles.<tier>) → member-bearing tier:
//     roster_size.min autonomous lives drawn from the roles/names tables,
//     running on the roles row's REQUIRED policy;
//   - a null roles row → unit tier (town): one inert roster row per already-
//     unlocked LOWER tier so the roster renders; no member slice is created,
//     so the ladder never runs these rows.
// No fake harvest is queued — the first card cooks once real folded residue
// charges the bench; the ceremony is UI.
// Pure: no react, no wall clock, no global RNG, no network.

import type { Rng } from './rng';
import { createMemberLife, memberSeed } from './roster';
import {
  StudioSessionSchema,
  type BenchState,
  type MemberSlice,
  type StudioSession,
} from './studio-session';
import { createTierState, type RosterMember } from './tier-state';
import type { EraId } from './types';

/** Tier content row for a graduation (the tier's row from registries().tiers). */
export interface GraduationTierRow {
  readonly id: string;
  readonly index: number;
  readonly roster_size: { readonly min: number; readonly max: number };
  readonly member_unit: string;
  readonly unlock_milestone: string | null;
}

/** Roles + names tables for one tier's founding roster (loader `roles.<tier>`).
 * A member-bearing graduation REQUIRES `policy`; a null roles row means the
 * tier seats unit rows instead of lives. */
export interface GraduationRolesRow {
  readonly roles: readonly string[];
  readonly names: readonly string[];
  readonly policy?: string | undefined;
}

/** Back-compat alias for the household founding table. */
export type HouseholdRolesTable = GraduationRolesRow;

const HOUSEHOLD_TIER = 'household';
const HOUSEHOLD_POLICY = 'policy:household-base';
const HOUSEHOLD_ROW: GraduationTierRow = {
  id: 'household',
  index: 1,
  roster_size: { min: 3, max: 8 },
  member_unit: 'person',
  unlock_milestone: 'unlock-household',
};
const UNIT_ROLE = 'unit';

/** Factory chassis era, matching the roster rebuild path (roster.ts AUTO_ERA). */
const MEMBER_ERA = 'roster@0.1.0' as EraId;

/**
 * Member ids are unique ACROSS tiers: `session.members` and the fold markers
 * (`member:<id>`) key on them globally. Household keeps the legacy bare
 * `m1..mN` (persisted sessions carry them); every other member-bearing tier
 * prefixes its own id: `<tierId>-m1..mN`. Unit rows use the source tier's id.
 */
function memberId(tierId: string, n: number): string {
  return tierId === HOUSEHOLD_TIER ? `m${n}` : `${tierId}-m${n}`;
}

function freshBench(): BenchState {
  return {
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
}

/** Draw the founding members and their starting slices from the tables. */
function memberRoster(
  tierId: string,
  tierRow: GraduationTierRow,
  roles: GraduationRolesRow,
  rng: Rng,
): { readonly roster: RosterMember[]; readonly slices: Record<string, MemberSlice> } {
  const policy = roles.policy;
  if (policy === undefined) {
    throw new Error(
      `graduateToTier: member-bearing tier "${tierId}" requires a policy on its roles row`,
    );
  }
  // One draw seeds the member streams; memberSeed spreads it per member id.
  const seedKey = String(rng.nextInt(1, 0x7fffffff));
  const roster: RosterMember[] = [];
  const slices: Record<string, MemberSlice> = {};
  for (let n = 1; n <= tierRow.roster_size.min; n += 1) {
    const id = memberId(tierId, n);
    const member: RosterMember = {
      id,
      name: rng.pick(roles.names),
      role: rng.pick(roles.roles),
      policy,
      embodied: false,
      seed: Number(memberSeed(seedKey, id)),
    };
    roster.push(member);
    const life = createMemberLife(member.id, member.role, MEMBER_ERA, rng);
    slices[id] = {
      life: {
        turn: life.turn,
        resources: { ...life.resources },
        skills: { ...life.skills },
        residue: [],
      },
      practices: [],
    };
  }
  return { roster, slices };
}

/**
 * Unit-tier roster: one row per already-unlocked LOWER tier, in session.tiers
 * insertion order (graduations append in ladder order, so insertion order IS
 * ladder order). Each row is named by its tier id, carries the source tier's
 * seated policy (`policy:unit:<id>` when the source has no roster), and gets
 * NO member slice — the ladder skips slice-less rows by design.
 */
function unitRoster(session: StudioSession, tierId: string): RosterMember[] {
  return Object.keys(session.tiers)
    .filter((id) => id !== tierId && session.tiers[id]?.unlocked === true)
    .map((id) => ({
      id,
      name: id,
      role: UNIT_ROLE,
      policy: session.tiers[id]?.roster.members[0]?.policy ?? `policy:unit:${id}`,
      embodied: false,
      seed: 0,
    }));
}

/**
 * Graduate `session` to `tierId`. Idempotent: a session whose tier is already
 * unlocked (or whose unlock milestone is already recorded) is returned by
 * reference, unchanged. Deterministic given the injected rng — the roster
 * names/roles and the member seed key all draw from that stream, so the same
 * stream graduates to the same roster.
 */
export function graduateToTier(
  session: StudioSession,
  tierId: string,
  tierRow: GraduationTierRow,
  rolesRow: GraduationRolesRow | null,
  rng: Rng,
): StudioSession {
  const milestone = tierRow.unlock_milestone ?? `unlock-${tierId}`;
  if (session.tiers[tierId]?.unlocked === true || session.milestones_done.includes(milestone)) {
    return session;
  }

  const seeded =
    rolesRow === null
      ? { roster: unitRoster(session, tierId), slices: {} as Record<string, MemberSlice> }
      : memberRoster(tierId, tierRow, rolesRow, rng);
  const milestonesDone = session.milestones_done.includes(milestone)
    ? session.milestones_done
    : [...session.milestones_done, milestone];
  const tier = {
    ...createTierState(tierId, true),
    roster: { tier: tierId, members: seeded.roster },
  };

  // The re-parse is load-bearing: it validates the seeded slices against the
  // session schema (a graduation that cannot persist is a bug, not a state).
  return StudioSessionSchema.parse({
    ...session,
    benches: { ...session.benches, [tierId]: freshBench() },
    tiers: { ...session.tiers, [tierId]: tier },
    members: { ...session.members, ...seeded.slices },
    milestones_done: milestonesDone,
  });
}

/** Thin wrapper: the household graduation with its content row inlined. */
export function graduateToHousehold(
  session: StudioSession,
  roles: HouseholdRolesTable,
  rng: Rng,
): StudioSession {
  return graduateToTier(
    session,
    HOUSEHOLD_TIER,
    HOUSEHOLD_ROW,
    { ...roles, policy: roles.policy ?? HOUSEHOLD_POLICY },
    rng,
  );
}
