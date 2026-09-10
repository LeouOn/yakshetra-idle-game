import { describe, expect, it } from 'vitest';

import {
  MIN_RESIDUE_TO_DEVELOP,
  STUDIO_AWAY_TICK_CAP,
  STUDIO_SECONDS_PER_TICK,
  catchUpSession,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  parseStudioSession,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
} from '../';
import type { LifeState, Practice } from '../';
import type { SessionStepContext } from '../session-step';
import { createTierState } from '../tier-state';
import type { DailySchedule } from '../schedule';
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

const SIX: Practice[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((name) => ({
  id: `practice:${name}`,
  label_sid: 'p_sid',
  description_sid: 'd_sid',
  lens: 'joyful_effort',
  progressPerTick: 1,
  maxProgress: 1000,
  currentProgress: 0,
  level: 0,
  effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
}));

const SIX_SCHEDULE: DailySchedule = {
  id: 'six-blocks',
  name_sid: 's_sid',
  blocks: SIX.map((practice, i) => ({
    id: `b${i}`,
    label_sid: 'b_sid',
    startHour: i * 4,
    endHour: i * 4 + 4,
    practice_id: practice.id,
    icon_sid: 'i_sid',
  })),
};

function events(n: number): ResidueEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    tick: i + 1,
    type: 'practice_tick' as const,
    ids: ['practice.test'],
    numbers: { progress: 1 },
  }));
}

function personSession(lastVisitedAtUnix: number) {
  return snapshotStudioSession(
    createStudioState(),
    createIdleState(),
    makeLife(),
    SIX,
    lastVisitedAtUnix,
  );
}

const PERSON_CTX: SessionStepContext = {
  practices: SIX,
  embodiedSchedule: SIX_SCHEDULE,
  memberScheduleFor: () => {
    throw new Error('no members');
  },
  memberPracticesFor: () => {
    throw new Error('no members');
  },
  endings: [],
  sessionSeed: 'catchup-test',
  tiers: [],
};

const HOUSEHOLD_CTX: SessionStepContext = {
  ...PERSON_CTX,
  tiers: [{ id: 'household', scale: 'household', fold_cadence: 4 }],
};

function householdSession(unlocked: boolean, lastVisitedAtUnix: number) {
  return snapshotStudioSession(
    createStudioState(),
    createIdleState(),
    makeLife(),
    SIX,
    lastVisitedAtUnix,
    {
      tiers: {
        person: createTierState('person', true),
        household: createTierState('household', unlocked),
      },
      milestones_done: [],
      compendium_done: [],
      embodied_member: null,
    },
  );
}

