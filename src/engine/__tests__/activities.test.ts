import { describe, expect, it } from 'vitest';

import { activityFamilyForLens, summarizeActivities } from '../';
import type { Practice } from '../';

function practice(lens: Practice['lens'], level: number, currentProgress: number): Practice {
  return {
    id: `p-${lens}`,
    label_sid: 'p_sid',
    description_sid: 'd_sid',
    lens,
    progressPerTick: 1,
    maxProgress: 10,
    currentProgress,
    level,
    effects: [],
  };
}

describe('activities', () => {
  it('maps lenses onto work, generosity, beings, learning, and meditation', () => {
    expect(activityFamilyForLens('generosity')).toBe('generosity');
    expect(activityFamilyForLens('careful_conduct')).toBe('beings');
    expect(activityFamilyForLens('joyful_effort')).toBe('learning');
    expect(activityFamilyForLens('collected_attention')).toBe('meditation');
    expect(activityFamilyForLens('patient_courage')).toBe('work');
  });

  it('weights time-on-task from level and leftover progress', () => {
    const totals = summarizeActivities([
      practice('generosity', 1, 4),
      practice('collected_attention', 0, 3),
    ]);
    expect(totals.generosity).toBe(14);
    expect(totals.meditation).toBe(3);
    expect(totals.work).toBe(0);
  });
});
