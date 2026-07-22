// Predicate evaluation — pure recursive descent over the Predicate union.
//
// Extracted from reducer.ts so both modules stay under the 250 LOC quality gate
// (F2 criterion 4: "No files >250 LOC in src/engine/"). The evaluator is pure:
// it only READS from LifeState and never mutates. reducer.ts imports
// `evaluatePredicate` for choice `requires` gating and event trigger matching.
//
// Reference: src/content/schema.ts (Predicate Zod shape, todo 4).

import type { Predicate } from '@/content/schema';

import type { LifeState } from './types';

/**
 * Resolve a predicate `key` against the state.
 *
 * Order: fixed scalars (age/turn/chosen_lens) -> resources -> skills.
 * Unknown keys resolve to undefined (eq/in yield no match; numeric ops coerce
 * to 0 via {@link lookupNumeric}).
 */
function lookupValue(state: LifeState, key: string): number | string | undefined {
  if (key === 'age') return state.age;
  if (key === 'turn') return state.turn;
  if (key === 'chosen_lens') return state.chosen_lens ?? undefined;
  if (Object.prototype.hasOwnProperty.call(state.resources, key)) {
    return state.resources[key];
  }
  if (Object.prototype.hasOwnProperty.call(state.skills, key)) {
    return state.skills[key];
  }
  return undefined;
}

function lookupNumeric(state: LifeState, key: string): number {
  const v = lookupValue(state, key);
  return typeof v === 'number' ? v : 0;
}

/** Share in [0,1] of the most frequent intent root in history (0 when empty). */
function dominantIntentShare(state: LifeState): number {
  const history = state.intent_root_history;
  if (history.length === 0) return 0;
  const counts: Record<string, number> = {};
  let max = 0;
  for (const root of history) {
    const next = (counts[root] ?? 0) + 1;
    counts[root] = next;
    if (next > max) max = next;
  }
  return max / history.length;
}

/** Recursively evaluate a {@link Predicate}. Pure (no state mutation). */
export function evaluatePredicate(state: LifeState, predicate: Predicate): boolean {
  switch (predicate.op) {
    case 'gte':
      return lookupNumeric(state, predicate.key) >= predicate.value;
    case 'lte':
      return lookupNumeric(state, predicate.key) <= predicate.value;
    case 'gt':
      return lookupNumeric(state, predicate.key) > predicate.value;
    case 'lt':
      return lookupNumeric(state, predicate.key) < predicate.value;
    case 'eq':
      return lookupValue(state, predicate.key) === predicate.value;
    case 'in': {
      const v = lookupValue(state, predicate.key);
      return typeof v === 'string' && predicate.values.includes(v);
    }
    case 'and':
      return predicate.operands.every((p) => evaluatePredicate(state, p));
    case 'or':
      return predicate.operands.some((p) => evaluatePredicate(state, p));
    case 'not':
      return !evaluatePredicate(state, predicate.operand);
    case 'has_flag':
      return state.flags.has(predicate.key);
    case 'has_skill':
      return Object.prototype.hasOwnProperty.call(state.skills, predicate.key);
    case 'has_resource':
      return Object.prototype.hasOwnProperty.call(state.resources, predicate.key);
    case 'intent_root_gte':
      return dominantIntentShare(state) >= predicate.value;
    default: {
      const _exhaustive: never = predicate;
      throw new Error(`evaluatePredicate: unhandled op ${String(_exhaustive)}`);
    }
  }
}
