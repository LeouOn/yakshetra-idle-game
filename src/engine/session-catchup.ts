// Session catch-up — wall-clock absence becomes one stepSession batch.
//
// The UI used to compose `studioTicksAway` + `stepSession` without stamping
// `last_visited_at_unix` on the stepped session. Saving that session and
// loading it again would re-apply the same absence. This module is the
// atomic engine entry: compute capped ticks, step, stamp.
// Pure: no Date; the caller passes `nowUnix`.

import { stepSession, type SessionStepContext, type SessionStepResult } from './session-step';
import { STUDIO_AWAY_TICK_CAP, studioTicksAway } from './studio-offline';
import type { Rng } from './rng';
import type { StudioSession } from './studio-session';

export interface SessionCatchUpResult extends SessionStepResult {
  readonly summary: SessionStepResult['summary'] & { readonly capped: boolean };
}

const EMPTY_SUMMARY: SessionCatchUpResult['summary'] = {
  embodiedTicks: 0,
  memberTicks: 0,
  folded: 0,
  benchesReady: [],
  capped: false,
};

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
    return { session, summary: EMPTY_SUMMARY };
  }
  const stepped = stepSession(session, ctx, ticks, rng);
  return {
    session: { ...stepped.session, last_visited_at_unix: nowUnix },
    summary: { ...stepped.summary, capped },
  };
}
