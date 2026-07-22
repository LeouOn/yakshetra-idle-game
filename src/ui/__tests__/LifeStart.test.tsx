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

import type { EraPack } from '@/content/schema';
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
 * Build a minimal valid EraPack fixture for the 'tang-china' era. The sids
 * (name_sid, lineage_notes_sid) resolve against the real en.json table; the
 * loader is mocked so schema/lint validation is not re-run here.
 */
function makeFixturePack(overrides: Partial<EraPack> = {}): EraPack {
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

  it('renders the era name, lineage notes, content warnings, and 3 role cards when a pack loads', async () => {
    vi.mocked(loadEraPack).mockResolvedValue(makeFixturePack());

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

    // Three role cards resolved from era.tang-china.role.* string ids.
    expect(() => getByTestID('life-start-role-peasant')).not.toThrow();
    expect(() => getByTestID('life-start-role-merchant')).not.toThrow();
    expect(() => getByTestID('life-start-role-monastic')).not.toThrow();

    // Role titles are visible.
    expect(() => getByText('Farmer')).not.toThrow();
    expect(() => getByText('Merchant')).not.toThrow();
    expect(() => getByText('Lay Resident')).not.toThrow();
  });

  it('navigates to the life route with the roleId param when a role card is tapped', async () => {
    vi.mocked(loadEraPack).mockResolvedValue(makeFixturePack());

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
      getByText('Completing advisory onboarding (todo 0) before content authoring can begin.'),
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
