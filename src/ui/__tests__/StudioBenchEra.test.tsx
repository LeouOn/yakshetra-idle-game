import { describe, expect, it } from 'vitest';
import { createElement } from 'react';

import StudioView from '@/ui/components/StudioView';
import { act, render } from '@/test/rntl';
import {
  StudioSessionSchema,
  createIdleState,
  createLifeState,
  createStudioState,
  snapshotStudioSession,
  type LifeState,
  type Practice,
} from '@/engine';
import { STUDIO_SESSION_KEY, createMemoryStudioKv, loadStudioSession } from '@/persistence';
import type { DailySchedule } from '@/engine/schedule';

function practice(): Practice {
  return {
    id: 'practice.test',
    label_sid: 'practice.test.label_sid',
    description_sid: 'practice.test.desc_sid',
    lens: 'joyful_effort',
    progressPerTick: 1,
    maxProgress: 100,
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

function benchLife(): LifeState {
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

function sessionWithEra(era: string | undefined) {
  return StudioSessionSchema.parse(
    snapshotStudioSession(
      createStudioState(),
      createIdleState(),
      benchLife(),
      [practice()],
      undefined,
      undefined,
      era === undefined ? undefined : { bench_era: era },
    ),
  );
}

async function mountSaved(seed: unknown) {
  const storage = createMemoryStudioKv({ [STUDIO_SESSION_KEY]: JSON.stringify(seed) });
  render(
    createElement(StudioView, {
      practices: [practice()],
      schedule: ALL_DAY,
      persist: true,
      storage,
      clock: () => 1_000_000,
    }),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return storage;
}

describe('the studio bench carries its era through its own save', () => {
  it('a session the bridge stamped with an era keeps it after the bench loads and saves', async () => {
    const storage = await mountSaved(sessionWithEra('fantasy-mahayana'));
    expect((await loadStudioSession(storage))?.bench_era).toBe('fantasy-mahayana');
  });

  it('an old session with no era loads and saves without inventing one', async () => {
    const storage = await mountSaved(sessionWithEra(undefined));
    const saved = await loadStudioSession(storage);
    expect(saved).not.toBeNull();
    expect(saved?.bench_era).toBeUndefined();
  });
});
