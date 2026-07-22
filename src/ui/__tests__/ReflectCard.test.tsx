import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import type { ReflectCardProps, ReflectEntry } from '@/ui/components/ReflectCard';
import ReflectCard from '@/ui/components/ReflectCard';
import { Animated, AccessibilityInfo } from 'react-native';
import { render, act } from '@/test/rntl';

function makeEntry(overrides: Partial<ReflectEntry> = {}): ReflectEntry {
  return {
    turn: 3,
    chosen_lens: 'generosity',
    chosen_action_sid: 'test.action.give_alms_label_sid',
    intent_root: 'care',
    consequence_summary_sid: 'test.consequence.alms_given_sid',
    world_state_delta: { trust: 5, provisions: -2 },
    journal_memory_sid: 'test.journal.alms_memory_sid',
    ...overrides,
  };
}

function renderCard(props: Partial<ReflectCardProps> & { entry?: ReflectEntry } = {}) {
  const onContinue = props.onContinue ?? vi.fn();
  const onRemember = props.onRemember ?? vi.fn();
  const entry = props.entry ?? makeEntry();
  // A huge autoDismissMs keeps the card from auto-dismissing during tests that
  // are not exercising the timer; the timer test passes an explicit value.
  const result = render(
    createElement(ReflectCard, {
      entry,
      onContinue,
      onRemember,
      autoDismissMs: props.autoDismissMs ?? 10 ** 9,
    }),
  );
  return { ...result, onContinue, onRemember, entry };
}

describe('ReflectCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders the three sections with resolved string-id text', () => {
    const { getByText, getByTextContent } = renderCard();

    // Section headings.
    expect(() => getByText('What you intended')).not.toThrow();
    expect(() => getByText('What happened')).not.toThrow();
    expect(() => getByText('What you carry')).not.toThrow();

    // Intended: lens name + action label.
    expect(() => getByTextContent('Generosity')).not.toThrow();
    expect(() => getByTextContent('Give alms at the temple gate')).not.toThrow();

    // Happened: consequence summary.
    expect(() => getByTextContent('The beggar ate well')).not.toThrow();

    // Carry: journal memory line (no emoji, no score language).
    expect(() => getByTextContent('handful of rice')).not.toThrow();
  });

  it('renders resource deltas as signed amounts, not scores', () => {
    const { getByTestID } = renderCard();
    const trust = getByTestID('reflect-delta-trust');
    const provisions = getByTestID('reflect-delta-provisions');

    // Positive delta reads "+N resource"; negative reads "-N resource".
    expect(trust.children[0]).toBe('+5 trust');
    expect(provisions.children[0]).toBe('-2 provisions');
  });

  it('omits the deltas list entirely when the world-state change is empty', () => {
    const { container } = renderCard({ entry: makeEntry({ world_state_delta: {} }) });
    const deltas = container.queryAll(
      (i) => typeof i.props.testID === 'string' && i.props.testID.startsWith('reflect-delta-'),
    );
    expect(deltas).toHaveLength(0);
  });

  it('calls onContinue when the Continue button is pressed', () => {
    const { onContinue, getByLabelText, press } = renderCard();
    press(getByLabelText('Continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('calls onRemember when the Remember button is pressed', () => {
    const { onRemember, getByLabelText, press } = renderCard();
    press(getByLabelText('Remember'));
    expect(onRemember).toHaveBeenCalledTimes(1);
  });

  it('pressing Remember cancels the auto-dismiss timer', async () => {
    const { onContinue, onRemember, getByLabelText, press } = renderCard({ autoDismissMs: 8000 });
    press(getByLabelText('Remember'));
    expect(onRemember).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    // Remember marks the card as interacted-with, so the auto-dismiss Continue never fires.
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('auto-dismisses (Continue) after the configured delay with no interaction', async () => {
    const onContinue = vi.fn();
    renderCard({ onContinue, autoDismissMs: 8000 });
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7999);
    });
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does not animate the slide when reduced motion is enabled', async () => {
    vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timingSpy = vi.spyOn(Animated, 'timing');

    renderCard();
    // Flush the async reduced-motion probe so the motion effect settles.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(timingSpy).not.toHaveBeenCalled();
  });

  it('animates the slide when reduced motion is disabled', async () => {
    vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const timingSpy = vi.spyOn(Animated, 'timing');

    renderCard();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(timingSpy).toHaveBeenCalledTimes(1);
  });

  it('throws "missing consequence" instead of rendering blank for an empty consequence sid', () => {
    const badEntry = makeEntry({ consequence_summary_sid: '' });
    expect(() => renderCard({ entry: badEntry })).toThrow('missing consequence');
  });

  it('labels every text node for assistive tech', () => {
    const { container } = renderCard();
    const textNodes = container.queryAll((i) => i.type === 'Text');
    // Every Text node carries either its own accessibilityLabel or non-empty text content.
    for (const node of textNodes) {
      const hasLabel =
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.length > 0;
      const hasText = node.children.some((c) => typeof c === 'string' && c.length > 0);
      expect(hasLabel || hasText).toBe(true);
    }
  });
});
