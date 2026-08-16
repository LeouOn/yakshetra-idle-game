import { describe, expect, it } from 'vitest';

import {
  createLifeState,
  createRng,
  createStudioState,
  createTierState,
  intendLens,
  applyChoice,
  residueLog,
  snapshotStudioSession,
  tableFillManifest,
} from '@/engine';
import type { Choice, LifeState, ResidueEvent } from '@/engine';
import {
  createMemoryStudioKv,
  loadStudioSession,
  saveStudioSession,
  syncPlayResidueToStudio,
} from '@/persistence';

function makeLife(id: string): LifeState {
  return createLifeState({
    id: id as LifeState['id'],
    era: 'era-test@0.1.0' as LifeState['era'],
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

const CHOICE: Choice = {
  id: 'choice.play',
  label_sid: 'choice.play_sid',
  requires: [],
  effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
  forbidden: false,
};

describe('syncPlayResidueToStudio', () => {
  it('creates a session and charges the bench from play, without double-import', async () => {
    const kv = createMemoryStudioKv();
    const intended = intendLens(makeLife('life-play'), 'generosity');
    const after = applyChoice(intended, CHOICE, createRng(1n));
    const log = residueLog(after);

    const first = await syncPlayResidueToStudio(after.id, log, kv);
    expect(first.residue).toHaveLength(2);
    expect(first.play_import?.life_id).toBe('life-play');

    const second = await syncPlayResidueToStudio(after.id, log, kv);
    expect(second.residue).toHaveLength(2);

    const saved = await loadStudioSession(kv);
    expect(saved?.benches['person']?.residue).toHaveLength(2);
    expect(saved?.benches['person']?.play_import?.index).toBe(1);
  });

  it('preserves archive and progression state through a sync', async () => {
    const social: readonly ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    ];
    const card = tableFillManifest(social, null, 0, createRng(11n), '11', 'm-person-seed');

    const intended = intendLens(makeLife('life-a'), 'generosity');
    const after = applyChoice(intended, CHOICE, createRng(1n));
    const log = residueLog(after);

    const seededStudio = { ...createStudioState(), archive: [card] };
    const seededSession = snapshotStudioSession(
      seededStudio,
      { mode: 'idle', lastSimulatedTick: 0n, totalIdleTicks: 0n },
      after,
      [],
      undefined,
      {
        tiers: { person: createTierState('person', true) },
        milestones_done: ['unlock-household'],
        compendium_done: [],
        embodied_member: null,
      },
    );

    const kv = createMemoryStudioKv();
    await saveStudioSession(seededSession, kv);

    await syncPlayResidueToStudio('life-a', log, kv);

    const saved = await loadStudioSession(kv);
    expect(saved?.archive).toHaveLength(1);
    expect(saved?.archive[0]?.id).toBe('m-person-seed');
    expect(saved?.milestones_done).toEqual(['unlock-household']);
    expect(saved?.benches['person']?.residue.length).toBeGreaterThanOrEqual(log.length);
    expect(saved?.benches['person']?.play_import).toEqual({
      life_id: 'life-a',
      index: log.length - 1,
    });
  });
});
