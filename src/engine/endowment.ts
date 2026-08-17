// Endowment — permanent card → bench modifier conversion.
//
// Endowing burns an archived Manifest into a tier's endowed track list:
// the card leaves the archive, bench pins and roster focus_ids that pointed
// at it are cleared (key omitted, exactOptionalPropertyTypes), and the
// tier's bench gains the track's modifiers permanently. Pure: no clock, no
// entropy, no platform.
//
// Structural views, the blocker/canEndow vocabulary, and slot accounting
// live in ./endowment-validators (a dependency leaf). This module keeps
// the bench modifier vocabulary, sum, cascade, and away cap.

import {
  EMPTY_BENCH_MODIFIERS,
  endowBlocker,
  endowedTracksOf,
  type BenchModifiers,
  type EndowmentTrackLike,
} from './endowment-validators';
import type { BenchState, StudioSession } from './studio-session';
import type { RosterMember, TierState } from './tier-state';

/* ---- modifier vocabulary -------------------------------------------------- */

export const MODIFIER_KEY_WHITELIST: readonly string[] = [
  'cook_speed',
  'window_min',
  'surplus_rate',
  'offline_cap',
  'endowment_slots',
];
export type ModifierKey = (typeof MODIFIER_KEY_WHITELIST)[number];

// BenchModifiers + EMPTY_BENCH_MODIFIERS live in ./endowment-validators and
// are re-exported below so the public import path (@/engine/endowment) stays
// stable for tests, the StudioView, and the progression lint.

/** Base idle cap, added before any track / global offline_cap modifiers. */
export const BASE_AWAY_CAP = 240;

/* ---- computeBenchModifiers ------------------------------------------------ */

export function computeBenchModifiers(
  tierId: string,
  session: StudioSession,
  tracks: readonly EndowmentTrackLike[],
  global: BenchModifiers = EMPTY_BENCH_MODIFIERS,
): BenchModifiers {
  const sum: Record<string, number> = {};
  for (const track of endowedTracksOf(tierId, session, tracks)) {
    for (const op of track.effects) {
      if (typeof op === 'object' && op !== null && (op as { op?: unknown }).op === 'add_resource') {
        const key = (op as { key: unknown }).key;
        const delta = (op as { delta: unknown }).delta;
        if (typeof key === 'string' && typeof delta === 'number') {
          sum[key] = (sum[key] ?? 0) + delta;
        }
      }
    }
  }
  return {
    cookSpeed: (sum['cook_speed'] ?? 0) + global.cookSpeed,
    windowMin: (sum['window_min'] ?? 0) + global.windowMin,
    surplusRate: (sum['surplus_rate'] ?? 0) + global.surplusRate,
    offlineCap: (sum['offline_cap'] ?? 0) + global.offlineCap,
    endowmentSlots: (sum['endowment_slots'] ?? 0) + global.endowmentSlots,
  };
}

/* ---- cascade -------------------------------------------------------------- */

function clearPinnedIfMatches(bench: BenchState, cardId: string): BenchState {
  if (bench.pinned === null || bench.pinned.id !== cardId) {
    return bench;
  }
  return { ...bench, pinned: null };
}

function clearFocusOnMember(member: RosterMember, cardId: string): RosterMember {
  if (member.focus_id !== cardId) {
    return member;
  }
  // Copy-then-delete: `delete` only fires on the optional `focus_id` key,
  // guaranteeing it is omitted from the new member shape rather than
  // assigned undefined (exactOptionalPropertyTypes requirement).
  const next: RosterMember = { ...member };
  delete next.focus_id;
  return next;
}

function rebuildTier(tier: TierState, cardId: string, tierId: string, trackId: string): TierState {
  const members = tier.roster.members.map((member) => clearFocusOnMember(member, cardId));
  const base: TierState = { ...tier, roster: { ...tier.roster, members } };
  return tier.tier === tierId ? { ...base, endowed: [...tier.endowed, trackId] } : base;
}

export function endowManifest(
  session: StudioSession,
  tierId: string,
  trackId: string,
  cardId: string,
  tracks: readonly EndowmentTrackLike[],
): StudioSession {
  const track = tracks.find((t) => t.id === trackId);
  if (track === undefined) {
    throw new Error(`endowManifest: unknown endowment track "${trackId}"`);
  }
  const blocker = endowBlocker(session, tierId, track, cardId);
  if (blocker !== null) {
    throw new Error(`endowManifest: ${blocker}`);
  }

  const benches: Record<string, BenchState> = {};
  for (const [id, bench] of Object.entries(session.benches)) {
    benches[id] = clearPinnedIfMatches(bench, cardId);
  }
  const tiers: Record<string, TierState> = {};
  for (const [id, tier] of Object.entries(session.tiers)) {
    tiers[id] = rebuildTier(tier, cardId, tierId, trackId);
  }
  const archive = session.archive.filter((card) => card.id !== cardId);
  return { ...session, benches, tiers, archive };
}

/* ---- effectiveAwayCap ----------------------------------------------------- */

/**
 * Idle-away cap (minutes/ticks equivalent) = base + the sum of every
 * UNLOCKED tier's offline_cap modifiers + the global offline cap. Each
 * unlocked tier's bench accrues during away time, so each one's endowed
 * offline_cap rows raise the shared catch-up ceiling; locked tiers
 * contribute nothing. Per-tier modifiers are computed with an empty global
 * view so the caller's global adds exactly once.
 */
export function effectiveAwayCap(
  session: StudioSession,
  tracks: readonly EndowmentTrackLike[],
  global: BenchModifiers = EMPTY_BENCH_MODIFIERS,
): number {
  let tierCaps = 0;
  for (const tier of Object.values(session.tiers)) {
    if (tier.unlocked) {
      tierCaps += computeBenchModifiers(tier.tier, session, tracks).offlineCap;
    }
  }
  return BASE_AWAY_CAP + tierCaps + global.offlineCap;
}

/* ---- re-exports for the public surface ----------------------------------- */

export { canEndow, EMPTY_BENCH_MODIFIERS, endowableSlots } from './endowment-validators';
export type {
  BenchModifiers,
  EndowBlockReason,
  EndowCheck,
  EndowmentTrackLike,
  TierSlotsLike,
} from './endowment-validators';
