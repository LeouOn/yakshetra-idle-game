import { describe, expect, it } from 'vitest';

import type { ManifestFocus } from '../focus';
import { tableFillManifest } from '../manifest';
import type { CatalogMap } from '../table-catalog';
import type { ResidueEvent } from '../residue';
import { createRng } from '../rng';
import { CATALOG } from '../manifest-catalog';

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
    // The subject is player-facing prose, so it names the figure in words and
    // never by id. It used to end in "(avalokiteshvara)"; that is the leak the
    // lead flagged from the browser, and it is gone.
    expect(m.subject).toContain('hearer of cries');
    expect(m.subject).not.toContain('avalokiteshvara');
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

  it('a generic pick of a figure row still carries its identity', () => {
    const row = CATALOG.person?.find((r) => r.tags.includes('figure:medicine-buddha'));
    expect(row).toBeDefined();
    const window = [
      { tick: 1, type: 'lens_chosen' as const, ids: ['market:tea', 'conversation:0'], numbers: {} },
      event(2, ['practice.test']),
      event(3, ['practice.test']),
    ];
    const m = tableFillManifest(
      window,
      null,
      0,
      createRng(9n),
      's6',
      'm-6',
      null,
      undefined,
      'person',
      undefined,
      { person: [row!] },
    );
    expect(m.about_id).toBe('figure:medicine-buddha');
    expect(m.about_name).toBe('Bhaiṣajyaguru, the Medicine Buddha');
  });

  it('keeps the plain table pick when nothing matches', () => {
    const window = [event(1, ['practice.test'])];
    const m = tableFillManifest(window, null, 0, createRng(3n), 's3', 'm-3');
    expect(m.fill_status).toBe('table');
    expect(m.about_id).toBeUndefined();
  });

  it('keeps the figure identity when a pin is active (identity seam)', () => {
    const window = [event(1, ['figure:amitabha'])];
    // ManifestFocus: kind is 'person' | 'place' and one_liner is required.
    const focus: ManifestFocus = {
      id: 'focus:x',
      kind: 'person',
      name: 'The evening hour',
      one_liner: 'The hour the lamps are trimmed.',
    };
    const m = tableFillManifest(window, null, 0, createRng(5n), 's4', 'm-4', focus);
    // Figure identity wins: a pin used to overwrite about_id with the pinned
    // card's manifest id, which made every figure after the first pin
    // anonymous to the cooldown, the figure memory and the chronicle. The
    // focus is still visible in the subject and tags.
    expect(m.about_id).toBe('figure:amitabha');
    expect(m.about_name).toBe('Amitābha');
  });

  it('a figure answers a long fire as itself: a person row is never labelled a thing', () => {
    // Three ticks of one practice predict `thing`; the bound practice also
    // names Amitābha, a row of the person table. Both fires answer with the
    // figure and the figure's own kind: a `thing` card must not carry a person row.
    const window = [1, 2, 3].map((tick) => event(tick, ['practice:tang/nianfo-recitation']));
    const short = tableFillManifest(
      window,
      null,
      0,
      createRng(13n),
      's7',
      'm-7',
      null,
      undefined,
      'person',
    );
    expect(short.about_id).toBe('figure:amitabha');
    expect(short.kind).toBe('person');
    const long = tableFillManifest(
      window,
      null,
      0,
      createRng(13n),
      's8',
      'm-8',
      null,
      undefined,
      'person',
      undefined,
      undefined,
      [],
      'long',
    );
    expect(long.about_id).toBe('figure:amitabha');
    expect(long.kind).toBe('person');
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
