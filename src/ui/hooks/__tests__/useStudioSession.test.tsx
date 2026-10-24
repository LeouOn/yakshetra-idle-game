import { describe, expect, it } from 'vitest';
import { createElement } from 'react';

import { eraFamilyOf } from '@/engine/card-composer';
import type { Practice } from '@/engine';
import type { DailySchedule } from '@/engine/schedule';
import { render } from '@/test/rntl';

import { useStudioSession, type UseStudioSessionResult } from '../useStudioSession';

const PRACTICE: Practice = {
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

const SCHEDULE: DailySchedule = {
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

function mount(benchEra?: string): UseStudioSessionResult {
  let captured: UseStudioSessionResult | null = null;
  function Probe() {
    captured = useStudioSession({
      practices: [PRACTICE],
      schedule: SCHEDULE,
      endings: [],
      persist: false,
      clock: () => 0,
      ...(benchEra === undefined ? {} : { benchEra }),
    });
    return null;
  }
  render(createElement(Probe));
  if (captured === null) {
    throw new Error('the hook did not render');
  }
  return captured;
}

// A real era id on the bench life is what lets `eraFamilyOf` resolve, so the harvest pools follow
// the era; the stand-in token resolves to nothing, which is the old era-neutral bench.
describe('useStudioSession bench life era', () => {
  it('carries the era the route passes', () => {
    const { life } = mount('fantasy-mahayana');
    expect(life.era).toBe('fantasy-mahayana');
    expect(eraFamilyOf(life.era)).toBe('fantasy');
    expect(eraFamilyOf(mount('tang-china').life.era)).toBe('tang');
  });

  it('without an era it is the era-neutral stand-in, as before', () => {
    const { life } = mount();
    expect(life.era).toBe('studio-bench@0.1.0');
    expect(eraFamilyOf(life.era)).toBeNull();
  });
});
