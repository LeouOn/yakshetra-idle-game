import { describe, expect, it } from 'vitest';

import {
  createIdleState,
  createLifeState,
  createStudioState,
  parseStudioSession,
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

  it('round-trips last_visited, a ready bay, and idle counters', async () => {
    const kv = createMemoryStudioKv();
    const residue: ResidueEvent[] = [
      { tick: 1, type: 'practice_tick', ids: ['p'], numbers: { progress: 3 } },
    ];
    const session = snapshotStudioSession(
      recordStudioResidues(createStudioState(), residue),
      { mode: 'idle', lastSimulatedTick: 18n, totalIdleTicks: 18n },
      makeLife(),
      [],
      42_000,
    );
    const person = session.benches['person'];
    if (person === undefined) {
      throw new Error('expected person bench');
    }
    const withReady = parseStudioSession({
      ...session,
      benches: {
        ...session.benches,
        person: {
          ...person,
          last_harvest_index: 0,
          bay: {
            id: 'op-ready',
            type: 'develop_from_residue',
            residue_window_id: 'w-1-1-1',
            residue: residue.map((event) => ({
              ...event,
              ids: [...event.ids],
              numbers: { ...event.numbers },
            })),
            brief: null,
            cook_ticks_total: 7,
            cook_ticks_done: 7,
            status: 'ready',
            rng_seed: '1',
            focus: null,
          },
        },
      },
    });
    await saveStudioSession(withReady, kv);
    const loaded = await loadStudioSession(kv);
    expect(loaded?.last_visited_at_unix).toBe(42_000);
    expect(loaded?.idle.last_simulated_tick).toBe('18');
    expect(loaded?.benches['person']?.bay?.status).toBe('ready');
    expect(loaded?.benches['person']?.residue).toHaveLength(1);
  });

  it('clear removes the key', async () => {
    const kv = createMemoryStudioKv();
    const session = snapshotStudioSession(createStudioState(), createIdleState(), makeLife(), []);
    await saveStudioSession(session, kv);
    await clearStudioSession(kv);
    expect(await loadStudioSession(kv)).toBeNull();
  });
});
