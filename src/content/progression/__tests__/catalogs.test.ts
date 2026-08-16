import { describe, expect, it } from 'vitest';

import { loadProgression } from '@/content/progression/loader';
import { CATALOG } from '@/engine/manifest-catalog';

describe('shipped catalogs', () => {
  const registries = loadProgression();

  it('has entries for every core kind', () => {
    for (const kind of ['thing', 'outcome', 'change', 'person', 'place'] as const) {
      expect((registries.catalogs[kind] ?? []).length).toBeGreaterThan(0);
    }
  });

  it('every catalog entry carries five tags max and a subject', () => {
    for (const entries of Object.values(registries.catalogs)) {
      for (const entry of entries) {
        expect(entry.subject.length).toBeGreaterThan(0);
        expect(entry.tags.length).toBeGreaterThan(0);
      }
    }
  });

  it('mirrors the engine default catalog entry-for-entry while both exist', () => {
    expect(registries.catalogs).toEqual(CATALOG);
  });
});
