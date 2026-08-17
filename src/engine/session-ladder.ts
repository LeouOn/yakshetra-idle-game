// Session ladder — every unlocked tier bench in one pass.
//
// The multi-tier generalization of stepSession's household branch: for each
// ctx.tiers row N (ladder order) whose tier is unlocked, N's roster members
// with stored slices run autonomously (rng seeded from the persisted roster
// row) and fold residue onto N's bench at cadence 1; the PREVIOUS rung's
// per-call bench delta — the person bench before the first row — folds onto
// N's bench at N's fold_cadence with the ordinal persisted on N's
// fold_position; then N's bench AUTO-QUEUES its cook once folded residue
// charges it (window_min may lower the gate; the engine floors it at 2) and
// cooks under the alreadyCharged gate. Locked rungs are skipped whole: no
// bench, no members, and their delta never flows past them. Roster rows
// without stored member slices (unit aggregates, e.g. town) skip the member
// loop without special-casing. Pure: no Date, no network, no global RNG;
// studio-session and session-step are TYPE-ONLY here (session-step imports
// this module's values, so the type-only edge keeps the runtime graph
// acyclic).

import {
  MIN_RESIDUE_TO_DEVELOP,
  absorbSurplus,
  pendingResidue,
  queueDevelop,
  recordStudioResidues,
  tickStudio,
} from './operations';
import { benchAfterStep, benchToStudio, emptyBench } from './bench-mapping';
import { EMPTY_BENCH_MODIFIERS } from './endowment-validators';
import { FOLD_IDS, memberSeed, runAutonomousMember } from './roster';
import { createRng } from './rng';
import { foldCopies } from './session-step-internal';
import type { BenchState, MemberSlice, StudioSession } from './studio-session';
import type { ResidueEvent } from './residue';
import type { SessionStepContext } from './session-step';

const PERSON_BENCH = 'person';

export interface LadderResult {
  readonly benches: Record<string, BenchState>;
  readonly members: Record<string, MemberSlice>;
  readonly memberTicks: number;
  readonly folded: number;
}

/** Fold marker for a rung's bench delta; the person rung keeps its
 * historical `bench:person` spelling (persisted sessions carry it). */
function benchFoldId(tierId: string): string {
  return tierId === PERSON_BENCH ? FOLD_IDS.bench : `bench:${tierId}`;
}

/**
 * The delta `source` appended to its bench this call. The person rung's
 * delta is the embodied step's fresh events; every other rung's is the
 * growth its bench accumulated this pass (member folds + incoming folds).
 * A locked source rung has no bench and contributes nothing.
 */
function rungDelta(
  source: string,
  session: StudioSession,
  stepped: Readonly<Record<string, BenchState>>,
  personDelta: readonly ResidueEvent[],
): readonly ResidueEvent[] {
  if (source === PERSON_BENCH) {
    return personDelta;
  }
  if (session.tiers[source]?.unlocked !== true) {
    return [];
  }
  const sourcePrev = session.benches[source] ?? emptyBench();
  const sourceNow = stepped[source] ?? sourcePrev;
  return sourceNow.residue.slice(sourcePrev.residue.length);
}

/**
 * Step every unlocked non-person bench: members, fold-up, auto-queue, cook.
 * `session` is the visitor-stepped session; `personDelta` is the embodied
 * step's per-call person-bench growth. Untouched benches are absent from
 * the returned record — the caller spreads it over the session's benches.
 */
export function stepTierLadder(
  session: StudioSession,
  ctx: SessionStepContext,
  personDelta: readonly ResidueEvent[],
  ticks: number,
): LadderResult {
  let members = session.members;
  let memberTicks = 0;
  let folded = 0;
  const stepped: Record<string, BenchState> = {};

  ctx.tiers.forEach((tier, position) => {
    if (tier.id === PERSON_BENCH) {
      return; // the embodied life steps on the person bench in stepStudio
    }
    const tierState = session.tiers[tier.id];
    if (tierState?.unlocked !== true) {
      return; // locked rung: no bench, no members, nothing flows past it
    }
    const prev = session.benches[tier.id] ?? emptyBench();
    let bench = benchToStudio(prev, session.archive);
    const mods = ctx.modifiersFor?.(tier.id) ?? EMPTY_BENCH_MODIFIERS;
    // window_min lowers the auto-queue minimum, floored at 2 events.
    const effectiveMin = Math.max(2, MIN_RESIDUE_TO_DEVELOP - mods.windowMin);
    // The cook gate snapshots the charge BEFORE any appends, against the
    // same minimum the auto-queue uses.
    const alreadyCharged = pendingResidue(bench).length >= effectiveMin;

    for (const member of tierState.roster.members) {
      const stored = members[member.id];
      if (member.embodied || stored === undefined) {
        continue; // embodied lives step above; slice-less rows have not joined
      }
      const advanced = runAutonomousMember(
        stored,
        ctx.memberPracticesFor(member.policy),
        ctx.memberScheduleFor(member.policy),
        ctx.endings,
        BigInt(ticks),
        createRng(BigInt(member.seed)),
      );
      if (members === session.members) {
        members = { ...session.members };
      }
      members[member.id] = advanced;
      const delta = advanced.life.residue.slice(stored.life.residue.length);
      bench = recordStudioResidues(
        bench,
        foldCopies(delta, FOLD_IDS.member(member.id), 1, 0).copies,
      );
      memberTicks += advanced.life.turn - stored.life.turn;
    }

    // Fold-up from the previous rung: every fold_cadence-th CUMULATIVE
    // source event, counting from the first, lands here exactly once. The
    // ordinal base persists on this bench's fold_position, so sub-cadence
    // batches combine across calls.
    const sourceRow = position === 0 ? undefined : ctx.tiers[position - 1];
    const source = sourceRow === undefined ? PERSON_BENCH : sourceRow.id;
    const delta = rungDelta(source, session, stepped, personDelta);
    let foldPosition = prev.fold_position;
    if (delta.length > 0) {
      const { copies, nextCounter } = foldCopies(
        delta,
        benchFoldId(source),
        tier.fold_cadence,
        prev.fold_position,
      );
      bench = recordStudioResidues(bench, copies);
      folded += copies.length;
      foldPosition = nextCounter;
    }

    // Auto-queue: tier benches have no manual develop control — folded
    // residue is their only charge path — so the step itself queues the
    // cook once the window reaches the effective minimum. A dedicated
    // derived stream per tier leaves every other rng untouched.
    if (bench.bay === null && pendingResidue(bench).length >= effectiveMin) {
      bench = queueDevelop(
        bench,
        null,
        createRng(memberSeed(ctx.sessionSeed, `${tier.id}-develop`)),
        { cookTicksDiscount: mods.cookSpeed, minResidue: effectiveMin },
      );
    }

    // Cook under the alreadyCharged gate; surplus_rate amplifies the
    // absorbed tend ticks (integer math).
    bench = tickStudio(bench, ticks);
    if (alreadyCharged) {
      bench = absorbSurplus(bench, ticks * (1 + mods.surplusRate));
    }

    stepped[tier.id] = { ...benchAfterStep(bench, prev), fold_position: foldPosition };
  });

  return { benches: stepped, members, memberTicks, folded };
}
