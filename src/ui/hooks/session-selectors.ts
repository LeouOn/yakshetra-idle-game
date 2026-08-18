// Bench-session selectors shared across the studio UI.
// Pure: no React, no DOM, no clock. They read registries + a session/series
// and return a single value the renderer can plug in. The engine barrel stays
// re-export-only at the package boundary, so this module is the UI-side home
// for selectors that touch registries.

import {
  MIN_RESIDUE_TO_DEVELOP,
  addBenchModifiers,
  computeBenchModifiers,
  computeGlobalRewards,
  visitorModifierOverlay,
  type ArchiveStats,
  type StudioSession,
} from '@/engine';

import type { ProgressionRegistries } from '@/content/progression/loader';

import { EMBODIED_TIER } from '@/engine/ladder-const';

/**
 * A locked rung's archive-stats walk. A `section.tail` key like
 * `archived.tradition` resolves to `stats.archived.tradition`. Unknown
 * sections or missing tails return 0.
 */
export function statValue(stats: ArchiveStats, key: string): number {
  const dot = key.indexOf('.');
  if (dot <= 0) {
    return 0;
  }
  const section = key.slice(0, dot);
  const tail = key.slice(dot + 1);
  if (section === 'pinned') {
    return stats.pinned[tail] ?? 0;
  }
  if (section === 'archived') {
    return stats.archived[tail] ?? 0;
  }
  if (section === 'world_drafts') {
    return stats.world_drafts[tail] ?? 0;
  }
  if (section === 'harvests') {
    return stats.harvests[tail] ?? 0;
  }
  return 0;
}

function visitorOverlayForTier(
  session: StudioSession,
  registries: ProgressionRegistries,
  tierId: string,
) {
  const active = session.tiers[tierId]?.active_visitor?.id ?? null;
  return visitorModifierOverlay(registries.visitors, active);
}

/**
 * The develop-button gate floor for the embodied bench: the canonical
 * `MIN_RESIDUE_TO_DEVELOP` baseline minus the endowed/visitor window-min
 * bonus, clamped at 2 so a develop always cooks a real window. Every
 * surface that asks "is the person bench developable yet" uses this number;
 * the inline copies (StudioView, next-action, session-ladder) all repeated
 * the same calc, so this is the single source.
 */
export function personEffectiveMin(
  session: StudioSession,
  registries: ProgressionRegistries,
): number {
  const global = computeGlobalRewards(session.compendium_done, registries.compendium);
  const endowed = computeBenchModifiers(EMBODIED_TIER, session, registries.endowment, global);
  const visitorOverlay = visitorOverlayForTier(session, registries, EMBODIED_TIER);
  const combined = addBenchModifiers(endowed, visitorOverlay);
  return Math.max(2, MIN_RESIDUE_TO_DEVELOP - combined.windowMin);
}
