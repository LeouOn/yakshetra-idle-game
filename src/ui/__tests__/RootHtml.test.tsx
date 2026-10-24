// Root HTML document pins (web-only surface, app/+html.tsx).
//
// agy-ux finding 11: at desktop widths a ~10px stark white strip ran down the
// right edge of the studio. Root cause (reproduced in Firefox): the studio
// scrolls inside its own `main` with `scrollbar-color: auto`, so the default
// LIGHT scrollbar track painted over the dark palette; html/body never scroll.
// The fix declares `scrollbar-color` on `html` — it inherits to every inner
// scroller — plus a dark root canvas, both from the shared studio tokens.
// app/+html.tsx is ignored on native, so the change cannot affect native.

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

import RootHTML from '../../../app/+html';
import { render } from '@/test/rntl';
import type { TestInstance } from 'test-renderer';
import { studioTheme } from '@/ui/studio-theme';

vi.mock('expo-router/html', () => ({
  ScrollViewStyleReset: () => null,
}));

describe('RootHTML (web document shell)', () => {
  it('paints dark scrollbars and a dark root canvas from the studio palette', () => {
    const { container } = render(createElement(RootHTML, null, createElement('div', null, 'x')));
    const styles: string[] = [];
    const visit = (node: TestInstance): void => {
      if (node.type === 'style') {
        const injected = node.props.dangerouslySetInnerHTML as { __html?: string } | undefined;
        if (typeof injected?.__html === 'string') {
          styles.push(injected.__html);
        }
      }
      for (const child of node.children) {
        if (typeof child === 'object' && child !== null) {
          visit(child as TestInstance);
        }
      }
    };
    visit(container);
    // One declaration on html; scrollbar-color inherits to inner scrollers.
    expect(styles).toEqual([
      `html{background-color:${studioTheme.bg};scrollbar-color:${studioTheme.line} ${studioTheme.bg};}`,
    ]);
  });
});
