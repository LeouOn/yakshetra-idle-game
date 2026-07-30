/**
 * Pure breath-counting minigame engine.
 *
 * The player counts breaths up to `target`, then the count cycles back to zero
 * (one completed cycle). A `LAPSE` (lost focus) zeroes the count without
 * completing a cycle. Each `COUNT` / `LAPSE` consumes one unit of the input
 * budget; the game is terminal once that budget (`maxInputs`) is spent or the
 * player aborts.
 *
 * Determinism contract: no wall-clock, no global RNG, no platform APIs (mirrors
 * the runtime-purity fence enforced across `@yakshetra/minigames`). Timing
 * advances only via caller-supplied `TICK` deltas; the engine is a pure fold
 * over `(def, state, input) -> state` and can be replayed exactly from recorded
 * inputs.
 *
 * Only TYPE-ONLY imports cross the package boundary — erased at compile time,
 * zero runtime coupling to content.
 */

import type { MinigameDef } from '@/content/minigame-schema';

import type { BreathCountState, MinigameInput, MinigameResult } from './types';

/**
 * Fresh `breath_count` session: zeroed counters, in the `playing` phase.
 * Config (target / maxInputs) lives on the def and is never copied into state.
 */
export function initBreathCount(def: MinigameDef & { type: 'breath_count' }): BreathCountState {
  return {
    id: def.id,
    type: 'breath_count',
    phase: 'playing',
    tick: 0,
    count: 0,
    lapses: 0,
    cycles: 0,
    inputsUsed: 0,
  };
}

/**
 * Advance one step. Pure: returns a NEW state, never mutates the input.
 *
 * The shared `MinigameInput` union carries every game's events on one bus; this
 * engine acts only on the breath-relevant subset (`COUNT`, `LAPSE`, `TICK`,
 * `ABORT`) and treats the rest as no-ops. No-op inputs leave the state object
 * referentially unchanged so callers can cheaply detect "nothing happened".
 *
 * Once the phase leaves `playing`, every input is a no-op — the caller is
 * expected to consult `isBreathCountTerminal` before stepping further.
 */
export function stepBreathCount(
  def: MinigameDef & { type: 'breath_count' },
  state: BreathCountState,
  input: MinigameInput,
): BreathCountState {
  if (state.phase !== 'playing') return state;

  switch (input.type) {
    case 'COUNT': {
      const nextCount = state.count + 1;
      if (nextCount >= def.config.target) {
        return { ...state, count: 0, cycles: state.cycles + 1, inputsUsed: state.inputsUsed + 1 };
      }
      return { ...state, count: nextCount, inputsUsed: state.inputsUsed + 1 };
    }
    case 'LAPSE':
      return { ...state, count: 0, lapses: state.lapses + 1, inputsUsed: state.inputsUsed + 1 };
    case 'TICK':
      return { ...state, tick: state.tick + input.dt };
    case 'ABORT':
      return { ...state, phase: 'aborted' };
    default:
      // Foreign input variants (START, TAP, STEP, STROKE, ALLOCATE, CHOOSE)
      // belong to other minigame types and are intentionally ignored here.
      return state;
  }
}

/** True once the input budget is spent OR the session was aborted. */
export function isBreathCountTerminal(
  state: BreathCountState,
  config: { readonly target: number; readonly maxInputs: number },
): boolean {
  return state.inputsUsed >= config.maxInputs || state.phase === 'aborted';
}

/**
 * Score a completed (or aborted) session, in [0, 100].
 *
 * The achievable cycle count is `floor(maxInputs / target)` — the most cycles a
 * perfectly-focused player could complete within budget. The score is the ratio
 * of cycles actually completed to that bound, scaled to 100 and clamped. A
 * session with no completed cycles scores 0; one that matches the bound scores
 * 100. Returns only the numeric `score` — tier/reward/summary resolution is the
 * caller's job (see `pickRewardTier` in `./scoring`).
 */
export function scoreBreathCount(
  def: MinigameDef & { type: 'breath_count' },
  state: BreathCountState,
): Omit<MinigameResult, 'tierIndex' | 'rewards' | 'summary_sid'> {
  const { maxInputs, target } = def.config;
  const achievable = Math.floor(maxInputs / target);
  const ratio = achievable > 0 ? state.cycles / achievable : 0;
  const score = Math.max(0, Math.min(100, ratio * 100));
  return { score };
}
