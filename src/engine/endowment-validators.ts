// Endowment — structural views + validation helpers.
//
// All the "what is a track / can we endow?" plumbing lives here so the
// steady-state engine module (./endowment) only carries the vocabulary,
// the modifier-sum, the cascade, and the away cap. This file is a
// dependency leaf: validators imports nothing from ./endowment; the
// engine module re-exports the public surface from this file. The track
// row is re-declared as EndowmentTrackLike so the engine never imports
// src/content; the content EndowmentTrack (which adds schema_version)
// stays structurally assignable to it. The same pattern lives in
// ./milestones (MilestoneLike) and ./archive-stats (ArchivePredicateLike).

import type { StudioSession } from './studio-session';

/* ---- modifier type + zero ----------------------------------------------- */

export interface BenchModifiers {
  readonly cookSpeed: number;
  readonly windowMin: number;
  readonly surplusRate: number;
  readonly offlineCap: number;
  readonly endowmentSlots: number;
}

export const EMPTY_BENCH_MODIFIERS: BenchModifiers = {
  cookSpeed: 0,
  windowMin: 0,
  surplusRate: 0,
  offlineCap: 0,
  endowmentSlots: 0,
};

/* ---- structural op + track views ----------------------------------------- */

export interface AddResourceLike {
  readonly op: 'add_resource';
  readonly key: string;
  readonly delta: number;
}

export interface EndowmentTrackLike {
  readonly id: string;
  readonly tier: string;
  readonly requires: string | null;
  readonly slot_cost: number;
  readonly effects: readonly unknown[];
}

/** Minimal tier view: identity + slot capacity. */
export interface TierSlotsLike {
  readonly id: string;
  readonly endowment_slots: number;
}

/* ---- internal helpers ----------------------------------------------------- */

/** Tracks from `tracks` whose id is in the tier's endowed list. Returns [] if the tier is absent. */
export function endowedTracksOf(
  tierId: string,
  session: StudioSession,
  tracks: readonly EndowmentTrackLike[],
): readonly EndowmentTrackLike[] {
  const tier = session.tiers[tierId];
  if (tier === undefined) {
    return [];
  }
  const endowed = new Set(tier.endowed);
  return tracks.filter((track) => endowed.has(track.id));
}

/* ---- slot accounting ------------------------------------------------------ */

export function endowableSlots(
  tierId: string,
  session: StudioSession,
  tracks: readonly EndowmentTrackLike[],
  tiers: readonly TierSlotsLike[],
  global: BenchModifiers = EMPTY_BENCH_MODIFIERS,
): number {
  const tier = tiers.find((t) => t.id === tierId);
  if (tier === undefined) {
    return 0;
  }
  let used = 0;
  for (const track of endowedTracksOf(tierId, session, tracks)) {
    used += track.slot_cost;
  }
  return tier.endowment_slots + global.endowmentSlots - used;
}

/* ---- validity check ------------------------------------------------------- */

export type EndowBlockReason =
  | 'tier-missing'
  | 'track-tier-mismatch'
  | 'tier-locked'
  | 'already-endowed'
  | 'requires-unmet'
  | 'card-missing'
  | 'no-slots';

export interface EndowCheck {
  readonly ok: boolean;
  readonly reason: EndowBlockReason | null;
}

/**
 * Every check that does NOT need tier-row `endowment_slots` (slot capacity
 * is layered on top by `canEndow`). Exported so `endowManifest` can reuse
 * the same reason vocabulary when it throws.
 */
export function endowBlocker(
  session: StudioSession,
  tierId: string,
  track: EndowmentTrackLike,
  cardId: string,
): EndowBlockReason | null {
  const tierState = session.tiers[tierId];
  if (tierState === undefined) {
    return 'tier-missing';
  }
  if (track.tier !== tierId) {
    return 'track-tier-mismatch';
  }
  if (!tierState.unlocked) {
    return 'tier-locked';
  }
  if (tierState.endowed.includes(track.id)) {
    return 'already-endowed';
  }
  if (track.requires !== null && !session.milestones_done.includes(track.requires)) {
    return 'requires-unmet';
  }
  if (!session.archive.some((card) => card.id === cardId)) {
    return 'card-missing';
  }
  return null;
}

export function canEndow(
  session: StudioSession,
  tierId: string,
  track: EndowmentTrackLike,
  cardId: string,
  tracks: readonly EndowmentTrackLike[],
  tiers: readonly TierSlotsLike[],
  global: BenchModifiers = EMPTY_BENCH_MODIFIERS,
): EndowCheck {
  const blocker = endowBlocker(session, tierId, track, cardId);
  if (blocker !== null) {
    return { ok: false, reason: blocker };
  }
  if (track.slot_cost > endowableSlots(tierId, session, tracks, tiers, global)) {
    return { ok: false, reason: 'no-slots' };
  }
  return { ok: true, reason: null };
}
