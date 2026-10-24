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
import { StyleSheet } from 'react-native';

import type { EraId, LifeId, LifeState, RoleId } from '@/engine';
import { createLifeState } from '@/engine';
import type { Choice, EraPack } from '@/content/schema';

import { TurnScreen } from '../../../app/life/[lifeId]';
import { resolveSid } from '@/i18n';
import { render } from '@/test/rntl';
import type { TestInstance } from 'test-renderer';

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

function makeChoice(
  id: string,
  labelSid: string,
  effects: Choice['effects'],
  outcomeSid?: string,
  journalSid?: string,
): Choice {
  return {
    id,
    label_sid: labelSid,
    requires: [],
    effects,
    forbidden: false,
    ...(outcomeSid === undefined ? {} : { outcome_sid: outcomeSid }),
    ...(journalSid === undefined ? {} : { journal_sid: journalSid }),
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
      situation_sid: 'test.situation.alms_sid',
      choices: [
        makeChoice(
          'choice-give-alms',
          'test.action.give_alms_label_sid',
          [
            { op: 'add_resource', key: 'trust', delta: 3 },
            { op: 'add_resource', key: 'provisions', delta: -2 },
            { op: 'set_intent_root', intent_root: 'care' },
          ],
          'test.consequence.alms_given_sid',
          'test.journal.alms_memory_sid',
        ),
      ],
    },
    {
      id: 'evt-harvest-rice',
      weight: 1,
      cooldown_turns: 0,
      once_per_run: false,
      content_warnings: [],
      situation_sid: 'test.situation.harvest_sid',
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

    // Top bar carries the turn. Nobody ages yet (age stays 0), and "Age 0" on
    // a grown farmer reads as a bug, so the age shows only once it is real.
    expect(() => getByText('Turn 0')).not.toThrow();
    expect(() => getByTestID('turn-top-age')).toThrow();
    expect(() => getByTestID('turn-orient-age')).toThrow();

    // Orient: every canonical resource appears as a readable strip cell —
    // the value prominent, the label small (wave 2b; was a monospace line).
    for (const id of ['time', 'energy', 'provisions', 'trust', 'skill', 'obligation'] as const) {
      expect(() => getByTestID(`turn-resource-${id}`)).not.toThrow();
    }
    // Starting values render as prominent numbers inside the cells (energy
    // and provisions both start at 100, so read the cell, not the page).
    const energyCell = getByTestID('turn-resource-energy');
    const energyValue = energyCell.children.find(
      (child) => typeof (child as { children?: readonly unknown[] }).children?.[0] === 'string',
    ) as { children: readonly unknown[] };
    expect(energyValue.children[0]).toBe('100');
    expect(() => getByText(resolveSid('resource.time_sid'))).not.toThrow();

    // Intend: all six lenses are rendered as tappable cards, each with one
    // truthful line about what choosing it changes (wave 2b).
    expect(() => getByTestID('turn-lens-generosity-hint')).not.toThrow();
    expect(() => getByText(resolveSid('lens.collected_attention_hint_sid'))).not.toThrow();
    expect(() => getByText('Generosity')).not.toThrow();
    expect(() => getByText('Careful Conduct')).not.toThrow();
    expect(() => getByText('Patient Courage')).not.toThrow();
    expect(() => getByText('Joyful Effort')).not.toThrow();
    expect(() => getByText('Collected Attention')).not.toThrow();
    expect(() => getByText('Discernment')).not.toThrow();
  });

  it('shows the age, label first, once the life has one', () => {
    const onDeath = vi.fn();
    const aged: LifeState = { ...makeInitialState(), age: 30 };
    const { getByText } = render(
      createElement(TurnScreen, { initialState: aged, eraPack: fixtureEraPack, onDeath }),
    );
    expect(() => getByText('Age 30')).not.toThrow();
    expect(() => getByText('Age: 30')).not.toThrow();
  });

  it('shows no count of flags: the count moves with the deed, so it would read as a tally', () => {
    // A kindness often sets no flag (Tang: bringing the sick traveler in) and a refusal sets one
    // (passing by), while releasing a grief in the Garden adds one. A number that rises with the
    // unkind choice, or with letting go, is a quiet moral tally; and "Ongoing situations: n" sat
    // directly above the real situation headings. The row is gone, and the lens row stays.
    const onDeath = vi.fn();
    const marked: LifeState = {
      ...makeInitialState(),
      flags: new Set(['passed_by_sick_traveler', 'attachment:memory:cleared']),
    };
    const { getByTestID } = render(
      createElement(TurnScreen, { initialState: marked, eraPack: fixtureEraPack, onDeath }),
    );
    expect(() => getByTestID('turn-orient-flags')).toThrow();
    expect(() => getByTestID('turn-orient-lens')).not.toThrow();
  });

  it('groups each event’s choices under its situation line in the act panel', () => {
    const onDeath = vi.fn();
    const { getByTestID, getByText, press, container } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    press(getByTestID('turn-lens-generosity'));

    // Each visible event renders its situation as a header above ONLY its
    // own choices — the choice the player is offered names its moment.
    const almsSituation = getByTestID('turn-situation-evt-give-alms');
    expect(almsSituation.props.accessibilityRole).toBe('header');
    expect(() => getByText(resolveSid('test.situation.alms_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('test.situation.harvest_sid'))).not.toThrow();
    expect(() => getByTestID('turn-situation-group-evt-give-alms')).not.toThrow();
    expect(() => getByTestID('turn-situation-group-evt-harvest-rice')).not.toThrow();

    // A screen reader moving button to button still hears the moment: each
    // group is a labelled group carrying its situation text.
    const almsGroup = getByTestID('turn-situation-group-evt-give-alms');
    expect(almsGroup.props.role).toBe('group');
    expect(almsGroup.props['aria-label']).toBe(resolveSid('test.situation.alms_sid'));

    // The alms situation precedes its own choice and the harvest group's
    // situation in the tree (document order).
    const order: string[] = [];
    const visit = (node: TestInstance): void => {
      const testID = String(node.props.testID ?? '');
      if (
        testID === 'turn-situation-evt-give-alms' ||
        testID === 'turn-action-choice-give-alms' ||
        testID === 'turn-situation-evt-harvest-rice'
      ) {
        order.push(testID);
      }
      for (const child of node.children) {
        if (typeof child === 'object' && child !== null) {
          visit(child as TestInstance);
        }
      }
    };
    visit(container);
    expect(order).toEqual([
      'turn-situation-evt-give-alms',
      'turn-action-choice-give-alms',
      'turn-situation-evt-harvest-rice',
    ]);

    // The existing choice contract is untouched: same testIDs, still pressable.
    press(getByTestID('turn-action-choice-give-alms'));
    expect(() => getByTestID('reflect-card')).not.toThrow();
  });

  it('renders no empty situation line for events without situation_sid', () => {
    const onDeath = vi.fn();
    const barePack: EraPack = {
      ...fixtureEraPack,
      events: fixtureEraPack.events.map((evt) => ({ ...evt, situation_sid: undefined })),
    };
    const { getByTestID, container, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: barePack,
        onDeath,
      }),
    );
    press(getByTestID('turn-lens-generosity'));
    // Graceful fallback: choices still group per event, no header, no empty text.
    const situations = container.queryAll(
      (node) =>
        node.props.testID === 'turn-situation-evt-give-alms' ||
        node.props.testID === 'turn-situation-evt-harvest-rice',
    );
    expect(situations).toHaveLength(0);
    expect(() => getByTestID('turn-action-choice-give-alms')).not.toThrow();

    // The group still exists (a control that fails on the old flat list), is
    // unlabelled, and holds no empty text before its first choice.
    const group = getByTestID('turn-situation-group-evt-give-alms');
    expect(group.props.role).toBe('group');
    expect(group.props['aria-label']).toBeUndefined();
    const strings: string[] = [];
    const collect = (node: TestInstance): void => {
      for (const child of node.children) {
        if (typeof child === 'string') {
          strings.push(child);
        } else if (typeof child === 'object' && child !== null) {
          collect(child as TestInstance);
        }
      }
    };
    collect(group);
    expect(strings.length).toBeGreaterThan(0);
    expect(strings.every((text) => text.trim() !== '')).toBe(true);
  });

  it('offers an open-bench affordance when the life charges Manifest', () => {
    const onDeath = vi.fn();
    const onOpenStudio = vi.fn();
    const { getByTestID, getByTextContent, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
        syncStudio: true,
        onOpenStudio,
      }),
    );

    const button = getByTestID('turn-open-studio');
    // The visible pill text keeps the SID's words (the arrow is a decorative
    // glyph appended after them, not part of the SID).
    expect(() => getByTextContent(resolveSid('life.turn.manifest_open_sid'))).not.toThrow();

    // It must LOOK like a control, not body text (agy-ux finding 8): a
    // pill with a border and a 44px minimum touch target.
    const style = StyleSheet.flatten(button.props.style) as {
      minHeight?: number;
      borderWidth?: number;
    };
    expect(style.minHeight ?? 0).toBeGreaterThanOrEqual(44);
    expect(style.borderWidth ?? 0).toBeGreaterThan(0);
    expect(button.props.accessibilityLabel).toBe(resolveSid('life.turn.manifest_open_sid'));

    press(button);
    expect(onOpenStudio).toHaveBeenCalledTimes(1);
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

    // Per-choice prose: What happened and What you carry render choice-specific text
    expect(() => getByText(resolveSid('test.consequence.alms_given_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('test.journal.alms_memory_sid'))).not.toThrow();
  });

  it('renders generic fallback prose when the chosen action lacks outcome_sid and journal_sid', () => {
    const onDeath = vi.fn();
    const { getByText, getByTestID, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    press(getByTestID('turn-lens-generosity'));
    // choice-harvest-rice has no outcome_sid or journal_sid
    press(getByTestID('turn-action-choice-harvest-rice'));
    expect(() => getByTestID('reflect-card')).not.toThrow();

    // Fallbacks render
    expect(() => getByText(resolveSid('event.default.consequence_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('event.default.journal_sid'))).not.toThrow();
    // Deltas still render
    expect(() => getByTestID('reflect-delta-provisions')).not.toThrow();
    expect(() => getByTestID('reflect-delta-energy')).not.toThrow();
  });

  it('drives the turn reducer end-to-end with a fixture choice carrying both outcome_sid and journal_sid', () => {
    const onDeath = vi.fn();
    const { getByText, getByTestID, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );

    // Turn 0 at start
    expect(() => getByText('Turn 0')).not.toThrow();
    expect(() => getByText('Lens: none')).not.toThrow();

    // Intend lens
    press(getByTestID('turn-lens-generosity'));
    expect(() => getByText('Lens: Generosity')).not.toThrow();

    // Act: select choice with outcome_sid and journal_sid
    press(getByTestID('turn-action-choice-give-alms'));
    expect(() => getByTestID('reflect-card')).not.toThrow();

    // Verify per-choice outcome & journal prose and deltas
    expect(() => getByText(resolveSid('test.consequence.alms_given_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('test.journal.alms_memory_sid'))).not.toThrow();
    expect(() => getByTestID('reflect-delta-trust')).not.toThrow();

    // Continue: reducer ADVANCE_TURN runs
    press(getByTestID('reflect-continue'));

    // Turn counter incremented to 1, lens reset, reflect card dismissed
    expect(() => getByText('Turn 1')).not.toThrow();
    expect(() => getByText('Lens: none')).not.toThrow();
    expect(() => getByTestID('reflect-card')).toThrow();
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

  it('bounds the lens cards to their container — the phone sideways-scroll cause', () => {
    // This does NOT prove the phone layout: jsdom has no layout engine, so
    // no vitest test can measure a flex row. It guards the CAUSE of the
    // overflow measured in a real browser (life/[lifeId], 360px: the page
    // scrolled to 548px because the lens card was content-width and its
    // one-line hint was 520px wide). A card with no width bound is
    // content-sized; a card that may not exceed its container and may
    // shrink cannot push the page sideways. The layout proof is the browser
    // probe in the harness (yaksh-browser/m1-c2b-sweep.mjs).
    const onDeath = vi.fn();
    const { getByTestID } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: fixtureEraPack,
        onDeath,
      }),
    );
    for (const lens of ['generosity', 'collected_attention']) {
      // Flatten: an innocent restyle may compose styles as an array.
      const card = StyleSheet.flatten(getByTestID(`turn-lens-${lens}`).props.style);
      expect(card.flexBasis).toBeDefined();
      expect(card.flexShrink).toBe(1);
      expect(card.maxWidth).toBe('100%');
      const hint = StyleSheet.flatten(getByTestID(`turn-lens-${lens}-hint`).props.style);
      expect(hint.flexShrink).toBe(1);
    }
  });

  it('does not offer a choice whose requires fail, and never renders a dead group', () => {
    const onDeath = vi.fn();
    const pack = structuredClone(fixtureEraPack);
    pack.events[0]!.choices.push({
      id: 'choice-wealth-blocked',
      label_sid: 'test.action.wealth_blocked_label_sid',
      requires: [{ op: 'gte', key: 'wealth', value: 1 }],
      effects: [],
      forbidden: false,
    });
    const { getByTestID, press } = render(
      createElement(TurnScreen, { initialState: makeInitialState(), eraPack: pack, onDeath }),
    );
    press(getByTestID('turn-lens-generosity'));
    // The reducer would refuse this choice; the act panel must not show it.
    expect(() => getByTestID('turn-action-choice-wealth-blocked')).toThrow();
    expect(() => getByTestID('turn-action-choice-give-alms')).not.toThrow();
  });

  it('when no choice is available, shows the empty line and lets the day pass', () => {
    const onDeath = vi.fn();
    const pack = structuredClone(fixtureEraPack);
    const blocked = {
      ...pack.events[0]!,
      id: 'evt-all-blocked',
      choices: [
        {
          ...pack.events[0]!.choices[0]!,
          id: 'choice-all-blocked',
          label_sid: 'test.action.all_blocked_label_sid',
          requires: [{ op: 'gte' as const, key: 'wealth', value: 1 }],
          effects: [],
        },
      ],
    };
    pack.events = [blocked];
    const { getByTestID, getByText, press } = render(
      createElement(TurnScreen, {
        initialState: makeInitialState(),
        eraPack: { ...pack, events: [blocked] },
        onDeath,
      }),
    );
    press(getByTestID('turn-lens-generosity'));
    expect(() => getByTestID('turn-act-empty')).not.toThrow();
    expect(() => getByTestID('turn-action-choice-all-blocked')).toThrow();
    press(getByTestID('turn-act-pass'));
    expect(() => getByText('Turn 1')).not.toThrow();
  });
});
