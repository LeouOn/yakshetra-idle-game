// LifeStart screen tests.
//
// Uses the test-renderer shim at @/test/rntl (see the ReflectCard test for the
// rationale: the real @testing-library/react-native cannot run under vitest 4 +
// RN 0.86). The loader, expo-router, and useSaveSlot are mocked so the test
// exercises the screen's render logic and navigation, not the filesystem or
// the persistence adapter.
//
// Plan reference: todo 12.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createElement } from 'react';

import type { LoadedEraPack } from '@/content/loader';
import { loadEraPack } from '@/content/loader';
import { router } from 'expo-router';
import LifeStartScreen from '../../../app/life/start';
import { render, act } from '@/test/rntl';

// vi.mock factories are hoisted above the imports by vitest's transformer.
vi.mock('@/content/loader', () => ({
  loadEraPack: vi.fn(),
}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  router: { push: vi.fn() },
}));
vi.mock('@/ui/hooks/useSaveSlot', () => ({
  useSaveSlot: () => ({ state: null, loading: false, dispatch: vi.fn() }),
}));

/**
 * Build a minimal valid LoadedEraPack fixture for the 'tang-china' era. The
 * sids (name_sid, lineage_notes_sid) resolve against the real en.json table;
 * the loader is mocked so schema/lint validation is not re-run here. The
 * `endings`, `practices`, `schedules`, `sutras`, `mantras`, and `figures`
 * fields are required by LoadedEraPack (the loader attaches them as siblings
 * to the schema-validated EraPack) but unused by the LifeStart screen, so
 * empty arrays suffice.
 */
function makeFixturePack(
  overrides: Partial<
    Omit<
      LoadedEraPack,
      'endings' | 'practices' | 'schedules' | 'sutras' | 'mantras' | 'figures' | 'minigames'
    >
  > = {},
): LoadedEraPack {
  const event = (id: string) => ({
    id,
    weight: 1,
    cooldown_turns: 0,
    once_per_run: false,
    content_warnings: [] as string[],
    choices: [
      {
        id: 'c1',
        label_sid: `event.${id}.c1.label_sid`,
        requires: [],
        effects: [],
        forbidden: false,
      },
    ],
  });
  return {
    id: 'tang-china@0.1.0',
    name_sid: 'era.tang-china.name_sid',
    locale_default: 'en',
    locale_available: ['en'],
    schema_version: '0.1',
    engine_compat: '^0.1.0',
    lens_set: 'six-paramita-mahayana',
    social: { paramitas: ['generosity'], relations: ['teacher'] },
    calendar: 'tang-lunar',
    content_warnings: ['references-to-death', 'depiction-of-illness'],
    events: [
      event('ev_one'),
      event('ev_two'),
      event('ev_three'),
      event('ev_four'),
      event('ev_five'),
      event('ev_six'),
    ],
    lineage_notes_sid: 'era.tang-china.lineage_notes_sid',
    glossary: { market: { en: 'The Western Market of Chang\u2019an.' } },
    source_bibliography: [
      { citation: 'A study of Tang commerce.', url: 'https://example.org/tang' },
    ],
    permitted_imagery: ['market'],
    rule_variation: {
      id: 'social-obligation-default',
      description_sid: 'rule.default.description_sid',
      enforces: 'social-obligation',
    },
    starting_roles: [
      {
        id: 'peasant',
        label_sid: 'tang.role.peasant.label_sid',
        description_sid: 'tang.role.peasant.description_sid',
        starting_resources: { time: 2, energy: 2 },
      },
      {
        id: 'merchant',
        label_sid: 'tang.role.merchant.label_sid',
        description_sid: 'tang.role.merchant.description_sid',
        starting_resources: { time: 2, energy: 2 },
      },
    ],
    endings: [],
    practices: [],
    schedules: [],
    sutras: [],
    mantras: [],
    figures: [],
    minigames: [],
    ...overrides,
  };
}

