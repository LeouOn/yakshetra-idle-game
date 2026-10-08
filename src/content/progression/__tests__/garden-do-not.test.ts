import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../../engine/manifest-catalog';
import { categoryOf, forbiddenTerms, rowProse } from '../garden-do-not';

describe('garden do-not list', () => {
  it('catches the terms and ignores the substrings', () => {
    const catchAll = [
      "Chang'an",
      'Luoyang',
      'a peasant family',
      'the bailiff',
      'five tael',
      'the curfew drum',
      'a grain cart',
      'a tallow dip',
      'the abbot',
      'a mule',
      'yellow loess dust',
      'the yamen',
    ];
    for (const t of catchAll) expect(forbiddenTerms(t).size, t).toBeGreaterThan(0);
    // must NOT fire
    for (const t of [
      'steely mulesh',
      'a plentiful harvest',
      'a bailiwick of cloth',
      'a capital letter',
      'the tenement wall',
      'padded cells',
    ]) {
      expect(forbiddenTerms(t).size, t).toBe(0);
    }
  });

  it('holds every Garden-era row free of Tang vocabulary', () => {
    // The whole point of the era filter is that a Garden life cannot see a
    // Chang'an row. A row tagged `era: 'fantasy'` reaching the player with a
    // curfew drum in it would be the filter working and the copy failing.
    const offenders: string[] = [];
    for (const [kind, rows] of Object.entries(CATALOG)) {
      for (const row of rows) {
        if (row.era !== 'fantasy') {
          continue;
        }
        for (const term of forbiddenTerms(rowProse(row))) {
          offenders.push(`${kind}/${row.name}: ${term} (${categoryOf(term)})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('tags every Tang-only row, and reports the count either way', () => {
    // Printed on every run, not only on failure. A row that quietly became
    // era-neutral when someone edited its copy is exactly the regression the
    // era filter cannot see, so the count is evidence rather than a warning.
    const tang: string[] = [];
    const neutral: string[] = [];
    for (const [kind, rows] of Object.entries(CATALOG)) {
      for (const row of rows) {
        const hit = forbiddenTerms(rowProse(row)).size > 0;
        (hit ? tang : neutral).push(`${kind}/${row.name}`);
        // The tag and the audit must agree, or one of them is lying.
        expect(row.era, `${kind}/${row.name}`).toBe(hit ? 'tang' : row.era);
      }
    }
    process.stdout.write(
      `  rows tagged tang: ${tang.length}  |  era-neutral: ${neutral.length}  |  ` +
        `fantasy: ${
          Object.values(CATALOG)
            .flat()
            .filter((r) => r.era === 'fantasy').length
        }\n`,
    );
  });
});
