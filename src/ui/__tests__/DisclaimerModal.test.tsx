import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { Text, View } from 'react-native';

import DisclaimerModal, { type DisclaimerModalProps } from '@/ui/components/DisclaimerModal';
import { resolveSid } from '@/i18n';
import { defaultAppSettings, useSaveSlot } from '@/ui/hooks/useSaveSlot';
import { render } from '@/test/rntl';

// ---------------------------------------------------------------------------
// DisclaimerModal presentational tests
// ---------------------------------------------------------------------------

interface ModalExtras {
  readonly onUnderstand: ReturnType<typeof vi.fn>;
  readonly onReadMore: ReturnType<typeof vi.fn>;
}

function renderModal(
  props: Partial<DisclaimerModalProps> = {},
): ModalExtras & ReturnType<typeof render> {
  const fns: ModalExtras = {
    onUnderstand: vi.fn(),
    onReadMore: vi.fn(),
  };
  const result = render(
    createElement(DisclaimerModal, {
      onUnderstand: props.onUnderstand ?? fns.onUnderstand,
      onReadMore: props.onReadMore ?? fns.onReadMore,
    } as DisclaimerModalProps),
  );
  return { ...result, ...fns };
}

describe('DisclaimerModal', () => {
  it('renders the title, body, and both buttons on first launch', () => {
    const { getByTestID, getByText } = renderModal();
    expect(() => getByTestID('disclaimer-modal')).not.toThrow();
    expect(() => getByTestID('disclaimer-body')).not.toThrow();
    expect(() => getByText(resolveSid('disclaimer.title_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('disclaimer.understand_button_sid'))).not.toThrow();
    expect(() => getByText(resolveSid('disclaimer.read_more_button_sid'))).not.toThrow();
  });

  it('the "I understand" button is the only dismiss path (fires onUnderstand)', () => {
    const { getByTestID, press, onUnderstand } = renderModal();
    press(getByTestID('disclaimer-understand'));
    expect(onUnderstand).toHaveBeenCalledTimes(1);
  });

  it('the "Read more" button fires onReadMore (navigates to /about)', () => {
    const { getByTestID, press, onReadMore } = renderModal();
    press(getByTestID('disclaimer-read-more'));
    expect(onReadMore).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Integration: useSaveSlot + DisclaimerModal wiring (mirrors app/index.tsx)
// ---------------------------------------------------------------------------

/**
 * Probe that reproduces app/index.tsx's disclaimer gating without importing
 * expo-router. Renders the modal while `!disclaimerAccepted` and flips the flag
 * via `updateSettings` on acknowledge.
 */
function IndexProbe() {
  const { settings, updateSettings } = useSaveSlot(1);
  return createElement(
    View,
    { testID: 'index-screen' },
    createElement(Text, { testID: 'probe-accepted' }, settings.disclaimerAccepted ? 'yes' : 'no'),
    settings.disclaimerAccepted
      ? null
      : createElement(DisclaimerModal, {
          onUnderstand: () => updateSettings({ disclaimerAccepted: true }),
          onReadMore: () => undefined,
        }),
  );
}

describe('disclaimer first-launch wiring (per save slot)', () => {
  it('shows the modal on first render (default disclaimerAccepted is false)', () => {
    expect(defaultAppSettings().disclaimerAccepted).toBe(false);
    const { getByTestID } = render(createElement(IndexProbe));
    expect(getByTestID('probe-accepted').children[0]).toBe('no');
    expect(() => getByTestID('disclaimer-modal')).not.toThrow();
  });

  it('dismisses the modal and persists disclaimerAccepted after tapping "I understand"', () => {
    const { getByTestID, press } = render(createElement(IndexProbe));
    expect(() => getByTestID('disclaimer-modal')).not.toThrow();
    press(getByTestID('disclaimer-understand'));
    expect(getByTestID('probe-accepted').children[0]).toBe('yes');
    expect(() => getByTestID('disclaimer-modal')).toThrow();
  });

  it('does not re-render the modal once disclaimerAccepted is persisted', () => {
    const { getByTestID, press } = render(createElement(IndexProbe));
    press(getByTestID('disclaimer-understand'));
    expect(() => getByTestID('disclaimer-modal')).toThrow();
    expect(getByTestID('probe-accepted').children[0]).toBe('yes');
  });
});