/** Flush pending microtasks/macrotasks so the load effect settles. */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('LifeStartScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the era name, lineage notes, content warnings, and the pack role cards when a pack loads', async () => {
    vi.mocked(loadEraPack).mockReturnValue(makeFixturePack());

    const { getByText, getByTextContent, getByTestID } = render(createElement(LifeStartScreen));

    await act(async () => {
      await flushPromises();
    });

    // Heading + era name resolved from pack.name_sid.
    expect(() => getByText('A new life begins')).not.toThrow();
    expect(() => getByText('Tang Dynasty Chang\u2019an')).not.toThrow();

    // Lineage notes resolved from pack.lineage_notes_sid (substring match).
    expect(() => getByTextContent('cosmopolitan capital at the eastern end')).not.toThrow();

    // Expand the content-warnings section and read the labels.
    const toggle = getByTestID('life-start-warnings-toggle');
    act(() => {
      toggle.props.onPress();
    });
    expect(() => getByText('References to death and mourning')).not.toThrow();
    expect(() => getByText('Depictions of illness and care')).not.toThrow();

    // Role cards come from the pack's own starting_roles, so any era lists
    // the roles that era actually authors.
    expect(() => getByTestID('life-start-role-peasant')).not.toThrow();
    expect(() => getByTestID('life-start-role-merchant')).not.toThrow();

    // Role titles are visible — the pack's own labels.
    expect(() => getByText('Peasant farmer')).not.toThrow();
    expect(() => getByText('Merchant')).not.toThrow();
  });

  it('lists the second era’s own roles instead of crashing on missing string ids', async () => {
    vi.mocked(loadEraPack).mockReturnValue(
      makeFixturePack({
        name_sid: 'fantasy.name_sid',
        lineage_notes_sid: 'fantasy.lineage_notes_sid',
        starting_roles: [
          {
            id: 'newly-arrived-soul',
            label_sid: 'fantasy.role.newly_arrived_soul.label_sid',
            description_sid: 'fantasy.role.newly_arrived_soul.description_sid',
            starting_resources: { time: 3, energy: 3 },
          },
          {
            id: 'court-attendant',
            label_sid: 'fantasy.role.court_attendant.label_sid',
            description_sid: 'fantasy.role.court_attendant.description_sid',
            starting_resources: { time: 2, energy: 2 },
          },
        ],
      }),
    );

    const { getByTestID, press } = render(createElement(LifeStartScreen));

    await act(async () => {
      await flushPromises();
    });

    expect(() => getByTestID('life-start-role-newly-arrived-soul')).not.toThrow();
    expect(() => getByTestID('life-start-role-court-attendant')).not.toThrow();
    expect(() => getByTestID('life-start-role-peasant')).toThrow();

    press(getByTestID('life-start-role-court-attendant'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/life/[lifeId]',
      params: { lifeId: 'pending', roleId: 'court-attendant', era: 'tang-china' },
    });
  });

  it('navigates to the life route with the roleId param when a role card is tapped', async () => {
    vi.mocked(loadEraPack).mockReturnValue(makeFixturePack());

    const { getByTestID, press } = render(createElement(LifeStartScreen));

    await act(async () => {
      await flushPromises();
    });

    press(getByTestID('life-start-role-merchant'));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/life/[lifeId]',
      params: { lifeId: 'pending', roleId: 'merchant', era: 'tang-china' },
    });
  });

  it('renders the advisory fallback panel with a link to /about when no pack is available', async () => {
    vi.mocked(loadEraPack).mockRejectedValue(new Error('ENOENT'));

    const { getByText, getByTestID } = render(createElement(LifeStartScreen));

    await act(async () => {
      await flushPromises();
    });

    expect(() => getByText('No eras available yet')).not.toThrow();
    expect(() =>
      getByText(
        'No historical chapters are open to inhabit at this hour. Return to the courtyard bench while the records are prepared.',
      ),
    ).not.toThrow();
    expect(() => getByTestID('life-start-about')).not.toThrow();

    // No role cards present in the fallback.
    expect(() => getByTestID('life-start-role-peasant')).toThrow();
  });

  it('navigates to /about when the fallback button is pressed', async () => {
    vi.mocked(loadEraPack).mockRejectedValue(new Error('ENOENT'));

    const { getByTestID, press } = render(createElement(LifeStartScreen));

    await act(async () => {
      await flushPromises();
    });

    press(getByTestID('life-start-about'));
    expect(router.push).toHaveBeenCalledWith('/about');
  });
});
