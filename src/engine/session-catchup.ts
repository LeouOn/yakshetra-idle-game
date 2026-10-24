// Session catch-up — wall-clock absence becomes a handful of capped workings.
//
// The UI used to compose `studioTicksAway` + `stepSession` without stamping
// `last_visited_at_unix` on the stepped session. Saving that session and
// loading it again would re-apply the same absence. This module is the
// atomic engine entry: compute capped ticks, step, stamp.
//
// The absence is converted into capped person workings (window-cap.ts): the
// first completed window is archived, the second is left ready for the
// player, and the rest of the banked ticks accrue residue. Before this, one
// 240-tick absence cooked as one 240-event window (always `change`) and the
// ladder stalled. Pure: no Date; the caller passes `nowUnix`.

import { benchAfterStep, benchToStudio, emptyBench } from './bench-mapping';
import { MIN_RESIDUE_TO_DEVELOP, queueDevelop, spendableResidue } from './cook-window';
import { harvestTableFill, STUDIO_TEND_TICKS } from './operations';
import { stepSession, type SessionStepContext, type SessionStepResult } from './session-step';
import { STUDIO_AWAY_TICK_CAP, studioTicksAway } from './studio-offline';
import { CATCHUP_TAIL_TICKS, CATCHUP_WORKINGS } from './window-cap';
import type { Manifest } from './manifest';
import type { Rng } from './rng';
import type { StudioSession } from './studio-session';

export interface AbsenceStepResult extends SessionStepResult {
  readonly summary: SessionStepResult['summary'] & { readonly archivedCards: number };
  /** Cards archived from completed away windows, oldest first. The caller
   * (UI) may show them; persistence already holds them in `session.archive`. */
  readonly harvested: readonly Manifest[];
}

export interface SessionCatchUpResult extends AbsenceStepResult {
  readonly summary: AbsenceStepResult['summary'] & { readonly capped: boolean };
}

const EMPTY_SUMMARY: SessionCatchUpResult['summary'] = {
  embodiedTicks: 0,
  memberTicks: 0,
  folded: 0,
  benchesReady: [],
  archivedCards: 0,
  capped: false,
};

const PERSON = 'person';

function benchesReady(session: StudioSession): readonly string[] {
  return Object.entries(session.benches)
    .filter(([, bench]) => bench.bay !== null && bench.bay.status === 'ready')
    .map(([id]) => id);
}

/**
 * Advance the session by exactly `ticks` of absence, converting the banked
 * time into capped person workings. A window that completes with time left
 * is archived and the next one queued; the LAST completed window is left
 * ready (one reveal for the returning player). A bay the player left ready
 * is never swept into the archive. Any leftover ticks run once at the end
 * with no further auto-work, so total applied ticks never exceed the bank.
 */
