import { describe, expect, it } from 'vitest';

import {
  createIdleState,
  createLifeState,
  createStudioState,
  recordStudioResidues,
  snapshotStudioSession,
} from '@/engine';
import {
  clearStudioSession,
  createMemoryStudioKv,
  loadStudioSession,
  saveStudioSession,
} from '@/persistence';
import type { ResidueEvent } from '@/engine/residue';

function makeLife() {
  return createLifeState({
    id: 'studio-bench' as ReturnType<typeof createLifeState>['id'],
    era: 'studio-bench@0.1.0' as ReturnType<typeof createLifeState>['era'],
    role: 'operator' as ReturnType<typeof createLifeState>['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

describe('studio kv', () => {
  it('saves and loads a session through a memory backend', async () => {
    const kv = createMemoryStudioKv();
    const residue: ResidueEvent[] = [
      { tick: 1, type: 'practice_tick', ids: ['p'], numbers: { progress: 3 } },
    ];
    const session = snapshotStudioSession(
      recordStudioResidues(createStudioState(), residue),
      createIdleState(),
      makeLife(),
      [],
    );
    await saveStudioSession(session, kv);
    const loaded = await loadStudioSession(kv);
    expect(loaded?.benches['person']?.residue).toHaveLength(1);
    expect(loaded?.benches['person']?.residue[0]?.ids).toEqual(['p']);
  });

  it('returns null and clears a corrupt payload', async () => {
    const kv = createMemoryStudioKv({ 'yakshetra.studio.v0': '{not-json' });
    expect(await loadStudioSession(kv)).toBeNull();
    expect(await kv.get('yakshetra.studio.v0')).toBeUndefined();
  });

  it('clear removes the key', async () => {
    const kv = createMemoryStudioKv();
    const session = snapshotStudioSession(createStudioState(), createIdleState(), makeLife(), []);
    await saveStudioSession(session, kv);
    await clearStudioSession(kv);
    expect(await loadStudioSession(kv)).toBeNull();
  });
});
