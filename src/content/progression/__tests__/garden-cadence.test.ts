// The cadence tic (lead's read-aloud): too many authored long-fire and rare
// lines share the frame 'The A is B, and the C is D.' — after ten cards a
// reader hears it. Mechanical ceiling over every authored long_fire/rare
// line in the shipped catalog (both eras): at most a quarter may sit in that
// family. Whole-catalog, not Garden-only: the tic is a house voice problem.
import { describe, expect, it } from 'vitest';

import { CATALOG } from '@/engine/manifest-catalog';
import { FIGURE_PEOPLE, FIGURE_PLACES } from '@/engine/manifest-catalog-figures';

// The family the lead actually heard: two parallel 'The A <verb> X, and the
// B <verb> Y.' clauses — is/has/does/stays/runs/goes in either half.
const TIC =
  /\bThe\b[^,.!?]{3,40}\b(is|has|does|stays|runs|goes|was)\b[^.!?]{3,70}, and the\b[^.!?]{3,70}\b(is|has|does|stays|runs|goes|was)\b/;

function lines(): string[] {
  const out: string[] = [];
  for (const row of [...Object.values(CATALOG).flat(), ...FIGURE_PEOPLE, ...FIGURE_PLACES]) {
    if (row.long_fire) {
      out.push(row.long_fire);
    }
    if (row.rare) {
      out.push(row.rare);
    }
    for (const template of row.templates ?? []) {
      if (template.long_fire) {
        out.push(template.long_fire);
      }
      if (template.rare) {
        out.push(template.rare);
      }
    }
  }
  return out;
}

describe('long-fire/rare cadence tic', () => {
  it('at most a quarter of authored long/rare lines share the is-and-is frame', () => {
    const all = lines();
    const offenders = all.filter((line) => TIC.test(line));
    process.stdout.write(
      `\n  cadence: ${offenders.length}/${all.length} lines in the 'The A is B, and the C is D' family\n`,
    );
    expect(offenders.length / all.length).toBeLessThanOrEqual(0.25);
  });

  it('GARDEN rows stay free of the frame entirely (0/42 after the pass)', () => {
    // The tic concentrated in the Garden pool the lead actually read (47.6%
    // of rows) while the whole-catalog ratio hid under the ceiling. The
    // Garden rows are now rewritten to 0% and pinned there.
    const TIC_G =
      /\bThe\b[^,.!?]{3,40}\b(is|has|does|stays|runs|goes|was)\b[^.!?]{3,70}, and the\b[^.!?]{3,70}\b(is|has|does|stays|runs|goes|was)\b/;
    const hits: string[] = [];
    for (const row of Object.values(CATALOG).flat()) {
      if (row.era !== 'fantasy') {
        continue;
      }
      const prose = [row.one_liner, row.subject, row.detail, row.long_fire, row.rare]
        .filter((x): x is string => typeof x === 'string')
        .join(' ');
      if (TIC_G.test(prose)) {
        hits.push(row.name);
      }
    }
    expect(hits).toEqual([]);
  });
});
