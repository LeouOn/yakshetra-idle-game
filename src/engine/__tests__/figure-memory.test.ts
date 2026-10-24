import { describe, expect, it } from 'vitest';

import { composeCard } from '../card-composer';
import { chooseFigureBody, figureTagOf } from '../figure-memory';
import type { CatalogEntry } from '../table-catalog';
import type { LifeContext } from '../life-context';
import { createRng } from '../rng';
import { summarizeResidue, type ResidueEvent } from '../residue';

function bodies(n: number, id: string): CatalogEntry {
  return {
    name: 'The figure',
    one_liner: `${id} one`,
    subject: `${id} subject`,
    detail: `${id} body zero.`,
    tags: [`figure:${id}`],
    templates: Array.from({ length: n - 1 }, (_, i) => ({
      detail: `${id} body ${i + 1}.`,
      tags: ['scene'],
    })),
  };
}

const win: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 1 } },
];
const summary = summarizeResidue(win);
const ctx: LifeContext = {
  schema_version: 'life_context/v0',
  life_id: 'm',
  age: 30,
  turn: 1,
  alive: true,
  lens: null,
  setting: {
    era_id: 'tang-china',
    role_id: 'peasant',
    year: 750,
    month: 1,
    day: 1,
    hour: 12,
    calendar_label: 'x',
  },
  ties: [],
  strongest_tie: null,
  flags: [],
  residue_summary: summary,
  activity: { work: 1, generosity: 0, beings: 0, learning: 0, meditation: 0, other: 0 },
  world_name: null,
  world_line: null,
};

describe('per-figure body memory', () => {
  it('prefers an unseen body, then the one printed longest ago', () => {
    const pool = [0, 1, 2, 3].map((i) => ({ i }));
    const detailOf = (c: { i: number }): string => `b${c.i}`;
    expect(chooseFigureBody(pool, [], detailOf)).toEqual({ i: 0 });
    expect(chooseFigureBody(pool, ['b0'], detailOf)).toEqual({ i: 1 });
    // Spent: the oldest print comes back, never the last; it is the order of the history that
    // counts, not which bodies are in it.
    expect(chooseFigureBody(pool, ['b0', 'b1', 'b2', 'b3'], detailOf)).toEqual({ i: 0 });
    expect(chooseFigureBody(pool, ['b0', 'b1', 'b2', 'b3', 'b0'], detailOf)).toEqual({ i: 1 });
    expect(chooseFigureBody(pool, ['b2', 'b0', 'b1', 'b3'], detailOf)).toEqual({ i: 2 });
    expect(chooseFigureBody([], ['b0'], detailOf)).toBeUndefined();
  });

  it('walks the whole pool: every body returns exactly once per lap, equal bodies pool-size apart', () => {
    const pool = [0, 1, 2, 3].map((i) => ({ i }));
    const detailOf = (c: { i: number }): string => `b${c.i}`;
    const seen: string[] = [];
    for (let n = 0; n < 12; n += 1) {
      seen.push(detailOf(chooseFigureBody(pool, seen, detailOf)!));
    }
    for (let lap = 0; lap < 3; lap += 1) {
      expect(new Set(seen.slice(lap * 4, lap * 4 + 4)).size).toBe(4);
    }
    for (let n = 4; n < 12; n += 1) {
      expect(seen[n]).toBe(seen[n - 4]);
    }
  });

  it('composes distinct bodies for a figure before repeating, and repeats deterministically', () => {
    const row = bodies(6, 'fixture') as CatalogEntry;
    const rng = createRng(7n);
    const used: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const card = composeCard(row, {
        summary,
        lifeContext: ctx,
        focus: null,
        brief: null,
        rarity: 'common',
        qualityTier: 0,
        fire: 'short',
        usedDetails: [...used],
        usedTitles: [],
        figureUsage: { 'figure:fixture': [...seen] },
        rng,
      });
      used.push(card.detail);
      seen.push(card.detail);
    }
    // First 6 are all distinct.
    expect(new Set(used.slice(0, 6)).size).toBe(6);
    // The second cycle is deterministic from the same archive.
    const again: string[] = [];
    const rng2 = createRng(7n);
    const seen2: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const card = composeCard(row, {
        summary,
        lifeContext: ctx,
        focus: null,
        brief: null,
        rarity: 'common',
        qualityTier: 0,
        fire: 'short',
        usedDetails: used.slice(0, i),
        usedTitles: [],
        figureUsage: { 'figure:fixture': [...seen2] },
        rng: rng2,
      });
      again.push(card.detail);
      seen2.push(card.detail);
    }
    expect(again).toEqual(used);
  });

  it('has no figure tag on a plain row', () => {
    expect(figureTagOf({ ...bodies(2, 'x'), tags: ['plain'] })).toBeNull();
  });
});
