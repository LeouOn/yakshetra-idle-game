import { describe, expect, it } from 'vitest';

import { pickCatalogRow } from '../manifest-pick';
import { createRng } from '../rng';
import { summarizeResidue } from '../residue';
import type { CatalogEntry } from '../table-catalog';

function row(name: string, tags: string[]): CatalogEntry {
  return { name, one_liner: `${name} line`, subject: `${name} subject`, detail: `${name}.`, tags };
}

describe('generic picks and the figure cooldown', () => {
  const figure = row('Figure A', ['figure:a']);
  const entries = [figure, row('B', []), row('C', []), row('D', []), row('E', [])];
  const catalog = { person: entries };
  const summary = summarizeResidue([]);

  it('once every row has been harvested, a figure still in the last four waits for another row', () => {
    // Figure A sits third in the archive and is not the latest card, so only the cooldown keeps it out.
    const titles = ['B', 'C', 'Figure A', 'D', 'E'];
    for (let seed = 1n; seed <= 60n; seed += 1n) {
      const picked = pickCatalogRow('person', entries, summary, catalog, createRng(seed), titles);
      expect(picked.entry.name, `seed ${seed}`).not.toBe('Figure A');
    }
  });

  it('with the cooldown spent the figure is eligible again, and carries its identity', () => {
    const titles = ['Figure A', 'B', 'C', 'D', 'E', 'B', 'C', 'D'];
    const names = new Set<string>();
    for (let seed = 1n; seed <= 60n; seed += 1n) {
      const picked = pickCatalogRow('person', entries, summary, catalog, createRng(seed), titles);
      names.add(picked.entry.name);
      if (picked.entry.name === 'Figure A') {
        expect(picked.about).toEqual({ id: 'figure:a', name: 'Figure A' });
      }
    }
    expect(names.has('Figure A')).toBe(true);
  });
});
