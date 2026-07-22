// Cross-life echo reducer.
//
// Three pure functions:
//   summarizeLife           — derive a KarmaState summary from a completed life
//   mergeKarma              — fold a life summary into the running chain karma
//   applyEchoesToNextLife   — project karma into a NextLifeSeed for the next life
//
// Full heuristics (dominant-tendency detection, pattern_break detection,
// vow/attachment scanning, echo cap of 6 with weakest-prune) land in todo 7.

import type { EraId, IntentRoot, KarmaState, LifeState, NextLifeSeed } from './types';
import type { Rng } from './rng';

/** A zeroed intent-root tally. */
function emptyIntentRoots(): Record<IntentRoot, number> {
  return { care: 0, greed: 0, aversion: 0, delusion: 0 };
}

/** A safe empty KarmaState — the canonical "nothing happened yet" value. */
export function emptyKarma(): KarmaState {
  return {
    echoes: [],
    accumulated_intent_roots: emptyIntentRoots(),
    vows: {},
  };
}

/**
 * Summarize a completed life into a karma delta.
 *
 * STUB: returns an empty karma. Full aggregation lands in todo 7.
 */
export function summarizeLife(_life: LifeState): KarmaState {
  // TODO(todo-7): aggregate intent_root_history, scan flags for vow:/attachment:,
  // detect dominant tendency (>0.4 share) and pattern_break (care-dominance >=5
  // turns after prior aversion-dominance).
  return emptyKarma();
}

/**
 * Fold a single life's karma summary into the running chain karma.
 *
 * STUB: returns `prev` unchanged. Full merge (echo cap of 6, prune oldest
 * weakest, accumulate intent-root counts) lands in todo 7.
 */
export function mergeKarma(prev: KarmaState, _lifeSummary: KarmaState): KarmaState {
  // TODO(todo-7): concat echoes, prune to cap of 6 by (oldest, weakest),
  // sum accumulated_intent_roots, merge vows.
  return prev;
}

/**
 * Project accumulated karma into the seed for the next life.
 *
 * STUB: returns an entirely neutral seed. Full projection lands in todo 7.
 *
 * CRITICAL INVARIANT: the returned object MUST NOT contain a `social_identity`
 * field (or any class/caste/gender/wealth/disability data). Todo 7 adds an
 * explicit runtime assertion enforcing this.
 */
export function applyEchoesToNextLife(
  _karma: KarmaState,
  _nextEra: EraId,
  _rng: Rng,
): NextLifeSeed {
  // TODO(todo-7): derive starting_resources_modifier from tendency echoes,
  // blocked_roles from broken vows, narrative_seed_events from unresolved
  // attachments, forbidden_lens rarely from pattern_break, imagery tag from
  // dominant tendency. NEVER touch social identity.
  return {
    starting_resources_modifier: {},
    blocked_roles: [],
    narrative_seed_events: [],
    forbidden_lens: [],
    permitted_imagery_tag: '',
  };
}
