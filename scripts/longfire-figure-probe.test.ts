// Why does a LONG fire drop every named figure?
//
// The lead measured it at the engine level: 300 cooks per fire mode, residue of
// figure-bound practices. SHORT gave Bhaisajyaguru 110 and Amitābha 102, always
// common. LONG gave ZERO figures and only generic rows. Two promises were being
// broken at once — the floor was working, and the "a named figure in the window
// answers first" promise was inverted by it.
//
// Run: pnpm exec vitest run --config scripts/report.vitest.config.ts scripts/longfire-figure-probe.test.ts

import { describe, expect, it } from 'vitest';
import {
  createRng,
  summarizeResidue,
  tableFillManifest,
  type KindRule,
  type LifeContext,
  type ResidueEvent,
} from '../src/engine';
import { figureCandidates } from '../src/engine/manifest-pick';
import { CATALOG } from '../src/engine/manifest-catalog';

const WINDOW: ResidueEvent[] = [
  {
    tick: 1,
    type: 'practice_tick',
    ids: ['practice:tang/medicine-rite'],
    numbers: { progress: 2 },
  },
  {
    tick: 2,
    type: 'practice_tick',
    ids: ['practice:tang/medicine-rite'],
    numbers: { progress: 2 },
  },
  {
    tick: 3,
    type: 'practice_tick',
    ids: ['practice:tang/nianfo-recitation'],
    numbers: { progress: 2 },
  },
  {
    tick: 4,
    type: 'practice_tick',
    ids: ['practice:tang/nianfo-recitation'],
    numbers: { progress: 2 },
  },
];

const CTX: LifeContext = {
  schema_version: 'life_context/v0',
  life_id: 'life-p',
  age: 41,
  turn: 5,
  alive: true,
  lens: 'patient_courage',
  setting: {
    era_id: 'tang-china',
    era_name: 'Late Tang China',
    role_id: 'peasant',
    role_name: 'Peasant farmer',
    year: 745,
    month: 4,
    day: 9,
    hour: 11,
    calendar_label: 'Year 745',
  },
  ties: [],
  strongest_tie: null,
  flags: [],
  residue_summary: summarizeResidue(WINDOW),
  activity: { work: 11, generosity: 2, beings: 0, learning: 0, meditation: 1, other: 0 },
  world_name: null,
  world_line: null,
};

const RULES: KindRule[] = [{ kind: 'person', match: { dominant: 'practice_tick' } }];

interface FireResult {
  fire: 'short' | 'long';
  figureCards: number;
  commonFigure: number;
  figureTotal: number;
  namedCards: number;
  longestFigureRun: number;
  figureRun3: number;
}
const RESULTS: FireResult[] = [];

/** The row names of the twelve figure rows, for the "did it read as a figure" count. */
const FIGURE_ROW_NAMES = new Set([
  'Śākyamuni',
  'Amitābha',
  'Bhaiṣajyaguru, the Medicine Buddha',
  'Vairocana',
  'Maitreya',
  'Avalokiteśvara (Guanyin)',
  'Mañjuśrī (Wenshu)',
  'Samantabhadra (Puxian)',
  'Kṣitigarbha (Dizang)',
  'Mahāsthāmaprāpta (Dashizhi)',
  'Nāgārjuna',
  'Bodhidharma',
]);

