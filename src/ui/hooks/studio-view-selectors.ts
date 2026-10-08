// Studio view selectors (wave 2a extraction, lane b1) — pure gate/rail/tier
// math moved verbatim from StudioView.tsx. No behavior change; every function
// keeps its exact body. StudioView re-imports them below.

import type { ArchivePredicate, EndowmentTrack } from '@/content/progression/schema';
import {
  computeGlobalRewards,
  endowableSlots,
  type ArchiveStats,
  type ManifestScale,
  type StudioSession,
} from '@/engine';
import { registries } from '@/ui/hooks/useStudioSession';
import { statValue } from '@/ui/hooks/session-selectors';
import { EMBODIED_TIER } from '@/engine/ladder-const';

/** Harvest-priority tier for endowing: the highest unlocked tier that HAS
 * endowment tracks (content-driven; today person + household). */
export function endowTierOf(session: StudioSession): string {
  const withTracks = new Set(registries().endowment.map((track) => track.tier));
  const candidates = registries()
    .tiers.filter((tier) => session.tiers[tier.id]?.unlocked === true && withTracks.has(tier.id))
    .sort((a, b) => b.index - a.index);
  return candidates[0]?.id ?? EMBODIED_TIER;
}

/**
 * Tracks the endow chip may offer for the session: tier match, requires met,
 * not already endowed, slot cost fitting the remaining slots (compendium
 * bonus included). Empty → every chip renders locked.
 */
export function endowPlan(session: StudioSession): readonly EndowmentTrack[] {
  const tierId = endowTierOf(session);
  const tier = session.tiers[tierId];
  if (tier === undefined) {
    return [];
  }
  const global = computeGlobalRewards(session.compendium_done, registries().compendium);
  const slots = endowableSlots(tierId, session, registries().endowment, registries().tiers, global);
  return registries().endowment.filter(
    (track) =>
      track.tier === tierId &&
      !tier.endowed.includes(track.id) &&
      (track.requires === null || session.milestones_done.includes(track.requires)) &&
      track.slot_cost <= slots,
  );
}

/** Display label for a track row; tracks carry no SID namespace, so the id tail names them. */
export function endowTrackLabel(track: EndowmentTrack): string {
  const parts = track.id.split('/');
  return parts[parts.length - 1] ?? track.id;
}

interface GateOperand {
  readonly key: string;
  readonly m: number;
}

/** The gte leaves of a conjunction — the badge-able operands. Non-gte
 * comparisons and or/not junctions yield none (no badge is rendered). */
export function gteOperandsOf(predicate: ArchivePredicate): readonly GateOperand[] {
  if (predicate.op === 'gte') {
    return [{ key: predicate.key, m: predicate.value }];
  }
  if (predicate.op === 'and') {
    return predicate.operands.flatMap(gteOperandsOf);
  }
  return [];
}

/** The least-satisfied gte operand of the tier's unlock milestone, as n/m. */
export function tierProgress(stats: ArchiveStats, tierId: string): { n: number; m: number } | null {
  const tier = registries().tiers.find((row) => row.id === tierId);
  if (tier === undefined || tier.unlock_milestone === null) {
    return null;
  }
  const milestone = registries().milestones.find((row) => row.id === tier.unlock_milestone);
  if (milestone === undefined) {
    return null;
  }
  const gates = gteOperandsOf(milestone.predicate);
  if (gates.length === 0) {
    return null;
  }
  let worst = gates[0]!;
  let worstRatio = Number.POSITIVE_INFINITY;
  for (const gate of gates) {
    const ratio = Math.min(1, statValue(stats, gate.key) / gate.m);
    if (ratio < worstRatio) {
      worstRatio = ratio;
      worst = gate;
    }
  }
  return { n: Math.min(statValue(stats, worst.key), worst.m), m: worst.m };
}

/** The tier row's scale, as the manifest compiler names it.
 * Throws on an unknown tier id by design: the rail and the harvest path
 * only ever pass `tierId`s they read from `session.tiers` or
 * `registries().tiers`, so a miss means a bug, not a user input. */
export function tierScaleOf(tierId: string): ManifestScale {
  const tier = registries().tiers.find((row) => row.id === tierId);
  if (tier === undefined) {
    throw new Error(`studio: no registered tier "${tierId}"`);
  }
  return tier.scale;
}

/** Model-acceptance gate: a model card is only archived when the record is
 * internally consistent — a model echoing a mixed provenance/fill_status
 * falls to the table path instead of archiving a contradiction. */
export function isModelCard(manifest: {
  readonly provenance: { readonly source: string };
  readonly fill_status: string;
}): boolean {
  return manifest.provenance.source === 'model' && manifest.fill_status === 'model';
}
