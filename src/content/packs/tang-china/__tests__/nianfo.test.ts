import { describe, expect, it } from 'vitest';

import { tableFillManifest } from '@/engine/manifest';
import { createRng } from '@/engine/rng';
import { loadEraPack } from '../../../loader';

describe('nianfo recitation (SPEC 16.1: a figure that acts)', () => {
  const pack = loadEraPack('tang-china');

  it('ships the practice in the pack', () => {
    const ids = pack.practices.map((p) => p.id);
    expect(ids).toContain('practice:tang/nianfo-recitation');
  });

  it('carries the practice on the monastic-day evening block', () => {
    const monastic = pack.schedules.find((s) => s.id === 'schedule:tang/monastic-day');
    const evening = monastic?.blocks.find(
      (b) => b.practice_id === 'practice:tang/nianfo-recitation',
    );
    expect(evening?.startHour).toBe(17);
    expect(evening?.endHour).toBe(20);
  });

  it('a window of nianfo practice harvests an Amitabha card with about_id', () => {
    const window = [
      {
        tick: 1,
        type: 'practice_tick' as const,
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 1 },
      },
      {
        tick: 2,
        type: 'practice_tick' as const,
        ids: ['practice:tang/nianfo-recitation'],
        numbers: { progress: 1 },
      },
    ];
    const m = tableFillManifest(window, null, 0, createRng(21n), 's', 'm-nianfo');
    expect(m.name).toBe('Amitābha');
    expect(m.about_id).toBe('figure:amitabha');
    expect(m.fill_status).toBe('table');
  });
});
