import { describe, it, expect } from 'vitest';
import { createElement } from 'react';

import StudioView from '@/ui/components/StudioView';
import { resolveSid } from '@/i18n';
import { render } from '@/test/rntl';
import { studioTheme } from '@/ui/studio-theme';
import {
  createRng,
  createStudioState,
  createTierState,
  emptyHydratedSession,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
  StudioSessionSchema,
  type Practice,
  type ResidueEvent,
  type StudioSession,
  type StudioState,
} from '@/engine';
import type { DailySchedule } from '@/engine/schedule';

function makePractice(): Practice {
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

const TRACES: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
  { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
  { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
];

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  }
  return style as Record<string, unknown>;
}

interface PrimaryButtonInfo {
  readonly testID?: string;
  readonly label?: string;
  readonly bg: string;
}

/**
 * Structural helper: walks all rendered elements in the root tree that act as buttons
 * (Pressable / role="button"), classifies primary buttons as having backgroundColor
 * equal to accentDeep or harvest (excluding the 44x44 cook steppers studio-cook-(less|more)-*),
 * and returns them.
 */
function findPrimaryButtons(container: {
  queryAll: (pred: (node: any) => boolean) => any[];
}): PrimaryButtonInfo[] {
  const isButton = (node: any) =>
    node.props && (node.props.role === 'button' || node.props.accessibilityRole === 'button');

  const nodes = container.queryAll(isButton);
  const primaries: PrimaryButtonInfo[] = [];

  for (const node of nodes) {
    const testID = node.props.testID as string | undefined;
    // Exclude 44x44 cook steppers
    if (
      testID &&
      (testID.startsWith('studio-cook-less-') || testID.startsWith('studio-cook-more-'))
    ) {
      continue;
    }
    const style = flattenStyle(node.props.style);
    const bg = style.backgroundColor as string | undefined;
    if (bg === studioTheme.accentDeep || bg === studioTheme.harvest) {
      const label = node.props.accessibilityLabel as string | undefined;
      primaries.push({
        ...(testID === undefined ? {} : { testID }),
        ...(label === undefined ? {} : { label }),
        bg,
      });
    }
  }

  return primaries;
}

function makeSession(mutator?: (s: StudioSession) => StudioSession): StudioSession {
  const hydrated = emptyHydratedSession();
  const base = snapshotStudioSession(
    hydrated.studio,
    hydrated.idle,
    hydrated.life,
    hydrated.practices,
  );
  const session = mutator ? mutator(base) : base;
  return StudioSessionSchema.parse(session);
}

