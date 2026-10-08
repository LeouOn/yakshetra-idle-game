// Runtime table-catalog types + assembler. Entries are compiled card output
// (plain strings by design — the compiler writes sentences, SPEC §7); they
// are NOT SIDs. Pure: data in, data out.

/**
 * One phrasing of a row. `{{slot}}` placeholders are filled from the window
 * that produced the card by `card-composer.ts`; a template needing a slot the
 * window cannot supply is skipped rather than half-written. `gate` hides a
 * template below that rarity, and `flourish` is a sentence only a rare card
 * carries — rarity has to change the text, not just the label.
 */
export interface CardTemplate {
  readonly name?: string;
  readonly one_liner?: string;
  readonly subject?: string;
  readonly detail: string;
  readonly tags?: readonly string[];
  readonly gate?: 'uncommon' | 'rare';
  readonly flourish?: string;
  /**
   * Which era family this phrasing is written for. Without it, Tang and
   * Fantasy produce byte-identical card sequences, because the rows are one
   * vocabulary. Author a variant per era family on the rows the bench actually
   * spends its harvests on; a row with no variant falls back to its era-neutral
   * templates, which still work in both.
   */
  readonly era?: 'tang' | 'fantasy';
  /**
   * Overrides the row's own long-fire / rare sentence for this phrasing.
   *
   * Needed whenever a template is a *different object* wearing the same row: the
   * "Six-leaf rule" template under "Folded measure" is another carpenter's
   * rule, not that same rule, and inheriting the row's sentence made two
   * distinct cards close on the same clause. Author the override or the two
   * objects will keep sharing a voice.
   */
  readonly long_fire?: string;
  readonly rare?: string;
}

export interface CatalogEntry {
  readonly name: string;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly tags: readonly string[];
  /** Optional phrasings the composer chooses between. Absent = verbatim row. */
  readonly templates?: readonly CardTemplate[];
  /**
   * One sentence for a long cook, in the row's own voice. A global long-fire
   * line read as a mechanic announcement stamped onto the card; the extra
   * effort should be something this particular object could say about itself.
   * Rows without one fall back to a shared pool chosen by seeded rotation, so
   * no single sentence can dominate the deck.
   */
  readonly long_fire?: string;
  /** One sentence for a rare card, same rule and same reason. */
  readonly rare?: string;
  /**
   * Which era family this ROW is written for, as distinct from CardTemplate.era
   * which scopes a single phrasing inside a row.
   *
   * A row with no `era` is era-neutral and eligible in every era. `era: 'tang'`
   * is eligible only in Tang, `era: 'fantasy'` only in the Garden of Arrivals.
   * This is what stops a Garden life from harvesting a Chang'an curfew drum, and
   * it has to be a property of the ROW rather than a tag, because the composer
   * cannot un-pick a row it has already chosen.
   *
   * The filter narrows and never throws: if a kind somehow has no eligible row
   * the picker falls back to the full table, and the catalog test asserts every
   * core kind has at least one row per era so that fallback is unreachable in
   * content.
   */
  readonly era?: 'tang' | 'fantasy';
}

export type CatalogMap = Readonly<Record<string, readonly CatalogEntry[]>>;

/** Assemble the runtime catalog from validated content. Throws on empty kind tables. */
export function buildCatalog(
  kindIds: readonly string[],
  byKind: Readonly<Record<string, readonly CatalogEntry[]>>,
): CatalogMap {
  const out: Record<string, readonly CatalogEntry[]> = {};
  for (const id of kindIds) {
    const entries = byKind[id];
    if (entries === undefined || entries.length === 0) {
      throw new Error(
        `buildCatalog: kind "${id}" has no table entries (table fallback is mandatory)`,
      );
    }
    out[id] = entries;
  }
  return out;
}
