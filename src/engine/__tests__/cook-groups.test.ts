import { describe, expect, it } from 'vitest';

import {
  groupTraces,
  reachableKinds,
  spentEvents,
  spentIndices,
  type SpendCounts,
} from '@/engine/cook-groups';
import { previewOf } from '@/engine/cook-groups';
import type { ResidueEvent } from '@/engine/residue';

import { canonicalHold, pendingIndices } from '@/engine/cook-window';
import { createStudioState } from '@/engine/operations';
import { previewKind, DEFAULT_KIND_RULES } from '@/engine/kind-registry';
import { summarizeResidue } from '@/engine/residue';
import type { StudioState } from '@/engine/operations';

function ev(tick: number, type: ResidueEvent['type'], ids: readonly string[]): ResidueEvent {
  return { tick, type, ids, numbers: {} };
}

function pile(events: readonly ResidueEvent[]) {
  return groupTraces(events.map((event, index) => ({ index, event })));
}

describe('cook groups', () => {
  it('merges identical traces by id tuple, first-appearance order', () => {
    const groups = pile([
      ev(1, 'practice_tick', ['practice:tang/alms-round']),
      ev(2, 'practice_tick', ['practice:tang/alms-round']),
      ev(3, 'lens_chosen', ['lens:beings']),
      ev(4, 'practice_tick', ['practice:tang/alms-round']),
    ]);
    expect(groups.map((g) => g.indices)).toEqual([[0, 1, 3], [2]]);
    expect(groups[0]?.events).toHaveLength(3);
  });

  it('keeps engagement-marked traces separate from their bare twins', () => {
    const groups = pile([
      ev(1, 'practice_tick', ['practice:a', 'engagement:guest']),
      ev(2, 'practice_tick', ['practice:a']),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('spends the first n of each group; absent key spends the whole group', () => {
    const groups = pile([
      ev(1, 'practice_tick', ['p:a']),
      ev(2, 'practice_tick', ['p:a']),
      ev(3, 'practice_tick', ['p:a']),
      ev(4, 'lens_chosen', ['lens:x']),
    ]);
    const counts: SpendCounts = { 'practice_tick|p:a': 1 };
    // The lens group key is absent → the whole lens group spends too.
    expect(spentIndices(groups, counts)).toEqual([0, 3]);
    expect(spentIndices(groups, {})).toEqual([0, 1, 2, 3]);
    expect(spentEvents(groups, counts)).toHaveLength(2); // 1 alms + the lens trace
  });
});

describe('reachable kinds', () => {
  it('lists only kinds a legal subset can make, leanest plan first', () => {
    const groups = pile([
      ev(1, 'lens_chosen', ['lens:beings']),
      ev(2, 'practice_tick', ['p:alms']),
      ev(3, 'practice_tick', ['p:alms']),
      ev(4, 'practice_tick', ['p:sutras']),
    ]);
    const kinds = reachableKinds(groups, 3);
    expect(kinds.map((k) => k.kind)).toContain('person');
    expect(kinds.map((k) => k.kind)).toContain('place');
    // 'thing' is genuinely unreachable from this pile: every legal 3-trace
    // subset carries either the lens marker (person) or two distinct
    // practices (place). Reachability must not over-promise.
    expect(kinds.map((k) => k.kind)).not.toContain('thing');
    // The leanest person plan spends the lens group plus one practice group.
    const person = kinds.find((k) => k.kind === 'person');
    const spentKeys = Object.entries(person?.counts ?? {}).filter(([, n]) => n > 0);
    expect(spentKeys).toHaveLength(2);
    expect(previewOf(groups, person?.counts ?? {})).toBe('person');
  });

  it('offers nothing a pile cannot legally make', () => {
    const onlyPractice = pile([
      ev(1, 'practice_tick', ['p:a']),
      ev(2, 'practice_tick', ['p:a']),
      ev(3, 'practice_tick', ['p:a']),
    ]);
    const kinds = reachableKinds(onlyPractice, 3).map((k) => k.kind);
    expect(kinds).toEqual(['thing']); // one id, no marker: person/place unreachable
  });

  it('never proposes a plan below the gate', () => {
    const groups = pile([ev(1, 'lens_chosen', ['lens:x']), ev(2, 'practice_tick', ['p:a'])]);
    expect(reachableKinds(groups, 3)).toEqual([]); // 2 traces cannot cook at gate 3
  });

  it('covers the check2 pile shape: 28 traces, many holdable', () => {
    const events: ResidueEvent[] = [];
    for (let i = 0; i < 24; i += 1) {
      events.push(ev(i + 1, 'practice_tick', ['p:alms']));
    }
    events.push(ev(25, 'lens_chosen', ['lens:beings']));
    events.push(ev(26, 'event_resolved', ['choice: famine-year']));
    events.push(ev(27, 'practice_tick', ['p:sutras']));
    events.push(ev(28, 'practice_level', ['p:alms']));
    const kinds = reachableKinds(pile(events), 3).map((k) => k.kind);
    for (const kind of ['person', 'place', 'thing', 'outcome', 'change']) {
      expect(kinds).toContain(kind);
    }
  });
});

describe('quick-pick integrity (browser finding 1, property)', () => {
  function randomPile(seed: bigint, size: number): ResidueEvent[] {
    // Deterministic pseudo-random pile over a small trace vocabulary.
    let state = seed;
    const next = (max: number): number => {
      state = (state * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffn;
      return Number(state % BigInt(max));
    };
    const types: ResidueEvent['type'][] = [
      'practice_tick',
      'practice_tick',
      'practice_tick',
      'lens_chosen',
      'event_resolved',
      'practice_level',
    ];
    const ids = [
      'p:alms',
      'p:sutras',
      'p:market',
      'lens:beings',
      'choice:famine',
      'engagement:guest',
    ];
    const out: ResidueEvent[] = [];
    for (let i = 0; i < size; i += 1) {
      const t = types[next(types.length)] ?? 'practice_tick';
      const id = ids[next(ids.length)] ?? 'p:alms';
      const extra = t === 'practice_tick' && next(4) === 0 ? ['engagement:guest'] : [];
      out.push({ tick: i + 1, type: t, ids: [id, ...extra], numbers: {} });
    }
    return out;
  }

  it('every reachable kind plan previews as that kind, before and after the hold round trip', () => {
    for (const seed of [1n, 7n, 99n, 4242n, 20261003n]) {
      for (const size of [8, 17, 26]) {
        const events = randomPile(seed, size);
        const chips = events.map((event, index) => ({ index, event }));
        const groups = groupTraces(chips);
        const reachable = reachableKinds(groups, 3);
        expect(reachable.length).toBeGreaterThan(0);
        for (const option of reachable) {
          expect(previewOf(groups, option.counts)).toBe(option.kind);
          // The UI turns a plan into holdBack indices; canonicalHold may trim
          // a plan that falls below the gate — the trimmed plan must still
          // preview as the picked kind or the pick was a lie.
          const spent = new Set(spentIndices(groups, option.counts));
          const holdBack = chips.filter((c) => !spent.has(c.index)).map((c) => c.index);
          const studio = {
            ...createStudioStateForProp(),
            residue: events,
            held_residue: holdBack,
          };
          const pending = pendingIndicesForProp(studio);
          const held = new Set(canonicalHoldForProp(studio, holdBack, pending, 3));
          const after = pending.filter((i) => !held.has(i));
          const afterEvents = after
            .map((i) => events[i])
            .filter((e): e is ResidueEvent => e !== undefined);
          const kindAfter = previewKindForProp(afterEvents);
          expect(kindAfter, `seed ${seed} size ${size} kind ${option.kind}`).toBe(option.kind);
        }
      }
    }
  });
});

function createStudioStateForProp(): StudioState {
  return createStudioState();
}
function pendingIndicesForProp(studio: StudioState): readonly number[] {
  return pendingIndices(studio);
}
function canonicalHoldForProp(
  studio: StudioState,
  holdBack: readonly number[],
  pending: readonly number[],
  gate: number,
): readonly number[] {
  return canonicalHold(studio, holdBack, pending, gate);
}
function previewKindForProp(events: readonly ResidueEvent[]): string | null {
  return previewKind(summarizeResidue(events), DEFAULT_KIND_RULES);
}

describe('quick-pick vs a mutating pile (browser finding 1, reproduced at engine level)', () => {
  it('a plan applied after the pile grows can preview as a different kind', () => {
    // The bench ticks every 4s while the panel is open. Compute the options
    // on the pile the player SAW, then apply one after a pulse appended a
    // marker trace — exactly the race check2 hit.
    const seen: ResidueEvent[] = [
      { tick: 1, type: 'practice_tick', ids: ['p:alms'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['p:alms'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['p:sutras'], numbers: {} },
    ];
    const groupsSeen = groupTraces(seen.map((event, index) => ({ index, event })));
    const options = reachableKinds(groupsSeen, 3);
    const place = options.find((o) => o.kind === 'place');
    expect(place).toBeDefined(); // 2 distinct practices -> place is reachable

    const afterPulse: ResidueEvent[] = [
      ...seen,
      { tick: 4, type: 'lens_chosen', ids: ['lens:beings'], numbers: {} },
    ];
    const groupsNow = groupTraces(afterPulse.map((event, index) => ({ index, event })));
    // Applying the SEEN plan's counts to the NOW pile: the lens group is a
    // NEW key, absent from the plan, so it spends IN FULL -> social -> thing.
    expect(previewOf(groupsNow, place?.counts ?? {})).not.toBe('place');
  });
});

describe('enumeration cap (wave-1 review #2)', () => {
  it('a 200-trace, 40-group pile answers quickly with plans that hold', () => {
    const events: ResidueEvent[] = [];
    for (let g = 0; g < 40; g += 1) {
      const type: ResidueEvent['type'] =
        g % 7 === 0 ? 'lens_chosen' : g % 11 === 0 ? 'event_resolved' : 'practice_tick';
      const id = `p:trace-${g}`;
      for (let i = 0; i < 5; i += 1) {
        events.push({ tick: events.length + 1, type, ids: [id], numbers: {} });
      }
    }
    expect(events).toHaveLength(200);
    const groups = groupTraces(events.map((event, index) => ({ index, event })));
    expect(groups).toHaveLength(40);

    const started = Date.now();
    const kinds = reachableKinds(groups, 3);
    const elapsed = Date.now() - started;

    // A wall-clock ceiling only has to separate "bounded" from "exponential":
    // the capped enumeration is ~4k previews (tens of ms, but it varies with
    // machine load), while 2^16 groups or more would take whole seconds and 2^40
    // never finishes. A tight ceiling (it was 50 ms) flaked about one run in
    // three on a busy machine; this one does not, and still catches the blow-up.
    expect(elapsed).toBeLessThan(1000);
    expect(kinds.length).toBeGreaterThan(0);
    for (const option of kinds) {
      // Every offered plan still previews as its kind over the REAL groups.
      expect(previewOf(groups, option.counts)).toBe(option.kind);
    }
    // The mask math never touches a 32-bit-overflowing shift.
    expect(groups.length).toBeGreaterThan(31);
  });
});
