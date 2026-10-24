// Practice counting for the place funnel (SPEC section 6).
//
// SPEC: place = "several practices, no social marker". HEAD counted every id on a
// window, so a single practice carrying a fold tag, or a resource key riding on a
// window, read as "several" and the window became a place. The engine now counts
// PRACTICE ids only (residue.ts practiceIds). Pinned here:
//   - tags written by the real fold helpers are never practices;
//   - one practice behind a tag is a thing; two practices behind member copies are a place;
//   - the cook preview and the harvest still agree on the kind, whatever the archive holds.
import { describe, expect, it } from 'vitest';

import { createRng, tableFillManifest } from '@/engine';
import { CATALOG } from '@/engine/manifest-catalog';
import { DEFAULT_KIND_RULES, pickKindFromRegistry, previewKind } from '@/engine/kind-registry';
import { summarizeResidue, type ResidueEvent } from '@/engine/residue';
import { FOLD_IDS } from '@/engine/roster';
import { benchFoldId } from '@/engine/session-ladder';

const P = (id: string): string => `practice:tang/${id}`;

/** A practice tick; `engaged` adds the engagement marker the emission layer stamps. */
function tick(id: string, engaged: boolean, extra: readonly string[] = [], at = 1): ResidueEvent {
  return {
    tick: at,
    type: 'practice_tick',
    ids: engaged ? [P(id), `engagement:${P(id)}`, ...extra] : [P(id), ...extra],
    numbers: { progress: 1 },
  };
}

const kindOf = (window: readonly ResidueEvent[]): string =>
  pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES);

describe('place counts practices, not every id on a tick', () => {
  it('one plain practice carrying a fold tag is a thing, not a place', () => {
    const bench = [0, 1, 2].map((i) => tick('sutra-copying', false, ['bench:person'], i));
    const member = [0, 1, 2].map((i) => tick('sutra-copying', false, ['member:m1'], i));
    expect(kindOf(bench)).toBe('thing');
    expect(kindOf(member)).toBe('thing');
  });

  it('two plain practices seen through member copies are still a place', () => {
    const window = [
      tick('sutra-copying', false, ['member:m1']),
      tick('breath-sitting', false, ['member:m2']),
      tick('sutra-copying', false, ['member:m1']),
    ];
    expect(kindOf(window)).toBe('place');
  });

  it('tags written by the real fold helpers are never counted as practices', () => {
    // residue.ts re-states the tag prefixes as literals; this ties them to the helpers
    // that actually write them (member copies, per-tier bench copies).
    const tagged = tick('sutra-copying', false, [
      FOLD_IDS.member('m1'),
      benchFoldId('household'),
      FOLD_IDS.bench,
    ]);
    expect(summarizeResidue([tagged]).practiceIds).toEqual([P('sutra-copying')]);
  });
});

describe('guard: the harvest agrees with the cook preview whatever the archive holds', () => {
  // Green at HEAD by design (HEAD never had a recency lever); it keeps one would-be
  // lever from desyncing the kind the cook panel promised from the kind it harvests.
  const everyTitle = Object.values(CATALOG).flatMap((rows) => rows.map((row) => row.name));
  const windows: Record<string, ResidueEvent[]> = {
    person: [tick('alms-round', true), tick('alms-round', true), tick('alms-round', true)],
    'person (lens marker)': [
      tick('sutra-copying', false),
      tick('breath-sitting', false),
      { tick: 3, type: 'lens_chosen', ids: ['market:tea', 'conversation:0'], numbers: {} },
    ],
    place: [
      tick('sutra-copying', false),
      tick('breath-sitting', false),
      tick('sutra-copying', false),
    ],
    thing: [
      tick('sutra-copying', false),
      tick('sutra-copying', false),
      tick('sutra-copying', false),
    ],
    change: [
      tick('sutra-copying', false),
      { tick: 2, type: 'practice_level', ids: [P('sutra-copying')], numbers: {} },
      { tick: 3, type: 'practice_level', ids: [P('sutra-copying')], numbers: {} },
    ],
  };

  it.each(Object.entries(windows))('%s window harvests the kind it previewed', (_label, window) => {
    const predicted = previewKind(summarizeResidue(window), DEFAULT_KIND_RULES);
    const card = tableFillManifest(
      window,
      null,
      0,
      createRng(7n),
      'agree',
      'agree',
      null,
      null,
      'person',
      undefined,
      undefined,
      [],
      'short',
      undefined,
      everyTitle,
    );
    expect(card.kind).toBe(predicted);
  });
});
