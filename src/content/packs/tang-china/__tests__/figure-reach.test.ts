import { describe, expect, it } from 'vitest';

import { tableFillManifest } from '@/engine/manifest';
import { createRng } from '@/engine/rng';
import { loadEraPack } from '../../../loader';

describe('figure reachability from real play (phase 7 polish)', () => {
  const pack = loadEraPack('tang-china');

  it('ships the medicine rite practice in the pack', () => {
    const ids = pack.practices.map((p) => p.id);
    expect(ids).toContain('practice:tang/medicine-rite');
  });

  it('carries the medicine rite on the city-day schedule', () => {
    const city = pack.schedules.find((s) => s.id === 'schedule:city-day');
    const block = city?.blocks.find((b) => b.practice_id === 'practice:tang/medicine-rite');
    expect(block?.startHour).toBe(15);
    expect(block?.endHour).toBe(19);
  });

  it('a window of medicine rite harvests the Medicine Buddha with about_id', () => {
    const window = [
      {
        tick: 1,
        type: 'practice_tick' as const,
        ids: ['practice:tang/medicine-rite'],
        numbers: { progress: 1 },
      },
      {
        tick: 2,
        type: 'practice_tick' as const,
        ids: ['practice:tang/medicine-rite'],
        numbers: { progress: 1 },
      },
    ];
    const m = tableFillManifest(window, null, 0, createRng(6n), 's', 'm-med');
    expect(m.name).toContain('Medicine Buddha');
    expect(m.about_id).toBe('figure:medicine-buddha');
  });

  it('a window of six-syllable recitation harvests Guanyin with about_id', () => {
    const window = [
      {
        tick: 1,
        type: 'practice_tick' as const,
        ids: ['practice:tang/six-syllable-recitation'],
        numbers: { progress: 1 },
      },
      {
        tick: 2,
        type: 'practice_tick' as const,
        ids: ['practice:tang/six-syllable-recitation'],
        numbers: { progress: 1 },
      },
    ];
    const m = tableFillManifest(window, null, 0, createRng(7n), 's', 'm-six');
    expect(m.name).toContain('Guanyin');
    expect(m.about_id).toBe('figure:avalokiteshvara');
  });
});
