import { describe, expect, it } from 'vitest';

import {
  createRng,
  createStudioState,
  harvestTableFill,
  queueDevelop,
  recordStudioResidues,
  tickStudio,
} from '@/engine';

// The per-figure body memory is wired through two places a unit test cannot see break: harvestWithFiller
// (archive -> per-figure history) and the fill adapter (request -> tableFillManifest). This drives the
// real harvest path and asserts what the player sees: a figure walks its bodies instead of repeating one.
describe('per-figure body memory through the real harvest path', () => {
  it('any three consecutive appearances of one figure print three different bodies', () => {
    let studio = createStudioState();
    for (let i = 0; i < 260; i += 1) {
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
    const byFigure = new Map<string, string[]>();
    for (const card of studio.archive) {
      if (card.about_id?.startsWith('figure:') && card.kind === 'person') {
        byFigure.set(card.about_id, [...(byFigure.get(card.about_id) ?? []), card.detail]);
      }
    }
    const guanyin = byFigure.get('figure:avalokiteshvara') ?? [];
    expect(guanyin.length).toBeGreaterThanOrEqual(8);
    for (let i = 0; i + 3 <= guanyin.length; i += 1) {
      expect(new Set(guanyin.slice(i, i + 3)).size, `appearances ${i + 1}-${i + 3}`).toBe(3);
    }
  });
});
