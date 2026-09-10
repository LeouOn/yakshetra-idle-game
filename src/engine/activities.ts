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

/** Find the dominant activity family if any has strictly positive units. */
export function dominantActivityFamily(totals: ActivityTotals): ActivityFamily | null {
  let bestKey: ActivityFamily | null = null;
  let bestVal = 0;
  for (const [key, val] of Object.entries(totals) as [ActivityFamily, number][]) {
    if (val > bestVal) {
      bestVal = val;
      bestKey = key;
    }
  }
  return bestKey;
}

/** Observational flavor note reflecting the dominant mode of daily labor and contemplation. */
export function activityFlavorNote(family: ActivityFamily): string {
  switch (family) {
    case 'work':
      return ' The days were shaped by physical craft and patient labor.';
    case 'generosity':
      return ' The days were marked by open hands and shared portions.';
    case 'beings':
      return ' The days were spent attending to the needs of other beings.';
    case 'learning':
      return ' The days were marked by study, copying, and discernment.';
    case 'meditation':
      return ' The days were shaped by seated quiet and collected attention.';
    default:
      return '';
  }
}

/** Evaluate life activity totals for manifest tagging and flavor detail. */
export function evaluateLifeActivity(activity: ActivityTotals | null | undefined): {
  readonly tag: string | null;
  readonly note: string;
} {
  if (activity === null || activity === undefined) {
    return { tag: null, note: '' };
  }
  const dominant = dominantActivityFamily(activity);
  if (dominant === null) {
    return { tag: null, note: '' };
  }
  return {
    tag: `activity:${dominant}`,
    note: activityFlavorNote(dominant),
  };
}

export interface WorkBalance {
  readonly laborUnits: number;
  readonly quietUnits: number;
  readonly laborPercent: number;
  readonly quietPercent: number;
  readonly balanceSid: string;
}

/**
 * Calculates the balance between active outward labor (work + beings + generosity)
 * and contemplative quiet (meditation + learning).
 */
export function computeWorkBalance(totals: ActivityTotals): WorkBalance {
  const laborUnits = totals.work + totals.beings + totals.generosity;
  const quietUnits = totals.meditation + totals.learning;
  const total = laborUnits + quietUnits;
  if (total === 0) {
    return {
      laborUnits: 0,
      quietUnits: 0,
      laborPercent: 50,
      quietPercent: 50,
      balanceSid: 'studio.balance_unformed_sid',
    };
  }
  const laborPercent = Math.round((laborUnits / total) * 100);
  const quietPercent = 100 - laborPercent;
  let balanceSid = 'studio.balance_equal_sid';
  if (laborPercent > 75) {
    balanceSid = 'studio.balance_artisan_sid';
  } else if (laborPercent > 55) {
    balanceSid = 'studio.balance_householder_sid';
  } else if (laborPercent < 25) {
    balanceSid = 'studio.balance_recluse_sid';
  } else if (laborPercent < 45) {
    balanceSid = 'studio.balance_scholar_sid';
  }
  return {
    laborUnits,
    quietUnits,
    laborPercent,
    quietPercent,
    balanceSid,
  };
}

/**
 * Calculates how many residue events from an individual life have folded into the household tier.
 */
export function countFoldedResidue(residueCount: number, foldCadence = 4): number {
  if (residueCount <= 0 || foldCadence <= 0) {
    return 0;
  }
  return Math.floor(residueCount / foldCadence);
}
