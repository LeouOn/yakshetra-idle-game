import { describe, expect, it } from 'vitest';

import {
  canonicalStringify,
  computeOfflineSummary,
  createIdleState,
  createLifeState,
  formatOfflineSummary,
} from '../';
import type { Ending, LifeState, Practice, SocialIdentity } from '../';
import type { CalendarEpoch } from '../calendar';
import type { DailySchedule } from '../schedule';

const SEED = 0x12345678_9abcdef0_deadbeef_cafebaben;

const IDENTITY: SocialIdentity = {
  gender: 'woman',
  social_class: 'merchant',
  family_wealth_at_birth: 'modest',
  caste_status: 'common',
  disability_status: 'none',
};

const EPOCH: CalendarEpoch = { year: 800, month: 1, day: 1, hour: 0 };

function makeLife(overrides: Partial<LifeState> = {}): LifeState {
  const base = createLifeState({
    id: 'life-1' as LifeState['id'],
    era: 'era-test@0.1.0' as LifeState['era'],
    role: 'role-test' as LifeState['role'],
    identity: IDENTITY,
  });
  return { ...base, ...overrides, identity: IDENTITY };
}

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

describe('computeOfflineSummary — elapsed time → ticks', () => {
  it('converts 3 hours of elapsed wall-clock to 3 idle ticks', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      3 * 3600,
      SEED,
    );
    expect(summary.idleTicksSimulated).toBe(3n);
  });

  it('stamps lastVisitedAtUnix on the returned state so the next catch-up starts fresh', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const { state } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      7200,
      SEED,
    );
    expect(state.lastVisitedAtUnix).toBe(7200);
  });
});

describe('computeOfflineSummary — zero elapsed', () => {
  it('returns an empty summary and unchanged idle counters when no time passed', () => {
    const life = makeLife({ lastVisitedAtUnix: 1000 });
    const idle = createIdleState();
    const { summary, idle: afterIdle } = computeOfflineSummary(
      life,
      idle,
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      1000,
      SEED,
    );
    expect(summary.idleTicksSimulated).toBe(0n);
    expect(summary.resourcesGained).toEqual({});
    expect(summary.practicesAdvanced).toEqual([]);
    expect(summary.eventsTriggered).toEqual([]);
    expect(summary.endingTriggered).toBeNull();
    expect(afterIdle).toBe(idle);
    expect(summary.calendarBefore).toEqual(summary.calendarAfter);
  });

  it('treats sub-hour elapsed (59 minutes) as zero ticks', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      59 * 60,
      SEED,
    );
    expect(summary.idleTicksSimulated).toBe(0n);
  });

  it('clamps clock-skew (nowUnix before lastVisited) to zero ticks without throwing', () => {
    const life = makeLife({ lastVisitedAtUnix: 5000 });
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      1000,
      SEED,
    );
    expect(summary.idleTicksSimulated).toBe(0n);
  });
});

describe('computeOfflineSummary — resources gained', () => {
  it('aggregates add_resource deltas across the simulated span', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const practice = makePractice({
      effects: [{ op: 'add_resource', key: 'energy', delta: 2 }],
    });
    const { summary, state } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [practice],
      [],
      EPOCH,
      3 * 3600,
      SEED,
    );
    expect(summary.resourcesGained.energy).toBe(6);
    expect(state.resources.energy ?? 0).toBe(100 + 6);
  });
});

describe('computeOfflineSummary — practice advancement', () => {
  it('reports progress gained and a level-up when progress crosses maxProgress', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const practice = makePractice({ progressPerTick: 4, maxProgress: 10, effects: [] });
    // 3 ticks * 4 progress = 12 → one level-up, 2 carried.
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [practice],
      [],
      EPOCH,
      3 * 3600,
      SEED,
    );
    const adv = summary.practicesAdvanced[0];
    expect(adv?.progressGained).toBe(12);
    expect(adv?.leveledUp).toBe(true);
  });
});

describe('computeOfflineSummary — ending trigger', () => {
  it('halts on the first matching ending and reports only the simulated ticks', () => {
    const ending: Ending = {
      id: 'ending:time-low',
      trigger: { op: 'lte', key: 'time', value: 95 },
      narrative_sid: 'ending.time_low.sid',
      echo_implications: {},
    };
    // time starts at 100, -1/tick → reaches 95 after exactly 5 ticks. We allow
    // 24 hours (24 ticks) of elapsed wall-clock; the ending must halt at tick 5.
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice({ effects: [] })],
      [ending],
      EPOCH,
      24 * 3600,
      SEED,
    );
    expect(summary.endingTriggered).toBe('ending:time-low');
    expect(summary.idleTicksSimulated).toBe(5n);
  });

  it('brackets the summary with calendarBefore/calendarAfter around the simulated tick', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice({ effects: [] })],
      [],
      EPOCH,
      2 * 3600,
      SEED,
    );
    expect(summary.calendarBefore.tick).toBe(0n);
    expect(summary.calendarAfter.tick).toBe(2n);
    expect(summary.calendarAfter.hour).toBe(2);
  });
});

describe('computeOfflineSummary — determinism', () => {
  it('produces byte-identical summaries for identical inputs across two runs', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const run1 = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      5 * 3600,
      SEED,
    );
    const run2 = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      5 * 3600,
      SEED,
    );
    expect(canonicalStringify(run1.summary)).toBe(canonicalStringify(run2.summary));
    expect(canonicalStringify(run1.state)).toBe(canonicalStringify(run2.state));
    expect(canonicalStringify(run1.idle)).toBe(canonicalStringify(run2.idle));
  });

  it('does not mutate the input state (lastVisitedAtUnix read-only on the caller copy)', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      3600,
      SEED,
    );
    expect(life.lastVisitedAtUnix).toBe(0);
  });
});

describe('formatOfflineSummary', () => {
  it('renders a no-time-passed welcome for zero ticks', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      [],
      EPOCH,
      0,
      SEED,
    );
    expect(formatOfflineSummary(summary)).toBe('Welcome back. No time has passed.');
  });

  it('renders resources, level-ups, and era name for a non-empty summary', () => {
    const life = makeLife({ lastVisitedAtUnix: 0 });
    const practice = makePractice({
      progressPerTick: 5,
      maxProgress: 3,
      effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
    });
    const { summary } = computeOfflineSummary(
      life,
      createIdleState(),
      ALL_DAY,
      [practice],
      [],
      EPOCH,
      25 * 3600,
      SEED,
    );
    const text = formatOfflineSummary(summary, 'Tang Dynasty');
    expect(text).toContain('1 day');
    expect(text).toContain('in the Tang Dynasty');
    expect(text).toContain('skill +');
    expect(text).toContain('Practices levelled up');
  });
});
