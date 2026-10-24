import { describe, expect, it } from 'vitest';

import {
  createRng,
  createStudioState,
  harvestTableFill,
  planCookTicks,
  queueDevelop,
  recordStudioResidues,
  tickStudio,
} from '@/engine';
import { loadProgression } from '@/content/progression/loader';

describe('cook-ticks invariant (finding 2: the collapse to 3)', () => {
  it('with an AUTHORED discount (<=2) the long fire always costs >= 3 more, at any pile and heat', () => {
    for (let len = 2; len <= 40; len += 1) {
      for (const discount of [0, 1, 2]) {
        for (const surplus of [0, 1, 6, 40, 228, 10000]) {
          const short = planCookTicks(len, 'short', discount, surplus).total;
          const long = planCookTicks(len, 'long', discount, surplus).total;
          expect(
            long - short,
            `len ${len} disc ${discount} surplus ${surplus}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('the authored content never grants more cook_speed than swift-cook + one seated visitor', () => {
    const reg = loadProgression();
    let maxEndowed = 0;
    let maxVisitor = 0;
    for (const track of reg.endowment) {
      for (const effect of track.effects as readonly { op: string; key: string; delta: number }[]) {
        if (effect.key === 'cook_speed') maxEndowed = Math.max(maxEndowed, effect.delta);
      }
    }
    for (const visitor of reg.visitors) {
      for (const effect of (visitor.effects ?? []) as readonly {
        op: string;
        key: string;
        delta: number;
      }[]) {
        if (effect.key === 'cook_speed') maxVisitor = Math.max(maxVisitor, effect.delta);
      }
    }
    // Documented cap: one endowed track (1) + one seated visitor (1) = 2.
    expect(maxEndowed).toBeLessThanOrEqual(1);
    expect(maxVisitor).toBeLessThanOrEqual(1);
    expect(maxEndowed + maxVisitor).toBeLessThanOrEqual(2);
  });

  it('the observed constant-3 cooks are the TIER benches: short fire, folded 2-trace window, named discount 2', () => {
    // Reproduces check2's save state exactly: every tier auto-cook at 3
    // ticks. This is the invariant's "a discount you can name explains it"
    // case — NOT the person long fire collapsing.
    const plan = planCookTicks(2, 'short', 2, 0);
    expect(plan.total).toBe(3);
    // And the person long fire at the same modifiers never collapses:
    expect(planCookTicks(2, 'long', 2, 228).total).toBe(7);
  });

  it('30 alternating person cooks through the real path hold the invariant end to end', () => {
    let studio = { ...createStudioState(), surplus: 228 };
    for (let i = 0; i < 30; i += 1) {
      studio = recordStudioResidues(studio, [
        {
          tick: studio.residue.length + 1,
          type: 'practice_tick',
          ids: ['practice.test'],
          numbers: {},
        },
      ]);
      const pending = studio.residue.length - studio.last_harvest_index - 1;
      if (pending < 2) continue;
      const fire = i % 2 === 0 ? 'short' : 'long';
      const queued = queueDevelop(studio, null, createRng(BigInt(i + 1)), {
        cookTicksDiscount: 2,
        minResidue: 2,
        fire,
      });
      if (queued.bay === null) continue;
      if (fire === 'long') {
        const shortTotal = planCookTicks(
          queued.bay.residue.length,
          'short',
          2,
          studio.surplus,
        ).total;
        expect(queued.bay.cook_ticks_total).toBeGreaterThanOrEqual(shortTotal + 3);
      }
      studio = tickStudio(queued, queued.bay.cook_ticks_total);
      const harvested = harvestTableFill(studio, createRng(BigInt(i + 1)));
      if (harvested) studio = harvested.studio;
    }
  });
});

describe('figure repetition on the real person path (finding 2b)', () => {
  it('40 consecutive harvests: measures longest same-figure run', () => {
    // The phone run saw Guanyin 12/12. This window is six-syllable-bound
    // (the compassion practice), so the residue-matched candidate set is
    // {Guanyin} every time and the suppression (which only avoids the LAST
    // card's figure when another candidate can answer) cannot diversify a
    // single-candidate pool. Measure and report; the fix, if wanted, is a
    // content/composer decision (b2/b1 lane).
    let studio = createStudioState();
    for (let i = 0; i < 40; i += 1) {
      studio = recordStudioResidues(studio, [
        {
          tick: studio.residue.length + 1,
          type: 'practice_tick',
          ids: ['practice:tang/six-syllable-recitation'],
          numbers: { progress: 2 },
        },
      ]);
      const pending = studio.residue.length - studio.last_harvest_index - 1;
      if (pending < 3) continue;
      const queued = queueDevelop(studio, null, createRng(BigInt(i + 1)));
      if (queued.bay === null) continue;
      studio = tickStudio(queued, queued.bay.cook_ticks_total);
      const harvested = harvestTableFill(studio, createRng(BigInt(i + 1)));
      if (harvested) studio = harvested.studio;
    }
    // The lane's own arrivals only (`about_id`). This harvest passes no life context,
    // so the era is undefined and a generic pick draws from the WHOLE table, figure
    // rows of every era included; which of those a seeded draw lands on moves
    // whenever a row is added anywhere in the table. That is not the repetition this
    // test measures: it measures the single-candidate figure lane.
    const figures = studio.archive
      .map((card) => card.about_id ?? null)
      .filter((f): f is string => f !== null);
    const counts = new Map<string, number>();
    for (const f of figures) counts.set(f, (counts.get(f) ?? 0) + 1);
    let longestRun = 0;
    let run = 0;
    let prev: string | null = null;
    for (const f of figures) {
      run = f === prev ? run + 1 : 1;
      prev = f;
      longestRun = Math.max(longestRun, run);
    }
    // Identity now follows generic figure picks too, and the per-figure
    // cooldown/memory is in place: the single-candidate practice lane no
    // longer fills every figure slot (the pre-fix finding this test pinned).
    expect(figures.length).toBeGreaterThan(0);
    expect(counts.get('figure:avalokiteshvara') ?? 0).toBeGreaterThan(0);
    expect(counts.get('figure:avalokiteshvara') ?? 0).toBeLessThan(figures.length);
    expect(longestRun).toBeLessThanOrEqual(2);
  });
});
