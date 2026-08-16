// Milestone evaluation — which milestone predicates flip true over a session.
//
// Pure: reads stats via ./archive-stats, never mutates. Callers record
// fired ids into session.milestones_done; done ids and duplicates within a
// run never re-fire. The milestone row is re-declared as MilestoneLike so
// the engine never imports src/content; the content Milestone (which adds
// schema_version and grants) stays structurally assignable to it.

import {
  computeArchiveStats,
  evaluateArchivePredicate,
  type ArchivePredicateLike,
  type WorldDraftStatSource,
} from './archive-stats';
import type { StudioSession } from './studio-session';

/** Engine view of a milestone row: enough to evaluate, nothing more. */
export interface MilestoneLike {
  readonly id: string;
  readonly predicate: ArchivePredicateLike;
}

/**
 * Ids whose predicate flips true over the session and are not already in
 * `session.milestones_done`, in input order, deduped.
 */
export function checkMilestones(
  session: StudioSession,
  worldDrafts: readonly WorldDraftStatSource[],
  milestones: readonly MilestoneLike[],
): string[] {
  const done = new Set(session.milestones_done);
  const stats = computeArchiveStats(session, worldDrafts);
  const fired: string[] = [];
  for (const milestone of milestones) {
    if (done.has(milestone.id) || fired.includes(milestone.id)) {
      continue;
    }
    if (evaluateArchivePredicate(stats, milestone.predicate)) {
      fired.push(milestone.id);
    }
  }
  return fired;
}
