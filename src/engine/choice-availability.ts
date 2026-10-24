// One availability rule for choices — the reducer and the act panel must
// agree, or the UI offers a button the reducer refuses (the child-illness
// wealth choice: a story with no consequence).
//
// `forbidden` is checked separately by the event selector; this function is
// exactly the `requires` gate applyChoice has always enforced.

import type { Choice } from '@/content/schema';

import { evaluatePredicate } from './predicates';
import type { LifeState } from './types';

/** True when every `requires` predicate holds for this state. */
export function choiceIsAvailable(state: LifeState, choice: Choice): boolean {
  return choice.requires.every((predicate) => evaluatePredicate(state, predicate));
}
