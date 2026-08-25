// Ladder rail E2E — Phase 4 Task 4, widened to the nation/world rungs in
// Phase 8.
//
// Pins the UI surface for the ladder chain end to end:
//
//   (a) The rail discloses rung by rung: unlocked tiers render, the next
//       locked rung shows its progress badge (city at the town-graduated
//       session, nation at the region-graduated one), and deeper rungs
//       (region, then world) stay masked by the disclosure loop.
//   (b) Full disclosure renders all EIGHT rows once every tier is
//       unlocked (person .. world).
//   (c) Harvesting a ready city bench fills the archive with a card whose
//       scale is `city` (kind institution or monument) and the export
//       JSON carries `"scale":"city"`.
//   (d) The next-action rail still fires for the top tier: a city bench
//       ready for harvest lights `studio.next_harvest_sid` with the city
//       tier label.
//
// All fixtures use the real content rows via `loadProgression()` — no
// hardcoded tier ids in assertions, no fabricated manifest kinds.

import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { AccessibilityInfo } from 'react-native';

import StudioView from '@/ui/components/StudioView';
import { formatSid, resolveSid } from '@/i18n';
import { act, render } from '@/test/rntl';
import { loadProgression } from '@/content/progression/loader';
import {
  StudioSessionSchema,
  createRng,
  createStudioState,
  emptyHydratedSession,
  graduateToHousehold,
  graduateToTier,
  queueDevelop,
  recordStudioResidues,
  snapshotStudioSession,
  tickStudio,
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

// Social window: a lens marker makes the compile social, so org scale
// matches charter, household scale matches tradition, city scale matches
// institution. The tick offset keeps two spliced bays' window ids distinct.
function socialWindow(at: number): ResidueEvent[] {
  return [
    { tick: at, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
    { tick: at + 1, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    { tick: at + 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
  ];
}

function readyBench(seed: bigint, at: number): StudioState {
  let bench: StudioState = recordStudioResidues(createStudioState(), socialWindow(at));
  bench = queueDevelop(bench, null, createRng(seed));
  bench = tickStudio(bench, bench.bay?.cook_ticks_total ?? 0);
  if (bench.bay?.status !== 'ready') {
    throw new Error('ladder-e2e fixture: spliced bay did not cook ready');
  }
  return bench;
}

function graduateToCity(): StudioSession {
  const reg = loadProgression();
  const hydrated = emptyHydratedSession();
  const base = snapshotStudioSession(
    hydrated.studio,
    hydrated.idle,
    hydrated.life,
    hydrated.practices,
  );
  const household = graduateToHousehold(base, reg.roles['household'], createRng(11n));

  const orgRow = reg.tiers.find((tier) => tier.id === 'org');
  if (orgRow === undefined) throw new Error('ladder-e2e fixture: no org tier row');
  const orgRoles = reg.roles['org'];
  if (orgRoles === undefined) throw new Error('ladder-e2e fixture: no org roles row');
  const org = graduateToTier(household, 'org', orgRow, orgRoles, createRng(13n));

  const townRow = reg.tiers.find((tier) => tier.id === 'town');
  if (townRow === undefined) throw new Error('ladder-e2e fixture: no town tier row');
  const town = graduateToTier(org, 'town', townRow, null, createRng(17n));

  const cityRow = reg.tiers.find((tier) => tier.id === 'city');
  if (cityRow === undefined) throw new Error('ladder-e2e fixture: no city tier row');
  const cityRoles = reg.roles['city'];
  if (cityRoles === undefined) throw new Error('ladder-e2e fixture: no city roles row');
  return graduateToTier(town, 'city', cityRow, cityRoles, createRng(19n));
}

function graduateToRegion(): StudioSession {
  const reg = loadProgression();
  const city = graduateToCity();
  const regionRow = reg.tiers.find((tier) => tier.id === 'region');
  if (regionRow === undefined) throw new Error('ladder-e2e fixture: no region tier row');
  return graduateToTier(city, 'region', regionRow, null, createRng(23n));
}

function withReadyBay(
  session: StudioSession,
  tierId: string,
  bench: StudioState,
  at: number,
): StudioSession {
  const existing = session.benches[tierId];
  if (existing === undefined) {
    throw new Error(`ladder-e2e fixture: session has no ${tierId} bench`);
  }
  if (bench.bay === null) {
    throw new Error('ladder-e2e fixture: cooked bench has no bay');
  }
  // Same re-parse pattern as StudioViewTiers' withReadyBay: the literal
  // matches BenchState modulo readonly array types and the parser normalises.
  return StudioSessionSchema.parse({
    ...session,
    benches: {
      ...session.benches,
      [tierId]: {
        ...existing,
        residue: socialWindow(at),
        bay: bench.bay,
      },
    },
  });
}

function renderStudio(session: StudioSession, onExport = vi.fn()) {
  return {
    onExport,
    ...render(
      createElement(StudioView, {
        practices: [makePractice()],
        schedule: ALL_DAY,
        initialSession: session,
        onExport,
      }),
    ),
  };
}

function kindBadgesFor(container: ReturnType<typeof render>['container']): string[] {
  return container
    .queryAll(
      (node) =>
        typeof node.props.testID === 'string' && node.props.testID.startsWith('manifest-kind-'),
    )
    .map((node) => node.children[0])
    .filter((child): child is string => typeof child === 'string');
}

describe('StudioView six-tier ladder (Phase 4 Task 4)', () => {
  it('renders five rail rows with the next locked rung showing its badge', () => {
    const { getByTestID, getByText, queryByText } = renderStudio(graduateToCity());

    // Unlocked rungs render with their tier label SID.
    for (const id of ['person', 'household', 'org', 'town'] as const) {
      expect(() => getByTestID(`studio-rail-tier-${id}`), `unlocked ${id}`).not.toThrow();
      expect(
        () => getByText(resolveSid(`studio.tier_${id}_sid`)),
        `unlocked ${id} label`,
      ).not.toThrow();
    }

    // The next locked rung — city — is shown with the locked mask and its
    // progress badge (1 of 2 archived cards of its gate, since the
    // city-graduated session holds zero archived cards yet).
    expect(() => getByTestID('studio-rail-tier-city')).not.toThrow();
    expect(() => getByText(resolveSid('studio.tier_locked_sid'))).not.toThrow();
    expect(() =>
      getByText(formatSid('studio.tier_progress_badge_sid', { n: 0, m: 1 })),
    ).not.toThrow();

    // The deeper rung — region — stays masked by the disclosure loop
    // (the rail breaks at the first locked rung).
    expect(queryByText(resolveSid('studio.tier_region_sid'))).toBeNull();
  });

  it('renders six rail rows when the first six tiers are unlocked (nation masked)', () => {
    const city = graduateToCity();
    const reg = loadProgression();
    const regionRow = reg.tiers.find((tier) => tier.id === 'region');
    if (regionRow === undefined) throw new Error('ladder-e2e fixture: no region tier row');
    const fullyUnlocked = graduateToTier(city, 'region', regionRow, null, createRng(23n));

    const { getByTestID, getByText, queryByText } = renderStudio(fullyUnlocked);

    for (const id of ['person', 'household', 'org', 'town', 'city', 'region'] as const) {
      expect(() => getByTestID(`studio-rail-tier-${id}`), `unlocked ${id}`).not.toThrow();
      expect(
        () => getByText(resolveSid(`studio.tier_${id}_sid`)),
        `unlocked ${id} label`,
      ).not.toThrow();
    }

    // Nation stays masked by the disclosure loop (the rail breaks at the
    // first locked rung — nation).
    expect(queryByText(resolveSid('studio.tier_nation_sid'))).toBeNull();
  });

  it('shows the nation locked badge once region is unlocked and keeps world masked', () => {
    const { getByTestID, getByText, queryByText } = renderStudio(graduateToRegion());

    // The next locked rung — nation — is shown with the locked mask and its
    // progress badge (0 of 1 archived legends of its gate, since the
    // region-graduated session holds zero archived cards and drafts yet).
    expect(() => getByTestID('studio-rail-tier-nation')).not.toThrow();
    expect(() => getByText(resolveSid('studio.tier_locked_sid'))).not.toThrow();
    expect(() =>
      getByText(formatSid('studio.tier_progress_badge_sid', { n: 0, m: 1 })),
    ).not.toThrow();

    // The deeper rung — world — stays masked by the disclosure loop.
    expect(queryByText(resolveSid('studio.tier_world_sid'))).toBeNull();
  });

  it('renders eight rail rows when every tier is unlocked (full disclosure)', () => {
    const reg = loadProgression();
    const nationRow = reg.tiers.find((tier) => tier.id === 'nation');
    if (nationRow === undefined) throw new Error('ladder-e2e fixture: no nation tier row');
    const nationRoles = reg.roles['nation'];
    if (nationRoles === undefined) throw new Error('ladder-e2e fixture: no nation roles row');
    const nation = graduateToTier(
      graduateToRegion(),
      'nation',
      nationRow,
      nationRoles,
      createRng(29n),
    );

    const worldRow = reg.tiers.find((tier) => tier.id === 'world');
    if (worldRow === undefined) throw new Error('ladder-e2e fixture: no world tier row');
    const fullyUnlocked = graduateToTier(nation, 'world', worldRow, null, createRng(31n));

    const { getByTestID, getByText } = renderStudio(fullyUnlocked);

    for (const id of [
      'person',
      'household',
      'org',
      'town',
      'city',
      'region',
      'nation',
      'world',
    ] as const) {
      expect(() => getByTestID(`studio-rail-tier-${id}`), `unlocked ${id}`).not.toThrow();
      expect(
        () => getByText(resolveSid(`studio.tier_${id}_sid`)),
        `unlocked ${id} label`,
      ).not.toThrow();
    }
  });

  it('harvests a city bench at city scale and exports a city-scaled card', async () => {
    const probe = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const session = withReadyBay(graduateToCity(), 'city', readyBench(31n, 1), 1);

    const { getByTestID, press, container, onExport } = renderStudio(session);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The city tier is the highest-index unlocked bench with a ready bay,
    // so harvest priority must pick it and compile at city scale. The
    // social window picks institution (city scale) over monument.
    press(getByTestID('studio-harvest'));
    const kinds = kindBadgesFor(container);
    expect(kinds).toContain(resolveSid('studio.kind_institution_sid'));

    press(getByTestID('studio-export'));
    expect(onExport).toHaveBeenCalledTimes(1);
    const json = onExport.mock.calls[0]?.[0] as string;
    expect(json).toContain('"scale":"city"');
    expect(json).toContain('"kind":"institution"');

    probe.mockRestore();
  });

  it('the next-action rail fires for the city tier when its bay is ready', () => {
    const session = withReadyBay(graduateToCity(), 'city', readyBench(41n, 1), 1);
    const { getByTestID, getByText } = renderStudio(session);

    expect(() => getByTestID('studio-next-action')).not.toThrow();
    expect(() =>
      getByText(formatSid('studio.next_harvest_sid', { tier: resolveSid('studio.tier_city_sid') })),
    ).not.toThrow();
  });
});