describe('Invariant 1: exactly ONE visually primary control across all five bench states', () => {
  it('State 1 (no traces): journey-primary is the only primary button ("Live a little")', () => {
    const ui = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: createStudioState(),
      }),
    );

    const bench = ui.getByTestID('studio-tab-section-bench');
    const primaries = findPrimaryButtons(bench);
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.testID).toBe('journey-primary');
    expect(primaries[0]?.bg).toBe(studioTheme.accentDeep);
    expect(ui.getByText(resolveSid('studio.journey_gather_sid'))).toBeDefined();

    // Tend and Run are compact secondary buttons
    const tend = ui.getByTestID('studio-tend');
    const run = ui.getByTestID('studio-run');
    expect(flattenStyle(tend.props.style).backgroundColor).toBe(studioTheme.chip);
    expect(flattenStyle(run.props.style).backgroundColor).toBe(studioTheme.chip);

    // Next action does NOT repeat anything (renders nothing)
    expect(() => ui.getByTestID('studio-next-action')).toThrow();
  });

  it('State 2 (traces gathered): journey-primary is the only primary; cook panel is a focused sub-state', () => {
    const readyStudio = recordStudioResidues(createStudioState(), TRACES);
    const ui = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: readyStudio,
      }),
    );

    // On the bench with cook panel closed, journey-primary is the ONLY primary
    const bench = ui.getByTestID('studio-tab-section-bench');
    const primaries = findPrimaryButtons(bench);
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.testID).toBe('journey-primary');
    expect(primaries[0]?.bg).toBe(studioTheme.accentDeep);
    expect(ui.getByText(resolveSid('studio.journey_cook_sid'))).toBeDefined();

    // studio-develop is styled as secondary, never competing primary
    const develop = ui.getByTestID('studio-develop');
    expect(flattenStyle(develop.props.style).backgroundColor).toBe(studioTheme.chip);

    // NextAction does NOT repeat "Cook what has gathered on the bench"
    expect(() => ui.getByTestID('studio-next-action')).toThrow();

    // Opening the cook panel: focused sub-state where studio-cook-confirm is THE primary
    // and the brief input lives inside the cook panel near the top
    ui.press(ui.getByTestID('journey-primary'));
    expect(ui.getByTestID('studio-cook-panel')).toBeDefined();
    expect(ui.getByTestID('studio-brief')).toBeDefined();

    const confirm = ui.getByTestID('studio-cook-confirm');
    expect(flattenStyle(confirm.props.style).backgroundColor).toBe(studioTheme.accentDeep);
  });

  it('State 3 (cooking in progress): journey-primary is the only primary with distinct label ("See it through")', () => {
    const readyStudio = recordStudioResidues(createStudioState(), TRACES);
    const cookingStudio = queueDevelop(readyStudio, null, createRng(42n), { fire: 'short' });
    const ui = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: cookingStudio,
      }),
    );

    // Exactly one primary button structurally
    const bench = ui.getByTestID('studio-tab-section-bench');
    const primaries = findPrimaryButtons(bench);
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.testID).toBe('journey-primary');
    expect(primaries[0]?.bg).toBe(studioTheme.accentDeep);

    // Distinct labels: journey-primary reworded to "See it through",
    // never near-duplicate with "Tend the work"
    expect(resolveSid('studio.journey_tend_sid')).toBe('See it through');
    expect(ui.getByText('See it through')).toBeDefined();
    expect(ui.queryByText('Tend the working')).toBeNull();

    const tend = ui.getByTestID('studio-tend');
    expect(flattenStyle(tend.props.style).backgroundColor).toBe(studioTheme.chip);
    expect(ui.getByText('Tend the work')).toBeDefined();

    // NextAction renders nothing
    expect(() => ui.getByTestID('studio-next-action')).toThrow();
  });

  it('State 4 (working ready): journey-primary is the ONLY green primary button ("Harvest keepsake")', () => {
    const readyStudio = recordStudioResidues(createStudioState(), TRACES);
    const queued = queueDevelop(readyStudio, null, createRng(42n), { fire: 'short' });
    const harvestReady: StudioState = {
      ...queued,
      bay: {
        ...queued.bay!,
        cook_ticks_done: queued.bay!.cook_ticks_total,
        status: 'ready',
      },
    };

    const ui = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: harvestReady,
      }),
    );

    const bench = ui.getByTestID('studio-tab-section-bench');
    const primaries = findPrimaryButtons(bench);
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.testID).toBe('journey-primary');
    expect(primaries[0]?.bg).toBe(studioTheme.harvest);
    expect(ui.getByText(resolveSid('studio.journey_reveal_sid'))).toBeDefined();

    // studio-harvest must NOT be green (no duplicate green primary buttons)
    // and is renamed to "Harvest by hand"
    const harvest = ui.getByTestID('studio-harvest');
    expect(flattenStyle(harvest.props.style).backgroundColor).not.toBe(studioTheme.harvest);
    expect(flattenStyle(harvest.props.style).backgroundColor).toBe(studioTheme.chip);
    expect(ui.getByText('Harvest by hand')).toBeDefined();

    // NextAction does NOT repeat "Next: Harvest One life"
    expect(() => ui.getByTestID('studio-next-action')).toThrow();
  });

  it('State 5 (out-of-band signals): NextAction stays quiet for normal loop, lights for out-of-band', () => {
    // Normal steady state with pinned latest card: NextAction renders nothing
    const steadySession = makeSession((s) => ({
      ...s,
      tiers: {
        person: {
          ...createTierState('person', true),
          endowed: ['endow/person/swift-cook', 'endow/person/deep-window'],
        },
      },
    }));
    const uiSteady = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: steadySession,
      }),
    );
    expect(() => uiSteady.getByTestID('studio-next-action')).toThrow();

    // Out-of-band visitor lights the strip
    const visitorSession = makeSession((s) => ({
      ...s,
      tiers: {
        person: {
          ...createTierState('person', true),
          endowed: ['endow/person/swift-cook', 'endow/person/deep-window'],
          active_visitor: { id: 'visitor/gate-yaksa', windows_left: 2 },
        },
      },
    }));
    const uiVisitor = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: visitorSession,
      }),
    );
    expect(uiVisitor.getByTestID('studio-next-action')).toBeDefined();
    expect(uiVisitor.getByText('The guest waits (The yakṣa at the gate)')).toBeDefined();
  });

  it('Disclosure: default expanded false, toggles true on press, panel hidden when closed', () => {
    const ui = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: createStudioState(),
      }),
    );

    const manualDisclosure = ui.getByTestID('studio-manual-disclosure');
    expect(manualDisclosure.props.accessibilityState).toEqual({ expanded: false });
    // RN Web maps aria-expanded, not accessibilityState.expanded: a screen reader on the web
    // only hears the state through this prop.
    expect(manualDisclosure.props['aria-expanded']).toBe(false);

    const manualPanel = ui.getByTestID('studio-manual-panel');
    expect(flattenStyle(manualPanel.props.style).display).toBe('none');

    // Press to expand
    ui.press(manualDisclosure);
    expect(manualDisclosure.props.accessibilityState).toEqual({ expanded: true });
    expect(manualDisclosure.props['aria-expanded']).toBe(true);
    expect(flattenStyle(manualPanel.props.style).display).toBeUndefined();

    // Press to collapse
    ui.press(manualDisclosure);
    expect(manualDisclosure.props.accessibilityState).toEqual({ expanded: false });
    expect(flattenStyle(manualPanel.props.style).display).toBe('none');

    // Milestone disclosure consistency
    const milestoneDisclosure = ui.getByTestID('studio-milestone-disclosure');
    expect(milestoneDisclosure.props.accessibilityState).toEqual({ expanded: false });
    ui.press(milestoneDisclosure);
    expect(milestoneDisclosure.props.accessibilityState).toEqual({ expanded: true });
  });
});
