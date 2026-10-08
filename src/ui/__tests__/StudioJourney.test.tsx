import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@/test/rntl';
import { formatSid } from '@/i18n';
import StudioView from '@/ui/components/StudioView';
import StudioJourney from '@/ui/components/StudioJourney';
import StudioMilestone from '@/ui/components/StudioMilestone';
import { loadProgression } from '@/content/progression/loader';
import {
  createStudioState,
  createRng,
  queueDevelop,
  recordStudioResidues,
  emptyHydratedSession,
  snapshotStudioSession,
  computeArchiveStats,
  createTierState,
  type ResidueEvent,
  type Practice,
} from '@/engine';
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
  effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
};
const schedule: DailySchedule = {
  id: 'all',
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
const people: ResidueEvent[] = [
  { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
  { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
  { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
];

describe('guided discovery loop', () => {
  it('takes a fresh player through gather, cook, and reveal using the primary action', () => {
    const ui = render(createElement(StudioView, { practices: [practice], schedule }));
    expect(ui.getByText('Live a little')).toBeTruthy();
    // Wave 2c: the milestone list sits behind a disclosure now.
    ui.press(ui.getByTestID('studio-milestone-disclosure'));
    expect(ui.getByTestID('studio-milestone')).toBeTruthy();
    ui.press(ui.getByTestID('journey-primary'));
    ui.press(ui.getByTestID('journey-primary'));
    ui.press(ui.getByTestID('journey-primary'));
    expect(ui.getByTestID('journey-primary')).toBeTruthy();
    ui.press(ui.getByTestID('journey-primary'));
    // The cook primary opens the shaping panel (lane B); confirm a short fire.
    ui.press(ui.getByTestID('studio-cook-confirm'));
    // Surplus can make a batch ready immediately; otherwise tending completes it.
    if (ui.queryByText('Tend the working') !== null) ui.press(ui.getByTestID('journey-primary'));
    expect(ui.getByTestID('journey-primary')).toBeTruthy();
    ui.press(ui.getByTestID('journey-primary'));
    // Wave 2c: the stage holds the fresh card; dismiss it and the journey
    // discovery block (non-pinnable card: follow hidden) returns.
    ui.press(ui.getByTestID('reveal-continue'));
    expect(ui.getByTestID('journey-discovery')).toBeTruthy();
    expect(() => ui.getByTestID('journey-follow')).toThrow();
  });
  it('lets a harvested person become the next story focus without scrolling to the archive', () => {
    const ui = render(
      createElement(StudioView, {
        practices: [practice],
        schedule,
        initialStudio: recordStudioResidues(createStudioState(), people),
      }),
    );
    expect(ui.getByTestID('journey-preview')).toBeTruthy();
    ui.press(ui.getByTestID('journey-primary'));
    // The bench is already charged, so that press opened the cook panel.
    ui.press(ui.getByTestID('studio-cook-confirm'));
    ui.press(ui.getByTestID('journey-primary'));
    ui.press(ui.getByTestID('journey-primary'));
    // The reveal stage now carries the fresh card (wave 2c): dismiss it
    // before pinning from the journey block.
    ui.press(ui.getByTestID('reveal-continue'));
    ui.press(ui.getByTestID('journey-follow'));
    expect(ui.getByTestID('journey-follow').props.accessibilityState).toEqual({ selected: true });
    expect(ui.getByTestID('journey-focus')).toBeTruthy();
    ui.press(ui.getByTestID('journey-follow'));
    expect(() => ui.getByTestID('journey-focus')).toThrow();
  });
  it('previews the frozen cooking window rather than newly gathered events', () => {
    const queued = queueDevelop(
      recordStudioResidues(createStudioState(), people),
      null,
      createRng(42n),
    );
    const studio = recordStudioResidues(queued, [
      { tick: 4, type: 'practice_level', ids: ['practice.test'], numbers: {} },
    ]);
    const noop = () => {};
    const ui = render(
      createElement(StudioJourney, {
        studio,
        minimum: 3,
        harvestable: false,
        onTend: noop,
        onDevelop: noop,
        onHarvest: noop,
        onPin: noop,
      }),
    );
    expect(ui.getByTestID('journey-preview')).toBeTruthy();
  });
  it('shows both household requirements at zero, and advances after household unlock', () => {
    const base = emptyHydratedSession();
    const session = snapshotStudioSession(base.studio, base.idle, base.life, base.practices);
    const registries = loadProgression();
    const first = render(
      createElement(StudioMilestone, {
        session,
        stats: computeArchiveStats(session, []),
        registries,
      }),
    );
    expect(first.getByText('Growing toward Household')).toBeTruthy();
    expect(first.getByText('Still needed — Worlds assembled: 0 (at least 1)')).toBeTruthy();
    expect(
      first.getByText('Still needed — Archived Person keepsakes: 0 (at least 3)'),
    ).toBeTruthy();
    const unlocked = {
      ...session,
      tiers: { ...session.tiers, household: createTierState('household', true) },
    };
    const second = render(
      createElement(StudioMilestone, {
        session: unlocked,
        stats: computeArchiveStats(unlocked, []),
        registries,
      }),
    );
    expect(second.getByText('Growing toward Workshop')).toBeTruthy();
  });
  it('hides the next chapter when every tier is unlocked', () => {
    const base = emptyHydratedSession();
    const session = snapshotStudioSession(base.studio, base.idle, base.life, base.practices);
    const registries = loadProgression();
    const complete = {
      ...session,
      tiers: Object.fromEntries(
        registries.tiers.map((tier) => [tier.id, createTierState(tier.id, true)]),
      ),
    };
    const ui = render(
      createElement(StudioMilestone, {
        session: complete,
        stats: computeArchiveStats(complete, []),
        registries,
      }),
    );
    expect(() => ui.getByTestID('studio-milestone')).toThrow();
  });
});

describe('journey numbers read the spendable count (finding 2)', () => {
  it('held traces drop out of the progress line, matching the gate', () => {
    // check2's save: 26 pending with 24 held -> bar said 26/3 while the gate
    // truthfully evaluated 2 spendable. Both must read the same number.
    const events: ResidueEvent[] = [];
    for (let i = 0; i < 26; i += 1) {
      events.push({ tick: i + 1, type: 'practice_tick', ids: ['p:alms'], numbers: {} });
    }
    let studio = recordStudioResidues(createStudioState(), events);
    studio = { ...studio, held_residue: events.map((_, index) => index).slice(0, 24) };
    const ui = render(
      createElement(StudioJourney, {
        studio,
        minimum: 3,
        harvestable: false,
        onTend: () => undefined,
        onDevelop: () => undefined,
        onHarvest: () => undefined,
        onPin: () => undefined,
      }),
    );
    expect(ui.getByTestID('journey-progress').children[0]).toBe(
      formatSid('studio.journey_progress_sid', { n: 2, min: 3 }),
    );
  });
});
