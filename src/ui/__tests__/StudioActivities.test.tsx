import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@/test/rntl';
import StudioActivities from '@/ui/components/StudioActivities';
import type { Practice } from '@/engine';

function createPractice(lens: Practice['lens'], level: number, currentProgress: number): Practice {
  return {
    id: `practice.${lens}`,
    label_sid: `practice.${lens}.label_sid`,
    description_sid: `practice.${lens}.desc_sid`,
    lens,
    progressPerTick: 1,
    maxProgress: 10,
    currentProgress,
    level,
    effects: [],
  };
}

describe('StudioActivities', () => {
  it('renders all activity families and default unformed work balance', () => {
    const practices: Practice[] = [];
    const ui = render(createElement(StudioActivities, { practices }));

    expect(ui.getByTestID('studio-activities')).toBeTruthy();
    expect(ui.getByText('How the time went')).toBeTruthy();
    expect(ui.getByTestID('studio-balance')).toBeTruthy();
    expect(ui.getByText('50% active labor · 50% contemplation')).toBeTruthy();
    expect(ui.getByText('Days yet unshaped by regular labor or collected attention.')).toBeTruthy();
    expect(ui.queryByText('Craft & Community Footprint')).toBeNull();
  });

  it('renders artisan work balance when labor dominates', () => {
    const practices = [
      createPractice('patient_courage', 5, 0), // work (50 units)
      createPractice('generosity', 3, 0), // generosity (30 units)
      createPractice('collected_attention', 1, 0), // meditation (10 units)
    ];
    const ui = render(createElement(StudioActivities, { practices }));

    expect(ui.getByText('89% active labor · 11% contemplation')).toBeTruthy();
    expect(ui.getByText('Days shaped largely by craft, physical effort, and trade.')).toBeTruthy();
  });

  it('renders footprint stats when market shifts, copper, and folded residue are present', () => {
    const practices = [createPractice('patient_courage', 1, 0)];
    const ui = render(
      createElement(StudioActivities, {
        practices,
        marketShifts: 6,
        copper: 12,
        residueCount: 16,
      }),
    );

    expect(ui.getByTestID('studio-footprint')).toBeTruthy();
    expect(ui.getByText('Craft & Community Footprint')).toBeTruthy();
    expect(ui.getByText('⚒ Market shifts: 6')).toBeTruthy();
    expect(ui.getByText('🪙 Purse: 12 copper')).toBeTruthy();
    expect(ui.getByText('🏛 Folded to household: 4 events')).toBeTruthy();
  });
});
