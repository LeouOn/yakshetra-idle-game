import { describe, expect, it } from 'vitest';

import { DEFAULT_KIND_RULES, pickKindFromRegistry, type KindRule } from '@/engine/kind-registry';
import { summarizeResidue, type ResidueEvent, type ResidueEventType } from '@/engine/residue';

function event(tick: number, type: ResidueEventType, ids: readonly string[]): ResidueEvent {
  return { tick, type, ids, numbers: {} };
}

function kindOf(events: readonly ResidueEvent[], rules = DEFAULT_KIND_RULES): string {
  return pickKindFromRegistry(summarizeResidue(events), rules);
}

describe('DEFAULT_KIND_RULES reproduce the SPEC §6 pick rules', () => {
  it('level-up windows harvest change', () => {
    expect(kindOf([event(1, 'practice_level', ['p:zazen'])])).toBe('change');
  });

  it('resolved-event windows harvest outcome', () => {
    expect(kindOf([event(1, 'event_resolved', ['ev:fire'])])).toBe('outcome');
  });

  it('social windows harvest person', () => {
    const window = [
      event(1, 'practice_tick', ['p:tea']),
      event(2, 'lens_chosen', ['lens:beings']),
      event(3, 'practice_tick', ['p:tea', 'being:guest']),
    ];
    expect(kindOf(window)).toBe('person');
  });

  it('spatial windows harvest place', () => {
    const window = [
      event(1, 'practice_tick', ['p:zazen']),
      event(2, 'practice_tick', ['p:walking']),
    ];
    expect(kindOf(window)).toBe('place');
  });

  it('empty windows harvest thing', () => {
    expect(kindOf([])).toBe('thing');
  });

  it('practice_tick-dominant windows harvest thing', () => {
    expect(kindOf([event(1, 'practice_tick', ['p:zazen'])])).toBe('thing');
  });

  it('resource_edge-dominant windows harvest outcome', () => {
    expect(kindOf([event(1, 'resource_edge', ['res:grain'])])).toBe('outcome');
  });

  it('life_ended-dominant windows harvest change', () => {
    expect(kindOf([event(1, 'life_ended', ['life:one'])])).toBe('change');
  });

  it('level-up beats social (rule order is load-bearing)', () => {
    const window = [
      event(1, 'practice_level', ['p:zazen']),
      event(2, 'lens_chosen', ['lens:beings']),
      event(3, 'practice_tick', ['p:zazen', 'being:guest']),
    ];
    expect(kindOf(window)).toBe('change');
  });
});

describe('pickKindFromRegistry', () => {
  it('throws when no rule matches', () => {
    const empty: readonly KindRule[] = [];
    expect(() => pickKindFromRegistry(summarizeResidue([]), empty)).toThrow('no rule matched');
  });
});
