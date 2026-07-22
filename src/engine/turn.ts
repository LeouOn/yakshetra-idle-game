// Turn loop.
//
// `advanceTurn` is the fixed-timestep tick: it advances the turn counter,
// decrements the `time` resource, ticks down event cooldowns, and may trigger
// scripted life-stage transitions via an `EraRules` callback hook (era-specific
// logic stays out of the engine).
//
// Reference: https://gafferongames.com/post/fix_your_timestep/
// Full implementation lands in todo 6.

import type { LifeState } from './types';
import type { Rng } from './rng';

/**
 * Advance one turn.
 *
 * STUB: returns `state` unchanged. Full tick (turn++, resources.time--,
 * cooldown reductions, era life-stage hooks) lands in todo 6.
 */
export function advanceTurn(state: LifeState, _rng: Rng): LifeState {
  // TODO(todo-6): increment turn, decrement time (clamp at 0), reduce cooldowns,
  // invoke EraRules life-stage callback, return spread-cloned state.
  return state;
}
