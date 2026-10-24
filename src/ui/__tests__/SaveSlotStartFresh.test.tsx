import { createElement, type ComponentType } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { act, render } from '@/test/rntl';
import { resolveSid } from '@/i18n';

// Round 2D: an unreadable slot needs a way OUT that is explicit and never
// destroys bytes on one press. Every route that can show a load error gets
// the same two-step bar: Start fresh -> a plain statement + Cancel/Confirm ->
// delete slot 1 -> land at /life/start. The adapter and router are mocked.

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() };
vi.mock('expo-router', () => ({
  router,
  useLocalSearchParams: (): Record<string, string> => params,
  useRouter: () => router,
}));

let params: Record<string, string> = {};

const adapter = {
  load: vi.fn(),
  save: vi.fn(),
  listSlots: vi.fn(),
  deleteSlot: vi.fn(),
};

vi.mock('@/persistence', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    lifeStorageAdapter: () => adapter,
  };
});

// Bounded waits, same contract as SaveSlotErrorRoutes.test.tsx.
const WAIT_TIMEOUT_MS = 30_000;

async function waitFor(label: string, predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  for (;;) {
    if (predicate()) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function waitForTestID(ui: ReturnType<typeof render>, testID: string): Promise<void> {
  await waitFor(`testID "${testID}"`, () => {
    try {
      ui.getByTestID(testID);
      return true;
    } catch {
      return false;
    }
  });
}

interface RouteCase {
  readonly name: string;
  readonly load: () => Promise<{ default: ComponentType }>;
  readonly params?: Readonly<Record<string, string>>;
}

// Every route that renders the bar. Start fresh lives in the bar, so the same
// promise must hold everywhere; life/[lifeId] lands a mid-life player at the
// fresh-chain screen rather than leaving them with a dead save.
const ROUTES: readonly RouteCase[] = [
  { name: 'home', load: () => import('../../../app/index') },
  { name: 'settings', load: () => import('../../../app/settings') },
  { name: 'life start', load: () => import('../../../app/life/start') },
  {
    name: 'life',
    load: () => import('../../../app/life/[lifeId]'),
    params: { lifeId: 'pending', roleId: 'peasant@0.1.0', era: 'tang-china' },
  },
  { name: 'bardo', load: () => import('../../../app/bardo') },
  { name: 'chain-complete', load: () => import('../../../app/chain-complete') },
];

async function openUnreadable(route: RouteCase): Promise<ReturnType<typeof render>> {
  params = route.params === undefined ? {} : { ...route.params };
  adapter.load.mockRejectedValue(new Error('storage broke'));
  const Screen = (await route.load()).default;
  const ui = render(createElement(Screen));
  await waitForTestID(ui, 'save-error-bar');
  return ui;
}

beforeEach(() => {
  params = {};
  adapter.load.mockReset().mockResolvedValue(null);
  adapter.save.mockReset().mockResolvedValue(undefined);
  adapter.listSlots.mockReset().mockResolvedValue([1]);
  adapter.deleteSlot.mockReset().mockResolvedValue(undefined);
  router.push.mockClear();
  router.replace.mockClear();
});

describe('Start fresh on every route that can show a load error', { timeout: 90_000 }, () => {
  it.each(ROUTES)('$name: Start fresh asks before it deletes', async (route) => {
    const ui = await openUnreadable(route);
    ui.press(ui.getByTestID('save-error-start-fresh'));
    expect(() => ui.getByTestID('save-error-confirm')).not.toThrow();
    expect(() => ui.getByTestID('save-error-cancel')).not.toThrow();
    expect(ui.getByTextContent(resolveSid('save_error.start_fresh_body_sid'))).toBeTruthy();
    // The first press is only a question; nothing is deleted.
    expect(adapter.deleteSlot).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each(ROUTES)('$name: Cancel leaves the save alone', async (route) => {
    const ui = await openUnreadable(route);
    ui.press(ui.getByTestID('save-error-start-fresh'));
    ui.press(ui.getByTestID('save-error-cancel'));
    expect(() => ui.getByTestID('save-error-start-fresh')).not.toThrow();
    expect(adapter.deleteSlot).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each(ROUTES)('$name: Confirm deletes slot 1 and lands at life/start', async (route) => {
    const ui = await openUnreadable(route);
    ui.press(ui.getByTestID('save-error-start-fresh'));
    ui.press(ui.getByTestID('save-error-confirm'));
    await waitFor(
      'navigation to the fresh-chain screen',
      () => router.replace.mock.calls.length > 0,
    );
    expect(adapter.deleteSlot).toHaveBeenCalledWith(1);
    expect(router.replace).toHaveBeenCalledWith('/life/start');
    await waitFor('the bar to go away', () => {
      try {
        ui.getByTestID('save-error-bar');
        return false;
      } catch {
        return true;
      }
    });
  });

  it.each(ROUTES)('$name: a refused delete stays, shows the error, and retries', async (route) => {
    const ui = await openUnreadable(route);
    adapter.deleteSlot.mockRejectedValueOnce(new Error('quota'));
    ui.press(ui.getByTestID('save-error-start-fresh'));
    ui.press(ui.getByTestID('save-error-confirm'));
    await waitFor('the delete error to be shown', () => {
      try {
        ui.getByTextContent('save slot delete failed: quota');
        return true;
      } catch {
        return false;
      }
    });
    expect(router.replace).not.toHaveBeenCalled();
    // The confirmation stays up, so the player can press Confirm again.
    expect(() => ui.getByTestID('save-error-confirm')).not.toThrow();
    ui.press(ui.getByTestID('save-error-confirm'));
    await waitFor(
      'navigation after the retry succeeds',
      () => router.replace.mock.calls.length > 0,
    );
    expect(adapter.deleteSlot).toHaveBeenCalledTimes(2);
  });

  it.each(ROUTES)('$name: a load error alone never deletes', async (route) => {
    await openUnreadable(route);
    expect(adapter.deleteSlot).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // The life route persists a fresh life as soon as the bar clears, so Go on
  // there would be Start fresh without the confirmation. The other routes do
  // not write on dismissal and keep the ordinary escape hatch.
  // Chain-complete is the same: dismissing the bar re-enables "Begin a new
  // chain", which deletes the unreadable slot without asking.
  const nonPersistingRoutes = ROUTES.filter(
    (route) => route.name !== 'life' && route.name !== 'chain-complete',
  );
  it.each(nonPersistingRoutes)('$name: Go on is still offered for a load error', async (route) => {
    const ui = await openUnreadable(route);
    expect(() => ui.getByTestID('save-error-continue')).not.toThrow();
  });

  it('life: a load error withholds Go on', async () => {
    const route = ROUTES.find((candidate) => candidate.name === 'life');
    expect(route).toBeDefined();
    const ui = await openUnreadable(route!);
    expect(() => ui.getByTestID('save-error-retry')).not.toThrow();
    expect(() => ui.getByTestID('save-error-start-fresh')).not.toThrow();
    // Dismissing here builds and persists a fresh life over the bytes.
    expect(() => ui.getByTestID('save-error-continue')).toThrow();
  });

  it('chain-complete: a load error withholds Go on, so Begin stays disabled and deletes nothing', async () => {
    const route = ROUTES.find((candidate) => candidate.name === 'chain-complete');
    expect(route).toBeDefined();
    const ui = await openUnreadable(route!);
    expect(() => ui.getByTestID('save-error-retry')).not.toThrow();
    expect(() => ui.getByTestID('save-error-start-fresh')).not.toThrow();
    // Dismissing here would enable "Begin a new chain" with the bytes still unread.
    expect(() => ui.getByTestID('save-error-continue')).toThrow();
    const begin = ui.getByTestID('chain-begin-new');
    expect(begin.props.disabled).toBe(true);
    ui.press(begin);
    expect(adapter.deleteSlot).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('life: Start fresh leaves slot 1 empty (no phantom life)', async () => {
    const route = ROUTES.find((candidate) => candidate.name === 'life');
    expect(route).toBeDefined();
    const ui = await openUnreadable(route!);
    ui.press(ui.getByTestID('save-error-start-fresh'));
    ui.press(ui.getByTestID('save-error-confirm'));
    await waitFor('navigation after the delete', () => router.replace.mock.calls.length > 0);
    await waitFor('the bar to go away', () => {
      try {
        ui.getByTestID('save-error-bar');
        return false;
      } catch {
        return true;
      }
    });
    // Let the route's create-a-life effect and the turn screen's persist
    // effect run if they were going to. The slot was just deleted; nothing may
    // write a life the player never chose into it.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(adapter.deleteSlot).toHaveBeenCalledWith(1);
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it('life: Go on stays withheld after a refused fresh delete is cancelled', async () => {
    const route = ROUTES.find((candidate) => candidate.name === 'life');
    expect(route).toBeDefined();
    const ui = await openUnreadable(route!);
    adapter.deleteSlot.mockRejectedValueOnce(new Error('quota'));
    ui.press(ui.getByTestID('save-error-start-fresh'));
    ui.press(ui.getByTestID('save-error-confirm'));
    await waitFor('the delete error to be shown', () => {
      try {
        ui.getByTextContent('save slot delete failed: quota');
        return true;
      } catch {
        return false;
      }
    });
    ui.press(ui.getByTestID('save-error-cancel'));
    // The slot is still unreadable; the ordinary bar must not re-open a path
    // that persists.
    expect(() => ui.getByTestID('save-error-start-fresh')).not.toThrow();
    expect(() => ui.getByTestID('save-error-continue')).toThrow();
  });
});