describe('catchUpSession', () => {
  it('is a no-op when last_visited is missing or not a full tick later', () => {
    const fresh = snapshotStudioSession(createStudioState(), createIdleState(), makeLife(), SIX);
    const none = catchUpSession(fresh, PERSON_CTX, 1_000_000, createRng(1n));
    expect(none.session).toBe(fresh);
    expect(none.summary.embodiedTicks).toBe(0);

    const session = personSession(1_000);
    const short = catchUpSession(session, PERSON_CTX, 1_030, createRng(1n));
    expect(short.session).toBe(session);
    expect(short.summary.embodiedTicks).toBe(0);
  });

  it('advances idle and stamps last_visited so a second call cannot duplicate', () => {
    const last = 1_000;
    const now = last + 24 * STUDIO_SECONDS_PER_TICK;
    const first = catchUpSession(personSession(last), PERSON_CTX, now, createRng(2n));
    expect(first.summary.embodiedTicks).toBe(24);
    expect(first.summary.capped).toBe(false);
    expect(first.session.last_visited_at_unix).toBe(now);
    expect(first.session.idle.last_simulated_tick).toBe('24');
    expect(first.session.life.turn).toBe(24);

    const second = catchUpSession(first.session, PERSON_CTX, now, createRng(2n));
    expect(second.summary.embodiedTicks).toBe(0);
    expect(second.session).toBe(first.session);
    expect(second.session.life.turn).toBe(24);
    expect(second.session.life.residue).toEqual(first.session.life.residue);
  });

  it('caps a long absence at STUDIO_AWAY_TICK_CAP by default', () => {
    const last = 1;
    const now = last + (STUDIO_AWAY_TICK_CAP + 80) * STUDIO_SECONDS_PER_TICK;
    const out = catchUpSession(personSession(last), PERSON_CTX, now, createRng(3n));
    expect(out.summary.embodiedTicks).toBe(STUDIO_AWAY_TICK_CAP);
    expect(out.summary.capped).toBe(true);
    expect(out.session.last_visited_at_unix).toBe(now);
  });

  it('honors a raised away cap from endowment-style callers', () => {
    const cap = 300;
    const last = 1;
    const now = last + 250 * STUDIO_SECONDS_PER_TICK;
    const out = catchUpSession(personSession(last), PERSON_CTX, now, createRng(4n), cap);
    expect(out.summary.embodiedTicks).toBe(250);
    expect(out.summary.capped).toBe(false);
  });

  it('finishes a cooking person bay to ready and does not harvest it', () => {
    let studio = recordStudioResidues(createStudioState(), events(MIN_RESIDUE_TO_DEVELOP));
    studio = queueDevelop(studio, null, createRng(9n));
    const needed = studio.bay?.cook_ticks_total ?? 0;
    const session = snapshotStudioSession(studio, createIdleState(), makeLife(), SIX, 1_000);
    const now = 1_000 + needed * STUDIO_SECONDS_PER_TICK;
    const out = catchUpSession(session, PERSON_CTX, now, createRng(9n));
    expect(out.session.benches['person']?.bay?.status).toBe('ready');
    expect(out.session.archive).toHaveLength(0);
    expect(out.summary.benchesReady).toEqual(['person']);
  });

  it('keeps an already-ready bay ready across catch-up', () => {
    let studio = recordStudioResidues(createStudioState(), events(MIN_RESIDUE_TO_DEVELOP));
    studio = queueDevelop(studio, null, createRng(11n));
    const total = studio.bay?.cook_ticks_total ?? 0;
    studio = {
      ...studio,
      bay: studio.bay === null ? null : { ...studio.bay, cook_ticks_done: total, status: 'ready' },
    };
    const session = snapshotStudioSession(studio, createIdleState(), makeLife(), SIX, 1_000);
    const out = catchUpSession(
      session,
      PERSON_CTX,
      1_000 + 40 * STUDIO_SECONDS_PER_TICK,
      createRng(11n),
    );
    expect(out.session.benches['person']?.bay?.status).toBe('ready');
    expect(out.session.archive).toHaveLength(0);
    expect(out.session.benches['person']?.harvest_count).toBe(0);
  });

  it('reloading a stamped session does not duplicate the absence', () => {
    const last = 5_000;
    const now = last + 18 * STUDIO_SECONDS_PER_TICK;
    const first = catchUpSession(personSession(last), PERSON_CTX, now, createRng(12n));
    const reloaded = parseStudioSession(JSON.parse(JSON.stringify(first.session)) as unknown);
    expect(reloaded.last_visited_at_unix).toBe(now);
    expect(reloaded.benches['person']?.residue).toEqual(first.session.benches['person']?.residue);
    const again = catchUpSession(reloaded, PERSON_CTX, now, createRng(12n));
    expect(again.summary.embodiedTicks).toBe(0);
    expect(again.session.life.turn).toBe(first.session.life.turn);
    expect(again.session.life.residue).toEqual(first.session.life.residue);
  });

  it('produces on an unlocked household rung and skips a locked one', () => {
    const last = 2_000;
    const now = last + 24 * STUDIO_SECONDS_PER_TICK;
    const unlocked = catchUpSession(
      householdSession(true, last),
      HOUSEHOLD_CTX,
      now,
      createRng(13n),
    );
    const household = unlocked.session.benches['household'];
    expect(household).toBeDefined();
    expect(household?.residue.some((event) => event.ids.includes('bench:person'))).toBe(true);

    const locked = catchUpSession(
      householdSession(false, last),
      HOUSEHOLD_CTX,
      now,
      createRng(13n),
    );
    expect('household' in locked.session.benches).toBe(false);
    expect(locked.session.life.turn).toBe(unlocked.session.life.turn);
  });
});