export function stepAbsence(
  session: StudioSession,
  ctx: SessionStepContext,
  ticks: number,
  rng: Rng,
): AbsenceStepResult {
  if (ticks <= 0) {
    return {
      session,
      summary: { embodiedTicks: 0, memberTicks: 0, folded: 0, benchesReady: [], archivedCards: 0 },
      harvested: [],
    };
  }

  let current = session;
  let remaining = ticks;
  let completed = 0;
  let embodiedTicks = 0;
  let memberTicks = 0;
  let folded = 0;
  const harvested: Manifest[] = [];

  const apply = (stepped: SessionStepResult): void => {
    current = stepped.session;
    embodiedTicks += stepped.summary.embodiedTicks;
    memberTicks += stepped.summary.memberTicks;
    folded += stepped.summary.folded;
    remaining -= stepped.summary.embodiedTicks;
  };

  while (remaining > 0) {
    const bench = current.benches[PERSON] ?? emptyBench();
    const bay = bench.bay;

    if (bay === null) {
      if (completed >= CATCHUP_WORKINGS) {
        break;
      }
      const studio = benchToStudio(bench, current.archive);
      if (spendableResidue(studio).length >= MIN_RESIDUE_TO_DEVELOP) {
        const queued = queueDevelop(studio, null, rng);
        if (queued === studio) {
          break;
        }
        current = {
          ...current,
          benches: { ...current.benches, [PERSON]: benchAfterStep(queued, bench) },
        };
        continue;
      }
      // Not enough material for the next capped window yet: let the absence
      // charge it (one live tend's worth at a time), then try again.
      const segment = Math.min(remaining, STUDIO_TEND_TICKS);
      const charged = stepSession(current, ctx, segment, rng);
      apply(charged);
      if (charged.summary.embodiedTicks < segment) {
        break;
      }
      continue;
    }

    if (bay.status === 'ready') {
      // The player left this one ready for themselves; never harvest it
      // behind their back.
      break;
    }

    const needed = Math.max(1, bay.cook_ticks_total - bay.cook_ticks_done);
    const segment = Math.min(remaining, needed);
    const stepped = stepSession(current, ctx, segment, rng);
    apply(stepped);

    const finished = current.benches[PERSON]?.bay;
    if (finished === null || finished === undefined || finished.status !== 'ready') {
      // A life ending halts the batch mid-segment (stepSession semantics).
      if (stepped.summary.embodiedTicks < segment) {
        break;
      }
      continue;
    }
    completed += 1;
    if (remaining <= 0) {
      // The absence ends exactly when this window finishes: leave it ready
      // for the player, as a short catch-up always has.
      break;
    }

    const settled = benchToStudio(current.benches[PERSON] ?? emptyBench(), current.archive);
    const result = harvestTableFill(settled, rng, null);
    if (result === null) {
      break;
    }
    harvested.push(result.manifest);
    current = {
      ...current,
      archive: [...current.archive, { ...result.manifest, tags: [...result.manifest.tags] }],
      benches: {
        ...current.benches,
        [PERSON]: benchAfterStep(result.studio, current.benches[PERSON] ?? emptyBench()),
      },
    };
    if (completed >= CATCHUP_WORKINGS) {
      break;
    }
    if (stepped.summary.embodiedTicks < segment) {
      break;
    }
  }

  // The tail runs in day-sized chunks: the tier ladder folds each call's
  // whole person delta at once, so one 200-tick call would hand the first
  // rung a huge fold batch and its window would cook as `change` again.
  while (remaining > 0) {
    const segment = Math.min(remaining, CATCHUP_TAIL_TICKS);
    const stepped = stepSession(current, ctx, segment, rng);
    current = stepped.session;
    embodiedTicks += stepped.summary.embodiedTicks;
    memberTicks += stepped.summary.memberTicks;
    folded += stepped.summary.folded;
    remaining -= stepped.summary.embodiedTicks;
    if (stepped.summary.embodiedTicks < segment) {
      break;
    }
  }

  return {
    session: current,
    summary: {
      embodiedTicks,
      memberTicks,
      folded,
      benchesReady: benchesReady(current),
      archivedCards: harvested.length,
    },
    harvested,
  };
}

/**
 * Advance `session` for elapsed absence and stamp `last_visited_at_unix` to
 * `nowUnix` when ticks run, so a second call with the same (or earlier) now
 * is a no-op. `last_visited_at_unix <= 0` or missing is "never visited".
 * `cap` defaults to STUDIO_AWAY_TICK_CAP; pass `effectiveAwayCap(...)` to
 * honor endowment / compendium / visitor `offline_cap`.
 */
export function catchUpSession(
  session: StudioSession,
  ctx: SessionStepContext,
  nowUnix: number,
  rng: Rng,
  cap: number = STUDIO_AWAY_TICK_CAP,
): SessionCatchUpResult {
  const { ticks, capped } = studioTicksAway(session.last_visited_at_unix ?? 0, nowUnix, cap);
  if (ticks <= 0) {
    return { session, summary: EMPTY_SUMMARY, harvested: [] };
  }
  const stepped = stepAbsence(session, ctx, ticks, rng);
  return {
    session: { ...stepped.session, last_visited_at_unix: nowUnix },
    summary: { ...stepped.summary, capped },
    harvested: stepped.harvested,
  };
}
