import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';

import StudioRoster from '@/ui/components/StudioRoster';
import { formatSid, resolveSid } from '@/i18n';
import { render } from '@/test/rntl';
import { TABLE_FILL_REVISION, type Manifest, type RosterMember } from '@/engine';

function member(parts: {
  readonly id: string;
  readonly role?: string;
  readonly embodied?: boolean;
  readonly focus_id?: string;
}): RosterMember {
  return {
    id: parts.id,
    name: `Name ${parts.id}`,
    role: parts.role ?? 'cook',
    policy: 'policy:household-base',
    embodied: parts.embodied ?? false,
    ...(parts.focus_id === undefined ? {} : { focus_id: parts.focus_id }),
    seed: 1,
  };
}

function card(id: string): Manifest {
  return {
    schema_version: 'manifest/v1',
    id,
    rng_seed: `seed-${id}`,
    brief: null,
    residue_window_id: 'w-1-3-3',
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

function renderRoster(
  members: readonly RosterMember[],
  pinnable: readonly Manifest[],
  embodiedMemberId: string | null = null,
) {
  const onEmbody = vi.fn();
  const onFocus = vi.fn();
  const queries = render(
    createElement(StudioRoster, {
      members,
      embodiedMemberId,
      pinnable,
      onEmbody,
      onFocus,
    }),
  );
  return { onEmbody, onFocus, ...queries };
}

describe('StudioRoster', () => {
  it('renders the heading and one row per member with name, role, and policy', () => {
    const { getByTestID, getByText, container } = renderRoster(
      [member({ id: 'm1' }), member({ id: 'm2', role: 'elder' })],
      [card('c-1')],
    );

    expect(() => getByTestID('studio-roster')).not.toThrow();
    expect(() => getByText(resolveSid('studio.roster_heading_sid'))).not.toThrow();
    for (const id of ['m1', 'm2']) {
      expect(() => getByTestID(`studio-roster-member-${id}`)).not.toThrow();
      expect(() => getByText(`Name ${id}`)).not.toThrow();
    }
    expect(() => getByText('cook')).not.toThrow();
    expect(() => getByText('elder')).not.toThrow();
    const policyText = formatSid('studio.roster_policy_sid', { policy: 'policy:household-base' });
    expect(
      container.queryAll(
        (node) =>
          node.type === 'Text' && node.children.length === 1 && node.children[0] === policyText,
      ),
    ).toHaveLength(2);
  });

  it('labels the embody button per embodiment state and toggles through the callback', () => {
    const { getByTestID, getByText, press, onEmbody } = renderRoster(
      [member({ id: 'm1' }), member({ id: 'm2' })],
      [],
      'm2',
    );

    expect(() =>
      getByText(formatSid('studio.roster_embody_sid', { name: 'Name m1' })),
    ).not.toThrow();
    expect(() =>
      getByText(formatSid('studio.roster_embodied_sid', { name: 'Name m2' })),
    ).not.toThrow();

    press(getByTestID('studio-roster-embody-m1'));
    expect(onEmbody).toHaveBeenCalledWith('m1');
    press(getByTestID('studio-roster-embody-m2'));
    expect(onEmbody).toHaveBeenCalledWith(null);
    expect(onEmbody).toHaveBeenCalledTimes(2);
  });

  it('offers the first pinnable card from an unfocused row', () => {
    const { getByTestID, getByText, press, onFocus } = renderRoster(
      [member({ id: 'm1' })],
      [card('c-1'), card('c-2')],
    );

    expect(() => getByText(resolveSid('studio.roster_focus_next_sid'))).not.toThrow();

    press(getByTestID('studio-roster-focus-m1'));
    expect(onFocus).toHaveBeenLastCalledWith('m1', 'c-1');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('labels the wrap-around press as clear when the focus sits on the last card', () => {
    const { getByText } = renderRoster(
      [member({ id: 'm1', focus_id: 'c-2' })],
      [card('c-1'), card('c-2')],
    );

    expect(() => getByText(resolveSid('studio.roster_focus_clear_sid'))).not.toThrow();
  });

  it('labels a mid-cycle focus with the focused card name', () => {
    const { getByText } = renderRoster(
      [member({ id: 'm1', focus_id: 'c-1' })],
      [card('c-1'), card('c-2')],
    );

    expect(() =>
      getByText(formatSid('studio.roster_focus_label_sid', { name: 'Card c-1' })),
    ).not.toThrow();
  });

  it('does not move focus when no pinnable cards exist', () => {
    const { getByTestID, press, onFocus } = renderRoster([member({ id: 'm1' })], []);

    press(getByTestID('studio-roster-focus-m1'));
    expect(onFocus).not.toHaveBeenCalled();
  });
});
