// Session step — one tick batch across every bench and member of a session.
//
// The multi-bench counterpart of `stepStudio`: the embodied life advances on
// the person bench with UNCHANGED stepStudio semantics (golden-tested), and
// every unlocked tier bench steps through the ladder (session-ladder.ts):
// autonomous members fold onto their own tier's bench, each rung's per-call
// delta folds to the next rung at the receiving tier's fold_cadence, and
// tier benches AUTO-QUEUE their cook once folded residue charges them, then
// cook under the alreadyCharged gate. Progression slices are carried
// untouched — milestone checks are the caller's job.
// Pure: no Date, no network, no global RNG; studio-session is TYPE-ONLY.
// Bench shaping lives in bench-mapping; step-local chassis shaping lives in
// session-step-internal; the tier ladder lives in session-ladder.

import { benchAfterStep, benchToStudio, emptyBench, freshSchemaEvents } from './bench-mapping';
import { stepStudio } from './studio-offline';
import { stepTierLadder } from './session-ladder';
import { stepVisitors, type VisitorLike } from './visitors';
import { benchIdle, benchLife, overlayPractices } from './session-step-internal';
import type { BenchModifiers } from './endowment-validators';
import type { Rng } from './rng';
import type { BenchState, StudioSession } from './studio-session';
import type { DailySchedule } from './schedule';
import type { Ending, Practice } from './types';

const PERSON_BENCH = 'person';

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
  /** Stable per-session seed; seeds ONLY each tier's develop stream (member
   * rng streams seed from their persisted roster `seed` rows). */
  readonly sessionSeed: string;
  /** Tier configs in ladder order (content index order); each row owns its
   * bench and the fold_cadence its incoming fold follows. */
  readonly tiers: readonly {
    readonly id: string;
    readonly scale: string;
    readonly fold_cadence: number;
  }[];
  /** Per-tier endowment modifiers (UI-supplied). Absent → zero modifiers:
   * every gate and tick keeps its unmodified value. Never consulted for a
   * tier while that tier is locked. */
  readonly modifiersFor?: (tierId: string) => BenchModifiers;
  /** Visitor rows (content, UI-supplied). Absent → no guest ever arrives. */
  readonly visitors?: readonly VisitorLike[];
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

/** Advance the whole session by `ticks`: embodied bench, the tier ladder
 * (members, fold-up, auto-queue, cook). Returns the new session plus a
 * summary. */
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

  // 0. Visitors — deterministic arrivals seat on unlocked tiers before any
  // bench cooks. Tiers-only and reference-preserving without rows, so a ctx
  // carrying no visitors (the golden person path) never observes this step.
  const withVisitors = stepVisitors(session, ctx, ticks);

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

  // 2. The tier ladder — every unlocked non-person bench. The person bench's
  // per-call growth feeds the first rung's fold-up.
  const personDelta = embodied.studio.residue.slice(personPrev.residue.length);
  const ladder = stepTierLadder(withVisitors, ctx, personDelta, ticks);

  // 3. New session — progression slices untouched.
  const benches: Record<string, BenchState> = {
    ...session.benches,
    [PERSON_BENCH]: benchAfterStep(embodied.studio, personPrev),
    ...ladder.benches,
  };
  const lifePrevLen = session.life.residue.length;
  const lifeLog = embodied.life.residue ?? [];
  const nextSession: StudioSession = {
    ...withVisitors,
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
    members: ladder.members,
  };

  const benchesReady = Object.entries(benches)
    .filter(([, bench]) => bench.bay !== null && bench.bay.status === 'ready')
    .map(([id]) => id);

  return {
    session: nextSession,
    summary: {
      embodiedTicks: embodied.summary.ticksSimulated,
      memberTicks: ladder.memberTicks,
      folded: ladder.folded,
      benchesReady,
    },
  };
}
