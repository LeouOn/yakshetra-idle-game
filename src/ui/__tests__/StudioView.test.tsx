import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { AccessibilityInfo } from 'react-native';

import StudioView from '@/ui/components/StudioView';
import { resolveSid, formatSid } from '@/i18n';
import { act, render } from '@/test/rntl';
import { loadProgression } from '@/content/progression/loader';
import {
  createRng,
  createStudioState,
  createTierState,
  emptyHydratedSession,
  graduateToHousehold,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
  StudioSessionSchema,
  tableFillManifest,
  tickStudio,
  type Manifest,
  type Practice,
  type ResidueEvent,
  type StudioSession,
  type StudioState,
  type TierState,
} from '@/engine';
import type { DailySchedule } from '@/engine/schedule';
import type { TestInstance } from 'test-renderer';

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

function renderStudio(onExport = vi.fn()) {
  return {
    onExport,
    ...render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        onExport,
      }),
    ),
  };
}

const THING_WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
  { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
];

const PERSON_WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
  { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
];

const PLACE_WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice.a'], numbers: { progress: 2 } },
  { tick: 2, type: 'practice_tick', ids: ['practice.b'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['practice.b'], numbers: { progress: 2 } },
];

interface StyledNode {
  readonly props: { readonly style?: unknown };
}

function borderWidths(node: StyledNode): number[] {
  const raw = node.props.style;
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => entry.borderWidth)
    .filter((width): width is number => typeof width === 'number');
}

function kindBadges(container: TestInstance): string[] {
  return container
    .queryAll(
      (node) =>
        typeof node.props.testID === 'string' && node.props.testID.startsWith('manifest-kind-'),
    )
    .map((node) => node.children[0])
    .filter((child): child is string => typeof child === 'string');
}

