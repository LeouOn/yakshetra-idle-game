// Row selection for table-fill: rarity, figure preference, id humanizing.
// Extracted from `manifest.ts` so that file stays inside the ~250-line engine
// budget while the card composer grows beside it. Pure: no Date, no Math.random.

import type { Rng } from './rng';
import type { ResidueSummary } from './residue';
import type { CatalogEntry, CatalogMap } from './table-catalog';
export { humanizeId, lastSegment } from './prose';

export type ManifestRarity = 'common' | 'uncommon' | 'rare';

/** common < uncommon < rare, for comparing a roll against a floor. */
const RARITY_RANK: Readonly<Record<ManifestRarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
};

export function atLeastRarity(value: ManifestRarity, floor: ManifestRarity): boolean {
  return RARITY_RANK[value] >= RARITY_RANK[floor];
}

export function raiseToFloor(value: ManifestRarity, floor: ManifestRarity): ManifestRarity {
  return RARITY_RANK[value] >= RARITY_RANK[floor] ? value : floor;
}

/**
 * Rarity roll for a table fill.
 *
 * `floor` is the additive argument wave 1 added for the long fire: a caller
 * that cooked longer may insist the card is at least `uncommon`. A floor RAISES
 * a low roll; it never lowers a high one, so a genuinely rare short card stays
 * rare.
 */
export function pickRarity(
  count: number,
  qualityTier: number,
  rng: Rng,
  floor?: ManifestRarity,
): ManifestRarity {
  const roll = rng.next();
  const rareCut = qualityTier >= 1 ? 0.18 : 0.08;
  const uncommonCut = count >= 6 ? 0.42 : 0.22;
  let rarity: ManifestRarity;
  if (roll < rareCut) {
    rarity = 'rare';
  } else if (roll < rareCut + uncommonCut) {
    rarity = 'uncommon';
  } else {
    rarity = 'common';
  }
  return floor === undefined ? rarity : raiseToFloor(rarity, floor);
}

/** The segment after the last `/` or `:` — `practice:tang/nianfo` -> `nianfo`. */
/** Id prefixes a card must never show the player (SPEC §7, SPEC §10.5). */

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

export interface PickedRow {
  readonly kind: string;
  readonly entry: CatalogEntry;
  readonly about: { readonly id: string; readonly name: string } | null;
}

/**
 * Choose the row this window compiles to: a figure row when the window names a
 * figure it can reach, otherwise a row from the predicted kind's table.
 *
 * `archiveTitles` holds the `name one_liner` pairs already on the bench. A
 * player remembers a card by its title, not by its detail, and a kind with six
 * rows is exhausted long before a kind with one. So when every candidate row's
 * title is already held, prefer a row whose title is not — that is the only
 * place a new row can be chosen from, and it has to be chosen before the
 * composer runs, since the composer can only rotate templates inside one row.
 *
 * Figure rows keep first call regardless of the archive: a window that names
 * Kṣitigarbha should harvest Kṣitigarbha. Repeat suppression is a preference
 * for the non-figure case, not a veto over the figure lane.
 */
export function pickCatalogRow(
  predictedKind: string,
  entries: readonly CatalogEntry[],
  summary: ResidueSummary,
  catalog: CatalogMap,
  rng: Rng,
  archiveTitles: readonly string[] = [],
  era?: CatalogEra,
  preferFigureId?: string,
): PickedRow {
  // Sought encounter (wave 3): the resolved recipe's figure arrives
  // deterministically — the pin pair and window already did the aiming, so
  // the rng only rolls rarity. The preferred row wins over residue-matched
  // figure candidates; absent id or absent row falls through unchanged.
  if (preferFigureId !== undefined) {
    const matchesEra = (entry: CatalogEntry): boolean =>
      era === undefined || entry.era === undefined || entry.era === era;

    // Check the predicted kind table first so a tag shared across kinds does
    // not pull an unintended kind into a predicted harvest.
    const predictedEntries = catalog[predictedKind];
    if (predictedEntries !== undefined) {
      for (const entry of predictedEntries) {
        if (entry.tags.includes(preferFigureId) && matchesEra(entry)) {
          return {
            kind: predictedKind,
            entry,
            about: { id: preferFigureId, name: entry.name },
          };
        }
      }
    }
    for (const [kind, entries] of Object.entries(catalog)) {
      if (kind === predictedKind) {
        continue;
      }
      for (const entry of entries) {
        if (entry.tags.includes(preferFigureId) && matchesEra(entry)) {
          return {
            kind,
            entry,
            about: { id: preferFigureId, name: entry.name },
          };
        }
      }
    }
  }
  const candidates = figureCandidates(summary, catalog, era);
  if (candidates.length > 0) {
    // A window naming two figures should not serve the same one three times
    // running. With two candidates a uniform pick gives three-in-a-row about a
    // quarter of the time, and the figure lane is the most-looked-at surface
    // in the game. The most recent card is the one the player is holding, and
    // its title is the last thing in `archiveTitles`; if some other figure can
    // answer, that one does.
    const latest = archiveTitles[archiveTitles.length - 1];
    const other =
      latest === undefined ? candidates : candidates.filter((c) => c.entry.name !== latest);
    const pool = other.length > 0 ? other : candidates;
    const picked = rng.pick(pool);
    return {
      kind: picked.kind,
      entry: picked.entry,
      about: { id: picked.figureId, name: picked.entry.name },
    };
  }
  const held = new Set(archiveTitles);
  // COMPACT: `archiveTitles` is a list of card TITLES, which is what
  // `archive.map((card) => card.name)` passes. Comparing against a combined
  // `name one_liner` key matched nothing, so `unseen` was always every row and
  // the row-level repeat preference never actually narrowed the table — the
  // same contract mistake the composer had, one layer up.
  //
  // A row counts as seen if ANY title it can produce is held, not just its own
  // name: `Sealed token` can render as "Chisel-stamped token" through a
  // template, so a row holding only its row-name looked entirely fresh and got
  // re-picked. Its `one_liner` counts too, because `pick` falls back to the
  // row's one-liner whenever a template does not override it.
  const eraEntries = rowsForEra(entries, era);
  const rowTitles = (e: CatalogEntry): string[] => [
    e.name,
    e.one_liner,
    ...(e.templates ?? []).flatMap((t) => [t.name ?? '', t.one_liner ?? '']),
  ];
  const seen = (e: CatalogEntry): boolean => rowTitles(e).some((t) => t !== '' && held.has(t));
  const unseen = eraEntries.filter((e) => !seen(e));
  if (unseen.length > 0) {
    return { kind: predictedKind, entry: rng.pick(unseen), about: null };
  }
  // Every row has been harvested. A repeat is now unavoidable — there are
  // twelve titles in the `thing` table and the sweep asks for twenty-four
  // cards — but a repeat IMMEDIATELY after the last card is the one a player
  // notices, and the plain uniform pick lands it often: four back-to-back
  // titles in twenty-four cards when this branch was a bare `rng.pick(all)`.
  // So the fallback is still ordered, just by recency rather than freshness.
  // `archiveTitles` is appended to in harvest order, so its last entry is the
  // card the player is looking at.
  const latest = archiveTitles[archiveTitles.length - 1];
  const notLatest =
    latest === undefined
      ? eraEntries
      : eraEntries.filter((e) => !rowTitles(e).some((t) => t === latest));
  return {
    kind: predictedKind,
    entry: rng.pick(notLatest.length > 0 ? notLatest : eraEntries),
    about: null,
  };
}
