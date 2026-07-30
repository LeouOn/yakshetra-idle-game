/**
 * Sutra-tracing (calligraphy) minigame engine.
 *
 * Pure and deterministic: no wall-clock, no RNG, no platform APIs — it mirrors
 * the runtime-purity fence enforced across the minigames package. The player
 * traces the strokes of a character in order; each stroke yields an accuracy in
 * [0, 1]. The session ends once every configured stroke is recorded or the
 * player aborts. The final score is the mean stroke accuracy scaled to [0, 100].
 *
 * Every transition is pure: `stepTrace` returns a NEW state and never mutates
 * its argument, so a full session replays deterministically from the recorded
 * input stream.
 */

import type { MinigameDef } from '@/content/minigame-schema';
import type { MinigameInput, MinigameResult, TraceState } from './types';
import { clamp01, mean } from './scoring';

/** The `trace` member of the `MinigameDef` discriminated union. */
export type TraceDef = Extract<MinigameDef, { type: 'trace' }>;

/** Per-stroke config (stroke targets + tolerances), derived from the schema. */
export type TraceConfig = TraceDef['config'];

/** Create the initial playing state for a trace minigame. */
export function initTrace(def: TraceDef): TraceState {
  return {
    id: def.id,
    type: 'trace',
    phase: 'playing',
    tick: 0,
    strokes: [],
    nextStrokeIndex: 0,
  };
}

/**
 * Advance a trace session by one input. Strokes must arrive in order: an
 * out-of-sequence index is a no-op so a dropped or duplicated event cannot
 * desync the trace. Accuracy is clamped to [0, 1] (non-finite -> 0). Inputs
 * shared with other minigame types are ignored.
 *
 * `def` is accepted for API symmetry with the other engines but is not read by
 * the pure stroke reducer; completion is signalled by `isTraceTerminal`.
 */
export function stepTrace(_def: TraceDef, state: TraceState, input: MinigameInput): TraceState {
  if (state.phase !== 'playing') return state;

  switch (input.type) {
    case 'STROKE': {
      if (input.index !== state.nextStrokeIndex) return state;
      return {
        ...state,
        strokes: [...state.strokes, clamp01(input.accuracy)],
        nextStrokeIndex: state.nextStrokeIndex + 1,
      };
    }
    case 'TICK':
      return { ...state, tick: state.tick + input.dt };
    case 'ABORT':
      return { ...state, phase: 'aborted' };
    // MinigameInput is a union shared across every minigame type; the variants
    // belonging to other engines (START, COUNT, LAPSE, TAP, STEP, ALLOCATE,
    // CHOOSE) intentionally leave the trace state untouched.
    default:
      return state;
  }
}

/** True once all configured strokes are recorded or the player has aborted. */
export function isTraceTerminal(state: TraceState, config: TraceConfig): boolean {
  return state.nextStrokeIndex >= config.strokes.length || state.phase === 'aborted';
}

/**
 * Pure accuracy score in [0, 100]: the mean recorded stroke accuracy, scaled.
 * An empty stroke list scores 0 (mean([]) === 0), so an aborted-before-any-
 * stroke session needs no special-case branch. Tier/reward resolution depends
 * on `def.rewardTiers` and is handled by a separate finalize step.
 */
export function scoreTrace(
  _def: TraceDef,
  state: TraceState,
): Omit<MinigameResult, 'tierIndex' | 'rewards' | 'summary_sid'> {
  return { score: mean(state.strokes) * 100 };
}
