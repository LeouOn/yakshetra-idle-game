import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@/test/rntl';
import StudioView from '@/ui/components/StudioView';
import type { Practice } from '@/engine';
import type { DailySchedule } from '@/engine/schedule';
const practice: Practice = {
  id: 'practice.test',
  label_sid: 'practice.test.label_sid',
  description_sid: 'practice.test.desc_sid',
  lens: 'joyful_effort',
  progressPerTick: 1,
  maxProgress: 100,
  currentProgress: 0,
  level: 0,
  effects: [],
};
const schedule: DailySchedule = {
  id: 'work-test',
  name_sid: 'studio.title_sid',
  blocks: [
    {
      id: 'all',
      label_sid: 'studio.title_sid',
      startHour: 0,
      endHour: 24,
      practice_id: practice.id,
      icon_sid: 'studio.title_sid',
    },
  ],
};
describe('market choices in the studio', () => {
  it('earns visible copper without practice residue, then spends it on a social working', () => {
    const ui = render(createElement(StudioView, { practices: [practice], schedule }));
    expect(ui.getByTestID('market-tea').props.disabled).toBe(true);
    ui.press(ui.getByTestID('market-work'));
    expect(ui.getByTestID('journey-progress').children[0]).toBe(
      'Traces gathered: 0 · ready to cook from 3',
    );
    for (let i = 0; i < 3; i++) ui.press(ui.getByTestID('market-work'));
    const wallet = ui.getByTestID('market-wallet').children[0];
    expect(typeof wallet).toBe('string');
    const before = Number(String(wallet).match(/\d+/)?.[0]);
    expect(before).toBeGreaterThanOrEqual(4);
    expect(ui.getByTestID('market-tea').props.disabled).toBe(false);
    ui.press(ui.getByTestID('market-tea'));
    expect(ui.getByText(`Your purse: ${before - 4} copper`)).toBeTruthy();
    expect(ui.getByTestID('journey-preview')).toBeTruthy();
    expect(ui.getByTestID('journey-primary')).toBeTruthy();
    expect(ui.getByText('−4 copper · +3 social traces for the next working.')).toBeTruthy();
  });
});
