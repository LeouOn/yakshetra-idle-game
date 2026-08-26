// assembleWorldDraftAtScale + recordWorldDraftAtScale + withRecordedDrafts —
// per-scale world drafts.
//
//   (a) person parity: exact equality with assembleWorldDraft over the same
//       archive, and the same null gate
//   (b) the scale filters the archive before the person rules apply
//   (c) household/org/town assemble at >= 2 cards of the scale; the name
//       comes from the first card, the one_liner from the second
//   (d) ordinal pairing: world k at a non-person scale is cards[2k]+cards[2k+1];
//       each pair is a DISTINCT world, and ordinals beyond the pairs are null
//   (e) recordWorldDraftAtScale grows the ledger up to `count` refs per scale
//       (dedup by presence — never shrinks, never duplicates past count)
//   (f) withRecordedDrafts accrues one ref per assembleable world per scale:
//       floor(cards/2) for non-person scales, <= 1 for person

import { describe, expect, it } from 'vitest';

import { assembleWorldDraft, type Manifest } from '../';
import {
  assembleWorldDraftAtScale,
  recordWorldDraftAtScale,
  withRecordedDrafts,
} from '../world-scale';
import type { ManifestScale } from '../manifest';

function card(
  kind: Manifest['kind'],
  id: string,
  name: string,
  scale: ManifestScale = 'person',
): Manifest {
  return {
    schema_version: 'manifest/v1',
    scale,
    id,
    rng_seed: '1',
    brief: null,
    residue_window_id: 'w-1',
    kind,
    name,
    one_liner: `${name} waits.`,
    subject: name,
    detail: 'detail',
    tags: ['t'],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 0,
    provenance: { source: 'table', revision: 'table/v0' },
  };
}

describe('assembleWorldDraftAtScale (person parity)', () => {
  const archives: readonly (readonly Manifest[])[] = [
    [card('person', 'p1', 'The clerk')],
    [card('place', 'pl1', 'The quay')],
    [
      card('person', 'p1', 'The night clerk'),
      card('place', 'pl1', 'The night market'),
      card('outcome', 'o1', 'A door that stays open'),
    ],
    [
      card('place', 'pl1', 'The night market'),
      { ...card('thing', 't1', 'Sealed token'), about_id: 'pl1', about_name: 'The night market' },
    ],
  ];

  it('matches assembleWorldDraft exactly, including the null gate', () => {
    for (const archive of archives) {
      expect(assembleWorldDraftAtScale(archive, 'person')).toEqual(assembleWorldDraft(archive));
    }
  });

  it('filters the archive to the scale before applying the person rules', () => {
    // One household-scale place does not seed a person world.
    const archive = [
      card('person', 'p1', 'The clerk'),
      card('place', 'pl2', 'The manor', 'household'),
    ];
    expect(assembleWorldDraftAtScale(archive, 'person')).toBeNull();
  });
});

describe('assembleWorldDraftAtScale (non-person scales)', () => {
  it('stays null below two cards of the scale', () => {
    expect(
      assembleWorldDraftAtScale([card('place', 'pl1', 'The quay', 'household')], 'household'),
    ).toBeNull();
    expect(
      assembleWorldDraftAtScale(
        [card('thing', 'c1', 'The guild seal', 'town'), card('place', 'pl1', 'The quay')],
        'town',
      ),
    ).toBeNull();
  });

  it('names the household world from the first card and the line from the second', () => {
    const archive = [
      card('place', 'pl1', 'The hearth row', 'household'),
      card('person', 'p1', 'Old Shi', 'household'),
    ];
    const draft = assembleWorldDraftAtScale(archive, 'household');
    expect(draft?.name).toBe('The hearth row');
    expect(draft?.one_liner).toBe('Old Shi waits.');
    expect(draft?.places).toHaveLength(1);
    expect(draft?.cast).toHaveLength(1);
  });

  it('assembles the town world at two cards of the scale', () => {
    const archive = [
      card('place', 'pl1', 'The west bridge', 'town'),
      card('thing', 'f1', 'Lantern night', 'town'),
    ];
    const draft = assembleWorldDraftAtScale(archive, 'town');
    expect(draft?.name).toBe('The west bridge');
    expect(draft?.one_liner).toBe('Lantern night waits.');
  });
});

