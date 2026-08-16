import { describe, expect, it } from 'vitest';

import { assembleWorldDraft, canAssembleWorld, type Manifest } from '../';

function card(kind: Manifest['kind'], id: string, name: string): Manifest {
  return {
    schema_version: 'manifest/v1',
    scale: 'person',
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

describe('assembleWorldDraft', () => {
  it('needs a place or two people', () => {
    expect(canAssembleWorld([card('person', 'p1', 'The clerk')])).toBe(false);
    expect(canAssembleWorld([card('place', 'pl1', 'The quay')])).toBe(true);
    expect(
      canAssembleWorld([card('person', 'p1', 'The clerk'), card('person', 'p2', 'The courier')]),
    ).toBe(true);
  });

  it('names the world after the first place and mentions the first person', () => {
    const draft = assembleWorldDraft([
      card('person', 'p1', 'The night clerk'),
      card('place', 'pl1', 'The night market'),
      card('outcome', 'o1', 'A door that stays open'),
    ]);
    expect(draft?.name).toBe('The night market');
    expect(draft?.one_liner).toContain('The night clerk');
    expect(draft?.cast).toHaveLength(1);
    expect(draft?.places).toHaveLength(1);
    expect(draft?.tensions).toHaveLength(1);
    expect(draft?.bonds).toEqual([]);
  });

  it('records bonds when a card is about a pinned subject', () => {
    const place = card('place', 'pl1', 'The night market');
    const about: Manifest = {
      ...card('thing', 't1', 'Sealed token'),
      about_id: 'pl1',
      about_name: 'The night market',
    };
    const draft = assembleWorldDraft([place, about]);
    expect(draft?.bonds).toEqual([
      {
        card_id: 't1',
        card_name: 'Sealed token',
        about_id: 'pl1',
        about_name: 'The night market',
      },
    ]);
  });
});
