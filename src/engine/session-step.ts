// Session step — one tick batch across every bench and member of a session.
//
// The multi-bench counterpart of `stepStudio`: the embodied life advances on
// the person bench with UNCHANGED stepStudio semantics (golden-tested),
// autonomous members advance on per-member seeded rng and fold residue onto
// the household bench, every cadence-th person event folds up too, and the
// household bay cooks under the same alreadyCharged gate. Progression slices
// are carried untouched — milestone checks are the caller's job.
// Pure: no Date, no network, no global RNG; studio-session is TYPE-ONLY.
// Bench shaping lives in bench-mapping; step-local chassis shaping lives in
// session-step-internal.

import {
  MIN_RESIDUE_TO_DEVELOP,
  absorbSurplus,
  pendingResidue,
  recordStudioResidues,
  tickStudio,
} from './operations';
import { benchAfterStep, benchToStudio, emptyBench, freshSchemaEvents } from './bench-mapping';
import { stepStudio } from './studio-offline';
import { FOLD_IDS, memberSeed, runAutonomousMember } from './roster';
import { createRng, type Rng } from './rng';
import { benchIdle, benchLife, foldCopies, overlayPractices } from './session-step-internal';
import type { BenchState, MemberSlice, StudioSession } from './studio-session';
import type { DailySchedule } from './schedule';
import type { Ending, Practice } from './types';

const PERSON_BENCH = 'person';
const HOUSEHOLD_BENCH = 'household';

export interface SessionStepContext {
  /** Runtime practices for the embodied life; progress overlaid from the session. */
  readonly practices: readonly Practice[];
  /** Schedule the embodied life runs on. */
  readonly embodiedSchedule: DailySchedule;
  /** Resolve a roster policy to its schedule (pack content, UI-supplied). */
  readonly memberScheduleFor: (policy: string) => DailySchedule;
  /** Resolve a roster policy to its runtime practices (pack content, UI-supplied). */
  readonly memberPracticesFor: (policy: string) => readonly Practice[];
  /** Ending rules shared by the embodied life and the members. */
  readonly endings: readonly Ending[];
  /** Stable per-session seed for the member rng streams. */
  readonly sessionSeed: string;
  /** Tier configs; the household row supplies the person fold cadence. */
  readonly tiers: readonly {
    readonly id: string;
    readonly scale: string;
    readonly fold_cadence: number;
  }[];
}

export interface SessionStepSummary {
  readonly embodiedTicks: number;
  readonly memberTicks: number;
  readonly folded: number;
  readonly benchesReady: readonly string[];
}

export interface SessionStepResult {
  readonly session: StudioSession;
  readonly summary: SessionStepSummary;
}

/** Advance the whole session by `ticks`: embodied bench, autonomous members,
 * fold-up, and the household cook. Returns the new session plus a summary. */
