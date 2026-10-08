// Hydration parity for the /studio route (React #418 review fix).
//
// The server render and the FIRST client render must produce the same tree:
// both show ScreenSkeleton until useMounted flips (a post-hydration update).
// A real jsdom hydrateRoot is not available in this node-env harness, so the
// parity is tested directly: two independent first renders are structurally
// identical and contain the skeleton (not the bench); after the mount flip
// the loaded bench appears with its testIDs intact.
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';

import StudioRoute from '@/ui/components/StudioRoute';
import { render, act } from '@/test/rntl';

function firstRenderJson(): string {
  const ui = render(createElement(StudioRoute));
  return JSON.stringify(ui.toJSON());
}

describe('/studio hydration parity', () => {
  it('first client render is the skeleton, structurally identical across renders', () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.join(' '));
    });
    try {
      const a = firstRenderJson();
      const b = firstRenderJson();
      expect(a).toBe(b);
      expect(a).toContain('studio-skeleton');
      expect(a).not.toContain('studio-screen');
      expect(errors).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it('the bench mounts after the flip with its testIDs unchanged', async () => {
    const ui = render(createElement(StudioRoute));
    expect(() => ui.getByTestID('studio-skeleton')).not.toThrow();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(() => ui.getByTestID('studio-screen')).not.toThrow();
    expect(() => ui.getByTestID('studio-tabs')).not.toThrow();
  });
});
