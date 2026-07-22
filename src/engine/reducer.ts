// Within-life reducer.
//
// Redux-style pure reducer: (state, choice, rng) -> new state. Full
// implementation (effect application, predicate evaluation, resource clamping
// at 0, immutable spread updates) lands in todo 6.
//
// Reference: https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers

import type { Choice, LifeState } from './types';
import type { Rng } from './rng';

/**
 * Apply a player `Choice` to a `LifeState`, returning a NEW state.
 *
 * STUB: returns `state` unchanged. The full pure pipeline
 * (evaluatePredicate -> applyEffect with clamp-at-0) lands in todo 6.
 */
export function applyChoice(state: LifeState, _choice: Choice, _rng: Rng): LifeState {
  // TODO(todo-6): walk choice.effects through applyEffect, evaluate choice.requires,
  // clamp resources at 0, return a spread-cloned state (never mutate input).
  return state;
}
