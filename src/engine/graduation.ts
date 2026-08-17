// Graduation — crossing `unlock-household` promotes the session a whole tier.
//
// One pure pass: unlock the household tier state, seat the founding roster
// (three members drawn from the content roles tables through the injected
// rng), open a fresh household bench, store each member's starting slice, and
// record the milestone. No fake harvest is queued — the first household card
// cooks once real folded residue charges the bench; the ceremony is UI.
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

/** Roles + names tables for the founding household (loader `roles.household`). */
export interface HouseholdRolesTable {
  readonly roles: readonly string[];
  readonly names: readonly string[];
}

const HOUSEHOLD_TIER = 'household';
const HOUSEHOLD_POLICY = 'policy:household-base';
const UNLOCK_HOUSEHOLD = 'unlock-household';
const HOUSEHOLD_MEMBER_IDS = ['m1', 'm2', 'm3'] as const;

/** Factory chassis era, matching the roster rebuild path (roster.ts AUTO_ERA). */
const MEMBER_ERA = 'roster@0.1.0' as EraId;

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

/**
 * Graduate `session` to the household tier. Idempotent: a session whose
 * household tier is already unlocked is returned by reference, unchanged.
 * Deterministic given the injected rng — the roster names/roles and the
 * member seed key all draw from that stream, so the same stream graduates
 * to the same household.
 */
export function graduateToHousehold(
  session: StudioSession,
  roles: HouseholdRolesTable,
  rng: Rng,
): StudioSession {
  if (session.tiers[HOUSEHOLD_TIER]?.unlocked === true) {
    return session;
  }

  // One draw seeds the member streams; memberSeed spreads it per member id.
  const seedKey = String(rng.nextInt(1, 0x7fffffff));
  const roster: RosterMember[] = HOUSEHOLD_MEMBER_IDS.map((id) => ({
    id,
    name: rng.pick(roles.names),
    role: rng.pick(roles.roles),
    policy: HOUSEHOLD_POLICY,
    embodied: false,
    seed: Number(memberSeed(seedKey, id)),
  }));

  const slices: Record<string, MemberSlice> = {};
  for (const member of roster) {
    const life = createMemberLife(member.id, member.role, MEMBER_ERA, rng);
    slices[member.id] = {
      life: {
        turn: life.turn,
        resources: { ...life.resources },
        skills: { ...life.skills },
        residue: [],
      },
      practices: [],
    };
  }

  const milestonesDone = session.milestones_done.includes(UNLOCK_HOUSEHOLD)
    ? session.milestones_done
    : [...session.milestones_done, UNLOCK_HOUSEHOLD];

  const household = {
    ...createTierState(HOUSEHOLD_TIER, true),
    roster: { tier: HOUSEHOLD_TIER, members: roster },
  };

  // The re-parse is load-bearing: it validates the seeded slices against the
  // session schema (a graduation that cannot persist is a bug, not a state).
  return StudioSessionSchema.parse({
    ...session,
    benches: { ...session.benches, [HOUSEHOLD_TIER]: freshBench() },
    tiers: { ...session.tiers, [HOUSEHOLD_TIER]: household },
    members: { ...session.members, ...slices },
    milestones_done: milestonesDone,
  });
}
