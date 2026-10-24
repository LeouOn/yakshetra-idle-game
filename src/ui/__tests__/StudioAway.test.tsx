import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';

import StudioAway from '@/ui/components/StudioAway';
import type { ReturnSummary } from '@/ui/hooks/away-summary';
import { render } from '@/test/rntl';

function summary(overrides: Partial<ReturnSummary> = {}): ReturnSummary {
  return {
    ticksSimulated: 240,
    residueGained: 40,
    workings: 2,
    keepsakes: [
      { id: 'p1', name: 'The gatekeeper' },
      { id: 'pl1', name: 'The mill by the ford' },
    ],
    otherKeepsakes: 1,
    bayReady: true,
    capped: false,
    ...overrides,
  };
}

function renderAway(overrides: Partial<ReturnSummary> = {}) {
  const onDismiss = vi.fn();
  const onOpenKeepsake = vi.fn();
  const result = render(
    createElement(StudioAway, { summary: summary(overrides), onDismiss, onOpenKeepsake }),
  );
  return { ...result, onDismiss, onOpenKeepsake };
}

describe('StudioAway', () => {
  it('names the workings and the keepsakes, label-first', () => {
    const { getByText } = renderAway();
    expect(getByText('Workings finished: 2')).toBeTruthy();
    expect(getByText('The gatekeeper')).toBeTruthy();
    expect(getByText('The mill by the ford')).toBeTruthy();
    expect(getByText('Other keepsakes: 1')).toBeTruthy();
    expect(getByText('A working is ready for you at the bench.')).toBeTruthy();
  });

  it('uses the singular for exactly one finished working', () => {
    const { getByTestID, queryByText } = renderAway({
      workings: 1,
      keepsakes: [],
      otherKeepsakes: 0,
      bayReady: false,
    });
    expect(getByTestID('studio-away-workings')).toBeTruthy();
    expect(queryByText('Working finished: 1')).toBeTruthy();
    expect(queryByText('1 workings')).toBeNull();
  });

  it('opens a keepsake in the archive when its chip is pressed', () => {
    const { getByTestID, press, onOpenKeepsake } = renderAway();
    const chip = getByTestID('studio-away-keepsake-p1');
    expect(chip.props.accessibilityLabel).toBe('Open The gatekeeper in the archive');
    press(chip);
    expect(onOpenKeepsake).toHaveBeenCalledWith({ id: 'p1', name: 'The gatekeeper' });
  });

  it('dismisses once and announces politely as a status', () => {
    const { getByTestID, press, onDismiss } = renderAway();
    const panel = getByTestID('studio-away');
    expect(panel.props.accessibilityLiveRegion).toBe('polite');
    expect(panel.props.role).toBe('status');
    press(getByTestID('studio-away-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps the honest capped line', () => {
    const { getByText } = renderAway({ capped: true });
    expect(
      getByText(
        'That is as long as the bench works unattended; tending paused until you came back.',
      ),
    ).toBeTruthy();
  });

  it('says nothing misleading when only a left-ready bay exists', () => {
    const { getByTestID } = renderAway({
      workings: 0,
      keepsakes: [],
      otherKeepsakes: 0,
      bayReady: true,
    });
    expect(getByTestID('studio-away-ready')).toBeTruthy();
    expect(() => getByTestID('studio-away-workings')).toThrow();
  });
});
