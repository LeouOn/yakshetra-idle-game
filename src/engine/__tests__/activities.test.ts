import { describe, expect, it } from 'vitest';

import {
  activityFamilyForLens,
  activityFlavorNote,
  computeWorkBalance,
  countFoldedResidue,
  dominantActivityFamily,
  emptyActivityTotals,
  evaluateLifeActivity,
  summarizeActivities,
} from '../';
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

  it('identifies dominant activity family', () => {
    expect(dominantActivityFamily(emptyActivityTotals())).toBeNull();
    const totals = { ...emptyActivityTotals(), work: 20, meditation: 5 };
    expect(dominantActivityFamily(totals)).toBe('work');
  });

  it('provides observational flavor notes without moralizing', () => {
    expect(activityFlavorNote('work')).toContain('physical craft and patient labor');
    expect(activityFlavorNote('generosity')).toContain('open hands and shared portions');
    expect(activityFlavorNote('beings')).toContain('attending to the needs of other beings');
    expect(activityFlavorNote('learning')).toContain('study, copying, and discernment');
    expect(activityFlavorNote('meditation')).toContain('seated quiet and collected attention');
    expect(activityFlavorNote('other')).toBe('');
  });

  it('evaluates life activity for manifest tagging', () => {
    expect(evaluateLifeActivity(null)).toEqual({ tag: null, note: '' });
    expect(evaluateLifeActivity(undefined)).toEqual({ tag: null, note: '' });
    expect(evaluateLifeActivity(emptyActivityTotals())).toEqual({ tag: null, note: '' });

    const evaluated = evaluateLifeActivity({
      ...emptyActivityTotals(),
      meditation: 50,
      learning: 10,
    });
    expect(evaluated.tag).toBe('activity:meditation');
    expect(evaluated.note).toContain('seated quiet and collected attention');
  });

  it('computes work vs contemplation balance archetypes', () => {
    // Unformed / empty
    expect(computeWorkBalance(emptyActivityTotals())).toEqual({
      laborUnits: 0,
      quietUnits: 0,
      laborPercent: 50,
      quietPercent: 50,
      balanceSid: 'studio.balance_unformed_sid',
    });

    // Artisan (>75% labor)
    const artisanTotals = { ...emptyActivityTotals(), work: 80, meditation: 10 };
    const artisan = computeWorkBalance(artisanTotals);
    expect(artisan.laborPercent).toBeGreaterThan(75);
    expect(artisan.balanceSid).toBe('studio.balance_artisan_sid');

    // Householder (55-75% labor)
    const householderTotals = { ...emptyActivityTotals(), work: 40, beings: 20, learning: 30 };
    const householder = computeWorkBalance(householderTotals);
    expect(householder.laborPercent).toBe(67);
    expect(householder.balanceSid).toBe('studio.balance_householder_sid');

    // Equal (45-55% labor)
    const equalTotals = { ...emptyActivityTotals(), work: 50, meditation: 50 };
    const equal = computeWorkBalance(equalTotals);
    expect(equal.laborPercent).toBe(50);
    expect(equal.balanceSid).toBe('studio.balance_equal_sid');

    // Scholar (25-45% labor)
    const scholarTotals = { ...emptyActivityTotals(), work: 30, learning: 70 };
    const scholar = computeWorkBalance(scholarTotals);
    expect(scholar.laborPercent).toBe(30);
    expect(scholar.balanceSid).toBe('studio.balance_scholar_sid');

    // Recluse (<25% labor)
    const recluseTotals = { ...emptyActivityTotals(), work: 10, meditation: 90 };
    const recluse = computeWorkBalance(recluseTotals);
    expect(recluse.laborPercent).toBe(10);
    expect(recluse.balanceSid).toBe('studio.balance_recluse_sid');
  });

  it('counts residue events folded up to the household tier', () => {
    expect(countFoldedResidue(0)).toBe(0);
    expect(countFoldedResidue(-5)).toBe(0);
    expect(countFoldedResidue(3, 4)).toBe(0);
    expect(countFoldedResidue(4, 4)).toBe(1);
    expect(countFoldedResidue(15, 4)).toBe(3);
    expect(countFoldedResidue(16, 4)).toBe(4);
  });
});
