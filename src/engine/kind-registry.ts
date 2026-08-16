// Kind registry — how a residue window claims a Manifest kind.
//
// Kind is DATA, not a closed union: the compile step reads an ordered list of
// rules and the first row whose match clauses all hold wins. The engine ships
// DEFAULT_KIND_RULES, which reproduce the SPEC §6 pick rules exactly; content
// (src/content/progression) may pass a longer list with higher-scale kinds.
// Pure: no Date, no Math.random, no platform APIs.

import type { ResidueEventType, ResidueSummary } from './residue';

/** The five SPEC §6 core kinds. New kinds arrive via registry rows. */
export type CoreManifestKind = 'thing' | 'outcome' | 'change' | 'person' | 'place';

/**
 * Residue-pattern clauses. Every specified clause must hold. Fields are
 * `T | undefined` because registry rows are Zod-parsed content.
 */
export interface KindMatch {
  readonly dominant?: ResidueEventType | undefined;
  readonly no_dominant?: boolean | undefined;
  readonly dominant_in?: readonly ResidueEventType[] | undefined;
  readonly social?: boolean | undefined;
  readonly spatial?: boolean | undefined;
}

/** An ordered registry row: when `match` holds, the window claims `kind`. */
export interface KindRule {
  readonly kind: string;
  readonly match: KindMatch;
}

/** "Social" = ≥2 distinct ids + an engagement marker (SPEC §6). */
export function isSocialWindow(summary: ResidueSummary): boolean {
  return (
    summary.ids.length >= 2 &&
    (summary.typeCounts.lens_chosen > 0 || summary.typeCounts.event_resolved > 0)
  );
}

/** Two or more practices, no social marker — a setting, not a someone. */
export function isSpatialWindow(summary: ResidueSummary): boolean {
  return (
    summary.ids.length >= 2 && summary.typeCounts.practice_tick >= 2 && !isSocialWindow(summary)
  );
}

function matchHolds(match: KindMatch, summary: ResidueSummary): boolean {
  if (match.dominant !== undefined && summary.dominantType !== match.dominant) {
    return false;
  }
  if (match.no_dominant === true && summary.dominantType !== null) {
    return false;
  }
  if (
    match.dominant_in !== undefined &&
    (summary.dominantType === null || !match.dominant_in.includes(summary.dominantType))
  ) {
    return false;
  }
  if (match.social === true && !isSocialWindow(summary)) {
    return false;
  }
  if (match.spatial === true && !isSpatialWindow(summary)) {
    return false;
  }
  return true;
}

/**
 * First-match-wins kind pick. Throws when no rule matches: a registry that
 * cannot classify a window is a content bug, not a runtime condition.
 */
export function pickKindFromRegistry<K extends string>(
  summary: ResidueSummary,
  rules: readonly { readonly kind: K; readonly match: KindMatch }[],
): K {
  for (const rule of rules) {
    if (matchHolds(rule.match, summary)) {
      return rule.kind;
    }
  }
  throw new Error('pickKindFromRegistry: no rule matched the residue summary');
}

/**
 * The SPEC §6 pick rules as data. Order is load-bearing:
 * level-up -> change, resolved-event -> outcome, social -> person,
 * spatial -> place, empty -> thing, then the dominant-type tail.
 */
export const DEFAULT_KIND_RULES: readonly {
  readonly kind: CoreManifestKind;
  readonly match: KindMatch;
}[] = [
  { kind: 'change', match: { dominant: 'practice_level' } },
  { kind: 'outcome', match: { dominant: 'event_resolved' } },
  { kind: 'person', match: { social: true } },
  { kind: 'place', match: { spatial: true } },
  { kind: 'thing', match: { no_dominant: true } },
  { kind: 'change', match: { dominant_in: ['life_ended'] } },
  { kind: 'outcome', match: { dominant_in: ['resource_edge'] } },
  { kind: 'thing', match: { dominant_in: ['practice_tick', 'lens_chosen'] } },
];
