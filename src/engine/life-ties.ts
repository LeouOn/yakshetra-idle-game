// Ties: who this life is connected to, and what a card is allowed to print
// about them. Split out of `life-context.ts` so that file stays inside the
// ~250-line engine budget.
//
// The rule that shapes this whole file: a display name must already exist.
// Where one does, it is used and cased. Where it does not, the tie carries no
// name and the composer prints nothing. Turning an identifier into a
// plausible-looking person is the failure mode — "m-guest" humanizes to
// "M Guest", and a player cannot tell that is not a real name.

import type { Manifest } from './manifest';
import type { LifeState } from './types';
import { displayName, isIdShaped } from './prose';
import type { BondKind, LifeTie } from './life-context';

export function classifyBond(trust: number, debt: number, affection: number): BondKind {
  if (affection >= 3 && trust >= 2) {
    return 'close';
  }
  if (debt > trust) {
    return 'owed';
  }
  if (affection > 0 || trust > 0) {
    return 'warm';
  }
  return 'thin';
}

/**
 * Relationships the player earned, keyed by whatever the life stores.
 *
 * A key is a real name far more often than not ("auntie-qian", sometimes
 * namespaced "relationship:old-wu"), and those are printable once the
 * namespace and dashes become words.
 *
 * But pinning a harvested person files it under the *manifest id*
 * ("m-0-464489159"), which is a handle, not a name. Humanizing that yields
 * "M Guest", which is worse than printing nothing: it invents a person out of
 * an identifier. So a key that is a known manifest id, or that is id-shaped
 * outright, gets no display name at all. Its identity still travels in `id`,
 * so lookups and pin paths are unaffected; only the printable name is absent.
 */
export function tiesFromLife(life: LifeState, manifestIds: ReadonlySet<string>): LifeTie[] {
  const ties: LifeTie[] = [];
  for (const [id, rel] of Object.entries(life.relationships)) {
    const raw = id
      .replace(/^relationship:/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    // Test the id as stored, not the word-shaped form: `m-guest` is a handle
    // and `m guest` is not, and by the time the dashes are gone the evidence
    // is gone too.
    const printable =
      manifestIds.has(id) || isIdShaped(id) || isIdShaped(raw) ? null : displayName(raw);
    ties.push({
      id,
      name: printable,
      source: 'relationship',
      trust: rel.trust,
      debt: rel.debt,
      affection: rel.affection,
      bond: classifyBond(rel.trust, rel.debt, rel.affection),
    });
  }
  return ties;
}

export function tiesFromCast(archive: readonly Manifest[]): LifeTie[] {
  return archive
    .filter((card) => card.kind === 'person')
    .map((card) => ({
      id: card.id,
      // The card's own name, never card.id. This is the "Closest tie:
      // m-0-464489159" leak, found in the browser and fixed here at the source.
      name: card.name,
      source: 'cast' as const,
      trust: 1,
      debt: 0,
      affection: 2,
      bond: 'warm' as const,
    }));
}

/**
 * The strongest tie as something printable, or null when there is nothing safe
 * to print. Resolved from the tie's display name; a manifest id is never a
 * fallback, because a card is player-facing prose.
 */
export function strongestTieName(ties: readonly LifeTie[]): string | null {
  if (ties.length === 0) {
    return null;
  }
  const ranked = [...ties].sort((a, b) => {
    const score = (t: LifeTie): number => t.affection * 3 + t.trust * 2 - t.debt;
    return score(b) - score(a);
  });
  const top = ranked[0];
  if (top === undefined) {
    return null;
  }
  return top.name ?? (isIdShaped(top.id) ? null : top.id);
}
