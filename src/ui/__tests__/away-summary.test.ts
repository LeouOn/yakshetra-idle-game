import { describe, it, expect } from 'vitest';

import type { Manifest } from '@/engine';
import { AWAY_QUIET_TICKS, deriveReturnSummary } from '@/ui/hooks/away-summary';

function card(overrides: Partial<Manifest>): Manifest {
  return {
    schema_version: 'manifest/v1',
    id: 'm1',
    rng_seed: 'seed',
    brief: null,
    residue_window_id: 'w1',
    kind: 'person',
    scale: 'person',
    name: 'A keepsake',
    one_liner: 'One line.',
    subject: 'subject',
    detail: 'detail',
    tags: [],
    rarity: 'common',
    fill_status: 'table',
    quality_tier: 1,
    provenance: { source: 'table', revision: 'test' },
    ...overrides,
  };
}

describe('deriveReturnSummary', () => {
  it('stays silent for a two-minute absence with nothing at the bench', () => {
    const summary = deriveReturnSummary({
      ticksSimulated: 2,
      residueGained: 2,
      harvested: [],
      benchesReady: [],
      capped: false,
    });
    expect(summary).toBeNull();
  });

  it('stays silent for a first visit', () => {
    expect(
      deriveReturnSummary({
        ticksSimulated: 0,
        residueGained: 0,
        harvested: [],
        benchesReady: [],
        capped: false,
      }),
    ).toBeNull();
  });

  it('names person and place keepsakes and counts the rest', () => {
    const summary = deriveReturnSummary({
      ticksSimulated: 240,
      residueGained: 40,
      harvested: [
        card({ id: 'p1', kind: 'person', name: 'The gatekeeper' }),
        card({ id: 'pl1', kind: 'place', name: 'The mill by the ford' }),
        card({ id: 't1', kind: 'thing', name: 'A cracked bowl' }),
      ],
      benchesReady: ['person', 'household'],
      capped: true,
    });
    expect(summary).not.toBeNull();
    expect(summary?.workings).toBe(3);
    expect(summary?.keepsakes.map((k) => k.name)).toEqual([
      'The gatekeeper',
      'The mill by the ford',
    ]);
    // One archived thing + one ready tier bench.
    expect(summary?.otherKeepsakes).toBe(2);
    expect(summary?.bayReady).toBe(true);
    expect(summary?.capped).toBe(true);
  });

  it('reports a single finished working without miscounting', () => {
    const summary = deriveReturnSummary({
      ticksSimulated: 120,
      residueGained: 12,
      harvested: [card({ id: 'only', kind: 'change', name: 'The quieter road' })],
      benchesReady: [],
      capped: false,
    });
    expect(summary?.workings).toBe(1);
    expect(summary?.keepsakes).toEqual([]);
    expect(summary?.otherKeepsakes).toBe(1);
  });

  it('does not call a bay the player left ready a working finished', () => {
    const summary = deriveReturnSummary({
      ticksSimulated: 120,
      residueGained: 8,
      harvested: [],
      benchesReady: ['person'],
      capped: false,
    });
    expect(summary?.workings).toBe(0);
    expect(summary?.keepsakes).toEqual([]);
    expect(summary?.otherKeepsakes).toBe(0);
    expect(summary?.bayReady).toBe(true);
  });

  it('still speaks after a long quiet absence that moved traces', () => {
    const summary = deriveReturnSummary({
      ticksSimulated: AWAY_QUIET_TICKS,
      residueGained: 3,
      harvested: [],
      benchesReady: [],
      capped: false,
    });
    expect(summary).not.toBeNull();
    expect(summary?.workings).toBe(0);
  });

  it('does not count the player person bench as a tier keepsake', () => {
    const summary = deriveReturnSummary({
      ticksSimulated: 120,
      residueGained: 4,
      harvested: [],
      benchesReady: ['person'],
      capped: false,
    });
    expect(summary?.otherKeepsakes).toBe(0);
  });
});