describe('assembleWorldDraftAtScale (ordinal pairing)', () => {
  const archive: readonly Manifest[] = [
    card('place', 'org-a', 'The charter hall', 'org'),
    card('person', 'org-b', 'The oath keeper', 'org'),
    card('place', 'org-c', 'The counted yard', 'org'),
    card('person', 'org-d', 'The tally master', 'org'),
    card('thing', 'org-e', 'The surplus ledger', 'org'),
  ];

  it('names world 1 from cards 2 and 3, distinct from world 0', () => {
    const world0 = assembleWorldDraftAtScale(archive, 'org', 0);
    const world1 = assembleWorldDraftAtScale(archive, 'org', 1);
    expect(world0?.name).toBe('The charter hall');
    expect(world0?.one_liner).toBe('The oath keeper waits.');
    expect(world1?.name).toBe('The counted yard');
    expect(world1?.one_liner).toBe('The tally master waits.');
    expect(world1?.name).not.toBe(world0?.name);
    expect(world1?.one_liner).not.toBe(world0?.one_liner);
  });

  it('builds each world from its own pair only', () => {
    const world1 = assembleWorldDraftAtScale(archive, 'org', 1);
    expect(world1?.places.map((place) => place.id)).toEqual(['org-c']);
    expect(world1?.cast.map((person) => person.id)).toEqual(['org-d']);
  });

  it('stays null when the pair is incomplete or beyond the pairs', () => {
    expect(assembleWorldDraftAtScale(archive, 'org', 2)).toBeNull();
    expect(
      assembleWorldDraftAtScale(
        [
          card('place', 'pl1', 'The hearth row', 'household'),
          card('person', 'p1', 'Old Shi', 'household'),
        ],
        'household',
        1,
      ),
    ).toBeNull();
  });
});

describe('recordWorldDraftAtScale', () => {
  it('appends up to count refs when fewer are recorded', () => {
    expect(recordWorldDraftAtScale([], 'household', 1)).toEqual([{ scale: 'household' }]);
    expect(recordWorldDraftAtScale([{ scale: 'person' }], 'household', 2)).toEqual([
      { scale: 'person' },
      { scale: 'household' },
      { scale: 'household' },
    ]);
  });

  it('returns the same reference once count refs of the scale are recorded', () => {
    const recorded = [{ scale: 'person' }, { scale: 'household' }, { scale: 'household' }];
    expect(recordWorldDraftAtScale(recorded, 'household', 2)).toBe(recorded);
    expect(recordWorldDraftAtScale(recorded, 'household', 0)).toBe(recorded);
  });

  it('never shrinks a ledger that somehow holds more refs than count', () => {
    const recorded = [{ scale: 'household' }, { scale: 'household' }, { scale: 'household' }];
    expect(recordWorldDraftAtScale(recorded, 'household', 2)).toBe(recorded);
  });
});

describe('withRecordedDrafts (one ref per assembled world)', () => {
  const ORG_ONLY: readonly ManifestScale[] = ['org'];

  it('records one org ref per pair of org cards — five cards cap at two', () => {
    const archive = [
      card('place', 'o1', 'The charter hall', 'org'),
      card('person', 'o2', 'The oath keeper', 'org'),
      card('place', 'o3', 'The counted yard', 'org'),
      card('person', 'o4', 'The tally master', 'org'),
      card('thing', 'o5', 'The surplus ledger', 'org'),
    ];
    const recorded = withRecordedDrafts(archive, [], ORG_ONLY);
    expect(recorded).toHaveLength(2);
    expect(recorded).toEqual([{ scale: 'org' }, { scale: 'org' }]);
  });

  it('two cards of a scale record ONE world — not enough for a gte 2 gate', () => {
    const archive = [
      card('place', 'o1', 'The charter hall', 'org'),
      card('person', 'o2', 'The oath keeper', 'org'),
    ];
    expect(withRecordedDrafts(archive, [], ORG_ONLY)).toEqual([{ scale: 'org' }]);
  });

  it('grows an already-recorded ledger as new pairs arrive', () => {
    const twoCards = [
      card('place', 'o1', 'The charter hall', 'org'),
      card('person', 'o2', 'The oath keeper', 'org'),
    ];
    const first = withRecordedDrafts(twoCards, [], ORG_ONLY);
    const fourCards = [
      ...twoCards,
      card('place', 'o3', 'The counted yard', 'org'),
      card('person', 'o4', 'The tally master', 'org'),
    ];
    expect(withRecordedDrafts(fourCards, first, ORG_ONLY)).toEqual([
      { scale: 'org' },
      { scale: 'org' },
    ]);
  });

  it('keeps person at one ref regardless of card count', () => {
    const archive = [
      card('person', 'p1', 'The clerk'),
      card('person', 'p2', 'The ferryman'),
      card('person', 'p3', 'The scribe'),
      card('person', 'p4', 'The baker'),
    ];
    expect(withRecordedDrafts(archive, [], ['person'])).toEqual([{ scale: 'person' }]);
  });
});
