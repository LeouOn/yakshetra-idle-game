// Window-shape kind rules (wave 1b, lane b1).
//
// The person-scale funnel was closed: the fixed 6x4h bench schedule made
// every window multi-practice, so only place/change could ever match. These
// tests pin the opened funnel over residue SHAPES the emission layer really
// produces:
//   - one practice, no marker            -> thing  (the work left an object)
//   - an engagement marker in the window -> person (social-family practice)
//   - a level-up in the window           -> change (existing rule, guarded)
//   - several practices, no marker       -> place  (existing rule, guarded)
import { describe, expect, it } from 'vitest';

import { DEFAULT_KIND_RULES, pickKindFromRegistry } from '@/engine/kind-registry';
import { summarizeResidue, type ResidueEvent } from '@/engine/residue';

const ev = (type: ResidueEvent['type'], ids: readonly string[], tick = 1): ResidueEvent => ({
  tick,
  type,
  ids,
  numbers: {},
});

describe('person-scale kind funnel over window shapes', () => {
  it('a window of one practice, no marker, is a thing', () => {
    const window = [
      ev('practice_tick', ['practice:tang/sutra-copying'], 10),
      ev('practice_tick', ['practice:tang/sutra-copying'], 12),
      ev('practice_tick', ['practice:tang/sutra-copying'], 14),
    ];
    expect(pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES)).toBe('thing');
  });

  it('a window holding an engagement marker is a person', () => {
    const window = [
      ev('practice_tick', ['practice:tang/extra-bowl', 'engagement:practice:tang/extra-bowl'], 10),
      ev('practice_tick', ['practice:tang/extra-bowl', 'engagement:practice:tang/extra-bowl'], 12),
      ev('practice_tick', ['practice:tang/extra-bowl', 'engagement:practice:tang/extra-bowl'], 14),
    ];
    expect(pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES)).toBe('person');
  });

  it('a mixed window with one social practice is still a person', () => {
    const window = [
      ev('practice_tick', ['practice:tang/sutra-copying'], 10),
      ev(
        'practice_tick',
        ['practice:tang/courtyard-beings', 'engagement:practice:tang/courtyard-beings'],
        12,
      ),
      ev('practice_tick', ['practice:tang/sutra-copying'], 14),
    ];
    expect(pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES)).toBe('person');
  });

  it('a lens_chosen marker (tea) still makes a person', () => {
    const window = [
      ev('lens_chosen', ['market:tea', 'conversation:0'], 10),
      ev('lens_chosen', ['market:tea', 'conversation:1'], 10),
      ev('lens_chosen', ['market:tea', 'conversation:2'], 10),
    ];
    expect(pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES)).toBe('person');
  });

  it('a window with a level-up is a change', () => {
    const window = [
      ev('practice_tick', ['practice:tang/sutra-copying'], 10),
      ev('practice_level', ['practice:tang/sutra-copying'], 12),
      ev('practice_tick', ['practice:tang/breath-sitting'], 14),
    ];
    expect(pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES)).toBe('change');
  });

  it('several distinct practices with no marker remain a place', () => {
    const window = [
      ev('practice_tick', ['practice:tang/sutra-copying'], 10),
      ev('practice_tick', ['practice:tang/breath-sitting'], 12),
      ev('practice_tick', ['practice:tang/sutra-copying'], 14),
    ];
    expect(pickKindFromRegistry(summarizeResidue(window), DEFAULT_KIND_RULES)).toBe('place');
  });

  it('a quiet empty window is still a thing (no_dominant tail)', () => {
    expect(pickKindFromRegistry(summarizeResidue([]), DEFAULT_KIND_RULES)).toBe('thing');
  });
});
