import { describe, it, expect } from 'vitest';
import { createElement } from 'react';

import StudioRail from '@/ui/components/StudioRail';
import { formatSid, resolveSid } from '@/i18n';
import { render } from '@/test/rntl';

const TIERS = [
  {
    id: 'person',
    labelSid: 'studio.tier_person_sid',
    unlocked: true,
    readyCount: 1,
    progress: null,
  },
  {
    id: 'household',
    labelSid: 'studio.tier_household_sid',
    unlocked: false,
    readyCount: 0,
    progress: { n: 2, m: 3 },
  },
] as const;

describe('StudioRail', () => {
  it('renders the rail with a row per injected tier', () => {
    const { getByTestID, getByText } = render(createElement(StudioRail, { tiers: TIERS }));

    expect(() => getByTestID('studio-rail')).not.toThrow();
    expect(() => getByTestID('studio-rail-tier-person')).not.toThrow();
    expect(() => getByTestID('studio-rail-tier-household')).not.toThrow();
    expect(() => getByText(resolveSid('studio.rail_heading_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('studio.tier_person_sid'))).not.toThrow();
  });

  it('shows the ready badge on an unlocked tier with ready benches', () => {
    const { getByText } = render(createElement(StudioRail, { tiers: TIERS }));

    expect(() => getByText(formatSid('studio.tier_ready_badge_sid', { n: 1 }))).not.toThrow();
  });

  it('names the locked rung and shows its progress toward unlocking (walk item 4)', () => {
    const { getByText, queryByText, getByTestID } = render(
      createElement(StudioRail, { tiers: TIERS }),
    );

    // The locked rung shows the tier the player is working TOWARD, not a
    // bare "Locked": the real name, dimmed, plus how far there is to go.
    expect(() => getByText(resolveSid('studio.tier_household_sid'))).not.toThrow();
    expect(() =>
      getByText(formatSid('studio.tier_progress_badge_sid', { n: 2, m: 3 })),
    ).not.toThrow();
    // "Locked" is no longer rendered as text; screen readers hear it as the
    // locked row's label instead.
    expect(queryByText(resolveSid('studio.tier_locked_sid'))).toBeNull();
    const lockedRow = getByTestID('studio-rail-tier-household');
    expect(String(lockedRow.props.accessibilityLabel ?? '')).toContain('Locked');
    expect(String(lockedRow.props.accessibilityLabel ?? '')).toContain(
      resolveSid('studio.tier_household_sid'),
    );
  });

  it('hides the progress badge when a tier reports no progress', () => {
    const { queryByText } = render(
      createElement(StudioRail, {
        tiers: [
          {
            id: 'person',
            labelSid: 'studio.tier_person_sid',
            unlocked: true,
            readyCount: 0,
            progress: null,
          },
        ],
      }),
    );

    expect(queryByText(formatSid('studio.tier_ready_badge_sid', { n: 0 }))).toBeNull();
  });
});
