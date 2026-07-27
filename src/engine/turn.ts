// Turn loop.
//
// `advanceTurn` is the fixed-timestep tick: it advances the turn counter,
// decrements the `time` resource (clamped at 0), ticks down event cooldowns,
// and — when an EraRules hook is supplied — delegates era-specific life-stage
// transitions (e.g. age increments) to the callback so no era knowledge lives
// in the engine. Pure: returns a NEW state.
//
// Reference: https://gafferongames.com/post/fix_your_timestep/

import type { EraRules, LifeState } from './types';
import type { Rng } from './rng';

/** Decrement every cooldown by 1, floored at 0. Returns a new map. */
function decrementAll(cooldowns: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(cooldowns)) {
    const v = cooldowns[key];
    if (v === undefined) continue;
    out[key] = Math.max(0, v - 1);
  }
  return out;
}

/**
 * Shallow-merge an era patch into the ticked state, deep-merging `resources` so
 * the time decrement survives, and ALWAYS preserving `identity` (the fence:
 * era rules cannot mutate social identity post-birth).
 */
function mergeEraPatch(state: LifeState, patch: Partial<LifeState>): LifeState {
  const { resources: patchResources, ...rest } = patch;
  const merged: LifeState = { ...state, ...rest, identity: state.identity };
  if (patchResources === undefined) {
    return merged;
  }
  return { ...merged, resources: { ...state.resources, ...patchResources } };
}

/**
 * Advance exactly one tick's worth of bookkeeping: turn+1, time-1 (clamped at
 * 0), cooldown-1, and fresh Set clones. Shared by both {@link advanceTurn}
 * (decision mode, with optional era rules) and {@link advanceIdleTick} (idle
 * mode, era-agnostic). Returns a NEW state.
 */
function baseTick(state: LifeState): LifeState {
  const nextTime = Math.max(0, (state.resources.time ?? 0) - 1);
  return {
    ...state,
    flags: new Set(state.flags),
    fired_once_per_run: new Set(state.fired_once_per_run),
    turn: state.turn + 1,
    resources: { ...state.resources, time: nextTime },
    cooldowns: decrementAll(state.cooldowns),
  };
}

/**
 * Advance one idle tick. Idle mode is era-agnostic — era-specific life-stage
 * transitions happen in decision mode via {@link advanceTurn}'s `eraRules`
 * hook. {@link simulateIdleTicks} calls this per tick so the single-tick
 * bookkeeping stays owned in one place.
 */
export function advanceIdleTick(state: LifeState): LifeState {
  return baseTick(state);
}

/** Advance one turn. */
export function advanceTurn(state: LifeState, rng: Rng, eraRules?: EraRules): LifeState {
  const base = baseTick(state);
  if (eraRules === undefined) {
    return base;
  }
  return mergeEraPatch(base, eraRules.advancePerTurn(base, rng));
}
