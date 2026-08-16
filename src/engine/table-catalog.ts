// Runtime table-catalog types + assembler. Entries are compiled card output
// (plain strings by design — the compiler writes sentences, SPEC §7); they
// are NOT SIDs. Pure: data in, data out.

export interface CatalogEntry {
  readonly name: string;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly tags: readonly string[];
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
