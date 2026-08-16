import { describe, expect, it } from 'vitest';

import { DEFAULT_KIND_RULES } from '@/engine/kind-registry';

import { loadProgression } from '@/content/progression/loader';

describe('loadProgression', () => {
  const registries = loadProgression();

  it('loads the six tiers in ladder order', () => {
    expect(registries.tiers.map((t) => t.id)).toEqual([
      'person',
      'household',
      'org',
      'town',
      'city',
      'region',
    ]);
    expect(registries.tiers.map((t) => t.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('person tier is the only one without an unlock milestone', () => {
    const person = registries.tiers.find((t) => t.id === 'person');
    expect(person?.unlock_milestone).toBeNull();
  });

  it('ships kind rules identical to the engine defaults', () => {
    expect(registries.kindRules).toEqual(DEFAULT_KIND_RULES);
  });

  it('ships one unlock milestone per non-person tier', () => {
    expect(registries.milestones.map((m) => m.id)).toEqual([
      'unlock-household',
      'unlock-org',
      'unlock-town',
      'unlock-city',
      'unlock-region',
    ]);
  });

  it('ships empty extension files as valid empty registries', () => {
    expect(registries.policies).toEqual([]);
    expect(registries.endowment).toEqual([]);
    expect(registries.visitors).toEqual([]);
    expect(registries.compendium).toEqual([]);
  });
});
