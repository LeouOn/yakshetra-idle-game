import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/engine/manifest-catalog';
import { figureCandidates } from '../src/engine/manifest-pick';
import { composeCard } from '../src/engine/card-composer';
import { createRng } from '../src/engine/rng';
import { summarizeResidue } from '../src/engine/residue';
import type { LifeContext } from '../src/engine/life-context';

// A real play context, because `{{hour}}` is unfillable without one: the
// template is dropped from the candidate pool entirely rather than rendered
// with a hole in it. With lifeContext: null the hour variant of every figure
// was unreachable and the probe reported a rotation failure that only exists in
// the test.
const CTX = {
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
  residue_summary: undefined as never,
  activity: { work: 11, generosity: 2, beings: 0, learning: 0, meditation: 1, other: 0 },
  world_name: null,
  world_line: null,
} as unknown as LifeContext;

// Given a figure-bound practice and a matching brief, do the three variants of a
// figure actually get used, or does the row's own copy win every time?
const ROUTES: { probe: string; want: string; pct: number }[] = [];
const bodiesPerFigure: number[] = [];

describe('figure context rotation', () => {
  it('counts distinct bodies per figure across briefs and seeds', () => {
    const WINDOW = [
      {
        tick: 1,
        type: 'practice_tick',
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 2 },
      },
      {
        tick: 2,
        type: 'practice_tick',
        ids: ['practice:tang/nianfo-recitation'],
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
    ] as const;
    const summary = summarizeResidue(WINDOW);
    // 12 distinct briefs x 12 seeds each = 144 encounters with this figure,
    // which is roughly what a life that keeps the same practice gives you.
    const briefs = [
      null,
      'the lamp on the water',
      'a fever at night',
      'the lane at dusk',
      'the ferry',
      'the sickbed',
      'closing',
      'northward',
      'sky',
      'fever',
      'dusk',
      'water',
    ];
    const seedRng = Array.from({ length: 12 }, (_, k) => k + 1);
    const encounters = briefs.flatMap((b) => seedRng.map((k) => [b, k] as const));
    const cands = figureCandidates(summary, CATALOG, 'tang');
    process.stdout.write(`  candidates: ${cands.map((c) => c.entry.name).join(', ')}\n`);
    for (const c of cands) {
      const bodies = new Set<string>();
      for (const [n, [b]] of encounters.entries()) {
        const card = composeCard(c.entry, {
          summary,
          lifeContext: CTX,
          focus: null,
          brief: b,
          rarity: 'common',
          qualityTier: 0,
          fire: 'short',
          usedDetails: [],
          usedTitles: [],
          rng: createRng(BigInt(n) + 1n),
        });
        bodies.add(card.detail.slice(0, 46));
      }
      process.stdout.write(
        `  ${c.entry.name.padEnd(32)} distinct bodies across ${encounters.length} encounters: ${bodies.size}\n`,
      );
      if (process.env.YAK_VERBOSE === '1') {
        for (const b of bodies) {
          process.stdout.write(`      - ${b}\n`);
        }
      }
      // ROUTING: a brief naming a context should land on that context's
      // variant, not merely produce some distinct body somewhere.
      // A brief naming a time of day belongs to the {{hour}} variant, not to
      // the row's own copy — even though that copy opens "At sundown". Before
      // the hour words were in the hour variant's tags, "dusk" scored it zero
      // and a brief that named the hour of day reached no hour copy at all.
      for (const [probe, want] of [
        ['fever', 'fever'],
        ['the ferry', 'ferrymen'],
        ['sky', 'western sky'],
        ['dusk', 'western sky'],
        ['night', 'western sky'],
      ] as const) {
        let hit = 0;
        const n = 24;
        for (let k = 0; k < n; k += 1) {
          const card = composeCard(c.entry, {
            summary,
            lifeContext: CTX,
            focus: null,
            brief: probe,
            rarity: 'common',
            qualityTier: 0,
            fire: 'short',
            usedDetails: [],
            usedTitles: [],
            rng: createRng(BigInt(k) + 1n),
          });
          if (card.detail.includes(want)) hit += 1;
        }
        const pct = (100 * hit) / n;
        process.stdout.write(
          `      route brief "${probe}" -> ${pct.toFixed(0)}% carry "${want}"\n`,
        );
        ROUTES.push({ probe, want, pct });
        bodiesPerFigure.push(bodies.size);
      }
    }
  });

  it('routes a context brief to that context, and keeps every body reachable', () => {
    // A figure has to be able to do something different each time you meet it.
    // Four bodies for one figure (its own copy plus three scenes) over 144
    // encounters.
    expect([...new Set(bodiesPerFigure)], 'distinct bodies per figure').toEqual([4]);
    // A brief that names a context has to reach that context. Every one of
    // these was measured at 0% or 21% before the tags were fixed.
    for (const r of ROUTES) {
      expect(Math.round(r.pct), `brief "${r.probe}" should carry "${r.want}"`).toBe(100);
    }
  });
});
