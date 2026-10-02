import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';

import NotFoundView from '@/ui/components/NotFoundView';
import { resolveSid } from '@/i18n';
import { render } from '@/test/rntl';

describe('NotFoundView', () => {
  it('renders the heading resolved from the string table, not a literal', () => {
    const { getByText } = render(createElement(NotFoundView, { onGoHome: vi.fn() }));

    // Asserting against `resolveSid` (rather than the copy itself) is the
    // point: it fails if the screen ever goes back to a hardcoded string, and
    // fails if the SID is renamed without the screen following.
    expect(() => getByText(resolveSid('not_found.heading_sid'))).not.toThrow();
  });

  it('offers a named way back to the start and fires it on press', () => {
    const onGoHome = vi.fn();
    const { getByLabelText, press } = render(createElement(NotFoundView, { onGoHome }));

    // The label is what a screen reader announces, so it must resolve from the
    // table and must not be empty.
    const label = resolveSid('not_found.home_label_sid');
    expect(label.length).toBeGreaterThan(0);

    const control = getByLabelText(label);
    expect(control).toBeDefined();
    press(control);
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it('keeps the accessible name inside the visible label (WCAG 2.5.3)', () => {
    // Label in Name: the accessible name must contain the visible button text,
    // or a voice-control user saying "click Go to the start" gets no match.
    // The visible and announced strings are separate SIDs, so they can drift;
    // this is the guard that catches it.
    const visible = resolveSid('not_found.home_button_sid');
    const announced = resolveSid('not_found.home_label_sid');

    expect(announced).toContain(visible);
  });

  it('shows no dev placeholder or todo marker to the player', () => {
    const { container } = render(createElement(NotFoundView, { onGoHome: vi.fn() }));

    // Regression guard for the review finding: this screen used to render
    // `RoutePlaceholder`, which prints "Coming soon — todo 15." A mistyped URL
    // must never show a developer marker.
    const flat = JSON.stringify(container.toJSON());
    expect(flat).not.toContain('Coming soon');
    expect(flat).not.toContain('todo');
  });
});
