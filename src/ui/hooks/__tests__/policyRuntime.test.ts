import { describe, expect, it } from 'vitest';

import { policyRuntime, registries } from '../useStudioSession';

// The roster policies are authored against the Tang pack: their schedules and practices exist
// nowhere else. A bench in another era must not throw, so it falls back policy by policy.
describe('policyRuntime', () => {
  const policies = registries().policies;

  it('resolves every roster policy for a Tang bench', () => {
    const tang = policyRuntime('tang-china');
    expect(tang.size).toBe(policies.length);
    for (const policy of policies) {
      expect(tang.get(policy.id)?.schedule.id, policy.id).toBe(policy.schedule_ref);
      expect(
        tang.get(policy.id)?.practices.map((p) => p.id),
        policy.id,
      ).toEqual(policy.practices);
    }
  });

  it('a Garden bench keeps the roster running on the Tang policies (the documented gap)', () => {
    // This pins TODAY's behaviour on purpose: the Garden pack carries none of these schedules or
    // practices. When per-era policy content lands, this is the test that should change.
    const garden = policyRuntime('fantasy-mahayana');
    const tang = policyRuntime('tang-china');
    expect(garden.size).toBe(policies.length);
    for (const policy of policies) {
      expect(garden.get(policy.id)?.schedule.id, policy.id).toBe(tang.get(policy.id)?.schedule.id);
    }
  });

  it('an unknown era also falls back instead of throwing, and is cached per era', () => {
    expect(() => policyRuntime('atlantis')).not.toThrow();
    expect(policyRuntime('fantasy-mahayana')).toBe(policyRuntime('fantasy-mahayana'));
  });
});
