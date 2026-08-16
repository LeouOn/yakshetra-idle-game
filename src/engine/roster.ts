// Roster runtime — autonomous member lives on the household cadence.
//
// Roster members live alongside the player's bench life: each member's
// progress is stored as a MemberSlice (turn/resources/skills/residue +
// practice progress) and REBUILT into a full LifeState only while simulating.
// `runAutonomousMember` drives `simulateIdleTicks` on the household policy's
// schedule/practices with a per-member seeded Rng, so a member's day advances
// deterministically whether the player is watching or not.
//
// Fold tagging + embodiment swaps live in ./roster-fold.ts.
//
// Pure: no react, no wall clock, no global RNG, no network. studio-session is
// imported TYPE-ONLY (erased at compile time) so no import cycle is created.

import { simulateIdleTicks } from './idle';
import { createLifeState } from './reducer';
import type { DailySchedule } from './schedule';
import type { MemberSlice } from './studio-session';
import type { Ending, EraId, IdleState, LifeState, Practice, Rng } from './types';

/** Fold ids: residue from a member is tagged `member:<id>`; the bench is `bench:person`. */
export const FOLD_IDS = {
  member: (id: string): string => `member:${id}`,
  bench: 'bench:person',
} as const;

// Placeholder chassis used when rebuilding a LifeState from a stored slice.
// These values never leave `runAutonomousMember` — the returned slice carries
// only turn/resources/skills/residue — and are never derived from play.
const AUTO_RAW_MEMBER_ID = 'auto';
const AUTO_ROLE = 'roster-member' as LifeState['role'];
const AUTO_ERA = 'roster@0.1.0' as EraId;

/**
 * Deterministic per-member seed: 32-bit FNV-1a over
 * `<sessionSeed>:<memberId>`, folded to bigint. Stable across reloads, so the
 * same member always resumes on the same rng stream.
 */
export function memberSeed(sessionSeed: string, memberId: string): bigint {
  const key = `${sessionSeed}:${memberId}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  return BigInt(hash);
}

/**
 * Factory life for a roster member. The id is the branded fold id
 * (`member:<id>`); the role is an assignment, NOT a derived identity — the
 * identity is the fixed opaque default (the fence). The `_rng` slot is
 * reserved for future stochastic starting conditions (reducer.ts precedent).
 */
export function createMemberLife(memberId: string, role: string, era: EraId, _rng: Rng): LifeState {
  return createLifeState({
    id: FOLD_IDS.member(memberId) as LifeState['id'],
    era,
    role: role as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'household',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
    resources: {},
  });
}

/** Roll accumulated progress past `maxProgress`, counting whole level-ups. */
function rollProgress(progress: number, maxProgress: number): { progress: number; levels: number } {
  let p = progress;
  let levels = 0;
  while (maxProgress > 0 && p >= maxProgress) {
    p -= maxProgress;
    levels += 1;
  }
  return { progress: p, levels };
}

/**
 * Advance one roster member's life by `ticks` on the policy's schedule.
 *
 * The stored MemberSlice is rebuilt into a full LifeState (factory chassis
 * under, slice over), practices are seeded from the slice's saved progress,
 * and `simulateIdleTicks` runs with a per-member IdleState whose tick axis is
 * anchored at the slice's turn. Returns the NEW MemberSlice — residue and
 * practice progress included; identity never enters or leaves.
 */
export function runAutonomousMember(
  member: MemberSlice,
  policyPractices: readonly Practice[],
  schedule: DailySchedule,
  endings: readonly Ending[],
  ticks: bigint,
  rng: Rng,
): MemberSlice {
  const saved = new Map(member.practices.map((p) => [p.id, p]));
  const practices: Practice[] = policyPractices.map((p) => {
    const slice = saved.get(p.id);
    if (slice === undefined) {
      return p;
    }
    return { ...p, currentProgress: slice.currentProgress, level: slice.level };
  });

  const chassis = createMemberLife(AUTO_RAW_MEMBER_ID, AUTO_ROLE, AUTO_ERA, rng);
  const life: LifeState = {
    ...chassis,
    turn: member.life.turn,
    resources: { ...chassis.resources, ...member.life.resources },
    skills: { ...member.life.skills },
    residue: member.life.residue,
  };
  const idle: IdleState = {
    mode: 'idle',
    lastSimulatedTick: BigInt(member.life.turn),
    totalIdleTicks: 0n,
  };

  const { state, result } = simulateIdleTicks(life, idle, schedule, practices, ticks, endings, rng);

  const practicesOut = practices.map((p): MemberSlice['practices'][number] => {
    const advanced = result.practicesAdvanced.find((a) => a.id === p.id);
    if (advanced === undefined || advanced.progressGained <= 0) {
      return { id: p.id, currentProgress: p.currentProgress, level: p.level };
    }
    const rolled = rollProgress(p.currentProgress + advanced.progressGained, p.maxProgress);
    return { id: p.id, currentProgress: rolled.progress, level: p.level + rolled.levels };
  });

  return {
    life: {
      turn: state.turn,
      resources: { ...state.resources },
      skills: { ...state.skills },
      residue: (state.residue ?? []).map((event) => ({
        ...event,
        ids: [...event.ids],
        numbers: { ...event.numbers },
      })),
    },
    practices: practicesOut,
  };
}
