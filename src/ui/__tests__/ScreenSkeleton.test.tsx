import { readFileSync } from 'node:fs';

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import ScreenSkeleton from '@/ui/components/ScreenSkeleton';
import { render } from '@/test/rntl';
import { resolveSid } from '@/i18n';

// Hydration parity (browser finding 3): the skeleton a route ships must
// carry the SAME root role and accessibility label as the screen it stands
// in for, or React 19 throws #418 on every visit. These tests pin the
// skeleton side of that contract and the route wiring that chooses which
// side (label or no label) each screen needs.

function rootProps(ui: ReturnType<typeof render>): Record<string, unknown> {
  return ui.getByTestID('screen-skeleton').props as Record<string, unknown>;
}

describe('ScreenSkeleton label parity', () => {
  it('carries no accessibility label when the screen it stands for has none', () => {
    const ui = render(createElement(ScreenSkeleton, { sections: 2 }));
    const props = rootProps(ui);
    expect(props.accessibilityRole === 'main' || props.role === 'main').toBe(true);
    expect('accessibilityLabel' in props).toBe(false);
  });

  it('carries the exact label of the screen it stands for, when it has one', () => {
    const ui = render(createElement(ScreenSkeleton, { labelSid: 'life.turn.screen_label_sid' }));
    expect(rootProps(ui).accessibilityLabel).toBe(resolveSid('life.turn.screen_label_sid'));
  });

  it('route wiring: only the life-turn route passes a label; the others ship none', () => {
    // The life turn screen's root is the one route root that carries an
    // accessibilityLabel (life.turn.screen_label_sid); every other gated
    // route's root is an unlabeled role="main", so its skeleton must pass no
    // labelSid. A source assertion is the honest cheap proof of the wiring;
    // the component tests above prove the behavior.
    const routes: readonly [string, boolean][] = [
      ['app/index.tsx', false],
      ['app/life/start.tsx', false],
      ['app/chain-complete.tsx', false],
      ['app/bardo.tsx', false],
      ['app/settings.tsx', false],
      ['app/about.tsx', false],
      ['app/life/[lifeId].tsx', true],
    ];
    for (const [path, shouldLabel] of routes) {
      const src = readFileSync(path, 'utf-8');
      const hasLabelSid = src.includes('labelSid=');
      expect(hasLabelSid, `${path} label wiring`).toBe(shouldLabel);
      if (shouldLabel) {
        expect(src).toContain('labelSid="life.turn.screen_label_sid"');
      }
    }
  });
});
