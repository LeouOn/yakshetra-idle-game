import { describe, expect, it } from 'vitest';

import type { ManifestFocus } from '../focus';
import { tableFillManifest } from '../manifest';
import type { CatalogMap } from '../table-catalog';
import type { ResidueEvent } from '../residue';
import { createRng } from '../rng';

function event(tick: number, ids: string[]): ResidueEvent {
  return { tick, type: 'practice_tick', ids, numbers: { progress: 1 } };
}

describe('figure-tagged catalog preference (SPEC 16.1)', () => {
  it('harvests the named figure when residue names its id', () => {
    const window = [event(1, ['figure:avalokiteshvara'])];
    const m = tableFillManifest(window, null, 0, createRng(7n), 's1', 'm-1');
    expect(m.name).toBe('Avalokiteśvara (Guanyin)');
    expect(m.kind).toBe('person');
    expect(m.about_id).toBe('figure:avalokiteshvara');
    expect(m.about_name).toBe('Avalokiteśvara (Guanyin)');
    expect(m.subject).toContain('avalokiteshvara');
  });

  it('matches a figure-bound practice id and names its figure', () => {
    const window = [
      event(1, ['practice:tang/nianfo-recitation']),
      event(2, ['practice:tang/nianfo-recitation']),
    ];
    const m = tableFillManifest(window, null, 0, createRng(11n), 's2', 'm-2');
    expect(m.name).toBe('Amitābha');
    expect(m.about_id).toBe('figure:amitabha');
  });

  it('keeps the plain table pick when nothing matches', () => {
    const window = [event(1, ['practice.test'])];
    const m = tableFillManifest(window, null, 0, createRng(3n), 's3', 'm-3');
    expect(m.fill_status).toBe('table');
    expect(m.about_id).toBeUndefined();
  });

  it('prefers the pinned focus over the figure for about_id', () => {
    const window = [event(1, ['figure:amitabha'])];
    // ManifestFocus: kind is 'person' | 'place' and one_liner is required.
    const focus: ManifestFocus = {
      id: 'focus:x',
      kind: 'person',
      name: 'The evening hour',
      one_liner: 'The hour the lamps are trimmed.',
    };
    const m = tableFillManifest(window, null, 0, createRng(5n), 's4', 'm-4', focus);
    expect(m.about_id).toBe('focus:x');
  });

  it('is deterministic per seed', () => {
    const window = [event(1, ['figure:avalokiteshvara', 'mantra:six-syllable'])];
    const a = tableFillManifest(window, null, 0, createRng(42n), 's5', 'm-a');
    const b = tableFillManifest(window, null, 0, createRng(42n), 's5', 'm-b');
    // ids are caller-supplied; everything else must match for the same seed.
    expect({ ...a, id: 'x' }).toEqual({ ...b, id: 'x' });
  });

  it('does not figure-match inside a swapped visitor table', () => {
    const entries = [
      {
        name: 'The seated guest',
        one_liner: 'v',
        subject: 'v',
        detail: 'v',
        tags: ['visitor'],
      },
    ];
    const swapped = new Proxy({}, { get: () => entries }) as CatalogMap;
    const m = tableFillManifest(
      [event(1, ['figure:amitabha'])],
      null,
      0,
      createRng(5n),
      's6',
      'm-5',
      null,
      null,
      'person',
      undefined,
      swapped,
    );
    expect(m.name).toBe('The seated guest');
    expect(m.about_id).toBeUndefined();
  });
});
