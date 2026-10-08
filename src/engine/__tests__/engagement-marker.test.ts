// Engagement markers on practice-tick residue (wave 1b, lane b1).
//
// SPEC §6: "Several distinct ids plus an engagement marker → person." The
// marker existed only as lens_chosen (player lens pick) and event_resolved
// (campaign choices) — a studio player who tends social-family practices
// (generosity, beings) could never produce one without buying tea. These
// tests pin the new emission: a practice whose activity family is social
// carries an `engagement:<practiceId>` id on its practice_tick residue, and
// no other event changes shape.
import { describe, expect, it } from 'vitest';

import { simulateIdleTicks } from '@/engine/idle';
import { createIdleState, createLifeState, createRng } from '@/engine';
import type { DailySchedule } from '@/engine/schedule';
import type { LifeState, Practice } from '@/engine';

function life(): LifeState {
  return createLifeState({
    id: 'test-life' as LifeState['id'],
    era: 'test@0.1.0' as LifeState['era'],
    role: 'tester' as LifeState['role'],
    identity: {
      gender: 'unspecified',
      social_class: 'tester',
      family_wealth_at_birth: 'unspecified',
      caste_status: 'none',
      disability_status: 'none',
    },
  });
}

function practice(id: string, lens: Practice['lens']): Practice {
  return {
    id,
    label_sid: 'test.label_sid',
    description_sid: 'test.description_sid',
    lens,
    progressPerTick: 1,
    maxProgress: 100,
    currentProgress: 0,
    level: 0,
    effects: [],
  };
}

const allDay = (practiceId: string): DailySchedule => ({
  id: 'test-schedule',
  name_sid: 'test.schedule_sid',
  blocks: [
    {
      id: 'test-block',
      label_sid: 'test.label_sid',
      startHour: 0,
      endHour: 24,
      practice_id: practiceId,
      icon_sid: 'test.label_sid',
    },
  ],
});

describe('engagement markers on practice-tick residue', () => {
  it('stamps an engagement id on a generosity-family practice tick', () => {
    const { state } = simulateIdleTicks(
      life(),
      createIdleState(),
      allDay('practice:tang/extra-bowl'),
      [practice('practice:tang/extra-bowl', 'generosity')],
      2n,
      [],
      createRng(1n),
    );
    const tickEvent = (state.residue ?? []).find((event) => event.type === 'practice_tick');
    expect(tickEvent?.ids).toEqual([
      'practice:tang/extra-bowl',
      'engagement:practice:tang/extra-bowl',
    ]);
  });

  it('stamps an engagement id on a beings-family (careful_conduct) practice tick', () => {
    const { state } = simulateIdleTicks(
      life(),
      createIdleState(),
      allDay('practice:tang/courtyard-beings'),
      [practice('practice:tang/courtyard-beings', 'careful_conduct')],
      2n,
      [],
      createRng(1n),
    );
    const tickEvent = (state.residue ?? []).find((event) => event.type === 'practice_tick');
    expect(tickEvent?.ids).toContain('engagement:practice:tang/courtyard-beings');
  });

  it('leaves non-social practice ticks unmarked (one id, as before)', () => {
    const { state } = simulateIdleTicks(
      life(),
      createIdleState(),
      allDay('practice:tang/sutra-copying'),
      [practice('practice:tang/sutra-copying', 'joyful_effort')],
      2n,
      [],
      createRng(1n),
    );
    const tickEvent = (state.residue ?? []).find((event) => event.type === 'practice_tick');
    expect(tickEvent?.ids).toEqual(['practice:tang/sutra-copying']);
  });

  it('marks a beings-family practice on the fantasy pack too', () => {
    const { state } = simulateIdleTicks(
      life(),
      createIdleState(),
      allDay('practice:fantasy/court-attendant-rounds'),
      [practice('practice:fantasy/court-attendant-rounds', 'careful_conduct')],
      2n,
      [],
      createRng(1n),
    );
    const tickEvent = (state.residue ?? []).find((event) => event.type === 'practice_tick');
    expect(tickEvent?.ids).toContain('engagement:practice:fantasy/court-attendant-rounds');
  });
});
