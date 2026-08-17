import { describe, expect, it } from 'vitest';

import {
  applyChoice,
  createIdleState,
  createLifeState,
  createRng,
  intendLens,
  residueLog,
  residueWindowId,
  simulateIdleTicks,
  summarizeResidue,
  windowSince,
} from '../';
import type { Choice, LifeState, Practice, SocialIdentity } from '../';
import type { DailySchedule } from '../schedule';
import type { ResidueEvent } from '../residue';

const IDENTITY: SocialIdentity = {
  gender: 'woman',
  social_class: 'merchant',
  family_wealth_at_birth: 'modest',
  caste_status: 'common',
  disability_status: 'none',
};

function makeLife(): LifeState {
  return createLifeState({
    id: 'life-1' as LifeState['id'],
    era: 'era-test@0.1.0' as LifeState['era'],
    role: 'role-test' as LifeState['role'],
    identity: IDENTITY,
  });
}

const ALL_DAY: DailySchedule = {
  id: 'all-day',
  name_sid: 'schedule.all_day.name',
  blocks: [
    {
      id: 'practice-block',
      label_sid: 'schedule.all_day.practice',
      startHour: 0,
      endHour: 24,
      practice_id: 'practice.test',
      icon_sid: 'icon.test',
    },
  ],
};

function makePractice(overrides: Partial<Practice> = {}): Practice {
  return {
    id: 'practice.test',
    label_sid: 'practice.test.label',
    description_sid: 'practice.test.desc',
    lens: 'joyful_effort',
    progressPerTick: 1,
    maxProgress: 10,
    currentProgress: 0,
    level: 0,
    effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
    ...overrides,
  };
}

describe('residue helpers', () => {
  it('treats a missing residue field as an empty log', () => {
    const life = makeLife();
    const stripped = { ...life };
    delete stripped.residue;
    expect(residueLog(stripped)).toEqual([]);
  });

  it('windows from afterIndex and ids a non-empty span', () => {
    const events: ResidueEvent[] = [
      { tick: 1, type: 'practice_tick', ids: ['a'], numbers: { progress: 1 } },
      { tick: 2, type: 'lens_chosen', ids: ['generosity'], numbers: {} },
      { tick: 3, type: 'event_resolved', ids: ['c1'], numbers: {} },
    ];
    expect(windowSince(events, 0)).toHaveLength(2);
    expect(residueWindowId(events)).toBe('w-1-3-3');
    expect(residueWindowId([])).toBe('w-empty');
  });

  it('summarizes dominant type with level-ups beating mere ticks', () => {
    const window: ResidueEvent[] = [
      { tick: 1, type: 'practice_tick', ids: ['p'], numbers: { progress: 4 } },
      { tick: 1, type: 'practice_tick', ids: ['p'], numbers: { progress: 4 } },
      { tick: 2, type: 'practice_level', ids: ['p'], numbers: {} },
    ];
    const summary = summarizeResidue(window);
    expect(summary.count).toBe(3);
    expect(summary.dominantType).toBe('practice_level');
    expect(summary.ids).toEqual(['p']);
  });
});

describe('residue emission', () => {
  it('stamps event_resolved on applyChoice and lens_chosen on intendLens', () => {
    const choice: Choice = {
      id: 'choice.probe',
      label_sid: 'choice.probe_sid',
      requires: [],
      effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
      forbidden: false,
    };
    const intended = intendLens(makeLife(), 'generosity');
    const after = applyChoice(intended, choice, createRng(1n));
    const types = residueLog(after).map((e) => e.type);
    expect(types).toEqual(['lens_chosen', 'event_resolved']);
    expect(residueLog(after)[1]?.ids).toEqual(['choice.probe']);
  });

  it('does not stamp residue when a choice is gated', () => {
    const choice: Choice = {
      id: 'choice.locked',
      label_sid: 'choice.locked_sid',
      requires: [{ op: 'has_flag', key: 'missing' }],
      effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
      forbidden: false,
    };
    const after = applyChoice(makeLife(), choice, createRng(1n));
    expect(residueLog(after)).toEqual([]);
  });

  it('aggregates practice ticks and level-ups from an idle batch', () => {
    const { state } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [makePractice({ progressPerTick: 5, maxProgress: 8, effects: [] })],
      4n,
      [],
      createRng(1n),
    );
    const types = residueLog(state).map((e) => e.type);
    expect(types).toContain('practice_tick');
    expect(types).toContain('practice_level');
    const tick = residueLog(state).find((e) => e.type === 'practice_tick');
    expect(tick?.numbers.progress).toBe(20);
  });

  it('stamps resource_edge only when a resource becomes zero', () => {
    const life = makeLife();
    life.resources.energy = 2;
    const { state } = simulateIdleTicks(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice({ effects: [{ op: 'add_resource', key: 'energy', delta: -1 }] })],
      2n,
      [],
      createRng(1n),
    );
    const edges = residueLog(state).filter((e) => e.type === 'resource_edge');
    expect(edges.some((e) => e.ids[0] === 'energy')).toBe(true);
    expect(edges.some((e) => e.ids[0] === 'skill')).toBe(false);
  });
});
