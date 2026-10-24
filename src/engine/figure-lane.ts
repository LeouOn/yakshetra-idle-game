// The figure lane — which catalog rows a residue window may name.
//
// Extracted from manifest-pick.ts (which was over the ~250-line budget).
// A row is a figure candidate only when one of its tags is an id the window
// carries; only rows with `practice:` tags can therefore be reached by studio
// residue. Pure: no Date, no RNG, no I/O.

import type { ResidueSummary } from './residue';
import type { CatalogEntry, CatalogMap } from './table-catalog';

/** A catalog row that names a figure and matches a residue id (SPEC §16.1). */
export interface FigureCandidate {
  readonly kind: string;
  readonly entry: CatalogEntry;
  readonly figureId: string;
}

/** The era families a row can be authored for. */
export type CatalogEra = 'tang' | 'fantasy';

/**
 * Rows whose tags reference an id the residue window carries. Only rows
 * tagged `figure:*` are candidates; the visitor table swap (a Proxy with no
 * own keys) yields none, which preserves the swap's replace-not-merge rule.
 */
export function figureCandidates(
  summary: ResidueSummary,
  catalog: CatalogMap,
  era?: CatalogEra,
): FigureCandidate[] {
  const out: FigureCandidate[] = [];
  for (const [kind, rows] of Object.entries(catalog)) {
    for (const entry of rowsForEra(rows, era)) {
      const figureTag = entry.tags.find((t) => t.startsWith('figure:'));
      if (figureTag === undefined) {
        continue;
      }
      if (entry.tags.some((t) => summary.ids.includes(t))) {
        out.push({ kind, entry, figureId: figureTag });
      }
    }
  }
  return out;
}

/**
 * Narrow a table to the rows an era may harvest.
 *
 * A row with no `era` is neutral and always eligible. A row tagged for the other
 * era is dropped. If the era owns no rows at all, the full table is returned
 * rather than an empty one, so a content gap in one kind cannot make a harvest
 * throw — but the catalog test asserts that situation does not arise, so the
 * fallback is a safety net and not a normal path.
 */
export function rowsForEra(
  entries: readonly CatalogEntry[],
  era: CatalogEra | undefined,
): readonly CatalogEntry[] {
  if (era === undefined) {
    return entries;
  }
  const eligible = entries.filter((e) => e.era === undefined || e.era === era);
  return eligible.length > 0 ? eligible : entries;
}

/**
 * After a figure card, that figure is off the residue-matched pick for this
 * many person-bench harvests (see pickCatalogRow). 4 was tuned against the
 * 80-harvest single-figure measurement: share ~25%, longest run <= 2, generic
 * people fill the rest. A LONG fire is the player calling on purpose, so it
 * serves a SHORTER cooldown — the figure answers more often than a short
 * fire ever will, but never camps (always-long measures 50%, run 1).
 */
export const FIGURE_COOLDOWN_HARVESTS = 4;
export const LONG_FIRE_COOLDOWN_HARVESTS = 1;