describe('long fire vs named figures', () => {
  it('sweeps 300 cooks per fire mode and prints the table', () => {
    const summary = summarizeResidue(WINDOW);
    const cands = figureCandidates(summary, CATALOG, 'tang');
    process.stdout.write(
      `  figure candidates visible for this window: ${cands.length}` +
        `  [${cands.map((c) => c.entry.name).join(', ')}]\n`,
    );

    RESULTS.length = 0;
    for (const fire of ['short', 'long'] as const) {
      const counts = new Map<string, { n: number; rare: number }>();
      let figureCards = 0;
      let commonFigure = 0;
      let figureRun3 = 0;
      let longestFigureRun = 0;
      let figureRun = 0;
      let lastFigureId: string | undefined = undefined;
      // Thread the archive the way real play does. Passing an empty one on
      // every call means no harvest can see what the last one was, and the
      // same-figure-suppression logic is then never exercised — the run
      // counter would read 300 for a game where the figure never changes.
      const archive: string[] = [];
      for (let i = 0; i < 300; i += 1) {
        // archiveTitles is the FIFTEENTH parameter; the twelfth is
        // archiveDetails. Passing the archive in slot twelve silently left
        // archiveTitles empty, so nothing could see the previous card.
        const m = tableFillManifest(
          WINDOW,
          null,
          0,
          createRng(BigInt(i) + 1n),
          `p${i}`,
          `m${i}`,
          null,
          CTX,
          'person',
          RULES,
          undefined,
          [],
          fire,
          undefined,
          archive,
        );
        archive.push(m.name);
        const e = counts.get(m.name) ?? { n: 0, rare: 0 };
        e.n += 1;
        if (m.rarity === 'rare') e.rare += 1;
        counts.set(m.name, e);
        if (m.about_id !== undefined) {
          figureCards += 1;
          if (m.rarity === 'common') commonFigure += 1;
          // Track WHICH figure, not merely that the card was a figure card —
          // "a figure, then a figure" is the good case, not a run.
          if (m.about_id === lastFigureId) {
            figureRun += 1;
            if (figureRun === 3) figureRun3 += 1;
          } else {
            figureRun = 1;
          }
          lastFigureId = m.about_id;
          if (figureRun > longestFigureRun) longestFigureRun = figureRun;
        } else {
          figureRun = 0;
          lastFigureId = undefined;
        }
      }
      const rows = [...counts.entries()].sort((a, b) => b[1].n - a[1].n);
      // Count by ROW IDENTITY, not by card title. A figure card can render a
      // title variant ("The bitter cup, and who gets it"), and counting titles
      // is how a figure harvest gets misread as a generic one.
      const figureTotal = figureCards;
      const namedCards = rows
        .filter(([n]) => FIGURE_ROW_NAMES.has(n))
        .reduce((a, [, v]) => a + v.n, 0);
      RESULTS.push({
        fire,
        figureCards,
        commonFigure,
        figureTotal,
        namedCards,
        longestFigureRun,
        figureRun3,
      });
      process.stdout.write(`\n  ${fire.toUpperCase()} fire, 300 cooks\n`);
      for (const [name, v] of rows) {
        process.stdout.write(
          `    ${String(v.n).padStart(3)}  ${name}${v.rare > 0 ? `  (${v.rare} rare)` : ''}\n`,
        );
      }
      process.stdout.write(
        `    --- figure cards by row id: ${figureTotal}/300` +
          `  |  of those, common: ${commonFigure}\n` +
          `    --- longest same-figure run: ${longestFigureRun}` +
          `  |  runs reaching 3: ${figureRun3}\n` +
          `    --- card titled with a FIGURE ROW NAME: ` +
          `${rows.filter(([n]) => FIGURE_ROW_NAMES.has(n)).reduce((a, [, v]) => a + v.n, 0)}/300\n`,
      );
    }
  });

  it('keeps the figure lane on both fires, floors the long fire, and never triples up', () => {
    expect(RESULTS).toHaveLength(2);
    for (const r of RESULTS) {
      // The figure lane answers first, and never silently becomes a generic row.
      expect(r.figureTotal, `${r.fire}: figure cards`).toBe(300);
      // Every figure card names its figure. SPEC 16.1, and the legibility
      // complaint: a harvest under a variant title reads as someone else.
      // This was 0/300 on a long fire before the fix.
      expect(r.namedCards, `${r.fire}: figure-named cards`).toBe(300);
      // The same figure twice in a row is already the worst case here; with two
      // candidates in this window, one in a row is the only honest target.
      expect(r.longestFigureRun, `${r.fire}: longest same-figure run`).toBeLessThanOrEqual(1);
      expect(r.figureRun3, `${r.fire}: three-in-a-rows`).toBe(0);
    }
    const short = RESULTS.find((r) => r.fire === 'short');
    const long = RESULTS.find((r) => r.fire === 'long');
    // A long fire buys a rarity floor: no common figure card.
    expect(long?.commonFigure).toBe(0);
    // A short fire is not floored, so it must still be allowed to land common.
    expect(short?.commonFigure).toBeGreaterThan(0);
  });
});