describe('StudioView', () => {
  it('renders the bench with an empty bay and locked develop', () => {
    const { getByText, getByTestID } = renderStudio();
    expect(() => getByTestID('studio-screen')).not.toThrow();
    expect(() => getByText(resolveSid('studio.title_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('studio.develop_locked_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('studio.bay_empty_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('studio.archive_empty_sid'))).not.toThrow();
  });

  it('tends, develops, cooks, harvests a card, and exports JSON', () => {
    const { getByTestID, getByText, press, onExport, container } = renderStudio();

    press(getByTestID('studio-tend'));
    press(getByTestID('studio-tend'));
    press(getByTestID('studio-tend'));
    expect(() => getByText(resolveSid('studio.charge_ready_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('studio.develop_button_sid'))).not.toThrow();

    press(getByTestID('studio-develop'));
    expect(() => getByText(resolveSid('studio.bay_empty_sid'))).toThrow();

    press(getByTestID('studio-tend'));
    expect(() => getByText(resolveSid('studio.bay_ready_sid'))).not.toThrow();

    press(getByTestID('studio-harvest'));
    expect(() => getByText(resolveSid('studio.archive_empty_sid'))).toThrow();
    expect(kindBadges(container)).toEqual([resolveSid('studio.kind_thing_sid')]);

    press(getByTestID('studio-export'));
    expect(onExport).toHaveBeenCalledTimes(1);
    const json = onExport.mock.calls[0]?.[0] as string;
    expect(json).toContain('"schema_version":"manifest/v1"');
  });

  it('renders a person kind badge when a social window is harvested', () => {
    const social: ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    ];
    let studio: StudioState = recordStudioResidues(createStudioState(), social);
    studio = queueDevelop(studio, null, createRng(31n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
    expect(studio.bay?.status).toBe('ready');

    const { getByTestID, press, container } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: studio,
      }),
    );

    press(getByTestID('studio-harvest'));
    expect(kindBadges(container)).toEqual([resolveSid('studio.kind_person_sid')]);
  });

  it('filters a mixed archive by kind and shows a per-kind empty state', () => {
    const thingCard = tableFillManifest(THING_WINDOW, null, 0, createRng(41n), '41', 'm-thing');
    const personCard = tableFillManifest(PERSON_WINDOW, null, 0, createRng(43n), '43', 'm-person');
    expect(thingCard.kind).toBe('thing');
    expect(personCard.kind).toBe('person');
    const studio: StudioState = { ...createStudioState(), archive: [thingCard, personCard] };

    const { getByTestID, getByText, queryByText, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: studio,
      }),
    );

    expect(() => getByText(thingCard.name)).not.toThrow();
    expect(() => getByText(personCard.name)).not.toThrow();

    press(getByTestID('studio-filter-thing'));
    expect(() => getByText(thingCard.name)).not.toThrow();
    expect(queryByText(personCard.name)).toBeNull();

    press(getByTestID('studio-filter-person'));
    expect(() => getByText(personCard.name)).not.toThrow();
    expect(queryByText(thingCard.name)).toBeNull();

    press(getByTestID('studio-filter-change'));
    expect(() => getByText(resolveSid('studio.archive_filter_empty_sid'))).not.toThrow();
    expect(queryByText(thingCard.name)).toBeNull();
    expect(queryByText(personCard.name)).toBeNull();

    press(getByTestID('studio-filter-all'));
    expect(() => getByText(thingCard.name)).not.toThrow();
    expect(() => getByText(personCard.name)).not.toThrow();
  });

  it('adds the freshly harvested card to the document with a flourish border', () => {
    let studio: StudioState = recordStudioResidues(createStudioState(), THING_WINDOW);
    studio = queueDevelop(studio, null, createRng(51n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);

    const { getByTestID, press, container } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: studio,
      }),
    );

    press(getByTestID('studio-harvest'));
    const cards = container.queryAll(
      (node) =>
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('manifest-') &&
        !node.props.testID.startsWith('manifest-kind-'),
    );
    expect(cards).toHaveLength(1);
    expect(borderWidths(cards[0]!)).toContain(2);
  });

  it('skips the flourish but keeps the card when reduced motion is preferred', async () => {
    const probe = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    let studio: StudioState = recordStudioResidues(createStudioState(), THING_WINDOW);
    studio = queueDevelop(studio, null, createRng(53n));
    studio = tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);

    const { getByTestID, press, container } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: studio,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(probe).toHaveBeenCalled();

    press(getByTestID('studio-harvest'));
    const cards = container.queryAll(
      (node) =>
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('manifest-') &&
        !node.props.testID.startsWith('manifest-kind-'),
    );
    expect(cards).toHaveLength(1);
    expect(borderWidths(cards[0]!)).not.toContain(2);
  });

  it('lists the manifested cast and place names on the world shelf', () => {
    const personCard = tableFillManifest(
      PERSON_WINDOW,
      null,
      0,
      createRng(61n),
      '61',
      'm-w-person',
    );
    const placeCard = tableFillManifest(PLACE_WINDOW, null, 0, createRng(67n), '67', 'm-w-place');
    expect(personCard.kind).toBe('person');
    expect(placeCard.kind).toBe('place');
    const studio: StudioState = {
      ...createStudioState(),
      archive: [placeCard, personCard],
    };

    const { getByTestID } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialStudio: studio,
      }),
    );

    expect(() => getByTestID(`studio-world-place-${placeCard.id}`)).not.toThrow();
    expect(() => getByTestID(`studio-world-cast-${personCard.id}`)).not.toThrow();
    const placeRow = getByTestID(`studio-world-place-${placeCard.id}`);
    expect(placeRow.children[0]).toBe(placeCard.name);
    const castRow = getByTestID(`studio-world-cast-${personCard.id}`);
    expect(castRow.children[0]).toBe(personCard.name);
  });

  it('tells the player what to do while the world shelf is empty', () => {
    const { getByTestID, getByTextContent } = renderStudio();

    expect(() => getByTestID('studio-world')).not.toThrow();
    const guidance = resolveSid('studio.world_empty_sid');
    expect(guidance).toContain('life');
    expect(() => getByTextContent(guidance)).not.toThrow();
  });

  /* ---- graduation: rail, progress, ceremony, household harvest ------------- */

  function personCard(id: string, seed: bigint): Manifest {
    return tableFillManifest(PERSON_WINDOW, null, 0, createRng(seed), String(seed), id);
  }

  function personTier(focusIds: readonly string[]): TierState {
    return {
      ...createTierState('person', true),
      roster: {
        tier: 'person',
        members: focusIds.map((focus_id, index) => ({
          id: `p-member-${index}`,
          name: `Focus ${index}`,
          role: 'keeper',
          policy: 'policy:household-base',
          embodied: false,
          focus_id,
          seed: index,
        })),
      },
    };
  }

  function sessionAt(parts: {
    readonly cards: readonly Manifest[];
    readonly pinnedId: string | null;
    readonly focusIds: readonly string[];
  }): StudioSession {
    const cards = [...parts.cards];
    const pinnedCard = cards.find((card) => card.id === parts.pinnedId) ?? null;
    const hydrated = emptyHydratedSession();
    return snapshotStudioSession(
      {
        ...hydrated.studio,
        archive: cards,
        pinned:
          pinnedCard === null
            ? null
            : {
                id: pinnedCard.id,
                name: pinnedCard.name,
                kind: 'person',
                one_liner: pinnedCard.one_liner,
              },
      },
      hydrated.idle,
      hydrated.life,
      hydrated.practices,
      undefined,
      {
        tiers: { person: personTier(parts.focusIds) },
        milestones_done: [],
        compendium_done: [],
        embodied_member: null,
      },
    );
  }

  it('shows the household ladder progress badge at 2 of 3 pinned', () => {
    const cards = [personCard('m-1', 11n), personCard('m-2', 13n), personCard('m-3', 17n)];
    const session = sessionAt({ cards, pinnedId: 'm-1', focusIds: ['m-2'] });

    const { getByTestID, getByText } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: session,
      }),
    );

    expect(() => getByTestID('studio-rail')).not.toThrow();
    expect(() => getByTestID('studio-rail-tier-person')).not.toThrow();
    expect(() => getByTestID('studio-rail-tier-household')).not.toThrow();
    expect(() => getByText(resolveSid('studio.tier_locked_sid'))).not.toThrow();
    expect(() =>
      getByText(formatSid('studio.tier_progress_badge_sid', { n: 2, m: 3 })),
    ).not.toThrow();
  });

  it('graduates with a ceremony when the milestone crosses and dismiss persists', () => {
    const cards = [personCard('m-1', 19n), personCard('m-2', 23n), personCard('m-3', 29n)];
    const session = sessionAt({ cards, pinnedId: 'm-1', focusIds: ['m-2', 'm-3'] });

    const { getByTestID, getByText, queryByText, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: session,
      }),
    );

    expect(() => getByTestID('graduation-overlay')).not.toThrow();
    expect(() => getByText(resolveSid('graduation.household_title_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('graduation.household_line_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('graduation.dismiss_button_sid'))).not.toThrow();

    press(getByTestID('graduation-dismiss'));
    expect(queryByText(resolveSid('graduation.household_title_sid'))).toBeNull();
    // The tier stays graduated after the ceremony: the rail names it, unlocked.
    expect(() => getByText(resolveSid('studio.tier_household_sid'))).not.toThrow();
  });

  it('harvests a ready household bay as a household-scale tradition or heirloom', async () => {
    const probe = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const cards = [personCard('m-1', 31n), personCard('m-2', 37n), personCard('m-3', 41n)];
    const crossing = sessionAt({ cards, pinnedId: 'm-1', focusIds: ['m-2', 'm-3'] });
    const graduated = graduateToHousehold(
      crossing,
      loadProgression().roles.household,
      createRng(7n),
    );

    const folded: ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test', 'member:m1'], numbers: {} },
      {
        tick: 2,
        type: 'practice_tick',
        ids: ['practice.test', 'member:m1'],
        numbers: { progress: 2 },
      },
      {
        tick: 3,
        type: 'practice_tick',
        ids: ['practice.test', 'member:m2'],
        numbers: { progress: 2 },
      },
    ];
    let bench: StudioState = recordStudioResidues(createStudioState(), folded);
    bench = queueDevelop(bench, null, createRng(97n));
    bench = tickStudio(bench, bench.bay?.cook_ticks_total ?? 0);
    expect(bench.bay?.status).toBe('ready');

    const session = StudioSessionSchema.parse({
      ...graduated,
      benches: {
        ...graduated.benches,
        household: {
          residue: folded,
          last_harvest_index: bench.last_harvest_index,
          bay: bench.bay,
          quality_tier: 0,
          harvest_count: 0,
          play_import: null,
          pinned: null,
          surplus: 0,
        },
      },
    });

    const onExport = vi.fn();
    const { getByTestID, getByText, press, container } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: session,
        onExport,
      }),
    );

    // Let the reduced-motion probe land before harvesting (no flourish timer).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The rail flags the ready household bench before the harvest.
    expect(() => getByText(formatSid('studio.tier_ready_badge_sid', { n: 1 }))).not.toThrow();

    press(getByTestID('studio-harvest'));
    const kinds = kindBadges(container);
    expect(kinds).toContain(resolveSid('studio.kind_tradition_sid'));

    press(getByTestID('studio-export'));
    expect(onExport).toHaveBeenCalledTimes(1);
    const json = onExport.mock.calls[0]?.[0] as string;
    expect(json).toContain('"scale":"household"');
    expect(json).toContain('"kind":"tradition"');
    probe.mockRestore();
  });
});
