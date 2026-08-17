// Map practices onto coarse activity families the bench can evaluate.

import type { Lens, Practice } from './types';

export type ActivityFamily = 'work' | 'generosity' | 'beings' | 'learning' | 'meditation' | 'other';

export function activityFamilyForLens(lens: Lens): ActivityFamily {
  if (lens === 'generosity') {
    return 'generosity';
  }
  if (lens === 'careful_conduct') {
    return 'beings';
  }
  if (lens === 'joyful_effort' || lens === 'discernment') {
    return 'learning';
  }
  if (lens === 'collected_attention') {
    return 'meditation';
  }
  if (lens === 'patient_courage') {
    return 'work';
  }
  return 'other';
}

export type ActivityTotals = Record<ActivityFamily, number>;

export function emptyActivityTotals(): ActivityTotals {
  return { work: 0, generosity: 0, beings: 0, learning: 0, meditation: 0, other: 0 };
}

/** Weighted time-on-task from practice level and leftover progress. */
export function summarizeActivities(practices: readonly Practice[]): ActivityTotals {
  const totals = emptyActivityTotals();
  for (const practice of practices) {
    const family = activityFamilyForLens(practice.lens);
    const units = practice.level * practice.maxProgress + practice.currentProgress;
    totals[family] += units;
  }
  return totals;
}
