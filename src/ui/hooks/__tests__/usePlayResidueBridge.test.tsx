import { describe, expect, it } from 'vitest';
import { createElement } from 'react';

import { createLifeState, type LifeState } from '@/engine';
import { createMemoryStudioKv, loadStudioSession, type StudioKv } from '@/persistence';
import { act, render } from '@/test/rntl';

import { usePlayResidueBridge } from '../usePlayResidueBridge';

function lifeIn(era: string): LifeState {
  return createLifeState({
    id: 'life-bridge' as LifeState['id'],
    era: era as LifeState['era'],
    role: 'role-test' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

function Probe({ state, kv }: { readonly state: LifeState; readonly kv: StudioKv }) {
  usePlayResidueBridge(state, true, kv);
  return null;
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('usePlayResidueBridge era', () => {
  it.each(['tang-china', 'fantasy-mahayana'])('a %s life sets the bench era', async (era) => {
    const kv = createMemoryStudioKv();
    render(createElement(Probe, { state: lifeIn(era), kv }));
    await settle();
    expect((await loadStudioSession(kv))?.bench_era).toBe(era);
  });

  it.each(['era-test@0.1.0', 'studio-bench@0.1.0', 'roster@0.1.0'])(
    'a build-internal era token (%s) records no bench era',
    async (token) => {
      const kv = createMemoryStudioKv();
      render(createElement(Probe, { state: lifeIn(token), kv }));
      await settle();
      expect((await loadStudioSession(kv))?.bench_era).toBeUndefined();
    },
  );

  it('a real era is not overwritten by a later life that carries a token', async () => {
    const kv = createMemoryStudioKv();
    render(createElement(Probe, { state: lifeIn('fantasy-mahayana'), kv }));
    await settle();
    render(createElement(Probe, { state: lifeIn('era-test@0.1.0'), kv }));
    await settle();
    expect((await loadStudioSession(kv))?.bench_era).toBe('fantasy-mahayana');
  });
});
