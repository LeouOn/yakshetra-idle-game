// Bench schedule rotation (wave 1b, lane b1).
//
// The bench used to invent one static day from slice(0, 6) of the pack's
// practices; the pack's authored schedules (which carry the figure-bound
// practices) never ran. These tests pin the engine side: when the ctx carries
// embodiedSchedules, in-game day N runs schedules[N % length]; when it does
// not, the single embodiedSchedule runs every day, byte-identical to before.
import { describe, expect, it } from 'vitest';

import {
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  snapshotStudioSession,
  stepSession,
  type Practice,
  type SessionStepContext,
  type StudioSession,
} from '@/engine';
import type { DailySchedule } from '@/engine/schedule';

const practice = (id: string): Practice => ({
  id,
  label_sid: 'p_sid',
  description_sid: 'd_sid',
  lens: 'joyful_effort',
  progressPerTick: 1,
  maxProgress: 1000,
  currentProgress: 0,
  level: 0,
  effects: [],
});

const PRACTICES = [practice('practice:a'), practice('practice:b')];

const allDay = (practiceId: string, id: string): DailySchedule => ({
  id,
  name_sid: 's_sid',
  blocks: [
    {
      id: `${id}-block`,
      label_sid: 'b_sid',
      startHour: 0,
      endHour: 24,
      practice_id: practiceId,
      icon_sid: 'i_sid',
    },
  ],
});

const SCHEDULE_A = allDay('practice:a', 'day-a');
const SCHEDULE_B = allDay('practice:b', 'day-b');

function freshSession(): StudioSession {
  const life = createLifeState({
    id: 'test-life' as Parameters<typeof createLifeState>[0]['id'],
    era: 'test@0.1.0' as Parameters<typeof createLifeState>[0]['era'],
    role: 'tester' as Parameters<typeof createLifeState>[0]['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'tester',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
  const session = snapshotStudioSession(createStudioState(), createIdleState(), life, PRACTICES);
  return { ...session, benches: {} };
}

function ctx(embodiedSchedules?: readonly DailySchedule[]): SessionStepContext {
  return {
    practices: PRACTICES,
    embodiedSchedule: SCHEDULE_A,
    ...(embodiedSchedules === undefined ? {} : { embodiedSchedules }),
    memberScheduleFor: () => SCHEDULE_A,
    memberPracticesFor: () => PRACTICES,
    endings: [],
    sessionSeed: 'rotation-test',
    tiers: [],
  };
}

function personPracticeIds(session: StudioSession): string[] {
  const bench = session.benches.person;
  return (bench?.residue ?? [])
    .filter((event) => event.type === 'practice_tick')
    .flatMap((event) => event.ids.filter((id) => id.startsWith('practice:')));
}

describe('bench schedule rotation across in-game days', () => {
  it('day 0 runs the first schedule, day 1 the second, day 2 wraps', () => {
    let session = freshSession();
    session = stepSession(session, ctx([SCHEDULE_A, SCHEDULE_B]), 24, createRng(1n)).session;
    expect(personPracticeIds(session)).toEqual(['practice:a']);
    session = stepSession(session, ctx([SCHEDULE_A, SCHEDULE_B]), 24, createRng(1n)).session;
    expect(personPracticeIds(session)).toEqual(['practice:a', 'practice:b']);
    session = stepSession(session, ctx([SCHEDULE_A, SCHEDULE_B]), 24, createRng(1n)).session;
    expect(personPracticeIds(session)).toEqual(['practice:a', 'practice:b', 'practice:a']);
  });

  it("a batch crossing midnight splits at the boundary onto each day's schedule", () => {
    let session = freshSession();
    session = stepSession(session, ctx([SCHEDULE_A, SCHEDULE_B]), 20, createRng(1n)).session;
    expect(personPracticeIds(session)).toEqual(['practice:a']);
    // 8 ticks from tick 20: chunk 4 on day 0 (schedule A), 4 on day 1 (B).
    session = stepSession(session, ctx([SCHEDULE_A, SCHEDULE_B]), 8, createRng(1n)).session;
    expect(personPracticeIds(session)).toEqual(['practice:a', 'practice:a', 'practice:b']);
  });

  it('a 240-tick catch-up chunk runs all ten of its days, not one day ten times', () => {
    let session = freshSession();
    session = stepSession(session, ctx([SCHEDULE_A, SCHEDULE_B]), 240, createRng(1n)).session;
    const ids = personPracticeIds(session);
    // 10 days x 1 aggregated event per day per practice; both schedules ran.
    expect(ids.filter((id) => id === 'practice:a').length).toBeGreaterThan(0);
    expect(ids.filter((id) => id === 'practice:b').length).toBeGreaterThan(0);
    expect(session.idle.last_simulated_tick).toBe('240');
  });

  it('without embodiedSchedules the single embodiedSchedule runs every day', () => {
    let session = freshSession();
    for (let day = 0; day < 3; day += 1) {
      session = stepSession(session, ctx(), 24, createRng(1n)).session;
    }
    expect(personPracticeIds(session)).toEqual(['practice:a', 'practice:a', 'practice:a']);
  });
});
