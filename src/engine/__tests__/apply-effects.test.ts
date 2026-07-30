import { describe, expect, it } from 'vitest';

import { applyEffects, createLifeState } from '../reducer';
import { createRng } from '../rng';
import type { LifeState, SocialIdentity } from '../types';

const IDENTITY: SocialIdentity = {
  gender: 'unset',
  social_class: 'unset',
  family_wealth_at_birth: 'unset',
  caste_status: 'unset',
  disability_status: 'unset',
};

function makeState(): LifeState {
  return createLifeState({
    id: 'test' as LifeState['id'],
    era: 'test' as LifeState['era'],
    role: 'test' as LifeState['role'],
    identity: IDENTITY,
    resources: { trust: 0 },
  });
}

describe('applyEffects', () => {
  it('folds multiple effects into state', () => {
    const state = makeState();
    const effects = [
      { op: 'add_resource' as const, key: 'trust', delta: 5 },
      { op: 'set_intent_root' as const, intent_root: 'care' },
    ];
    const result = applyEffects(state, effects, createRng(1n));
    expect(result.resources.trust).toBe(5);
    expect(result.intent_root_history).toContain('care');
  });

  it('returns unchanged state for empty effects', () => {
    const state = makeState();
    const result = applyEffects(state, [], createRng(1n));
    expect(result).toBe(state); // empty array -> same reference
  });
});
