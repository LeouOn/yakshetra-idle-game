// Session step — one tick batch across every bench and member of a session.
//
// The multi-bench counterpart of `stepStudio`: the embodied life advances on
// the person bench with UNCHANGED stepStudio semantics (golden-tested),
// autonomous members advance on per-member seeded rng and fold residue onto
// the household bench, every cadence-th person event folds up too, and the
// household bay cooks under the same alreadyCharged gate. Progression slices
// are carried untouched — milestone checks are the caller's job.
// Pure: no Date, no network, no global RNG; studio-session is TYPE-ONLY.

import {
  MIN_RESIDUE_TO_DEVELOP,
  absorbSurplus,
  pendingResidue,
  recordStudioResidues,
  tickStudio,
  type StudioState,
} from './operations';
import { stepStudio } from './studio-offline';
import { FOLD_IDS, memberSeed, runAutonomousMember } from './roster';
import { foldUpEvents } from './roster-fold';
import { createLifeState } from './reducer';
import { createRng, type Rng } from './rng';
import type { ResidueEvent } from './residue';
import type { DailySchedule } from './schedule';
import type { BenchState, MemberSlice, StudioSession } from './studio-session';
import type { Ending, IdleState, LifeState, Practice } from './types';

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

function emptyBench(): BenchState {
  return {
    residue: [],
    last_harvest_index: -1,
    bay: null,
    quality_tier: 0,
    harvest_count: 0,
    play_import: null,
    pinned: null,
    surplus: 0,
  };
}

/** Bench slice → runtime StudioState; the shared archive rides on top. */
function benchToStudio(bench: BenchState, archive: StudioSession['archive']): StudioState {
  return {
    residue: bench.residue,
    last_harvest_index: bench.last_harvest_index,
    bay: bench.bay === null ? null : { ...bench.bay, focus: bench.bay.focus ?? null },
    archive,
    quality_tier: bench.quality_tier,
    harvest_count: bench.harvest_count,
    play_import: bench.play_import,
    pinned: bench.pinned,
    surplus: bench.surplus,
  };
}

/** Only the events a step appended beyond the persisted prefix, re-shaped as
 * mutable schema events (session slices store mutable ids/numbers). */
function freshSchemaEvents(log: readonly ResidueEvent[], prevLen: number): BenchState['residue'] {
  return log.slice(prevLen).map((event) => ({
    ...event,
    ids: [...event.ids],
    numbers: { ...event.numbers },
  }));
}

/** stepStudio only advances cook_ticks_done/status — keep the queued window. */
function bayAfterStep(studio: StudioState, prevBay: BenchState['bay']): BenchState['bay'] {
  if (studio.bay === null) {
    return null;
  }
  if (prevBay === null) {
    throw new Error('stepSession: step produced a bay without a queued window');
  }
  return { ...prevBay, cook_ticks_done: studio.bay.cook_ticks_done, status: studio.bay.status };
}

/** Bench slice after a step. Logs are append-only, so the persisted prefix
 * array is reused and only the fresh tail is copied. */
function benchAfterStep(studio: StudioState, prev: BenchState): BenchState {
  const prevLen = prev.residue.length;
  return {
    residue:
      studio.residue.length === prevLen
        ? prev.residue
        : [...prev.residue, ...freshSchemaEvents(studio.residue, prevLen)],
    last_harvest_index: studio.last_harvest_index,
    bay: bayAfterStep(studio, prev.bay),
    quality_tier: studio.quality_tier,
    harvest_count: studio.harvest_count,
    play_import: studio.play_import,
    pinned: studio.pinned,
    surplus: studio.surplus,
  };
}

/** Studio-bench chassis under the session's life slice (identity stays out). */
function benchLife(session: StudioSession): LifeState {
  const chassis = createLifeState({
    id: 'studio-bench' as LifeState['id'],
    era: 'studio-bench@0.1.0' as LifeState['era'],
    role: 'operator' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
  return {
    ...chassis,
    turn: session.life.turn,
    resources: { ...chassis.resources, ...session.life.resources },
    skills: { ...session.life.skills },
    residue: session.life.residue,
  };
}

function benchIdle(session: StudioSession): IdleState {
  return {
    mode: session.idle.mode,
    lastSimulatedTick: BigInt(session.idle.last_simulated_tick),
    totalIdleTicks: BigInt(session.idle.total_idle_ticks),
  };
}

/** Overlay saved session progress onto the ctx runtime practices. */
function overlayPractices(
  runtime: readonly Practice[],
  saved: StudioSession['practices'],
): Practice[] {
  const progress = new Map(saved.map((p) => [p.id, p]));
  return runtime.map((practice) => {
    const slice = progress.get(practice.id);
    if (slice === undefined) {
      return practice;
    }
    return { ...practice, currentProgress: slice.currentProgress, level: slice.level };
  });
}

/** Tag every cadence-th event with `sourceId` and keep only the marked
 * copies — the parent bench receives marked events only. Members pass
 * cadence 1 (every event); the person bench passes the tier cadence. */
function foldCopies(
  events: readonly ResidueEvent[],
  sourceId: string,
  cadence: number,
  counter: number,
): readonly ResidueEvent[] {
  const { events: marked } = foldUpEvents(events, sourceId, cadence, counter);
  return marked.filter((event) => event.ids.includes(sourceId));
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
          foldCopies(delta, FOLD_IDS.member(member.id), 1, 0),
        );
        memberTicks += advanced.life.turn - stored.life.turn;
      }
    }

    // 3. Person fold-up — counter derived from existing marks, no new state.
    const tierConfig = ctx.tiers.find((tier) => tier.id === HOUSEHOLD_BENCH);
    if (tierConfig === undefined) {
      throw new Error(`stepSession: ctx.tiers is missing the "${HOUSEHOLD_BENCH}" tier`);
    }
    const delta = embodied.studio.residue.slice(personPrev.residue.length);
    const counter = household.residue.filter((e) => e.ids.includes(FOLD_IDS.bench)).length;
    const copies = foldCopies(delta, FOLD_IDS.bench, tierConfig.fold_cadence, counter);
    household = recordStudioResidues(household, copies);
    folded = copies.length;

    // 4. Household cook under the alreadyCharged gate.
    household = tickStudio(household, ticks);
    if (alreadyCharged && ticks > 0) {
      household = absorbSurplus(household, ticks);
    }
    benches[HOUSEHOLD_BENCH] = benchAfterStep(household, householdPrev);
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
