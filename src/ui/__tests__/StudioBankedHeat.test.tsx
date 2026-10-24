// The bench says how much heat it can bank (the cap that bdaa7b6 added to the engine),
// so a long absence does not look like unbounded savings.
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { render } from '@/test/rntl';
import StudioView from '@/ui/components/StudioView';
import {
  SURPLUS_CAP_TICKS,
  StudioSessionSchema,
  createStudioState,
  emptyHydratedSession,
  snapshotStudioSession,
  type Practice,
  type StudioState,
} from '@/engine';
import { studioToBench } from '@/engine/bench-mapping';
import type { DailySchedule } from '@/engine/schedule';
import { formatSid } from '@/i18n';

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
  id: 'all-day',
  name_sid: 'studio.title_sid',
  blocks: [
    {
      id: 'all',
      label_sid: 'studio.tend_button_sid',
      startHour: 0,
      endHour: 24,
      practice_id: practice.id,
      icon_sid: 'studio.title_sid',
    },
  ],
};

function sessionWith(studio: StudioState) {
  const hydrated = emptyHydratedSession();
  const base = snapshotStudioSession(
    hydrated.studio,
    hydrated.idle,
    hydrated.life,
    hydrated.practices,
  );
  return StudioSessionSchema.parse({
    ...base,
    benches: { ...base.benches, person: studioToBench(studio) },
    archive: studio.archive,
  });
}

describe('banked heat line', () => {
  it('names the cap next to the banked amount', () => {
    const ui = render(
      createElement(StudioView, {
        practices: [practice],
        schedule,
        initialSession: sessionWith({ ...createStudioState(), surplus: 12 }),
      }),
    );
    const text = ui
      .getByTestID('studio-surplus')
      .children.map((child) => String(child))
      .join('');
    expect(text).toContain(formatSid('studio.banked_heat_sid', { n: 12 }));
    // The cap sentence follows on the same line, so the amount must end its own sentence.
    expect(formatSid('studio.banked_heat_sid', { n: 12 })).toMatch(/[.!?]$/);
    expect(text).toContain(formatSid('studio.cook_heat_cap_sid', { n: SURPLUS_CAP_TICKS }));
  });

  it('shows no heat line when nothing is banked', () => {
    const ui = render(
      createElement(StudioView, {
        practices: [practice],
        schedule,
        initialSession: sessionWith(createStudioState()),
      }),
    );
    expect(() => ui.getByTestID('studio-surplus')).toThrow();
  });
});
