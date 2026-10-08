import { describe, expect, it } from 'vitest';

import {
  createIdleState,
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

describe('play-bridge bench-field carry (wave-1 review #1)', () => {
  it('RED-GREEN: held traces, choice counters, and fold position survive a sync', async () => {
    const kv = createMemoryStudioKv();
    const intended = intendLens(makeLife('life-carry'), 'generosity');
    const after = applyChoice(intended, CHOICE, createRng(1n));
    const log = residueLog(after);

    // Seed a bench with a hold-back, counters, and fold progress.
    const seedStudio = {
      ...createStudioState(),
      held_residue: [1],
      cook_choices: { long: 2, holdback: 3 },
    };
    const bench = snapshotStudioSession(seedStudio, createIdleState(), after, []);
    await saveStudioSession(bench, kv);

    const synced = await syncPlayResidueToStudio(after.id, log, kv);
    expect(synced.held_residue).toEqual([1]);
    expect(synced.cook_choices).toEqual({ long: 2, holdback: 3 });

    const saved = await loadStudioSession(kv);
    expect(saved?.benches['person']?.held_residue).toEqual([1]);
    expect(saved?.benches['person']?.cook_choices).toEqual({ long: 2, holdback: 3 });
    expect(saved?.benches['person']?.fold_position).toBe(
      bench.benches['person']?.fold_position ?? 0,
    );

    // Guard by construction: EVERY field the loaded bench carries survives
    // the sync unless the bridge intentionally overrides it. If BenchSchema
    // grows a field, this fails until the spread carries it (it will) — the
    // old field-listing literal is what dropped three fields at once.
    const before = bench.benches['person'];
    const afterBench = saved?.benches['person'];
    if (before === undefined || afterBench === undefined) {
      throw new Error('expected benches');
    }
    const overridden = new Set([
      'residue',
      'last_harvest_index',
      'bay',
      'quality_tier',
      'harvest_count',
      'play_import',
      'pinned',
      'surplus',
    ]);
    for (const key of Object.keys(before)) {
      if (overridden.has(key)) {
        continue;
      }
      expect(afterBench, `field ${key} must survive the sync`).toHaveProperty(
        key,
        before[key as keyof typeof before],
      );
    }
  });
});
