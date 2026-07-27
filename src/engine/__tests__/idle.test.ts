import { describe, expect, it } from 'vitest';

import {
  advanceIdleTick,
  canonicalStringify,
  createIdleState,
  createLifeState,
  createRng,
  reduceIdleTick,
  simulateIdleTicks,
} from '../';
import type { Ending, IdleTickAction, LifeState, Practice, SocialIdentity } from '../';
import type { DailySchedule } from '../schedule';

const SEED = 0x12345678_9abcdef0_deadbeef_cafebaben;

const IDENTITY: SocialIdentity = {
  gender: 'woman',
  social_class: 'merchant',
  family_wealth_at_birth: 'modest',
  caste_status: 'common',
  disability_status: 'none',
};

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

const HALF_DAY: DailySchedule = {
  id: 'half-day',
  name_sid: 'schedule.half_day.name',
  blocks: [
    {
      id: 'practice-block',
      label_sid: 'schedule.half_day.practice',
      startHour: 0,
      endHour: 12,
      practice_id: 'practice.test',
      icon_sid: 'icon.test',
    },
    {
      id: 'rest-block',
      label_sid: 'schedule.half_day.rest',
      startHour: 12,
      endHour: 24,
      practice_id: null,
      icon_sid: 'icon.moon',
    },
  ],
};

describe('createIdleState', () => {
  it('starts at tick 0 in idle mode with zero cumulative ticks', () => {
    const idle = createIdleState();
    expect(idle.mode).toBe('idle');
    expect(idle.lastSimulatedTick).toBe(0n);
    expect(idle.totalIdleTicks).toBe(0n);
  });
});

describe('advanceIdleTick', () => {
  it('increments turn, decrements time (clamped), and clones Sets without era rules', () => {
    const life = makeLife();
    const next = advanceIdleTick(life);
    expect(next.turn).toBe(life.turn + 1);
    expect(next.resources.time ?? 0).toBe((life.resources.time ?? 0) - 1);
    expect(next.flags).not.toBe(life.flags);
    expect(next.fired_once_per_run).not.toBe(life.fired_once_per_run);
  });
});

describe('simulateIdleTicks — basic progression', () => {
  it('accumulates progress by progressPerTick for each active tick', () => {
    const { result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [makePractice({ progressPerTick: 1, maxProgress: 100, effects: [] })],
      5n,
      [],
      createRng(SEED),
    );
    expect(result.ticksSimulated).toBe(5n);
    expect(result.practicesAdvanced[0]?.progressGained).toBe(5);
    expect(result.practicesAdvanced[0]?.leveledUp).toBe(false);
  });

  it('folds practice effects each tick (skill +1 over 3 ticks = +3 in state and report)', () => {
    const { state, result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [makePractice()],
      3n,
      [],
      createRng(SEED),
    );
    expect(state.resources.skill ?? 0).toBe(3);
    expect(result.resourcesGained.skill).toBe(3);
  });

  it('skips practice progress during a rest block (half-day boundary at hour 12)', () => {
    // ticks 1..11 land in the practice block (hours 1..11); ticks 12..13 are rest.
    const { result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      HALF_DAY,
      [makePractice({ progressPerTick: 1, effects: [] })],
      13n,
      [],
      createRng(SEED),
    );
    expect(result.practicesAdvanced[0]?.progressGained).toBe(11);
  });

  it('collects event ids emitted by trigger_event effects', () => {
    const practice = makePractice({
      effects: [{ op: 'trigger_event', event_id: 'e_dawn_bell' }],
    });
    const { result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [practice],
      3n,
      [],
      createRng(SEED),
    );
    expect(result.eventsTriggered).toEqual(['e_dawn_bell', 'e_dawn_bell', 'e_dawn_bell']);
  });
});

describe('simulateIdleTicks — level-ups', () => {
  it('levels up once when progress crosses maxProgress', () => {
    const practice = makePractice({ progressPerTick: 3, maxProgress: 10, effects: [] });
    const { result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [practice],
      4n,
      [],
      createRng(SEED),
    );
    expect(result.practicesAdvanced[0]?.progressGained).toBe(12);
    expect(result.practicesAdvanced[0]?.leveledUp).toBe(true);
  });

  it('levels up multiple times when progress spans several maxProgress units', () => {
    const practice = makePractice({ progressPerTick: 5, maxProgress: 3, effects: [] });
    const { result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [practice],
      2n,
      [],
      createRng(SEED),
    );
    // 2 ticks * 5 = 10 progress; maxProgress 3 → 3 level-ups (9 consumed), 1 carried.
    expect(result.practicesAdvanced[0]?.progressGained).toBe(10);
    expect(result.practicesAdvanced[0]?.leveledUp).toBe(true);
  });
});

