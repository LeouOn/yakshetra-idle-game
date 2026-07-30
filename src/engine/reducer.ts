// Within-life reducer.
//
// Redux-style pure pipeline. Every function returns a NEW LifeState; inputs are
// never mutated (no direct property writes on the input — only reads and spread
// clones).
//   applyChoice        -> gate on requires -> fold applyEffect -> record history
//   applyEvent         -> cooldown/once gate -> trigger predicate -> first match
//   applyEffect        -> exhaustive dispatch on the EffectOp discriminator
//
// Predicate evaluation (`evaluatePredicate`) lives in ./predicates.ts; it is
// imported here for choice `requires` gating and event trigger matching.
//
// Reference: https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers

import type { Choice, EffectOp, Event } from '@/content/schema';

import type { IntentRoot, LifeState, ResourceId, SocialIdentity } from './types';
import type { Rng } from './rng';
import { evaluatePredicate } from './predicates';

// IDLE_TICK action surface — the idle reducer lives in ./idle.ts (it needs the
// schedule + practice modules). Re-exported here so consumers import all
// reduction actions from one module. The reducer.ts <-> idle.ts edge is a
// safe cycle: every cross-module binding is used inside function bodies only.
export { reduceIdleTick, simulateIdleTicks } from './idle';
export type { IdleTickAction } from './idle';

/** Canonical starting resources for a fresh life (the six {@link ResourceId} keys). */
const BASE_RESOURCES: Record<ResourceId, number> = {
  time: 100,
  energy: 100,
  provisions: 50,
  trust: 10,
  skill: 0,
  obligation: 0,
};

/** Options for {@link createLifeState}. */
export interface CreateLifeStateOptions {
  id: LifeState['id'];
  era: LifeState['era'];
  role: LifeState['role'];
  identity: SocialIdentity;
  age?: number;
  resources?: Partial<Record<ResourceId, number>>;
}

/**
 * Construct the initial LifeState for a new life.
 *
 * `identity` is set ONCE here and is immutable thereafter — the reducer never
 * writes to any SocialIdentity field (the todo 7/8 fence).
 */
export function createLifeState(opts: CreateLifeStateOptions): LifeState {
  return {
    identity: opts.identity,
    id: opts.id,
    era: opts.era,
    role: opts.role,
    age: opts.age ?? 0,
    turn: 0,
    resources: { ...BASE_RESOURCES, ...(opts.resources ?? {}) },
    skills: {},
    relationships: {},
    flags: new Set<string>(),
    intent_root_history: [],
    chosen_lens: null,
    alive: true,
    last_narrative_sid: null,
    event_weights: {},
    cooldowns: {},
    history: [],
    fired_once_per_run: new Set<string>(),
    pending_events: [],
    schedule_id: null,
    practice_override_id: null,
  };
}

/* -------------------------------------------------------------------------------------------------
 * Effect application
 * -----------------------------------------------------------------------------------------------*/

/** Clamp to [0, +inf); non-finite (NaN/-Infinity) collapses to 0. */
function clampNonNegative(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n;
}

/**
 * Apply a single {@link EffectOp}, returning a NEW state.
 *
 * The `_rng` slot is reserved for future stochastic effects; none of the eleven
 * current ops consume it, so the pipeline stays deterministic today.
 */
