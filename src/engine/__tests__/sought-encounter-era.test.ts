// A SOUGHT encounter must still obey the era gate.
//
// `preferFigureId` returns before `figureCandidates`, which is the right
// ordering — sought beats fresh, and a sought figure that is also the last
// card on the bench still arrives. But it walks the whole catalog looking for
// a matching tag and never consults `era`, so a recipe resolved in one life
// can hand a player a row from the other. That breaks the standing invariant:
// a Fantasy life cannot draw a Tang-only row, and the reverse.
//
// It is worse than a generic cross-era row, because the sought path is
// deterministic. A wrong row here is not one card in fifty, it is every time.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '../manifest-catalog';
import { figureCandidates, pickCatalogRow } from '../manifest-pick';
import { createRng } from '../rng';
import { summarizeResidue } from '../residue';
import type { CatalogEntry } from '../table-catalog';

function rowNamed(entries: readonly CatalogEntry[], name: string): CatalogEntry {
  const hit = entries.find((e) => e.name === name);
  if (hit === undefined) {
    throw new Error(`no row named ${name}`);
  }
  return hit;
}

/** A Tang-only row, so it must be unreachable in a Fantasy life. */
function tangOnlyRow(): CatalogEntry {
  for (const entries of Object.values(CATALOG)) {
    const hit = entries.filter((e) => e.era === 'tang');
    const first = hit[0];
    if (first !== undefined) {
      return first;
    }
  }
  throw new Error('no tang-tagged row in the catalog');
}

describe('sought encounters obey the era gate', () => {
  it('refuses a Tang-only figure sought in a Fantasy life', () => {
    const tang = tangOnlyRow();
    // Any tag on that row will do: the sought path matches on tags, not on
    // kind, which is the other half of the bug.
    const figureTag = tang.tags[0];
    expect(figureTag, 'the tang row carries at least one tag').toBeDefined();

    // Note: `rowsForEra` deliberately falls back to the full table when no row
    // is era-eligible, so a lone tang row comes back anyway. That fallback is
    // right for "never starve the player a card" and wrong for "serve the figure
    // this recipe named", which is why the sought path needs its own gate
    // rather than borrowing this helper. The invariant under test is the one
    // that matters: a Fantasy life must not be handed a Tang-only row by name.

    // Then: confirm the sought path serves it anyway.
    const window = [
      {
        tick: 1,
        type: 'practice_tick',
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 2 },
      },
    ] as const;
    const summary = summarizeResidue(window);
    const picked = pickCatalogRow(
      'person',
      [],
      summary,
      CATALOG,
      createRng(1n),
      [],
      'fantasy',
      figureTag,
    );
    expect(
      picked.entry.era,
      `a Fantasy life was served a ${picked.entry.era ?? 'neutral'} row ` +
        `(${picked.entry.name}) by seeking ${figureTag}`,
    ).not.toBe('tang');
  });

  it('still serves a sought figure that belongs to this era', () => {
    // The fix must not break the feature: a sought figure in the right era
    // still arrives, and still beats the same-figure repeat filter.
    const person = CATALOG.person ?? [];
    const neutral = person.find((e) => e.era === undefined);
    expect(neutral).toBeDefined();
    const tag =
      (neutral as CatalogEntry).tags.find((t) => t.startsWith('figure:')) ??
      (neutral as CatalogEntry).tags[0];
    const window = [
      {
        tick: 1,
        type: 'practice_tick',
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 2 },
      },
    ] as const;
    const summary = summarizeResidue(window);
    const picked = pickCatalogRow(
      'person',
      [],
      summary,
      CATALOG,
      createRng(1n),
      [(neutral as CatalogEntry).name],
      'tang',
      tag,
    );
    expect(picked.entry.name).toBe((neutral as CatalogEntry).name);
    expect(picked.about?.id).toBe(tag);
  });

  it('does not let a sought tag resolve to a row of another kind', () => {
    // The sought loop walks every kind. A tag that happens to appear on a
    // place row should not answer a person harvest.
    const placeTable = CATALOG.place ?? [];
    const firstPlace = placeTable[0];
    if (firstPlace === undefined) {
      return;
    }
    const place = rowNamed(placeTable, firstPlace.name);
    const window = [
      {
        tick: 1,
        type: 'practice_tick',
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 2 },
      },
    ] as const;
    const summary = summarizeResidue(window);
    const personTable = CATALOG.person ?? [];
    const shared = place.tags.find((t) => personTable.some((p) => p.tags.includes(t)));
    if (shared === undefined) {
      return; // no shared tag today; nothing to assert
    }
    const picked = pickCatalogRow(
      'person',
      [],
      summary,
      CATALOG,
      createRng(1n),
      [],
      'tang',
      shared,
    );
    expect(picked.kind, `sought tag ${shared} answered with a ${picked.kind}`).toBe('person');
  });

  it('figure candidates stay era-filtered for the unsought path', () => {
    // Guard against a regression in the path I wrote: the residue-matched
    // figure lane must not offer tang rows in a fantasy life.
    const window = [
      {
        tick: 1,
        type: 'practice_tick',
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 2 },
      },
    ] as const;
    const summary = summarizeResidue(window);
    for (const c of figureCandidates(summary, CATALOG, 'fantasy')) {
      expect(c.entry.era, `unsought path offered a ${c.entry.era ?? 'neutral'} row`).not.toBe(
        'tang',
      );
    }
  });
});
