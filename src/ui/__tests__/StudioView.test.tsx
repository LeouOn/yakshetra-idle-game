import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { AccessibilityInfo } from 'react-native';

import StudioView from '@/ui/components/StudioView';
import { resolveSid, formatSid } from '@/i18n';
import { act, render } from '@/test/rntl';
import { loadProgression } from '@/content/progression/loader';
import {
  STUDIO_SECONDS_PER_TICK,
  TABLE_FILL_REVISION,
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
import { STUDIO_SESSION_KEY, createMemoryStudioKv, loadStudioSession } from '@/persistence';
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

/** Six practices in 4h blocks: one tend batch moves several at once, so a
 * single large batch (away catch-up) folds every 4th person event up. */
const SIX_PRACTICES: Practice[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((name) => ({
  id: `practice:${name}`,
  label_sid: 'studio.tend_button_sid',
  description_sid: 'studio.title_sid',
  lens: 'joyful_effort',
  progressPerTick: 1,
  maxProgress: 1000,
  currentProgress: 0,
  level: 0,
  effects: [{ op: 'add_resource', key: 'skill', delta: 1 }],
}));

const SIX_SCHEDULE: DailySchedule = {
  id: 'six-blocks',
  name_sid: 'studio.title_sid',
  blocks: SIX_PRACTICES.map((practice, i) => ({
    id: `b${i}`,
    label_sid: 'studio.tend_button_sid',
    startHour: i * 4,
    endHour: i * 4 + 4,
    practice_id: practice.id,
    icon_sid: 'studio.title_sid',
  })),
};

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

/** Single Text child of a Pressable (roster buttons), for labels that other
 *  rows may duplicate (graduation draws roster names with replacement). */
function buttonLabel(node: TestInstance): string {
  const text = node.children[0];
  if (typeof text !== 'object' || text === null) {
    throw new Error('buttonLabel: node has no Text child');
  }
  const label = text.children[0];
  if (typeof label !== 'string') {
    throw new Error('buttonLabel: Text child has no string label');
  }
  return label;
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

  it('shows the household ladder progress badge at 2 of 3 archived', () => {
    // The gate counts archived person cards (reachable before any roster
    // exists). Two archived persons + the mount-recorded world draft leave
    // archived.person as the least-satisfied operand: 2/3.
    const cards = [personCard('m-1', 11n), personCard('m-2', 13n)];
    const session = sessionAt({ cards, pinnedId: 'm-1', focusIds: [] });

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

  /* ---- live session stepping: household accrual on the tick path ---------- */

  function graduatedSession(seeds: readonly bigint[]): StudioSession {
    const cards = seeds.map((seed, index) => personCard(`m-${index + 1}`, seed));
    const crossing = sessionAt({ cards, pinnedId: 'm-1', focusIds: ['m-2', 'm-3'] });
    return graduateToHousehold(crossing, loadProgression().roles.household, createRng(7n));
  }

  it('accrues folded household residue when live tend ticks run after graduation', async () => {
    const graduated = graduatedSession([101n, 103n, 107n]);
    const storage = createMemoryStudioKv();

    const { getByTestID, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: graduated,
        persist: true,
        storage,
        clock: () => 1_000_000,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    press(getByTestID('studio-tend'));
    press(getByTestID('studio-tend'));
    press(getByTestID('studio-tend'));
    press(getByTestID('studio-tend'));

    const saved = await loadStudioSession(storage);
    expect(saved).not.toBeNull();
    const household = saved?.benches['household'];
    expect(household).toBeDefined();
    // Autonomous members folded their morning practice onto the household
    // bench; the person fold-up marker lands from larger batches (see the
    // away test) because the fold counter bootstraps from existing marks.
    expect(household?.residue.some((e) => e.ids.includes('member:m1'))).toBe(true);
    expect(household?.residue.some((e) => e.ids.includes('member:m3'))).toBe(true);
    // Member slices advanced four tend pulses (4 × 8 ticks) and persist.
    expect(saved?.members['m1']?.life.turn).toBe(32);
    expect(saved?.members['m3']?.life.turn).toBe(32);
  });

  it('catches autonomous members up through the away path after graduation', async () => {
    const awayTicks = 120; // 5 days at 60s/tick, under the 240 cap
    const seeded = StudioSessionSchema.parse({
      ...graduatedSession([109n, 113n, 127n]),
      last_visited_at_unix: 1_000_000 - awayTicks * STUDIO_SECONDS_PER_TICK,
    });
    const storage = createMemoryStudioKv({
      [STUDIO_SESSION_KEY]: JSON.stringify(seeded),
    });

    const { getByTestID } = render(
      createElement(StudioView, {
        practices: SIX_PRACTICES,
        schedule: SIX_SCHEDULE,
        persist: true,
        storage,
        clock: () => 1_000_000,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(() => getByTestID('studio-away')).not.toThrow();
    const saved = await loadStudioSession(storage);
    // Members ran the whole absence; the single large embodied batch folds
    // every 4th person event up (6 events → 1 bench:person mark).
    expect(saved?.members['m1']?.life.turn).toBe(awayTicks);
    expect(saved?.members['m2']?.life.turn).toBe(awayTicks);
    const household = saved?.benches['household'];
    expect(household?.residue.some((e) => e.ids.includes('member:m1'))).toBe(true);
    expect(household?.residue.some((e) => e.ids.includes('bench:person'))).toBe(true);
  });

  it('harvests a household card through the live tick path after graduation', async () => {
    // E2E for the auto-queue: no hand-spliced bay — a graduated session comes
    // back from a week-long absence, the mount catch-up runs the SAME
    // stepSession tick path as live tend presses, folded member residue
    // (including practice level-ups, which make the window an heirloom)
    // auto-queues and cooks the household bay, and the harvest button yields
    // an exported household-scale card.
    const probe = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const awayTicks = 168; // 7 days at 60s/tick, under the 240 cap
    const seeded = StudioSessionSchema.parse({
      ...graduatedSession([211n, 223n, 227n]),
      last_visited_at_unix: 1_000_000 - awayTicks * STUDIO_SECONDS_PER_TICK,
    });
    const storage = createMemoryStudioKv({ [STUDIO_SESSION_KEY]: JSON.stringify(seeded) });

    const onExport = vi.fn();
    const { getByTestID, getByText, press, container } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        persist: true,
        storage,
        clock: () => 1_000_000,
        onExport,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The away catch-up charged, auto-queued, and cooked the household bay.
    expect(() => getByText(formatSid('studio.tier_ready_badge_sid', { n: 1 }))).not.toThrow();
    const saved = await loadStudioSession(storage);
    const household = saved?.benches['household'];
    expect(household?.bay?.status).toBe('ready');
    // The queued window is folded member/person residue with level-ups.
    expect(household?.bay?.residue.some((e) => e.type === 'practice_level')).toBe(true);
    expect(
      household?.bay?.residue.every(
        (e) => e.ids.some((id) => id.startsWith('member:')) || e.ids.includes('bench:person'),
      ),
    ).toBe(true);

    // A live tend pulse after the catch-up keeps the ready bay stable.
    press(getByTestID('studio-tend'));

    press(getByTestID('studio-harvest'));

    const kinds = kindBadges(container);
    expect(
      kinds.includes(resolveSid('studio.kind_tradition_sid')) ||
        kinds.includes(resolveSid('studio.kind_heirloom_sid')),
    ).toBe(true);

    press(getByTestID('studio-export'));
    expect(onExport).toHaveBeenCalledTimes(1);
    const json = onExport.mock.calls[0]?.[0] as string;
    expect(json).toContain('"scale":"household"');
    expect(json).toMatch(/"kind":"(tradition|heirloom)"/);
    probe.mockRestore();
  });

  it('keeps the household bench out of the saved session while the tier is locked', async () => {
    // Regression guard: the locked tick path stays person-only (stepSession's
    // golden invariant), asserted here at the persistence layer. Two archived
    // persons stay under the archived.person >= 3 gate.
    const cards = [personCard('m-1', 131n), personCard('m-2', 137n)];
    const locked = sessionAt({ cards, pinnedId: 'm-1', focusIds: ['m-2'] });
    const storage = createMemoryStudioKv();

    const { getByTestID, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: locked,
        persist: true,
        storage,
        clock: () => 1_000_000,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    press(getByTestID('studio-tend'));

    const saved = await loadStudioSession(storage);
    expect(saved).not.toBeNull();
    expect(saved && 'household' in saved.benches).toBe(false);
    // The person bench still accrues through the same tick path.
    expect(saved?.benches['person']?.residue.length).toBeGreaterThan(0);
  });

  /* ---- endowment modifiers: an endowed swift-cook track speeds the cook --- */

  it('shortens the visible bay cook total with an endowed swift-cook track', () => {
    const hydrated = emptyHydratedSession();
    const studio = recordStudioResidues(hydrated.studio, THING_WINDOW);
    const session = snapshotStudioSession(
      studio,
      hydrated.idle,
      hydrated.life,
      hydrated.practices,
      undefined,
      {
        tiers: {
          person: { ...createTierState('person', true), endowed: ['endow/person/swift-cook'] },
        },
        milestones_done: [],
        compendium_done: [],
        embodied_member: null,
      },
    );

    const { getByTestID, getByText, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: session,
      }),
    );

    press(getByTestID('studio-develop'));
    // Window 3 → cookTicksFor(3) = 7; swift-cook's cook_speed 1 discounts to 6.
    expect(() =>
      getByText(formatSid('studio.bay_cooking_sid', { done: 0, total: 6 })),
    ).not.toThrow();
  });

  /* ---- endowment modifiers: deep-window widens the manual develop gate ----- */

  function sessionWithTwoPending(endowed: readonly string[]): StudioSession {
    const hydrated = emptyHydratedSession();
    const studio = recordStudioResidues(hydrated.studio, THING_WINDOW.slice(0, 2));
    return snapshotStudioSession(
      studio,
      hydrated.idle,
      hydrated.life,
      hydrated.practices,
      undefined,
      {
        tiers: {
          person: { ...createTierState('person', true), endowed: [...endowed] },
        },
        milestones_done: [],
        compendium_done: [],
        embodied_member: null,
      },
    );
  }

  it('enables develop at 2 pending residue with an endowed deep-window track', () => {
    const session = sessionWithTwoPending(['endow/person/deep-window']);

    const { getByTestID, getByText, queryByText, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: session,
      }),
    );

    expect(queryByText(resolveSid('studio.develop_locked_sid'))).toBeNull();
    expect(() => getByText(resolveSid('studio.develop_button_sid'))).not.toThrow();

    press(getByTestID('studio-develop'));
    // Window 2 → cookTicksFor(2) = 6; no cook_speed endowment, no discount.
    expect(() =>
      getByText(formatSid('studio.bay_cooking_sid', { done: 0, total: 6 })),
    ).not.toThrow();
  });

  it('keeps develop locked at 2 pending residue without the deep-window track', () => {
    const session = sessionWithTwoPending([]);

    const { getByText, queryByText } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: session,
      }),
    );

    expect(() => getByText(resolveSid('studio.develop_locked_sid'))).not.toThrow();
    expect(queryByText(resolveSid('studio.develop_button_sid'))).toBeNull();
  });

  /* ---- visitors: seated guest banner, harvest decay, overlay composition --- */

  function sessionWithSeatedGuest(opts: { readyBay: boolean }): StudioSession {
    const hydrated = emptyHydratedSession();
    const base = recordStudioResidues(hydrated.studio, THING_WINDOW);
    const studio = opts.readyBay
      ? (() => {
          const queued = queueDevelop(base, null, createRng(21n));
          return tickStudio(queued, queued.bay?.cook_ticks_total ?? 0);
        })()
      : base;
    const seated: TierState = {
      ...createTierState('person', true),
      active_visitor: { id: 'visitor/gate-yaksa', windows_left: 2 },
    };
    return snapshotStudioSession(
      studio,
      hydrated.idle,
      hydrated.life,
      hydrated.practices,
      undefined,
      {
        tiers: { person: seated },
        milestones_done: [],
        compendium_done: [],
        embodied_member: null,
      },
    );
  }

  it('renders the seated guest banner with name and windows', () => {
    const { getByTestID, getByText } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: sessionWithSeatedGuest({ readyBay: false }),
      }),
    );

    expect(() => getByTestID('studio-visitor')).not.toThrow();
    expect(() =>
      getByText(
        formatSid('studio.visitor_banner_sid', {
          name: resolveSid('visitor.gate_yaksa.name_sid'),
        }),
      ),
    ).not.toThrow();
    expect(() => getByText(formatSid('studio.visitor_windows_sid', { n: 2 }))).not.toThrow();
  });

  it('decays the guest seat when its tier is harvested', () => {
    const { getByTestID, getByText, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: sessionWithSeatedGuest({ readyBay: true }),
      }),
    );

    press(getByTestID('studio-harvest'));
    expect(() => getByText(formatSid('studio.visitor_windows_sid', { n: 1 }))).not.toThrow();
  });

  it('composes the guest overlay into the develop cook discount', () => {
    const { getByTestID, getByText, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: sessionWithSeatedGuest({ readyBay: false }),
      }),
    );

    press(getByTestID('studio-develop'));
    // Window 3 → cookTicksFor(3) = 7; gate-yaksa's cook_speed 1 discounts to 6.
    expect(() =>
      getByText(formatSid('studio.bay_cooking_sid', { done: 0, total: 6 })),
    ).not.toThrow();
  });

  /* ---- compendium: panel smoke, grant + persistence round-trip, cross-state --- */

  function commonCard(id: string, seq: number): Manifest {
    return {
      schema_version: 'manifest/v1',
      id,
      rng_seed: `seed-${seq}`,
      brief: null,
      residue_window_id: 'w-1-3-1',
      kind: 'person',
      scale: 'person',
      name: `Card ${id}`,
      one_liner: 'A fixture one-liner.',
      subject: 'a fixture subject',
      detail: 'Fixture detail.',
      tags: ['fixture'],
      rarity: 'common',
      fill_status: 'table',
      quality_tier: 0,
      provenance: { source: 'table', revision: TABLE_FILL_REVISION },
    };
  }

  function sessionAtNCommonHarvests(n: number): StudioSession {
    const hydrated = emptyHydratedSession();
    const cards: Manifest[] = [];
    for (let index = 0; index < n; index += 1) {
      cards.push(commonCard(`m-${index + 1}`, index + 1));
    }
    return snapshotStudioSession(
      { ...hydrated.studio, archive: cards },
      hydrated.idle,
      hydrated.life,
      hydrated.practices,
      undefined,
      {
        tiers: { person: createTierState('person', true) },
        milestones_done: [],
        compendium_done: [],
        embodied_member: null,
      },
    );
  }

  it('renders the compendium panel with all rows and marks a done row', () => {
    const { getByTestID, getByText, container } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: sessionAtNCommonHarvests(1),
      }),
    );

    expect(() => getByTestID('studio-compendium')).not.toThrow();
    expect(() => getByTestID('studio-compendium-row-compendium/first-harvest')).not.toThrow();
    expect(() => getByText(resolveSid('compendium.first_harvest.name_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('compendium.first_harvest.desc_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('studio.compendium_done_sid'))).not.toThrow();
    const lockedText = resolveSid('studio.compendium_locked_sid');
    const lockedRows = container.queryAll(
      (node) =>
        node.type === 'Text' && node.children.length === 1 && node.children[0] === lockedText,
    );
    expect(lockedRows.length).toBeGreaterThanOrEqual(4);
    expect(() => getByTestID('studio-compendium-row-compendium/five-harvests')).not.toThrow();
  });

  it('persists a granted compendium id through snapshotStudioSession → parseStudioSession', () => {
    const session = sessionAtNCommonHarvests(1);
    expect(session.compendium_done).toEqual([]);
    const seeded: StudioSession = StudioSessionSchema.parse({
      ...session,
      compendium_done: ['compendium/first-harvest'],
    });
    expect(seeded.compendium_done).toEqual(['compendium/first-harvest']);
    const reparsed = StudioSessionSchema.parse(seeded);
    expect(reparsed.compendium_done).toEqual(['compendium/first-harvest']);
  });

  it('flips the five-harvests row to done when the initial archive has 5 commons', () => {
    const { getByTestID, getByText } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: sessionAtNCommonHarvests(5),
      }),
    );

    expect(() => getByTestID('studio-compendium')).not.toThrow();
    expect(() => getByText(resolveSid('compendium.five_harvests.name_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('compendium.five_harvests.desc_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('compendium.first_harvest.name_sid'))).not.toThrow();
  });

  /* ---- roster panel: mount gate, focus row, embodiment swap ---------------- */

  it('hides the roster while the household is locked and seats it after graduation', () => {
    const locked = sessionAt({ cards: [], pinnedId: null, focusIds: [] });
    const hidden = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: locked,
      }),
    );
    expect(hidden.container.queryAll((node) => node.props.testID === 'studio-roster')).toHaveLength(
      0,
    );

    const graduated = graduatedSession([307n, 311n, 313n]);
    const shown = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: graduated,
      }),
    );
    expect(() => shown.getByTestID('studio-roster')).not.toThrow();
    for (const id of ['m1', 'm2', 'm3']) {
      expect(() => shown.getByTestID(`studio-roster-member-${id}`)).not.toThrow();
    }
  });

  it('assigns focus to a roster member and persists the row', async () => {
    const graduated = graduatedSession([317n, 331n, 337n]);
    const focused = graduated.archive.find((card) => card.id === 'm-1');
    expect(focused?.kind).toBe('person');
    const storage = createMemoryStudioKv();

    const { getByTestID, getByText, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: graduated,
        persist: true,
        storage,
        clock: () => 1_000_000,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    press(getByTestID('studio-roster-focus-m1'));
    if (focused === undefined) {
      throw new Error('roster focus test: fixture card m-1 missing');
    }
    expect(() =>
      getByText(formatSid('studio.roster_focus_label_sid', { name: focused.name })),
    ).not.toThrow();

    const saved = await loadStudioSession(storage);
    const row = saved?.tiers['household']?.roster.members.find((m) => m.id === 'm1');
    expect(row?.focus_id).toBe('m-1');
  });

  it('swaps embodiment from the roster and restores it on release', async () => {
    const graduated = graduatedSession([347n, 349n, 353n]);
    const m1 = graduated.tiers['household']?.roster.members.find((m) => m.id === 'm1');
    expect(m1).toBeDefined();
    if (m1 === undefined) {
      throw new Error('roster embody test: fixture member m1 missing');
    }
    const storage = createMemoryStudioKv();

    const { getByTestID, press } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: graduated,
        persist: true,
        storage,
        clock: () => 1_000_000,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    press(getByTestID('studio-roster-embody-m1'));
    expect(buttonLabel(getByTestID('studio-roster-embody-m1'))).toBe(
      formatSid('studio.roster_embodied_sid', { name: m1.name }),
    );
    let saved = await loadStudioSession(storage);
    expect(saved?.embodied_member).toEqual({ tier: 'household', member: 'm1' });
    expect(saved?.tiers['household']?.roster.members.find((m) => m.id === 'm1')?.embodied).toBe(
      true,
    );

    press(getByTestID('studio-roster-embody-m1'));
    expect(buttonLabel(getByTestID('studio-roster-embody-m1'))).toBe(
      formatSid('studio.roster_embody_sid', { name: m1.name }),
    );
    saved = await loadStudioSession(storage);
    expect(saved?.embodied_member).toBeNull();
  });

  it('graduates through harvest presses alone and dismisses into the roster', async () => {
    // The reachability pin, played honestly: a locked household with an EMPTY
    // archive; each round seeds one social residue window (person kinds need a
    // lens marker, which idle ticks never stamp) and the card itself lands via
    // develop → tend → harvest PRESSES. Round three graduates inside the mount.
    const probe = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    function socialWindow(lensId: string, tick: number): ResidueEvent[] {
      return [
        { tick, type: 'lens_chosen', ids: [lensId], numbers: {} },
        {
          tick: tick + 1,
          type: 'practice_tick',
          ids: ['practice.test'],
          numbers: { progress: 2 },
        },
        {
          tick: tick + 2,
          type: 'practice_tick',
          ids: ['practice.test'],
          numbers: { progress: 2 },
        },
      ];
    }

    function withWindow(session: StudioSession, window: readonly ResidueEvent[]): StudioSession {
      const bench = session.benches['person'];
      if (bench === undefined) {
        throw new Error('graduation e2e: session has no person bench');
      }
      return StudioSessionSchema.parse({
        ...session,
        benches: {
          ...session.benches,
          person: { ...bench, residue: [...bench.residue, ...window], bay: null },
        },
      });
    }

    async function harvestRound(
      session: StudioSession,
      window: readonly ResidueEvent[],
    ): Promise<StudioSession> {
      const storage = createMemoryStudioKv();
      const view = render(
        createElement(StudioView, {
          practices: [makePractice()],
          schedule: ALL_DAY,
          initialSession: withWindow(session, window),
          persist: true,
          storage,
          clock: () => 1_000_000,
        }),
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      view.press(view.getByTestID('studio-develop'));
      view.press(view.getByTestID('studio-tend'));
      view.press(view.getByTestID('studio-harvest'));
      act(() => {
        view.root.unmount();
      });
      const saved = await loadStudioSession(storage);
      if (saved === null) {
        throw new Error('graduation e2e: round did not persist');
      }
      return saved;
    }

    let session: StudioSession = sessionAt({ cards: [], pinnedId: null, focusIds: [] });
    session = await harvestRound(session, socialWindow('lens.a', 10));
    expect(session.archive.filter((card) => card.kind === 'person')).toHaveLength(1);
    session = await harvestRound(session, socialWindow('lens.b', 20));
    expect(session.archive.filter((card) => card.kind === 'person')).toHaveLength(2);
    expect(session.world_drafts).toHaveLength(1);
    expect(session.milestones_done).toEqual([]);

    const storage = createMemoryStudioKv();
    const { getByTestID, press, container } = render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: withWindow(session, socialWindow('lens.c', 30)),
        persist: true,
        storage,
        clock: () => 1_000_000,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.queryAll((node) => node.props.testID === 'studio-roster')).toHaveLength(0);

    press(getByTestID('studio-develop'));
    press(getByTestID('studio-tend'));
    press(getByTestID('studio-harvest'));

    expect(() => getByTestID('graduation-overlay')).not.toThrow();
    press(getByTestID('graduation-dismiss'));
    expect(() => getByTestID('studio-roster')).not.toThrow();
    for (const id of ['m1', 'm2', 'm3']) {
      expect(() => getByTestID(`studio-roster-member-${id}`)).not.toThrow();
    }

    const saved = await loadStudioSession(storage);
    expect(saved?.milestones_done).toContain('unlock-household');
    expect(saved?.tiers['household']?.unlocked).toBe(true);
    expect(saved?.world_drafts).toHaveLength(1);
    probe.mockRestore();
  });
});