export function applyEffect(state: LifeState, effect: EffectOp, _rng: Rng): LifeState {
  switch (effect.op) {
    case 'add_resource': {
      const current = state.resources[effect.key] ?? 0;
      return {
        ...state,
        resources: { ...state.resources, [effect.key]: clampNonNegative(current + effect.delta) },
      };
    }
    case 'add_skill': {
      const current = state.skills[effect.key] ?? 0;
      return {
        ...state,
        skills: { ...state.skills, [effect.key]: current + 1 },
      };
    }
    case 'add_flag': {
      const flags = new Set(state.flags);
      flags.add(effect.key);
      return { ...state, flags };
    }
    case 'remove_flag': {
      const flags = new Set(state.flags);
      flags.delete(effect.key);
      return { ...state, flags };
    }
    case 'add_relationship': {
      const existing = state.relationships[effect.target] ?? { trust: 0, debt: 0, affection: 0 };
      return {
        ...state,
        relationships: {
          ...state.relationships,
          [effect.target]: { ...existing, trust: existing.trust + effect.delta },
        },
      };
    }
    case 'modify_event_weight': {
      const current = state.event_weights[effect.event_id] ?? 1;
      return {
        ...state,
        event_weights: {
          ...state.event_weights,
          [effect.event_id]: current * effect.multiplier,
        },
      };
    }
    case 'trigger_event':
      return {
        ...state,
        pending_events: [...state.pending_events, effect.event_id],
      };
    case 'set_intent_root':
      return {
        ...state,
        intent_root_history: [...state.intent_root_history, effect.intent_root as IntentRoot],
      };
    case 'narrative_card':
      return { ...state, last_narrative_sid: effect.card_sid };
    case 'set_schedule':
      return { ...state, schedule_id: effect.schedule_id };
    case 'set_practice_override':
      return { ...state, practice_override_id: effect.practice_id };
    default: {
      const _exhaustive: never = effect;
      throw new Error(`applyEffect: unhandled op ${String(_exhaustive)}`);
    }
  }
}

/**
 * Fold an array of {@link EffectOp} into a LifeState, returning a NEW state.
 *
 * Pure: no mutation, no side effects. Used by minigame rewards and any caller
 * that needs to apply a batch of effects without a {@link Choice} wrapper.
 * Empty input returns the same state reference (reduce no-op).
 */
export function applyEffects(state: LifeState, effects: readonly EffectOp[], rng: Rng): LifeState {
  return effects.reduce((acc, effect) => applyEffect(acc, effect, rng), state);
}

/* -------------------------------------------------------------------------------------------------
 * Choice & event application
 * -----------------------------------------------------------------------------------------------*/

/**
 * Apply a player {@link Choice}, returning a NEW state.
 *
 * If any `requires` predicate fails the choice is unavailable and the state is
 * returned unchanged. Otherwise every effect is folded through
 * {@link applyEffect} and the choice id is appended to the replay history.
 */
export function applyChoice(state: LifeState, choice: Choice, rng: Rng): LifeState {
  if (!choice.requires.every((p) => evaluatePredicate(state, p))) {
    return state;
  }
  const afterEffects = choice.effects.reduce<LifeState>(
    (acc, effect) => applyEffect(acc, effect, rng),
    state,
  );
  return { ...afterEffects, history: [...afterEffects.history, choice.id] };
}

/**
 * Resolve an {@link Event} against the state, returning a NEW state.
 *
 * Skips when already fired (once_per_run) or on cooldown; checks the trigger
 * predicate; picks the first non-forbidden choice whose `requires` pass
 * (falling back to the first choice); applies it; stamps cooldown and
 * once_per_run bookkeeping.
 */
export function applyEvent(state: LifeState, event: Event, rng: Rng): LifeState {
  if (event.once_per_run && state.fired_once_per_run.has(event.id)) {
    return state;
  }
  if ((state.cooldowns[event.id] ?? 0) > 0) {
    return state;
  }
  if (event.trigger !== undefined && !evaluatePredicate(state, event.trigger)) {
    return state;
  }

  const firstChoice = event.choices[0];
  if (firstChoice === undefined) {
    return state;
  }
  const matched =
    event.choices.find(
      (c) => !c.forbidden && c.requires.every((p) => evaluatePredicate(state, p)),
    ) ?? firstChoice;

  const afterChoice = applyChoice(state, matched, rng);
  const firedOnce = event.once_per_run
    ? new Set(afterChoice.fired_once_per_run).add(event.id)
    : afterChoice.fired_once_per_run;

  return {
    ...afterChoice,
    cooldowns: { ...afterChoice.cooldowns, [event.id]: event.cooldown_turns },
    fired_once_per_run: firedOnce,
  };
}
