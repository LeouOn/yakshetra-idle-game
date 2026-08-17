import { describe, expect, it } from 'vitest';

import {
  MIN_RESIDUE_TO_DEVELOP,
  STUDIO_AWAY_TICK_CAP,
  catchUpStudio,
  createIdleState,
  createLifeState,
  createRng,
  createStudioState,
  queueDevelop,
  recordStudioResidues,
  studioTicksAway,
} from '../';
import type { LifeState, Practice } from '../';
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

function makePractice(): Practice {
  return {
    id: 'practice.test',
    label_sid: 'p_sid',
    description_sid: 'd_sid',
    lens: 'joyful_effort',
    progressPerTick: 1,
    maxProgress: 10,
    currentProgress: 0,
    level: 0,
    effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
  };
}

const ALL_DAY: DailySchedule = {
  id: 'all-day',
  name_sid: 'studio.title_sid',
  blocks: [
    {
      id: 'all',
      label_sid: 'studio.tend_button_sid',
      startHour: 0,
      endHour: 24,
      practice_id: 'practice.test',
      icon_sid: 'studio.title_sid',
    },
  ],
};

function residue(n: number): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      tick: i + 1,
      type: 'practice_tick',
      ids: ['practice.test'],
      numbers: { progress: 1 },
    });
  }
  return out;
}

describe('studioTicksAway', () => {
  it('ignores missing or future last-visited stamps', () => {
    expect(studioTicksAway(0, 10_000).ticks).toBe(0);
    expect(studioTicksAway(500, 400).ticks).toBe(0);
  });

  it('floors to minutes and caps a long absence', () => {
    expect(studioTicksAway(0, 120).ticks).toBe(0);
    expect(studioTicksAway(100, 100 + 10 * 60).ticks).toBe(10);
    const long = studioTicksAway(1, 1 + STUDIO_AWAY_TICK_CAP * 60 + 3600);
    expect(long.ticks).toBe(STUDIO_AWAY_TICK_CAP);
    expect(long.capped).toBe(true);
  });

  it('honors a caller-supplied cap above the default', () => {
    const cap = 300;
    // 250 ticks is over the 240 default but under the raised cap.
    const within = studioTicksAway(1, 1 + 250 * 60, cap);
    expect(within.ticks).toBe(250);
    expect(within.capped).toBe(false);
    const beyond = studioTicksAway(1, 1 + (cap + 5) * 60, cap);
    expect(beyond.ticks).toBe(cap);
    expect(beyond.capped).toBe(true);
  });

  it('keeps the 240 default cap when no cap is passed', () => {
    const away = studioTicksAway(1, 1 + 300 * 60);
    expect(away.ticks).toBe(STUDIO_AWAY_TICK_CAP);
    expect(away.capped).toBe(true);
  });
});

describe('catchUpStudio', () => {
  it('is a no-op when no time has passed', () => {
    const studio = createStudioState();
    const result = catchUpStudio(
      studio,
      createIdleState(),
      makeLife(),
      [makePractice()],
      ALL_DAY,
      [],
      1_000,
      1_030,
      createRng(1n),
    );
    expect(result.summary.ticksSimulated).toBe(0);
    expect(result.studio).toBe(studio);
  });

  it('tends residue and finishes a cooking bay while away', () => {
    let studio = recordStudioResidues(createStudioState(), residue(MIN_RESIDUE_TO_DEVELOP));
    studio = queueDevelop(studio, null, createRng(2n));
    expect(studio.bay?.status).toBe('cooking');
    const needed = studio.bay?.cook_ticks_total ?? 0;

    const result = catchUpStudio(
      studio,
      createIdleState(),
      makeLife(),
      [makePractice()],
      ALL_DAY,
      [],
      1_000,
      1_000 + needed * 60,
      createRng(3n),
    );

    expect(result.summary.ticksSimulated).toBe(needed);
    expect(result.summary.residueGained).toBeGreaterThan(0);
    expect(result.summary.bayReady).toBe(true);
    expect(result.studio.bay?.status).toBe('ready');
    expect(result.practices[0]?.currentProgress).toBeGreaterThan(0);
  });
});
