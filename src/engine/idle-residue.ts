// Idle residue stamping — the emission end of the idle loop.
//
// Extracted from idle.ts (wave 1b) so the emission rules live in one small
// module: one aggregated residue event per practice that moved, level-ups,
// resources that became zero, life endings — plus the wave-1b engagement
// marker. Pure: no Date, no Math.random, no platform APIs.

import { activityFamilyForLens } from './activities';
import { ENGAGEMENT_PREFIX, appendResidue, residueLog, type ResidueEvent } from './residue';
import type { IdleTickResult, LifeState, Practice } from './types';

/** Families whose practice counts as engaging other beings: generosity is
 * giving to beings; careful conduct (beings) is attending to them. */
export function isSocialFamily(family: ReturnType<typeof activityFamilyForLens>): boolean {
  return family === 'generosity' || family === 'beings';
}

/** Practice ids whose activity family is social. */
export function socialPracticeIds(practices: readonly Practice[]): ReadonlySet<string> {
  const out = new Set<string>();
  for (const practice of practices) {
    if (isSocialFamily(activityFamilyForLens(practice.lens))) {
      out.add(practice.id);
    }
  }
  return out;
}

/**
 * One aggregated residue event per practice that moved, plus level-ups and
 * resources that *became* zero this batch. Compact enough for a compiler.
 * A practice in `socialIds` carries an `engagement:<id>` marker id on its
 * practice_tick event, so a window of social-family work can read as a
 * person window without any prose on the log.
 */
export function stampIdleResidue(
  state: LifeState,
  resourcesBefore: Record<string, number>,
  tick: number,
  result: IdleTickResult,
  socialIds: ReadonlySet<string>,
): LifeState {
  const extra: ResidueEvent[] = [];
  for (const row of result.practicesAdvanced) {
    if (row.progressGained > 0) {
      extra.push({
        tick,
        type: 'practice_tick',
        ids: socialIds.has(row.id) ? [row.id, `${ENGAGEMENT_PREFIX}${row.id}`] : [row.id],
        numbers: { progress: row.progressGained },
      });
    }
    if (row.leveledUp) {
      extra.push({
        tick,
        type: 'practice_level',
        ids: [row.id],
        numbers: {},
      });
    }
  }
  for (const key of Object.keys(state.resources)) {
    const before = resourcesBefore[key] ?? 0;
    const after = state.resources[key] ?? 0;
    if (before > 0 && after === 0) {
      extra.push({
        tick,
        type: 'resource_edge',
        ids: [key],
        numbers: { value: 0 },
      });
    }
  }
  if (result.endingTriggered !== null) {
    extra.push({
      tick,
      type: 'life_ended',
      ids: [result.endingTriggered],
      numbers: {},
    });
  }
  if (extra.length === 0) {
    return state;
  }
  let log = residueLog(state);
  for (const event of extra) {
    log = appendResidue(log, event);
  }
  return { ...state, residue: log };
}
