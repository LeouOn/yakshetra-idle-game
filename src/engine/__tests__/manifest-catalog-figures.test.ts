import { describe, expect, it } from 'vitest';

import { CATALOG } from '../manifest-catalog';
import { FIGURE_IDS, FIGURE_PEOPLE, FIGURE_PLACES } from '../manifest-catalog-figures';

describe('figure catalog rows (SPEC 16.1)', () => {
  it('ships twelve figure person rows, each tagged with exactly one figure id', () => {
    expect(FIGURE_PEOPLE).toHaveLength(12);
    for (const row of FIGURE_PEOPLE) {
      const figTags = row.tags.filter((t) => t.startsWith('figure:'));
      expect(figTags).toHaveLength(1);
      expect(FIGURE_IDS).toContain(figTags[0] ?? '');
      expect(CATALOG.person).toContain(row);
    }
  });

  it('ships two site place rows tagged to their figures', () => {
    expect(FIGURE_PLACES).toHaveLength(2);
    const figTags = FIGURE_PLACES.map((r) => r.tags.find((t) => t.startsWith('figure:')));
    expect(figTags).toEqual(['figure:manjushri', 'figure:ksitigarbha']);
    for (const row of FIGURE_PLACES) {
      expect(CATALOG.place).toContain(row);
    }
  });

  it('keeps the eight generic person rows and six generic place rows as fallbacks', () => {
    expect(CATALOG.person).toHaveLength(20); // 8 generic + 12 figures
    expect(CATALOG.place).toHaveLength(8); // 6 generic + 2 sites
  });

  it('binds the nianfo practice and mantras by tag', () => {
    const amitabha = FIGURE_PEOPLE.find((r) => r.tags.includes('figure:amitabha'));
    expect(amitabha?.tags).toContain('mantra:nianfo');
    expect(amitabha?.tags).toContain('practice:tang/nianfo-recitation');
    const guanyin = FIGURE_PEOPLE.find((r) => r.tags.includes('figure:avalokiteshvara'));
    expect(guanyin?.tags).toContain('mantra:six-syllable');
    const medicine = FIGURE_PEOPLE.find((r) => r.tags.includes('figure:medicine-buddha'));
    expect(medicine?.tags).toContain('mantra:medicine-buddha');
  });

  it('caps every figure row at five tags with non-empty prose', () => {
    for (const row of [...FIGURE_PEOPLE, ...FIGURE_PLACES]) {
      expect(row.tags.length).toBeLessThanOrEqual(5);
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.one_liner.length).toBeGreaterThan(0);
      expect(row.subject.length).toBeGreaterThan(0);
      expect(row.detail.length).toBeGreaterThan(0);
    }
  });
});
