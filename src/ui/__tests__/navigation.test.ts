import { beforeEach, describe, expect, it, vi } from 'vitest';

import { goBackOrHome } from '@/ui/navigation';

const mocks = vi.hoisted(() => ({
  router: { back: vi.fn(), replace: vi.fn(), canGoBack: vi.fn() },
}));
vi.mock('expo-router', () => ({ router: mocks.router }));

describe('goBackOrHome', () => {
  beforeEach(() => {
    mocks.router.back.mockClear();
    mocks.router.replace.mockClear();
    mocks.router.canGoBack.mockReset();
  });

  it('steps back when there is history', () => {
    mocks.router.canGoBack.mockReturnValue(true);
    goBackOrHome();
    expect(mocks.router.back).toHaveBeenCalledTimes(1);
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it('goes home when the screen was deep-linked and has no history', () => {
    mocks.router.canGoBack.mockReturnValue(false);
    goBackOrHome();
    expect(mocks.router.replace).toHaveBeenCalledWith('/');
    expect(mocks.router.back).not.toHaveBeenCalled();
  });

  it('still steps back when the router cannot say (older router, test doubles)', () => {
    const original = mocks.router.canGoBack;
    (mocks.router as { canGoBack?: unknown }).canGoBack = undefined;
    goBackOrHome();
    expect(mocks.router.back).toHaveBeenCalledTimes(1);
    mocks.router.canGoBack = original;
  });
});
