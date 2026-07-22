// Cross-life echo reducer (public API).
//
// Three pure functions:
//   summarizeLife           — derive a KarmaState summary from a completed life
//   mergeKarma              — fold a life summary into the running chain karma
//   applyEchoesToNextLife   — project karma into a NextLifeSeed for the next life
//
// CRITICAL INVARIANT (plan todo 7): `applyEchoesToNextLife` MUST NOT produce any
// field that touches `SocialIdentity`. The invariant is enforced structurally
// (NextLifeSeed has no such fields) AND at runtime by `assertSeedTouchesNoIdentity`,
// which is called at the tail of `applyEchoesToNextLife`.
//
// Life-signal analysis (tendency/pattern_break/vow/attachment detection) lives
// in the internal sibling `./echo-heuristics`.

import type {
  Echo,
  EraId,
  IntentRoot,
  KarmaState,
  Lens,
  LifeState,
  NextLifeSeed,
  ResourceId,
  RoleId,
} from './types';
import type { Rng } from './rng';

import {
  INTENT_ROOTS,
  capEchoes,
  countIntentRoots,
  detectDominantTendency,
  detectPatternBreak,
  emptyIntentRoots,
  scanAttachments,
  scanVows,
} from './echo-heuristics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of echoes retained across lives; weakest pruned first. */
const ECHO_CAP = 6;

/** The closed set of resources, for exhaustive iteration. */
const RESOURCE_IDS: readonly ResourceId[] = [
  'time',
  'energy',
  'provisions',
  'trust',
  'skill',
  'obligation',
];

/**
 * Per-tendency starting-resource delta projected into the next life.
 * Wholesome roots (care) grant; unwholesome roots deplete. Exhaustive over the
 * IntentRoot union by Record construction.
 */
const TENDENCY_RESOURCE_DELTA: Readonly<Record<IntentRoot, Partial<Record<ResourceId, number>>>> = {
  care: { trust: 5 },
  aversion: { time: -5 },
  greed: { provisions: -3 },
  delusion: { skill: -3 },
};

/** Imagery tag suggested by each dominant tendency. */
const TENDENCY_IMAGERY: Readonly<Record<IntentRoot, string>> = {
  care: 'lotus',
  greed: 'gold',
  aversion: 'smoke',
  delusion: 'fog',
};

/**
 * Field names the echo reducer is forbidden from emitting. This regex literal
 * IS the explicit assertion string permitted by the plan's grep gate.
 */
const IDENTITY_FIELD_PATTERN = /social_identity|caste|gender|race|disability|wealth/i;

/** A safe empty KarmaState — the canonical "nothing happened yet" value. */
export function emptyKarma(): KarmaState {
  return {
    echoes: [],
    accumulated_intent_roots: emptyIntentRoots(),
    vows: {},
  };
}

// ---------------------------------------------------------------------------
// Identity-leak assertion (plan todo 7 CRITICAL INVARIANT)
// ---------------------------------------------------------------------------

/**
 * Throw if `seed` carries any field touching SocialIdentity. Exported so the
 * invariant test (todo 8) can drive a poisoned object through the exact check
 * that `applyEchoesToNextLife` runs on its own return value.
 */
