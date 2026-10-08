import { describe, expect, it } from 'vitest';
import { createRng } from '@/engine';
import {
  LONG_FIRE_EXTRA_TICKS,
  canonicalHold,
  cookTicksFor,
  heldPending,
  maxHoldBack,
  pendingIndices,
  planCookTicks,
  queueDevelop,
  spendableResidue,
} from '@/engine/cook-window';

import { createStudioState, recordStudioResidues } from '@/engine/operations';
import type { ResidueEvent } from '@/engine/residue';

function events(n: number): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push({
      tick: i + 1,
      type: i % 2 === 0 ? 'practice_tick' : 'lens_chosen',
      ids: [`trace.${i}`],
      numbers: {},
    });
  }
  return out;
}

function studioWith(n: number, held: readonly number[] = []) {
  const base = recordStudioResidues(createStudioState(), events(n));
  return { ...base, held_residue: held };
}

describe('cook-window math (lane B)', () => {
  it('short fire halves the marginal cost of window material', () => {
    // Old formula: 4 + min(len, 8) — a full tick per extra event.
    expect(cookTicksFor(3, 'short')).toBe(6);
    expect(cookTicksFor(4, 'short')).toBe(6);
    expect(cookTicksFor(8, 'short')).toBe(8);
    expect(cookTicksFor(16, 'short')).toBe(12); // cap holds
  });

  it('long fire always costs exactly LONG_FIRE_EXTRA_TICKS more', () => {
    for (const len of [3, 4, 8, 16]) {
      expect(cookTicksFor(len, 'long')).toBe(cookTicksFor(len, 'short') + LONG_FIRE_EXTRA_TICKS);
    }
    expect(LONG_FIRE_EXTRA_TICKS).toBe(6);
  });

  it('leaves no dominant option: banking is nearly free, material is nearly free', () => {
    // Cooking an 8-event window costs 2 more ticks than a 3-event one (8 vs
    // 6) — kind and card richness decide, not the clock. Holding back costs
    // at most 1 tick (window 5 → 7 vs 8 when cooked without the held pair),
    // and buys kind steering. Neither branch strictly dominates.
    expect(cookTicksFor(8, 'short') - cookTicksFor(3, 'short')).toBe(2);
    expect(cookTicksFor(5, 'short')).toBe(7);
  });

  it('defaults to short fire when fire is omitted', () => {
    expect(cookTicksFor(3)).toBe(cookTicksFor(3, 'short'));
  });
});

describe('pending window with hold-back', () => {
  it('lists held skips below the consumed index as still pending', () => {
    // 5 events; a cook spent 0,1,3,4 and held 2 → index 2 stays pending.
    const studio = { ...studioWith(5, [2]), last_harvest_index: 4 };
    expect(pendingIndices(studio)).toEqual([2]);
    expect(spendableResidue(studio)).toEqual([]); // still held, not spendable
    expect(heldPending(studio)).toEqual([2]);
  });

  it('unions held skips with the fresh tail, ascending', () => {
    const studio = { ...studioWith(6, [1]), last_harvest_index: 3 };
    expect(pendingIndices(studio)).toEqual([1, 4, 5]);
  });

  it('lets the player hold everything above the gate (no count cap)', () => {
    expect(maxHoldBack(28, 3)).toBe(25); // the pile check2 saw: 25 of 28 holdable
    expect(maxHoldBack(6, 3)).toBe(3);
    expect(maxHoldBack(3, 3)).toBe(0);
    expect(maxHoldBack(2, 3)).toBe(0); // never let the queue gate go dark
  });

  it('canonicalHold keeps any number of pending indices, sorted and deduped', () => {
    const studio = studioWith(6); // pending 0..5
    const pending = pendingIndices(studio);
    expect(canonicalHold(studio, [5, 0, 3, 99, 3], pending, 3)).toEqual([0, 3, 5]);
    expect(canonicalHold(studio, [2, 4], pending, 3)).toEqual([2, 4]);
    expect(canonicalHold(studio, undefined, pending, 3)).toEqual([]); // no prior holds
  });

  it('canonicalHold spends the lowest held indices when the gate demands it', () => {
    const studio = studioWith(5); // pending 0..4, gate 3
    const pending = pendingIndices(studio);
    // Holding 0,1,2 would leave only 2 spendable: the engine spends 0 first.
    expect(canonicalHold(studio, [0, 1, 2], pending, 3)).toEqual([1, 2]);
    // A legal large hold passes through untouched (25 of 28 style).
    const pile = studioWith(28);
    const pilePending = pendingIndices(pile);
    const wanted = pilePending.slice(3);
    expect(canonicalHold(pile, wanted, pilePending, 3)).toEqual(wanted);
  });

  it('carries an existing hold forward when the cook passes no new choice', () => {
    const studio = studioWith(6, [2]);
    const pending = pendingIndices(studio);
    expect(canonicalHold(studio, undefined, pending, 3)).toEqual([2]);
  });
});

describe('ghost held indices (wave-1 review #3)', () => {
  it('pendingIndices ignores out-of-range holds from an out-of-sync save', () => {
    const studio = { ...studioWith(3), last_harvest_index: 2, held_residue: [99, 1] };
    expect(pendingIndices(studio)).toEqual([1]); // 99 is beyond the log
  });

  it('queueDevelop refuses an empty window even if a ghost slipped through', () => {
    const studio = { ...studioWith(1), last_harvest_index: 0, held_residue: [77] };
    const queued = queueDevelop(studio, null, createRng(5n));
    expect(queued.bay).toBeNull();
    expect(queued.last_harvest_index).toBe(0); // nothing advanced past real events
  });
});

describe('banked heat cannot erase the fire trade (finding 1)', () => {
  it('RED: advertised ticks equal the bay it queues, for any surplus', () => {
    for (const surplus of [0, 3, 10, 228]) {
      for (const fire of ['short', 'long'] as const) {
        let studio = recordStudioResiduesForCap(createStudioState(), eventsForCap(8));
        studio = { ...studio, surplus };
        const queued = queueDevelop(studio, null, createRng(9n), { fire });
        const bay = queued.bay;
        if (bay === null) {
          throw new Error('expected a bay');
        }
        expect(bay.cook_ticks_total, `surplus ${surplus} fire ${fire}`).toBe(
          planCookTicksForTest(8, fire, 0, surplus).total,
        );
      }
    }
  });

  it('RED: with surplus 0, 10, 228 a long fire always costs at least +3 over short', () => {
    for (const surplus of [0, 10, 228]) {
      let studio = recordStudioResiduesForCap(createStudioState(), eventsForCap(8));
      studio = { ...studio, surplus };
      const short = queueDevelop(studio, null, createRng(10n), { fire: 'short' }).bay;
      const long = queueDevelop(studio, null, createRng(10n), { fire: 'long' }).bay;
      if (short === null || long === null) {
        throw new Error('expected bays');
      }
      expect(
        long.cook_ticks_total - short.cook_ticks_total,
        `surplus ${surplus}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});

function eventsForCap(n: number) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push({ tick: i + 1, type: 'practice_tick' as const, ids: [`p.${i % 3}`], numbers: {} });
  }
  return out;
}
function recordStudioResiduesForCap(
  base: ReturnType<typeof createStudioState>,
  events: readonly unknown[],
) {
  // Local helper: the engine export works on StudioState.
  return { ...base, residue: [...base.residue, ...events] } as typeof base;
}
function planCookTicksForTest(
  len: number,
  fire: 'short' | 'long',
  discount: number,
  surplus: number,
) {
  return planCookTicks(len, fire, discount, surplus);
}
