// Studio catch-up — wall-clock absence becomes bench ticks.
//
// One studio tick = 60 seconds. The UI passes `nowUnix`; this module never
// reads Date. Away time both tends (residue) and cooks the bay.

import type { Ending } from '@/content/schema';

import { simulateIdleTicks } from './idle';
import {
  MIN_RESIDUE_TO_DEVELOP,
  absorbSurplus,
  applyPracticeProgress,
  pendingResidue,
  recordStudioResidues,
  tickStudio,
  type StudioState,
} from './operations';
import { residueLog } from './residue';
import type { Rng } from './rng';
import type { DailySchedule } from './schedule';
import type { IdleState, LifeState, Practice } from './types';

/** Seconds of real time that equal one studio tick. */
export const STUDIO_SECONDS_PER_TICK = 60;

/** Hard cap so a long absence cannot spin a huge simulate loop. */
export const STUDIO_AWAY_TICK_CAP = 240;

export interface StudioAwaySummary {
  readonly ticksSimulated: number;
  readonly residueGained: number;
  readonly bayReady: boolean;
  readonly capped: boolean;
}

export interface StudioCatchUpResult {
  readonly studio: StudioState;
  readonly idle: IdleState;
  readonly life: LifeState;
  readonly practices: Practice[];
  readonly summary: StudioAwaySummary;
}

function emptySummary(capped = false): StudioAwaySummary {
  return { ticksSimulated: 0, residueGained: 0, bayReady: false, capped };
}

/**
 * Whole ticks from `lastVisitedAtUnix` to `nowUnix`, floored and capped.
 * `cap` defaults to STUDIO_AWAY_TICK_CAP; callers thread `effectiveAwayCap`
 * (endowment offline_cap) to raise it.
 */
export function studioTicksAway(
  lastVisitedAtUnix: number,
  nowUnix: number,
  cap: number = STUDIO_AWAY_TICK_CAP,
): {
  readonly ticks: number;
  readonly capped: boolean;
} {
  if (lastVisitedAtUnix <= 0 || nowUnix <= lastVisitedAtUnix) {
    return { ticks: 0, capped: false };
  }
  const raw = Math.floor((nowUnix - lastVisitedAtUnix) / STUDIO_SECONDS_PER_TICK);
  if (raw <= 0) {
    return { ticks: 0, capped: false };
  }
  if (raw > cap) {
    return { ticks: cap, capped: true };
  }
  return { ticks: raw, capped: false };
}

/** Apply `ticks` of bench work: residue, practice progress, and bay cook. */
export function stepStudio(
  studio: StudioState,
  idle: IdleState,
  life: LifeState,
  practices: readonly Practice[],
  schedule: DailySchedule,
  endings: readonly Ending[],
  ticks: number,
  rng: Rng,
): StudioCatchUpResult {
  if (ticks <= 0) {
    return {
      studio,
      idle,
      life,
      practices: [...practices],
      summary: emptySummary(false),
    };
  }
  const beforeLen = residueLog(life).length;
  const simulated = simulateIdleTicks(life, idle, schedule, practices, BigInt(ticks), endings, rng);
  const applied = Number(simulated.result.ticksSimulated);
  const fresh = residueLog(simulated.state).slice(beforeLen);
  const alreadyCharged = pendingResidue(studio).length >= MIN_RESIDUE_TO_DEVELOP;
  let nextStudio = recordStudioResidues(studio, fresh);
  nextStudio = tickStudio(nextStudio, applied);
  if (alreadyCharged && applied > 0) {
    nextStudio = absorbSurplus(nextStudio, applied);
  }
  return {
    studio: nextStudio,
    idle: simulated.idle,
    life: simulated.state,
    practices: applyPracticeProgress(practices, simulated.result.practicesAdvanced),
    summary: {
      ticksSimulated: applied,
      residueGained: fresh.length,
      bayReady: nextStudio.bay !== null && nextStudio.bay.status === 'ready',
      capped: false,
    },
  };
}

/**
 * Advance the bench for elapsed absence. `lastVisitedAtUnix <= 0` means
 * "never visited" and is a no-op (do not treat epoch as a week away).
 */
export function catchUpStudio(
  studio: StudioState,
  idle: IdleState,
  life: LifeState,
  practices: readonly Practice[],
  schedule: DailySchedule,
  endings: readonly Ending[],
  lastVisitedAtUnix: number,
  nowUnix: number,
  rng: Rng,
): StudioCatchUpResult {
  const { ticks, capped } = studioTicksAway(lastVisitedAtUnix, nowUnix);
  if (ticks <= 0) {
    return {
      studio,
      idle,
      life,
      practices: [...practices],
      summary: emptySummary(false),
    };
  }
  const stepped = stepStudio(studio, idle, life, practices, schedule, endings, ticks, rng);
  return {
    ...stepped,
    summary: { ...stepped.summary, capped },
  };
}
