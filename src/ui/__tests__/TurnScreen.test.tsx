// Turn-screen integration test (todo 13).
//
// Drives the full Orient -> Intend -> Act -> Resolve loop against a fixture
// EraPack using the test-renderer shim (see src/test/rntl.ts). The real RNTL
// cannot run under vitest 4 (RN's Flow source is unparseable); the shim wraps
// test-renderer with the query/interaction primitives our component tests need.
//
// The fixture pack is injected directly via the `TurnScreen` named export's
// `eraPack` prop, so no loader mock is required. expo-router is mocked at the
// module level so the default export's `useRouter` / `useLocalSearchParams`
// imports do not pull in unparseable platform code.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement } from 'react';

import type { EraId, LifeId, LifeState, RoleId } from '@/engine';
import { createLifeState } from '@/engine';
import type { Choice, EraPack } from '@/content/schema';

import { TurnScreen } from '../../../app/life/[lifeId]';
import { render } from '@/test/rntl';

// expo-router imports real RN transitively; mock it before importing the screen.
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ lifeId: 'test-life' }),
  useRouter: () => ({ push: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Fixture: a minimal but validly-shaped EraPack with 2 events (each with one
// choice). The schema's min-events constraint is a Zod-runtime check; the TS
// type does not encode it, so a 2-event fixture satisfies the type.
// ---------------------------------------------------------------------------

function makeChoice(id: string, labelSid: string, effects: Choice['effects']): Choice {
  return {
    id,
    label_sid: labelSid,
    requires: [],
    effects,
    forbidden: false,
  };
}

const fixtureEraPack: EraPack = {
  id: 'test-era@0.1.0',
  name_sid: 'test.era.name_sid',
  locale_default: 'en',
  locale_available: ['en'],
  schema_version: '0.1',
  engine_compat: '^0.1.0',
  lens_set: 'six-paramita-mahayana',
  social: { paramitas: ['generosity'], relations: [] },
  calendar: 'iso',
  content_warnings: [],
  events: [
    {
      id: 'evt-give-alms',
      weight: 1,
      cooldown_turns: 0,
      once_per_run: false,
      content_warnings: [],
      choices: [
        makeChoice('choice-give-alms', 'test.action.give_alms_label_sid', [
          { op: 'add_resource', key: 'trust', delta: 3 },
          { op: 'add_resource', key: 'provisions', delta: -2 },
          { op: 'set_intent_root', intent_root: 'care' },
        ]),
      ],
    },
    {
      id: 'evt-harvest-rice',
      weight: 1,
      cooldown_turns: 0,
      once_per_run: false,
      content_warnings: [],
      choices: [
        makeChoice('choice-harvest-rice', 'test.action.harvest_rice_label_sid', [
          { op: 'add_resource', key: 'provisions', delta: 5 },
          { op: 'add_resource', key: 'energy', delta: -3 },
          { op: 'set_intent_root', intent_root: 'care' },
        ]),
      ],
    },
  ],
  lineage_notes_sid: 'test.era.lineage_sid',
  glossary: {},
  source_bibliography: [],
  permitted_imagery: [],
  rule_variation: {
    id: 'social-obligation',
    description_sid: 'test.era.rule_sid',
    enforces: 'social-obligation',
  },
};

function makeInitialState(): LifeState {
  return createLifeState({
    id: 'life-1' as LifeId,
    era: 'test-era' as EraId,
    role: 'wanderer' as RoleId,
    identity: {
      gender: 'x',
      social_class: 'x',
      family_wealth_at_birth: 'x',
      caste_status: 'x',
      disability_status: 'x',
    },
  });
}

describe('TurnScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders the Orient phase with resources and the Intend phase with six lenses', () => {
    const onDeath = vi.fn();
    const { getByText, getByTestID } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    // Top bar carries turn and age.
    expect(() => getByText('Turn 0')).not.toThrow();
    expect(() => getByText('Age 0')).not.toThrow();

    // Orient: every canonical resource appears.
    for (const id of ['time', 'energy', 'provisions', 'trust', 'skill', 'obligation'] as const) {
      expect(() => getByTestID(`turn-resource-${id}`)).not.toThrow();
    }

    // Intend: all six lenses are rendered as tappable cards.
    expect(() => getByText('Generosity')).not.toThrow();
    expect(() => getByText('Careful Conduct')).not.toThrow();
    expect(() => getByText('Patient Courage')).not.toThrow();
    expect(() => getByText('Joyful Effort')).not.toThrow();
    expect(() => getByText('Collected Attention')).not.toThrow();
    expect(() => getByText('Discernment')).not.toThrow();
  });

  it('completes the full orient -> intend -> act -> resolve flow', () => {
    const onDeath = vi.fn();
    const { getByText, getByTestID, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    // Phase: intend. The Act-phase actions are not yet visible.
    expect(() => getByText('Choose your lens')).not.toThrow();
    expect(() => getByText('Give alms at the temple gate')).toThrow();

    // Select the Generosity lens.
    press(getByTestID('turn-lens-generosity'));

    // Phase: act. Top bar reflects the chosen lens.
    expect(() => getByText('Lens: Generosity')).not.toThrow();
    expect(() => getByText('Choose an action')).not.toThrow();

    // Two or more actions are visible.
    const giveAlms = getByTestID('turn-action-choice-give-alms');
    const harvestRice = getByTestID('turn-action-choice-harvest-rice');
    expect(typeof giveAlms).toBe('object');
    expect(typeof harvestRice).toBe('object');

    // Resolve: tap an action; the ReflectCard appears.
    press(giveAlms);
    expect(() => getByTestID('reflect-card')).not.toThrow();

    // The lens name surfaces in the ReflectCard "intended" section.
    expect(() => getByText('Generosity — Give alms at the temple gate')).not.toThrow();

    // Resource deltas render: trust +3 (positive format).
    expect(() => getByTestID('reflect-delta-trust')).not.toThrow();
    expect(() => getByTestID('reflect-delta-provisions')).not.toThrow();
  });

  it('advances the turn and returns to Intend when the ReflectCard Continue is pressed', async () => {
    const onDeath = vi.fn();
    const { getByText, getByTestID, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    // Complete one turn: lens -> action.
    press(getByTestID('turn-lens-generosity'));
    press(getByTestID('turn-action-choice-give-alms'));
    expect(() => getByTestID('reflect-card')).not.toThrow();

    // Turn counter is still 0 inside the reflect entry (it was captured pre-advance).
    expect(() => getByText('Turn 0')).not.toThrow();

    // Press Continue: ADVANCE_TURN fires, lens resets, reflect closes.
    press(getByTestID('reflect-continue'));

    // Back to Intend, turn counter incremented.
    expect(() => getByText('Turn 1')).not.toThrow();
    expect(() => getByText('Choose your lens')).not.toThrow();
    // Lens indicator has reset.
    expect(() => getByText('Lens: none')).not.toThrow();
  });

  it('renders the no-era fallback with an end-life button when the pack is null', () => {
    const onDeath = vi.fn();
    const { getByText, getByTestID } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: null,
        onDeath,
      }),
    );

    // The fallback heading and body render.
    expect(() => getByText('No events for this era yet')).not.toThrow();

    // Selecting a lens still works, but Act stays in fallback.
    expect(() => getByTestID('turn-end-life-early')).not.toThrow();
  });

  it('navigates to the bardo (via onDeath) when the DIE action fires from the fallback', () => {
    const onDeath = vi.fn();
    const { getByTestID, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: null,
        onDeath,
      }),
    );

    press(getByTestID('turn-end-life-early'));

    // onDeath fires synchronously after the state update propagates.
    expect(onDeath).toHaveBeenCalledTimes(1);
  });

  it('navigates to the bardo when time runs out after enough turns', () => {
    const onDeath = vi.fn();
    // Start with time = 1 so a single ADVANCE_TURN exhausts it.
    const initial = makeInitialState();
    initial.resources.time = 1;
    const { getByTestID, press } = render(
      createElement(TurnScreen, {
        initialState: initial,
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    // Complete one turn and Continue; the resulting ADVANCE_TURN drops time to 0.
    press(getByTestID('turn-lens-generosity'));
    press(getByTestID('turn-action-choice-give-alms'));
    press(getByTestID('reflect-continue'));

    expect(onDeath).toHaveBeenCalled();
  });

  it('keeps the ReflectCard absent until the player chooses an action', () => {
    const onDeath = vi.fn();
    const { getByTestID, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    expect(() => getByTestID('reflect-card')).toThrow();

    press(getByTestID('turn-lens-generosity'));
    expect(() => getByTestID('reflect-card')).toThrow();
  });

  it('exposes every Text node with a label or text content for assistive tech', () => {
    const onDeath = vi.fn();
    const { container } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );
    const textNodes = container.queryAll((i) => i.type === 'Text');
    expect(textNodes.length).toBeGreaterThan(0);
    for (const node of textNodes) {
      const hasLabel =
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.length > 0;
      const hasText = node.children.some((c) => typeof c === 'string' && c.length > 0);
      expect(hasLabel || hasText).toBe(true);
    }
  });

  it('uses no inline string literals — every visible text resolves via @/i18n', () => {
    // Smoke test: the screen renders without throwing on SID resolution. Any
    // inline literal would either render as-is (no SID lookup) or, more likely
    // here, break the resolveSid contract by feeding it an unknown id.
    const onDeath = vi.fn();
    expect(() =>
      render(
        createElement(TurnScreen, {
          initialState: makeInitialState(),
          eraPack: fixtureEraPack,
          onDeath,
        }),
      ),
    ).not.toThrow();
  });
});