export function stepSession(
  session: StudioSession,
  ctx: SessionStepContext,
  ticks: number,
  rng: Rng,
): SessionStepResult {
  if (ticks <= 0) {
    return {
      session,
      summary: { embodiedTicks: 0, memberTicks: 0, folded: 0, benchesReady: [] },
    };
  }

  // 1. Embodied life on the person bench — stepStudio semantics unchanged.
  const personPrev = session.benches[PERSON_BENCH] ?? emptyBench();
  const embodied = stepStudio(
    benchToStudio(personPrev, session.archive),
    benchIdle(session),
    benchLife(session),
    overlayPractices(ctx.practices, session.practices),
    ctx.embodiedSchedule,
    ctx.endings,
    ticks,
    rng,
  );

  const benches: Record<string, BenchState> = {
    ...session.benches,
    [PERSON_BENCH]: benchAfterStep(embodied.studio, personPrev),
  };
  let members: Record<string, MemberSlice> = session.members;
  let memberTicks = 0;
  let folded = 0;

  if (session.tiers[HOUSEHOLD_BENCH]?.unlocked === true) {
    const householdPrev = session.benches[HOUSEHOLD_BENCH] ?? emptyBench();
    let household = benchToStudio(householdPrev, session.archive);
    // The cook gate snapshots the charge BEFORE any appends (stepStudio's gate).
    const alreadyCharged = pendingResidue(household).length >= MIN_RESIDUE_TO_DEVELOP;

    // 2. Autonomous members — per-member seeded rng, residue folds at cadence 1.
    for (const tier of Object.values(session.tiers)) {
      for (const member of tier.roster.members) {
        const stored = members[member.id];
        if (member.embodied || stored === undefined) {
          continue; // embodied lives step above; slice-less members have not joined
        }
        const advanced = runAutonomousMember(
          stored,
          ctx.memberPracticesFor(member.policy),
          ctx.memberScheduleFor(member.policy),
          ctx.endings,
          BigInt(ticks),
          createRng(memberSeed(ctx.sessionSeed, member.id)),
        );
        if (members === session.members) {
          members = { ...session.members };
        }
        members[member.id] = advanced;
        const delta = advanced.life.residue.slice(stored.life.residue.length);
        household = recordStudioResidues(
          household,
          foldCopies(delta, FOLD_IDS.member(member.id), 1, 0).copies,
        );
        memberTicks += advanced.life.turn - stored.life.turn;
      }
    }

    // 3. Person fold-up. Invariant: every fold_cadence-th CUMULATIVE person
    // event, counting from the first, lands on the household bench exactly
    // once. The ordinal base persists on the household bench's
    // fold_position, so sub-cadence batches combine across calls (a
    // marks-derived counter restarts every call and never seeds the first
    // fold under the cadence). v1.1 sessions parse with position 0: the
    // per-call delta keeps the position honest going forward, and any
    // historical marks stay on the bench as data.
    const tierConfig = ctx.tiers.find((tier) => tier.id === HOUSEHOLD_BENCH);
    if (tierConfig === undefined) {
      throw new Error(`stepSession: ctx.tiers is missing the "${HOUSEHOLD_BENCH}" tier`);
    }
    const delta = embodied.studio.residue.slice(personPrev.residue.length);
    const { copies, nextCounter } = foldCopies(
      delta,
      FOLD_IDS.bench,
      tierConfig.fold_cadence,
      householdPrev.fold_position,
    );
    household = recordStudioResidues(household, copies);
    folded = copies.length;

    // 4. Household cook under the alreadyCharged gate.
    household = tickStudio(household, ticks);
    if (alreadyCharged && ticks > 0) {
      household = absorbSurplus(household, ticks);
    }
    benches[HOUSEHOLD_BENCH] = {
      ...benchAfterStep(household, householdPrev),
      fold_position: nextCounter,
    };
  }

  // 5. New session — progression slices untouched.
  const lifePrevLen = session.life.residue.length;
  const lifeLog = embodied.life.residue ?? [];
  const nextSession: StudioSession = {
    ...session,
    benches,
    idle: {
      mode: embodied.idle.mode,
      last_simulated_tick: embodied.idle.lastSimulatedTick.toString(10),
      total_idle_ticks: embodied.idle.totalIdleTicks.toString(10),
    },
    life: {
      turn: embodied.life.turn,
      resources: { ...embodied.life.resources },
      skills: { ...embodied.life.skills },
      residue:
        lifeLog.length === lifePrevLen
          ? session.life.residue
          : [...session.life.residue, ...freshSchemaEvents(lifeLog, lifePrevLen)],
    },
    practices: embodied.practices.map((p) => ({
      id: p.id,
      currentProgress: p.currentProgress,
      level: p.level,
    })),
    members,
  };

  const benchesReady = Object.entries(benches)
    .filter(([, bench]) => bench.bay !== null && bench.bay.status === 'ready')
    .map(([id]) => id);

  return {
    session: nextSession,
    summary: { embodiedTicks: embodied.summary.ticksSimulated, memberTicks, folded, benchesReady },
  };
}