describe('simulateIdleTicks — ending trigger', () => {
  it('halts on the first matching ending and reports only the ticks processed', () => {
    const ending: Ending = {
      id: 'ending:time-low',
      trigger: { op: 'lte', key: 'time', value: 95 },
      narrative_sid: 'ending.time_low.sid',
      echo_implications: {},
    };
    // time starts at 100, -1/tick → reaches 95 after exactly 5 ticks.
    const { result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [makePractice({ effects: [] })],
      20n,
      [ending],
      createRng(SEED),
    );
    expect(result.endingTriggered).toBe('ending:time-low');
    expect(result.ticksSimulated).toBe(5n);
  });

  it('returns null endingTriggered when no ending matches', () => {
    const ending: Ending = {
      id: 'ending:never',
      trigger: { op: 'gt', key: 'time', value: 1000 },
      narrative_sid: 'ending.never.sid',
      echo_implications: {},
    };
    const { result } = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [makePractice({ effects: [] })],
      3n,
      [ending],
      createRng(SEED),
    );
    expect(result.endingTriggered).toBeNull();
  });
});

describe('simulateIdleTicks — determinism', () => {
  it('produces byte-identical state for identical seed and inputs across two runs', () => {
    const practice = makePractice({
      progressPerTick: 2,
      effects: [{ op: 'add_resource', key: 'energy', delta: 1 }],
    });
    const run1 = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [practice],
      10n,
      [],
      createRng(SEED),
    );
    const run2 = simulateIdleTicks(
      makeLife(),
      createIdleState(),
      ALL_DAY,
      [practice],
      10n,
      [],
      createRng(SEED),
    );
    expect(canonicalStringify(run1.state)).toBe(canonicalStringify(run2.state));
    expect(canonicalStringify(run1.idle)).toBe(canonicalStringify(run2.idle));
    expect(run1.result.practicesAdvanced[0]?.progressGained).toBe(
      run2.result.practicesAdvanced[0]?.progressGained,
    );
  });
});

describe('simulateIdleTicks — immutability', () => {
  it('does not mutate the input state, idle, or practice', () => {
    const life = makeLife();
    const idle = createIdleState();
    const practice = makePractice();
    const beforeTurn = life.turn;
    const beforeTime = life.resources.time ?? 0;
    const beforeFlags = life.flags;
    const beforeIdleTick = idle.lastSimulatedTick;
    const beforeProgress = practice.currentProgress;

    simulateIdleTicks(life, idle, ALL_DAY, [practice], 5n, [], createRng(SEED));

    expect(life.turn).toBe(beforeTurn);
    expect(life.resources.time ?? 0).toBe(beforeTime);
    expect(life.flags).toBe(beforeFlags);
    expect(idle.lastSimulatedTick).toBe(beforeIdleTick);
    expect(practice.currentProgress).toBe(beforeProgress);
  });

  it('accumulates totalIdleTicks across successive simulate calls', () => {
    let idle = createIdleState();
    const life = makeLife();
    const practice = makePractice({ effects: [] });
    const r1 = simulateIdleTicks(life, idle, ALL_DAY, [practice], 4n, [], createRng(SEED));
    idle = r1.idle;
    const r2 = simulateIdleTicks(r1.state, idle, ALL_DAY, [practice], 6n, [], createRng(SEED));
    expect(r1.idle.totalIdleTicks).toBe(4n);
    expect(r2.idle.totalIdleTicks).toBe(10n);
    expect(r2.idle.lastSimulatedTick).toBe(10n);
  });
});

describe('reduceIdleTick (IDLE_TICK action)', () => {
  it('dispatches through simulateIdleTicks and applies practice effects', () => {
    const action: IdleTickAction = {
      type: 'IDLE_TICK',
      ticks: 3n,
      schedule: ALL_DAY,
      practices: [makePractice({ effects: [{ op: 'add_resource', key: 'skill', delta: 2 }] })],
      endings: [],
      rng: createRng(SEED),
    };
    const { state, result } = reduceIdleTick(makeLife(), createIdleState(), action);
    expect(result.ticksSimulated).toBe(3n);
    expect(state.resources.skill ?? 0).toBe(6);
  });
});
