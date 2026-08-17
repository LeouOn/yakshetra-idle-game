// assembleWorldDraftAtScale + recordWorldDraftAtScale — per-scale world drafts.
//
//   (a) person parity: exact equality with assembleWorldDraft over the same
//       archive, and the same null gate
//   (b) the scale filters the archive before the person rules apply
//   (c) household/org/town assemble at >= 2 cards of the scale; the name
//       comes from the first card, the one_liner from the second
//   (d) recordWorldDraftAtScale appends once per scale and dedups by presence

import { describe, expect, it } from 'vitest';

import { assembleWorldDraft, type Manifest } from '../';
import { assembleWorldDraftAtScale, recordWorldDraftAtScale } from '../world-scale';
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

describe('recordWorldDraftAtScale', () => {
  it('appends the scale when absent', () => {
    expect(recordWorldDraftAtScale([], 'household')).toEqual([{ scale: 'household' }]);
    expect(recordWorldDraftAtScale([{ scale: 'person' }], 'household')).toEqual([
      { scale: 'person' },
      { scale: 'household' },
    ]);
  });

  it('returns the same reference once the scale is recorded', () => {
    const recorded = [{ scale: 'person' }, { scale: 'household' }];
    expect(recordWorldDraftAtScale(recorded, 'household')).toBe(recorded);
  });
});
