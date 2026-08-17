// Compendium — long-lived accumulator of archive thresholds and the rewards
// they grant. Pure: reads stats through ./archive-stats, never mutates. The
// grant function mirrors milestones.ts: filters done ids, evaluates real
// predicates, dedupes in-run, and returns a session with newly-granted ids
// appended (input preserved when nothing grants).
//
// The row is re-declared as CompendiumEntryLike so the engine never imports
// src/content; the content CompendiumEntry (which adds schema_version and
// sid_ns) stays structurally assignable to it. Same pattern lives in
// ./milestones (MilestoneLike), ./archive-stats (ArchivePredicateLike) and
// ./endowment-validators (EndowmentTrackLike).
//
// `computeGlobalRewards` sums the granted rows' `reward.effects` add_resource
// deltas into a single BenchModifiers view, fed to computeBenchModifiers and
// effectiveAwayCap so a player who crosses multiple thresholds keeps every
// bonus. Unlock rewards (titles, etc.) deliberately contribute nothing here:
// they are displayed in the panel, not summed into bench math.

import {
  EMPTY_BENCH_MODIFIERS,
  addBenchModifiers,
  modifiersFromEffects,
  type BenchModifiers,
} from './endowment-validators';
import {
  computeArchiveStats,
  evaluateArchivePredicate,
  type ArchivePredicateLike,
  type WorldDraftStatSource,
} from './archive-stats';
import type { StudioSession } from './studio-session';

/** Engine view of a compendium row: enough to grant, nothing more. */
export interface CompendiumEntryLike {
  readonly id: string;
  readonly predicate: ArchivePredicateLike;
  /**
   * `effects` contributes deltas to the bench modifier global; `unlock` is a
   * non-numeric label (titles etc.) that contributes nothing here. The schema
   * enforces exactly-one-of — at runtime either side may be present or
   * absent; missing or non-add_resource data is treated as no-modifier.
   * Both shapes carry `| undefined` so the structural view stays assignable
   * from the zod-inferred content row under `exactOptionalPropertyTypes`.
   */
  readonly reward: {
    readonly effects?: readonly unknown[] | undefined;
    readonly unlock?: string | undefined;
  };
}

export interface CompendiumGrantResult {
  /** Newly-granted ids not already in `session.compendium_done`, in input order, deduped. */
  readonly granted: readonly string[];
  /** Session with granted ids appended; equals input when nothing grants. */
  readonly session: StudioSession;
}

/**
 * Ids whose predicate flips true over the session's archive stats AND the
 * `worldDrafts` argument AND that are not already in `session.compendium_done`,
 * in input order, deduped inside a run. The returned `session` has those ids
 * appended to `compendium_done`; the input session is never mutated.
 */
export function grantCompendium(
  session: StudioSession,
  worldDrafts: readonly WorldDraftStatSource[],
  entries: readonly CompendiumEntryLike[],
): CompendiumGrantResult {
  const done = new Set(session.compendium_done);
  const fired = new Set<string>();
  const stats = computeArchiveStats(session, worldDrafts);
  const granted: string[] = [];
  for (const entry of entries) {
    if (done.has(entry.id) || fired.has(entry.id)) {
      continue;
    }
    if (evaluateArchivePredicate(stats, entry.predicate)) {
      granted.push(entry.id);
      fired.add(entry.id);
    }
  }
  if (granted.length === 0) {
    return { granted, session };
  }
  return {
    granted,
    session: { ...session, compendium_done: [...session.compendium_done, ...granted] },
  };
}

/**
 * Fold the granted rows' reward `effects` add_resource deltas into a single
 * BenchModifiers view. Unknown ids in `done` are tolerated (the player may
 * have granted something not currently loaded), `unlock`-type rows contribute
 * nothing, and duplicates inside `done` are folded exactly once. Pure: the
 * engine stays sync and the modifiers cache this produces is fed to
 * computeBenchModifiers and effectiveAwayCap at call time.
 */
export function computeGlobalRewards(
  done: readonly string[],
  entries: readonly CompendiumEntryLike[],
): BenchModifiers {
  const entryById = new Map<string, CompendiumEntryLike>();
  for (const entry of entries) {
    entryById.set(entry.id, entry);
  }
  let total: BenchModifiers = EMPTY_BENCH_MODIFIERS;
  for (const id of done) {
    const entry = entryById.get(id);
    if (entry === undefined || entry.reward.effects === undefined) {
      continue;
    }
    const effects = entry.reward.effects;
    if (effects === undefined) {
      continue;
    }
    total = addBenchModifiers(total, modifiersFromEffects(effects));
  }
  return total;
}
