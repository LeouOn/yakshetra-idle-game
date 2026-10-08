// The reveal stage (wave 2a, lane b1) — the harvested card IS the screen.
// Pins the card's composed fields, the pin affordance, the drain's "also
// revealed" list, and the reduced-motion path (no animation call).
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { Animated } from 'react-native';

import StudioRevealStage from '@/ui/components/StudioRevealStage';
import { render } from '@/test/rntl';
import { tableFillManifest, createRng } from '@/engine';
import type { Manifest } from '@/engine';

function stage(props: Partial<Parameters<typeof StudioRevealStage>[0]> & { card: Manifest }) {
  return render(
    createElement(StudioRevealStage, {
      alsoRevealed: [],
      reducedMotion: true,
      pinned: null,
      onPin: () => {},
      onContinue: () => {},
      ...props,
    } satisfies Parameters<typeof StudioRevealStage>[0]),
  );
}

function card(overrides: Partial<Manifest> = {}): Manifest {
  const base = tableFillManifest(
    [
      { tick: 1, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 1 } },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 1 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 1 } },
    ],
    null,
    1,
    createRng(7n),
    '7',
    'm-test',
  );
  return { ...base, ...overrides };
}

describe('StudioRevealStage', () => {
  it('renders the card: name, rarity chip, kind, one_liner, subject, detail', () => {
    const manifest = card();
    const ui = stage({ card: manifest });
    expect(ui.getByTestID('reveal-stage')).toBeTruthy();
    expect(ui.getByText(manifest.name)).toBeTruthy();
    expect(
      ui.getByText(
        manifest.rarity === 'rare'
          ? 'Rare'
          : manifest.rarity === 'uncommon'
            ? 'Uncommon'
            : 'Common',
      ),
    ).toBeTruthy();
    expect(ui.getByText('Thing')).toBeTruthy();
    expect(ui.getByText(manifest.one_liner)).toBeTruthy();
    expect(ui.getByTextContent(manifest.subject)).toBeTruthy();
    expect(ui.getByText(manifest.detail)).toBeTruthy();
  });

  it('shows the about line when the card is about a figure or pin', () => {
    const manifest = card({ about_id: 'figure:amitabha', about_name: 'Amitābha' });
    const ui = stage({ card: manifest });
    expect(ui.getByTextContent('Amitābha')).toBeTruthy();
  });

  it('pins from the stage for a pinnable card', () => {
    const manifest = card({ kind: 'person' });
    const onPin = vi.fn();
    const ui = stage({ card: manifest, onPin });
    ui.press(ui.getByTestID('reveal-pin'));
    expect(onPin).toHaveBeenCalledWith(manifest);
  });

  it('hides the pin action for non-pinnable kinds', () => {
    const manifest = card({ kind: 'thing' });
    const ui = stage({ card: manifest });
    expect(() => ui.getByTestID('reveal-pin')).toThrow();
  });

  it('shows the drain list as also-revealed names', () => {
    const manifest = card({ kind: 'person' });
    const tier = card({ kind: 'tradition', scale: 'household', name: 'The dumpling fold' });
    const ui = stage({ card: manifest, alsoRevealed: [tier] });
    expect(ui.getByTestID('reveal-also')).toBeTruthy();
    expect(ui.getByTextContent('The dumpling fold')).toBeTruthy();
  });

  it('continue dismisses', () => {
    const onContinue = vi.fn();
    const ui = stage({ card: card(), onContinue });
    ui.press(ui.getByTestID('reveal-continue'));
    expect(onContinue).toHaveBeenCalled();
  });

  it('reduced motion: no Animated.timing call; full motion: one entry animation', () => {
    const timing = vi.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: (cb?: (r: { finished: boolean }) => void) => {
        cb?.({ finished: true });
      },
      stop: () => {},
      reset: () => {},
    }));
    try {
      const ui = stage({ card: card(), reducedMotion: true });
      expect(timing).not.toHaveBeenCalled();
      expect(ui.getByTestID('reveal-stage')).toBeTruthy();
      const animated = stage({ card: card({ id: 'm-second' }), reducedMotion: false });
      expect(timing).toHaveBeenCalled();
      expect(animated.getByTestID('reveal-stage')).toBeTruthy();
    } finally {
      timing.mockRestore();
    }
  });
});
