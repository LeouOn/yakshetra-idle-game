import { describe, expect, it } from 'vitest';

import {
  MIN_RESIDUE_TO_DEVELOP,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  harvestTableFill,
  hydrateStudioSession,
  parseStudioSession,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
  tickStudio,
} from '../';
import type { LifeState, Practice } from '../';
import type { ResidueEvent } from '../residue';

function makeLife(): LifeState {
  return createLifeState({
    id: 'studio-bench' as LifeState['id'],
    era: 'studio-bench@0.1.0' as LifeState['era'],
    role: 'operator' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'operator',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

function makePractice(): Practice {
  return {
    id: 'practice.test',
    label_sid: 'p_sid',
    description_sid: 'd_sid',
    lens: 'joyful_effort',
    progressPerTick: 1,
    maxProgress: 10,
    currentProgress: 4,
    level: 2,
    effects: [],
  };
}

function events(n: number): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      tick: i + 1,
      type: 'practice_tick',
      ids: ['practice.test'],
      numbers: { progress: 2 },
    });
  }
  return out;
}

describe('studio session snapshot', () => {
  it('round-trips a harvested archive and practice progress', () => {
    let studio = recordStudioResidues(createStudioState(), events(MIN_RESIDUE_TO_DEVELOP));
    studio = queueDevelop(studio, 'a kept promise', createRng(3n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    const harvested = harvestTableFill(studio, createRng(3n));
    if (harvested === null) {
      throw new Error('expected harvest');
    }
    const life = { ...makeLife(), turn: 12, residue: events(2) };
    const idle = {
      ...createIdleState(),
      lastSimulatedTick: 24n,
      totalIdleTicks: 24n,
    };
    const snap = snapshotStudioSession(harvested.studio, idle, life, [makePractice()]);
    const again = parseStudioSession(JSON.parse(JSON.stringify(snap)) as unknown);
    const hydrated = hydrateStudioSession(again, makeLife(), [
      { ...makePractice(), currentProgress: 0, level: 0 },
    ]);
    expect(hydrated.studio.archive).toHaveLength(1);
    expect(hydrated.studio.archive[0]?.brief).toBe('a kept promise');
    expect(hydrated.idle.lastSimulatedTick).toBe(24n);
    expect(hydrated.life.turn).toBe(12);
    expect(hydrated.practices[0]?.level).toBe(2);
    expect(hydrated.practices[0]?.currentProgress).toBe(4);
  });

  it('rejects a payload with the wrong version', () => {
    expect(() => parseStudioSession({ schema_version: 'nope' })).toThrow();
  });
});
