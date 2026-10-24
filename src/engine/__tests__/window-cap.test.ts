import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KIND_RULES,
  WINDOW_MAX_EVENTS,
  createRng,
  harvestTableFill,
  pendingResidue,
  previewKind,
  queueDevelop,
  recordStudioResidues,
  spendableResidue,
  summarizeResidue,
  tickStudio,
  createStudioState,
} from '../';
import type { ResidueEvent } from '../residue';

function events(n: number): ResidueEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    tick: i + 1,
    type: i % 2 === 0 ? ('practice_tick' as const) : ('lens_chosen' as const),
    ids: [`trace.${i}`, 'practice:tang/alms-round'],
    numbers: {},
  }));
}

describe('a working spends a capped window', () => {
  it('queues at most WINDOW_MAX_EVENTS and leaves the rest pending', () => {
    const studio = recordStudioResidues(createStudioState(), events(30));
    const queued = queueDevelop(studio, null, createRng(1n));
    expect(queued.bay?.residue).toHaveLength(WINDOW_MAX_EVENTS);
    expect(pendingResidue(queued)).toHaveLength(30 - WINDOW_MAX_EVENTS);
    // The next window still has material and is itself capped.
    expect(spendableResidue(queued)).toHaveLength(30 - WINDOW_MAX_EVENTS);
    const second = queueDevelop({ ...queued, bay: null }, null, createRng(2n));
    expect(second.bay?.residue).toHaveLength(30 - WINDOW_MAX_EVENTS);
  });

  it('spendableResidue (what the panel previews) is the window the bay queues', () => {
    const studio = recordStudioResidues(createStudioState(), events(30));
    const preview = spendableResidue(studio);
    const queued = queueDevelop(studio, null, createRng(3n));
    expect(preview).toHaveLength(WINDOW_MAX_EVENTS);
    expect(queued.bay?.residue).toEqual(preview);
  });

  it('the kind previewed at cook time is the kind the card harvests', () => {
    const studio = recordStudioResidues(createStudioState(), events(30));
    const window = spendableResidue(studio);
    const predicted = previewKind(summarizeResidue(window), DEFAULT_KIND_RULES);
    const queued = queueDevelop(studio, null, createRng(4n));
    const ready = tickStudio(queued, queued.bay?.cook_ticks_total ?? 0);
    const harvested = harvestTableFill(ready, createRng(4n));
    expect(harvested).not.toBeNull();
    expect(harvested?.manifest.kind).toBe(predicted);
  });
});
