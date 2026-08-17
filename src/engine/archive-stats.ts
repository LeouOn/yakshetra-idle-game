// Archive stats — the numeric vocabulary progression reads over a session.
//
// Pure functions: no clock, no entropy, no platform. Key vocabulary:
//   pinned.<kind>        distinct archive cards of that kind currently pinned
//                        by ANY bench OR referenced as a roster member's
//                        focus_id (kind resolved through the archive)
//   archived.<kind>      archive card counts by kind — the pre-roster
//                        gate operand, reachable before any roster exists
//   world_drafts.total   assembled world drafts, supplied by the caller —
//   world_drafts.<scale> v1 does not persist drafts; Phase 1 threads them in
//   harvests.<rarity>    archive card counts by rarity
//
// Unknown or malformed keys read as 0 and surface in
// validateArchivePredicateKeys. The predicate union is re-declared here
// (ArchivePredicateLike) so the engine never imports src/content; the
// content ArchivePredicate stays structurally assignable to it.

import { SCALE_VALUES, type ManifestRarity } from './manifest';
import type { StudioSession } from './studio-session';

/* ---- predicate view ------------------------------------------------------- */

export interface ArchiveComparisonLike {
  readonly op: 'gte' | 'gt' | 'eq';
  readonly key: string;
  readonly value: number;
}

export interface ArchiveJunctionLike {
  readonly op: 'and' | 'or';
  readonly operands: readonly ArchivePredicateLike[];
}

export interface ArchiveNegationLike {
  readonly op: 'not';
  readonly operand: ArchivePredicateLike;
}

export type ArchivePredicateLike =
  ArchiveComparisonLike | ArchiveJunctionLike | ArchiveNegationLike;

/** Minimal world-draft view for stats: drafts are recorded by scale only. */
export interface WorldDraftStatSource {
  readonly scale: string;
}

/* ---- stats shape + key vocabulary ------------------------------------------ */

export interface ArchiveStats {
  readonly pinned: Readonly<Record<string, number>>;
  readonly archived: Readonly<Record<string, number>>;
  readonly world_drafts: Readonly<Record<string, number>>;
  readonly harvests: Readonly<Record<string, number>>;
}

export interface ArchiveStatKeyVocabulary {
  /** Stat-key sections. `pinned` and `archived` have an open tail: any non-empty kind id. */
  readonly sections: readonly string[];
  readonly world_drafts: readonly string[];
  readonly harvests: readonly string[];
}

export const ARCHIVE_STAT_KEYS: ArchiveStatKeyVocabulary = {
  sections: ['pinned', 'archived', 'world_drafts', 'harvests'],
  world_drafts: ['total', ...SCALE_VALUES],
  harvests: ['common', 'uncommon', 'rare'] satisfies readonly ManifestRarity[],
};

const OPEN_TAIL_SECTIONS: readonly string[] = ['pinned', 'archived'];

export function isKnownArchiveStatKey(key: string): boolean {
  const dot = key.indexOf('.');
  if (dot <= 0 || dot >= key.length - 1) {
    return false;
  }
  const section = key.slice(0, dot);
  const tail = key.slice(dot + 1);
  if (OPEN_TAIL_SECTIONS.includes(section)) {
    return true;
  }
  if (section === 'world_drafts') {
    return ARCHIVE_STAT_KEYS.world_drafts.includes(tail);
  }
  if (section === 'harvests') {
    return ARCHIVE_STAT_KEYS.harvests.includes(tail);
  }
  return false;
}

/* ---- compute --------------------------------------------------------------- */

export function computeArchiveStats(
  session: StudioSession,
  worldDrafts: readonly WorldDraftStatSource[] = [],
): ArchiveStats {
  const kindById = new Map<string, string>();
  for (const card of session.archive) {
    kindById.set(card.id, card.kind);
  }

  // kind -> distinct card ids counted as pinned (bench pin or focus_id ref).
  const pinnedIdsByKind = new Map<string, Set<string>>();
  const countPinned = (id: string, kind: string): void => {
    const ids = pinnedIdsByKind.get(kind);
    if (ids === undefined) {
      pinnedIdsByKind.set(kind, new Set([id]));
      return;
    }
    ids.add(id);
  };
  for (const bench of Object.values(session.benches)) {
    if (bench.pinned !== null) {
      countPinned(bench.pinned.id, bench.pinned.kind);
    }
  }
  for (const tier of Object.values(session.tiers)) {
    for (const member of tier.roster.members) {
      if (member.focus_id === undefined) {
        continue;
      }
      const kind = kindById.get(member.focus_id);
      if (kind !== undefined) {
        countPinned(member.focus_id, kind);
      }
    }
  }

  const pinned: Record<string, number> = {};
  for (const [kind, ids] of pinnedIdsByKind) {
    pinned[kind] = ids.size;
  }

  const archived: Record<string, number> = {};
  for (const card of session.archive) {
    archived[card.kind] = (archived[card.kind] ?? 0) + 1;
  }

  const worldDraftCounts: Record<string, number> = { total: worldDrafts.length };
  for (const draft of worldDrafts) {
    worldDraftCounts[draft.scale] = (worldDraftCounts[draft.scale] ?? 0) + 1;
  }

  const harvests: Record<string, number> = { common: 0, uncommon: 0, rare: 0 };
  for (const card of session.archive) {
    harvests[card.rarity] = (harvests[card.rarity] ?? 0) + 1;
  }

  return { pinned, archived, world_drafts: worldDraftCounts, harvests };
}

/* ---- evaluate + validate ---------------------------------------------------- */

function statNumber(stats: ArchiveStats, key: string): number {
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

export function evaluateArchivePredicate(
  stats: ArchiveStats,
  predicate: ArchivePredicateLike,
): boolean {
  switch (predicate.op) {
    case 'gte':
      return statNumber(stats, predicate.key) >= predicate.value;
    case 'gt':
      return statNumber(stats, predicate.key) > predicate.value;
    case 'eq':
      return statNumber(stats, predicate.key) === predicate.value;
    case 'and':
      return predicate.operands.every((operand) => evaluateArchivePredicate(stats, operand));
    case 'or':
      return predicate.operands.some((operand) => evaluateArchivePredicate(stats, operand));
    case 'not':
      return !evaluateArchivePredicate(stats, predicate.operand);
  }
}

/** Unknown comparison keys in the tree, deduped in encounter order. Empty = valid. */
export function validateArchivePredicateKeys(predicate: ArchivePredicateLike): string[] {
  const unknown: string[] = [];
  const walk = (node: ArchivePredicateLike): void => {
    switch (node.op) {
      case 'gte':
      case 'gt':
      case 'eq':
        if (!isKnownArchiveStatKey(node.key) && !unknown.includes(node.key)) {
          unknown.push(node.key);
        }
        break;
      case 'and':
      case 'or':
        node.operands.forEach(walk);
        break;
      case 'not':
        walk(node.operand);
        break;
    }
  };
  walk(predicate);
  return unknown;
}
