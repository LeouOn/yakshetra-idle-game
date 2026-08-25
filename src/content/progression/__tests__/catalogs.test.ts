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

  it('mirrors the engine default catalog entry-for-entry for the five core kinds', () => {
    // Tradition + heirloom (Task 4) are progression-only and intentionally
    // absent from the engine default CATALOG; only the five SPEC §6 core
    // kinds must still match entry-for-entry.
    for (const kind of ['thing', 'outcome', 'change', 'person', 'place'] as const) {
      expect(registries.catalogs[kind]).toEqual(CATALOG[kind]);
    }
  });
});

describe('catalog rubric (SPEC 10.15 quality pass)', () => {
  const registries = loadProgression();
  const METER = /karma|merit|enlightenment|spiritual_rank/i;

  function rowsOf(registries: ReturnType<typeof loadProgression>): {
    table: string;
    i: number;
    entry: {
      name: string;
      one_liner: string;
      subject: string;
      detail: string;
      tags: readonly string[];
    };
  }[] {
    const out: {
      table: string;
      i: number;
      entry: {
        name: string;
        one_liner: string;
        subject: string;
        detail: string;
        tags: readonly string[];
      };
    }[] = [];
    for (const [kind, entries] of Object.entries(registries.catalogs)) {
      entries.forEach((entry, i) => out.push({ table: kind, i, entry }));
    }
    return out;
  }

  it('every row satisfies the mechanical rubric', () => {
    const failures: string[] = [];
    for (const { table, i, entry } of rowsOf(registries)) {
      const where = `${table}[${i}] ${entry.name}`;
      if (entry.name.length < 3 || entry.name.length > 40)
        failures.push(`${where}: name length ${entry.name.length}`);
      if (entry.one_liner.length < 10 || entry.one_liner.length > 120)
        failures.push(`${where}: one_liner length ${entry.one_liner.length}`);
      if (!/[.?!]$/.test(entry.one_liner) || entry.one_liner.includes('. '))
        failures.push(`${where}: one_liner must be one sentence`);
      if (entry.subject.length < 3 || entry.subject.length > 60 || /[.?!]$/.test(entry.subject))
        failures.push(`${where}: subject shape`);
      if (entry.detail.length < 60 || entry.detail.length > 420)
        failures.push(`${where}: detail length ${entry.detail.length}`);
      if ((entry.detail.match(/[.?!]/g) ?? []).length < 2)
        failures.push(`${where}: detail needs 2+ sentences`);
      if (entry.tags.length < 2 || entry.tags.length > 5)
        failures.push(`${where}: ${entry.tags.length} tags`);
      if (new Set(entry.tags).size !== entry.tags.length) failures.push(`${where}: duplicate tags`);
      if (METER.test(`${entry.name} ${entry.one_liner} ${entry.subject} ${entry.detail}`))
        failures.push(`${where}: meter token`);
    }
    expect(failures).toEqual([]);
  });

  it('names are unique within each table', () => {
    for (const [kind, entries] of Object.entries(registries.catalogs)) {
      const names = entries.map((e) => e.name);
      expect(new Set(names).size, kind).toBe(names.length);
    }
  });
});
