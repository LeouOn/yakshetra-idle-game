// Patch A: the Garden's named figures, the five-coloured vow cord, two verses, and the plain people
// that keep the figure share of Garden person cards inside its band. These pins guard the properties
// the review depends on; the shared catalog tests (rubric, mirror, Tang list, cadence, era sweeps)
// already cover every new row.
import { describe, expect, it } from 'vitest';

import { CATALOG } from '../manifest-catalog';
import { FIGURE_IDS, FIGURE_PEOPLE, FIGURE_PLACES } from '../manifest-catalog-figures';
import {
  GARDEN_FIGURE_IDS,
  GARDEN_FIGURE_PEOPLE,
  GARDEN_FIGURE_THINGS,
} from '../manifest-catalog-garden-figures';
import { GARDEN_PEOPLE } from '../manifest-catalog-garden-people';
import { GARDEN_VERSES } from '../manifest-catalog-garden-verses';
import { pickCatalogRow, rowsForEra } from '../manifest-pick';
import { summarizeResidue } from '../residue';
import { createRng } from '../rng';
import type { CatalogEntry } from '../table-catalog';

const NEW_ROWS: readonly CatalogEntry[] = [
  ...GARDEN_FIGURE_PEOPLE,
  ...GARDEN_FIGURE_THINGS,
  ...GARDEN_VERSES,
  ...GARDEN_PEOPLE,
];

function figureTag(row: CatalogEntry): string | undefined {
  return row.tags.find((t) => t.startsWith('figure:'));
}

describe('Garden catalog rows (Patch A)', () => {
  it('adds five figure people, one figure thing, two verses and fourteen plain people', () => {
    expect(GARDEN_FIGURE_PEOPLE).toHaveLength(5);
    expect(GARDEN_FIGURE_THINGS).toHaveLength(1);
    expect(GARDEN_VERSES).toHaveLength(2);
    expect(GARDEN_PEOPLE).toHaveLength(14);
  });

  it('puts every new row in the shared catalog, and only in the Garden era', () => {
    for (const row of NEW_ROWS) {
      expect(row.era, row.name).toBe('fantasy');
    }
    for (const row of [...GARDEN_FIGURE_PEOPLE, ...GARDEN_PEOPLE]) {
      expect(CATALOG.person, row.name).toContain(row);
    }
    for (const row of [...GARDEN_FIGURE_THINGS, ...GARDEN_VERSES]) {
      expect(CATALOG.thing, row.name).toContain(row);
    }
  });

  it('gives each figure row exactly one figure id, none of them a Tang core id', () => {
    for (const row of GARDEN_FIGURE_PEOPLE) {
      expect(
        row.tags.filter((t) => t.startsWith('figure:')),
        row.name,
      ).toHaveLength(1);
    }
    const ids = new Set(GARDEN_FIGURE_PEOPLE.map((r) => figureTag(r)));
    expect(ids).toEqual(new Set(GARDEN_FIGURE_IDS.filter((id) => id !== 'figure:garden-cor')));
    for (const id of GARDEN_FIGURE_IDS) {
      expect(FIGURE_IDS as readonly string[], id).not.toContain(id);
    }
    expect(figureTag(GARDEN_FIGURE_THINGS[0]!)).toBe('figure:kumbhira');
  });

  it("tags the Bell Warden Cor on his existing row and adds the bible's deed there", () => {
    const cor = CATALOG.person?.find((r) => r.name === 'Cor, the bell striker');
    expect(cor?.tags).toContain('figure:garden-cor');
    expect(cor?.era).toBe('fantasy');
    expect(cor?.templates?.some((t) => t.detail.includes('rim of the bell'))).toBe(true);
  });

  it('binds no row to a practice id', () => {
    // A figure row that carries a practice tag fires on every fifth harvest whose window carries
    // that practice and forces the card kind to person (measured: Garden place share 34% -> 8%).
    // Garden figures are reached through the shared pool, a pinned figure card, and later Sought.
    for (const row of NEW_ROWS) {
      expect(
        row.tags.some((t) => t.startsWith('practice:')),
        row.name,
      ).toBe(false);
    }
  });

  it('authors both qualifiers on every new row, as the card guide expects', () => {
    for (const row of NEW_ROWS) {
      expect(row.long_fire?.startsWith(' '), `${row.name} long_fire`).toBe(true);
      expect(row.rare?.startsWith(' '), `${row.name} rare`).toBe(true);
    }
  });

  it('promises nothing and grades no one (SPEC section 3)', () => {
    const PROMISE = /attain|enlighten|bless|merit|karma|reward|absolv|forgiv|destin/i;
    for (const row of NEW_ROWS) {
      const prose = [row.name, row.one_liner, row.subject, row.detail, row.long_fire, row.rare]
        .concat((row.templates ?? []).map((t) => t.detail))
        .join(' ');
      expect(PROMISE.test(prose), row.name).toBe(false);
    }
  });

  it('quotes the two verses from their source text', () => {
    const [tablet, bell] = GARDEN_VERSES;
    expect(tablet?.detail).toContain('Ye dhammā hetuppabhavā');
    expect(bell?.detail).toContain('Aniccā vata saṅkhārā');
  });

  it('answers a pinned Garden figure in a Garden life, and never in a Tang life', () => {
    const summary = (id: string) =>
      summarizeResidue([{ tick: 1, type: 'practice_tick', ids: [id], numbers: { progress: 1 } }]);
    for (const id of GARDEN_FIGURE_IDS) {
      const garden = pickCatalogRow(
        'person',
        CATALOG.person ?? [],
        summary(id),
        CATALOG,
        createRng(3n),
        [],
        'fantasy',
      );
      expect(garden.about?.id, id).toBe(id);
      const tang = pickCatalogRow(
        'person',
        CATALOG.person ?? [],
        summary(id),
        CATALOG,
        createRng(3n),
        [],
        'tang',
      );
      expect(tang.about?.id, `${id} in Tang`).not.toBe(id);
      expect(tang.entry.era, `${id} in Tang`).not.toBe('fantasy');
    }
  });

  it('keeps the two mountain rows out of a Garden life (era tang)', () => {
    for (const row of FIGURE_PLACES) {
      expect(row.era, row.name).toBe('tang');
    }
    const gardenPlaces = rowsForEra(CATALOG.place ?? [], 'fantasy');
    for (const row of FIGURE_PLACES) {
      expect(gardenPlaces, row.name).not.toContain(row);
    }
  });

  it('keeps the Garden figure share of the person pool inside the 30-40% band', () => {
    // A pool count, not the instrument: the instrument (30 seeds) read 31-34% on the two Garden cells.
    const pool = rowsForEra(CATALOG.person ?? [], 'fantasy');
    const figures = pool.filter((r) => figureTag(r) !== undefined);
    const share = figures.length / pool.length;
    expect(share).toBeGreaterThanOrEqual(0.3);
    expect(share).toBeLessThanOrEqual(0.4);
    // The twelve Tang core figures are still present in the shared pool.
    expect(FIGURE_PEOPLE).toHaveLength(12);
  });
});
