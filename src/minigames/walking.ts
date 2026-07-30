/**
 * Walking-meditation minigame engine — pure and deterministic.
 *
 * The player takes steps at a target cadence. The session is scored by cadence
 * *consistency*: the lower the variance of inter-step intervals relative to the
 * target cadence, the higher the score. Unlike rhythm, walking rewards a steady
 * internal pace rather than accuracy to an external beat.
 *
 * Runtime purity fence: every transition operates only on its arguments — no
 * wall-clock, no global RNG, no platform APIs (mirrors the rest of the
 * `@yakshetra/minigames` package). All timing uses caller-supplied virtual
 * ticks, so a recorded input sequence replays to an identical score every time.
 *
 * The only runtime import is the pure `./scoring` helper; the schema import is
 * type-only (erased at compile time), so it creates zero runtime coupling to
 * the content package.
 */

import type { WalkingConfig, MinigameDef } from '@/content/minigame-schema';
import type { MinigameInput, MinigameResult, WalkingState } from './types';
import { variance } from './scoring';

/** Build the initial `playing` state for a walking session. */
export function initWalking(def: MinigameDef & { type: 'walking' }): WalkingState {
  return {
    id: def.id,
    type: 'walking',
    phase: 'playing',
    tick: 0,
    steps: [],
  };
}

/** Advance a walking session by one input event (STEP / TICK / ABORT). */
export function stepWalking(
  _def: MinigameDef & { type: 'walking' },
  state: WalkingState,
  input: MinigameInput,
): WalkingState {
  if (state.phase !== 'playing') return state;

  switch (input.type) {
    case 'STEP':
      return { ...state, steps: [...state.steps, input.nowTick] };
    case 'TICK':
      return { ...state, tick: state.tick + input.dt };
    case 'ABORT':
      return { ...state, phase: 'aborted' };
    default:
      return state;
  }
}

/** True once enough steps are recorded or the session has been aborted. */
export function isWalkingTerminal(state: WalkingState, config: WalkingConfig): boolean {
  return state.steps.length >= config.requiredSteps || state.phase === 'aborted';
}

/**
 * Score a walking session by cadence consistency, in [0, 100].
 *
 * Computes the population variance of the inter-step intervals and normalises
 * it against an upper bound of `targetCadence²`: zero variance (perfectly even
 * spacing) scores 100, and the score decays toward 0 as the spacing spreads.
 * With fewer than two steps there is no interval to judge, so the score is 0.
 *
 * Returns only the raw `score`; tier selection and reward application are the
 * caller's responsibility.
 */
export function scoreWalking(
  def: MinigameDef & { type: 'walking' },
  state: WalkingState,
): Omit<MinigameResult, 'tierIndex' | 'rewards' | 'summary_sid'> {
  const config = def.config as WalkingConfig;
  if (state.steps.length < 2) return { score: 0 };
  const intervals: number[] = [];
  for (let i = 1; i < state.steps.length; i++) {
    const prev = state.steps[i - 1];
    const curr = state.steps[i];
    if (prev === undefined || curr === undefined) continue;
    intervals.push(curr - prev);
  }
  const v = variance(intervals);
  const maxVariance = config.targetCadence * config.targetCadence; // rough upper bound
  const consistency = Math.max(0, 1 - v / maxVariance);
  return { score: consistency * 100 };
}
