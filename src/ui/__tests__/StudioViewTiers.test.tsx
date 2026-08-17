// Tier-generalized studio shell — org-tier coverage for the Phase 3 Task 4
// generalization. Every fixture mounts through StudioView exactly like the
// base suite; the assertions pin the REGISTRY-DRIVEN behaviors: rail rows,
// harvest priority across benches, milestone-derived gate badges, and
// visitor banners on any tier.

import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { AccessibilityInfo } from 'react-native';

import StudioView from '@/ui/components/StudioView';
import { resolveSid, formatSid } from '@/i18n';
import { act, render } from '@/test/rntl';
import { loadProgression } from '@/content/progression/loader';
import { graduateToTier } from '@/engine/graduation';
import {
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

/** Social window: a lens marker makes the compile social, so org scale
 * matches charter and household scale matches tradition. The tick offset
 * keeps two spliced bays' window ids distinct. */
function socialWindow(at: number): ResidueEvent[] {
  return [
    { tick: at, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
    { tick: at + 1, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    { tick: at + 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
  ];
}

const SOCIAL_WINDOW: ResidueEvent[] = socialWindow(1);

function personCard(id: string, seed: bigint): Manifest {
  return tableFillManifest(SOCIAL_WINDOW, null, 0, createRng(seed), String(seed), id);
}

function householdCard(id: string, kind: 'tradition' | 'heirloom', seq: number): Manifest {
  return {
    schema_version: 'manifest/v1',
    id,
    rng_seed: `seed-${seq}`,
    brief: null,
    residue_window_id: 'w-1-3-1',
    kind,
    scale: 'household',
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

function graduatedHousehold(seeds: readonly bigint[]): StudioSession {
  const hydrated = emptyHydratedSession();
  const cards = seeds.map((seed, index) => personCard(`m-${index + 1}`, seed));
  const crossing = snapshotStudioSession(
    { ...hydrated.studio, archive: cards, pinned: null },
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
  return graduateToHousehold(crossing, loadProgression().roles.household, createRng(7n));
}

function orgGraduatedSession(seeds: readonly bigint[]): StudioSession {
  const household = graduatedHousehold(seeds);
  const orgRow = loadProgression().tiers.find((tier) => tier.id === 'org');
  if (orgRow === undefined) {
    throw new Error('org fixture: no org tier row in the registry');
  }
  const orgRoles = loadProgression().roles.org;
  if (orgRoles === undefined) {
    throw new Error('org fixture: no org roles row in the registry');
  }
  return graduateToTier(household, 'org', orgRow, orgRoles, createRng(11n));
}

/** A cooked, ready bay from a social residue window (any tier's bench shape). */
function readyBench(seed: bigint, at: number): StudioState {
  let bench: StudioState = recordStudioResidues(createStudioState(), socialWindow(at));
  bench = queueDevelop(bench, null, createRng(seed));
  bench = tickStudio(bench, bench.bay?.cook_ticks_total ?? 0);
  if (bench.bay?.status !== 'ready') {
    throw new Error('org fixture: spliced bay did not cook ready');
  }
  return bench;
}

function withReadyBay(
  session: StudioSession,
  tierId: string,
  bench: StudioState,
  at: number,
): StudioSession {
  const existing = session.benches[tierId];
  if (existing === undefined) {
    throw new Error(`org fixture: session has no ${tierId} bench`);
  }
  if (bench.bay === null) {
    throw new Error('org fixture: cooked bench has no bay');
  }
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

function kindBadges(container: TestInstance): string[] {
  return container
    .queryAll(
      (node) =>
        typeof node.props.testID === 'string' && node.props.testID.startsWith('manifest-kind-'),
    )
    .map((node) => node.children[0])
    .filter((child): child is string => typeof child === 'string');
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

describe('StudioView tier generalization', () => {
  it('renders an org rail row once the org tier is unlocked', () => {
    const { getByTestID, getByText } = renderStudio(orgGraduatedSession([101n, 103n, 107n]));

    expect(() => getByTestID('studio-rail-tier-person')).not.toThrow();
    expect(() => getByTestID('studio-rail-tier-household')).not.toThrow();
    expect(() => getByTestID('studio-rail-tier-org')).not.toThrow();
    expect(() => getByText(resolveSid('studio.tier_org_sid'))).not.toThrow();
    expect(() => getByTestID('studio-rail-tier-town')).not.toThrow();
  });

  it('harvests the highest ready bench first: an org bay outranks the household', async () => {
    const probe = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    // Household AND org bays both ready: harvest priority must pick org
    // (ladder index 2) and compile at org scale (charter for a social window).
    const session = withReadyBay(
      withReadyBay(orgGraduatedSession([211n, 223n, 227n]), 'household', readyBench(97n, 1), 1),
      'org',
      readyBench(98n, 11),
      11,
    );

    const { getByTestID, press, container, onExport } = renderStudio(session);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    press(getByTestID('studio-harvest'));
    const kinds = kindBadges(container);
    expect(kinds).toContain(resolveSid('studio.kind_charter_sid'));

    press(getByTestID('studio-export'));
    expect(onExport).toHaveBeenCalledTimes(1);
    const json = onExport.mock.calls[0]?.[0] as string;
    expect(json).toContain('"scale":"org"');
    expect(json).toContain('"kind":"charter"');

    // The next press falls through to the household rung (tradition scale).
    press(getByTestID('studio-harvest'));
    expect(kindBadges(container)).toContain(resolveSid('studio.kind_tradition_sid'));
    probe.mockRestore();
  });

  it('shows the locked org rung at 1 of 2 archived traditions from the milestone predicate', () => {
    // unlock-org = archived.tradition >= 2 AND world_drafts.household >= 1.
    // One tradition + one heirloom assemble the household world draft, so
    // the draft operand is satisfied and tradition is the worst: 1/2.
    const graduated = graduatedHousehold([307n, 311n, 313n]);
    const session = StudioSessionSchema.parse({
      ...graduated,
      archive: [
        ...graduated.archive,
        householdCard('hh-tradition', 'tradition', 1),
        householdCard('hh-heirloom', 'heirloom', 2),
      ],
      world_drafts: [...graduated.world_drafts, { scale: 'household' }],
    });

    const { getByTestID, getByText } = renderStudio(session);

    expect(() => getByTestID('studio-rail-tier-org')).not.toThrow();
    expect(() => getByText(resolveSid('studio.tier_locked_sid'))).not.toThrow();
    expect(() =>
      getByText(formatSid('studio.tier_progress_badge_sid', { n: 1, m: 2 })),
    ).not.toThrow();
  });

  it('banners a visitor seated on the org tier', () => {
    const graduated = orgGraduatedSession([401n, 409n, 419n]);
    const orgTier: TierState | undefined = graduated.tiers['org'];
    if (orgTier === undefined) {
      throw new Error('visitor fixture: org tier missing');
    }
    const session = StudioSessionSchema.parse({
      ...graduated,
      tiers: {
        ...graduated.tiers,
        org: { ...orgTier, active_visitor: { id: 'visitor/traveling-teacher', windows_left: 2 } },
      },
    });

    const { getByTestID, getByText } = renderStudio(session);

    expect(() => getByTestID('studio-visitor')).not.toThrow();
    expect(() =>
      getByText(
        formatSid('studio.visitor_banner_sid', {
          name: resolveSid('visitor.traveling_teacher.name_sid'),
        }),
      ),
    ).not.toThrow();
    expect(() => getByText(formatSid('studio.visitor_windows_sid', { n: 2 }))).not.toThrow();
  });
});