export function assertSeedTouchesNoIdentity(seed: NextLifeSeed): void {
  for (const key of Object.keys(seed)) {
    if (IDENTITY_FIELD_PATTERN.test(key)) {
      throw new Error(`echo cannot touch social identity: ${key}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Public reducers
// ---------------------------------------------------------------------------

/**
 * Summarize a completed life into a karma delta.
 *
 * Aggregates `intent_root_history`, scans `flags` for vows and attachments,
 * and surfaces up to `ECHO_CAP` echoes (weakest pruned). Pure: returns a new
 * object, never mutates `life`.
 */
export function summarizeLife(life: LifeState): KarmaState {
  const echoes: Echo[] = [];

  const tendency = detectDominantTendency(life.intent_root_history);
  if (tendency !== null) {
    echoes.push({
      type: 'tendency',
      key: tendency.root,
      weight: tendency.root === 'care' ? tendency.share : -tendency.share,
      source_life_id: life.id,
      narrative_sid: `echo:tendency:${tendency.root}`,
    });
  }

  if (detectPatternBreak(life.intent_root_history)) {
    echoes.push({
      type: 'pattern_break',
      key: 'care_after_aversion',
      weight: 0.5,
      source_life_id: life.id,
      narrative_sid: 'echo:pattern_break:care_after_aversion',
    });
  }

  const { vows, echoes: vowEchoes } = scanVows(life.flags, life.id);
  echoes.push(...vowEchoes);
  echoes.push(...scanAttachments(life.flags, life.id));

  return {
    echoes: capEchoes(echoes, ECHO_CAP),
    accumulated_intent_roots: countIntentRoots(life.intent_root_history),
    vows,
  };
}

/**
 * Fold a single life's karma summary into the running chain karma.
 *
 * Concatenates echoes (capped at `ECHO_CAP`, weakest pruned), sums intent-root
 * counts, and lets the life summary's vows override the chain's. Pure.
 */
export function mergeKarma(prev: KarmaState, lifeSummary: KarmaState): KarmaState {
  const echoes = capEchoes([...prev.echoes, ...lifeSummary.echoes], ECHO_CAP);
  const accumulated = emptyIntentRoots();
  for (const root of INTENT_ROOTS) {
    accumulated[root] =
      prev.accumulated_intent_roots[root] + lifeSummary.accumulated_intent_roots[root];
  }
  return {
    echoes,
    accumulated_intent_roots: accumulated,
    vows: { ...prev.vows, ...lifeSummary.vows },
  };
}

/**
 * Project accumulated karma into the seed for the next life.
 *
 * Tendency echoes shift starting resources and imagery; broken vows and open
 * attachments surface as narrative seed events. Role-gating and lens-forbidding
 * are intentionally left empty here — they are era-specific (no era logic in the
 * engine). Pure and deterministic via the passed `rng`.
 *
 * CRITICAL INVARIANT: the returned seed is passed through
 * `assertSeedTouchesNoIdentity` before it leaves this function.
 */
export function applyEchoesToNextLife(karma: KarmaState, nextEra: EraId, rng: Rng): NextLifeSeed {
  const starting_resources_modifier: Partial<Record<ResourceId, number>> = {};
  const blocked_roles: RoleId[] = [];
  const narrative_seed_events: string[] = [];
  const forbidden_lens: Lens[] = [];
  const tendencyRoots: IntentRoot[] = [];

  for (const echo of karma.echoes) {
    narrative_seed_events.push(`${nextEra}:${echo.type}:${echo.key}`);

    if (echo.type === 'tendency') {
      const root = INTENT_ROOTS.find((r) => r === echo.key);
      if (root !== undefined) {
        tendencyRoots.push(root);
        const delta = TENDENCY_RESOURCE_DELTA[root];
        for (const res of RESOURCE_IDS) {
          const d = delta[res];
          if (d !== undefined) {
            starting_resources_modifier[res] = (starting_resources_modifier[res] ?? 0) + d;
          }
        }
      }
      continue;
    }

    if (echo.type === 'vow' && echo.weight < 0) {
      // A broken vow surfaces as an extra narrative beat; role-gating is
      // era-specific and therefore not applied inside the engine.
      narrative_seed_events.push(`${nextEra}:vow_broken:${echo.key}`);
    }
  }

  const permitted_imagery_tag =
    tendencyRoots.length === 0 ? '' : rng.pick(tendencyRoots.map((r) => TENDENCY_IMAGERY[r]));

  const result: NextLifeSeed = {
    starting_resources_modifier,
    blocked_roles,
    narrative_seed_events,
    forbidden_lens,
    permitted_imagery_tag,
  };

  assertSeedTouchesNoIdentity(result);
  return result;
}
