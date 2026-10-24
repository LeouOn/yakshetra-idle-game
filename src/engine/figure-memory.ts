// Per-figure card-body memory: a figure walks its whole pool of bodies before any body returns.
//
// The archive already carries every card's `about_id` and `detail`; there is no persisted field. A
// generic pick of a figure row carries `about_id` too (manifest-pick), so the archive answers "which
// bodies has this figure already said, and in what order" with data it already has.
// Pure: no RNG, no I/O, no Date.

import type { CatalogEntry } from './table-catalog';

/** The `figure:<id>` tag a row carries, or null. */
export function figureTagOf(entry: CatalogEntry): string | null {
  return entry.tags.find((tag) => tag.startsWith('figure:')) ?? null;
}

/** The identity a figure row attaches to a card, or null for a plain row. */
export function figureAboutOf(
  entry: CatalogEntry,
): { readonly id: string; readonly name: string } | null {
  const id = figureTagOf(entry);
  return id === null ? null : { id, name: entry.name };
}

/**
 * Pick a figure's next body: one it has never printed (the first in the caller's order, which the
 * composer rotates by its seeded rng), else the body printed LONGEST ago. `seenDetails` is
 * oldest-first, as the archive is. After the first pass this is a strict walk, so a body returns only
 * once every other body has had a turn: equal bodies are `pool.length` appearances apart.
 */
export function chooseFigureBody<T>(
  pool: readonly T[],
  seenDetails: readonly string[],
  detailOf: (candidate: T) => string,
): T | undefined {
  let best: T | undefined;
  let bestAt = Number.POSITIVE_INFINITY;
  for (const candidate of pool) {
    const at = seenDetails.lastIndexOf(detailOf(candidate));
    if (at < bestAt) {
      best = candidate;
      bestAt = at;
    }
  }
  return best;
}
