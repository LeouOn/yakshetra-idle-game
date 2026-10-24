import { createElement, useEffect } from 'react';
import { Text, View } from 'react-native';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { act, cleanup, render } from '@/test/rntl';
import type { SaveBlob } from '@/engine';
import { useSaveSlot, type UseSaveSlotResult } from '@/ui/hooks/useSaveSlot';

// Route-level error-bar wiring (browser finding 1): the bar must reach the
// PLAYER through the real route components, and Try again appears only for a
// LOAD failure (it re-runs the load; it cannot retry a failed write). The
// adapter and router are mocked at module scope; per-test behaviour lives in
// the mutable stubs below.

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

// Bounded waits, not fixed tick counts: React's act() flushes its work on a
// macrotask, so a microtask-only settle races the machine's load. Wait on the
// observable condition (element or adapter call) with an explicit timeout; a
// loaded box then costs latency, never a false red.
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

beforeEach(() => {
  params = {};
  hookApi = null;
  adapter.load.mockReset().mockResolvedValue(null);
  adapter.save.mockReset().mockResolvedValue(undefined);
  adapter.listSlots.mockReset().mockResolvedValue([1]);
  router.push.mockClear();
  router.replace.mockClear();
});

// The bounded waits below may legitimately take seconds on a loaded box;
// keep a suite timeout above them so the wait's own message is the one seen.
// Two bounded waits can take 60 s on a loaded box; keep the suite timeout
// above that so the wait's own message is the one a broken run reports.
describe('SaveSlotErrorBar through the route components', { timeout: 90_000 }, () => {
  it('home: a load that throws paints the bar, and Try again re-runs the load', async () => {
    adapter.load.mockRejectedValue(new Error('storage broke'));
    const IndexScreen = (await import('../../../app/index')).default;
    const ui = render(createElement(IndexScreen));
    await waitForTestID(ui, 'save-error-bar');
    expect(() => ui.getByTestID('save-error-bar')).not.toThrow();
    const loadsBefore = adapter.load.mock.calls.length;
    ui.press(ui.getByTestID('save-error-retry'));
    await waitFor(
      'Try again to re-run the load',
      () => adapter.load.mock.calls.length > loadsBefore,
    );
    expect(adapter.load.mock.calls.length).toBeGreaterThan(loadsBefore);
  });

  it('home: garbage under the key (slot present, data null) is a failure, not an empty slot', async () => {
    adapter.listSlots.mockResolvedValue([1]);
    adapter.load.mockResolvedValue(null); // present but unparseable
    const IndexScreen = (await import('../../../app/index')).default;
    const ui = render(createElement(IndexScreen));
    await waitForTestID(ui, 'save-error-bar');
    expect(() => ui.getByTestID('save-error-bar')).not.toThrow();
  });

  it('settings: a failed load paints the bar with a working Try again', async () => {
    adapter.load.mockRejectedValue(new Error('quota'));
    const SettingsScreen = (await import('../../../app/settings')).default;
    const ui = render(createElement(SettingsScreen));
    await waitForTestID(ui, 'save-error-bar');
    expect(() => ui.getByTestID('save-error-bar')).not.toThrow();
    const loadsBefore = adapter.load.mock.calls.length;
    ui.press(ui.getByTestID('save-error-retry'));
    await waitFor(
      'Try again to re-run the load',
      () => adapter.load.mock.calls.length > loadsBefore,
    );
    expect(adapter.load.mock.calls.length).toBeGreaterThan(loadsBefore);
  });

  it('life start: a failed load paints the bar on the era screen', async () => {
    adapter.load.mockRejectedValue(new Error('locked'));
    const StartScreen = (await import('../../../app/life/start')).default;
    const ui = render(createElement(StartScreen));
    await waitForTestID(ui, 'save-error-bar');
    expect(() => ui.getByTestID('save-error-bar')).not.toThrow();
    // Presence alone passed at HEAD (the bar was already rendered here); the
    // discriminator is the retry wiring that only this batch adds.
    expect(() => ui.getByTestID('save-error-retry')).not.toThrow();
  });

  it('life route: a SAVE that fails paints the bar where the player now is', async () => {
    params = {
      lifeId: 'pending',
      roleId: 'peasant@0.1.0',
      era: 'tang-china',
    };
    adapter.load.mockResolvedValue(blob());
    adapter.save.mockRejectedValue(new Error('quota exceeded'));
    const LifeScreen = (await import('../../../app/life/[lifeId]')).default;
    const ui = render(createElement(LifeScreen));
    await waitForTestID(ui, 'save-error-bar');
    expect(() => ui.getByTestID('save-error-bar')).not.toThrow();
    // A save failure is not a load failure: Try again would only re-read the
    // slot, never retry the write. The bar must not offer it.
    expect(() => ui.getByTestID('save-error-retry')).toThrow();
  });

  it('a successful reload keeps a SAVE warning instead of clearing it', async () => {
    adapter.load.mockResolvedValue(blob());
    adapter.listSlots.mockResolvedValue([1]);
    adapter.save.mockRejectedValue(new Error('quota'));
    render(
      createElement(HookProbe, {
        onApi: (api) => {
          hookApi = api;
        },
      }),
    );
    await waitFor('the first load to finish', () => hookApi !== null && !hookApi.loading);
    expect(hookApi!.error).toBeNull();

    let saved: boolean | undefined;
    await act(async () => {
      saved = await hookApi!.dispatch({ type: 'PERSIST', blob: blob() });
    });
    expect(saved).toBe(false);
    expect(hookApi!.error?.operation).toBe('save');

    // A reload now succeeds; the failed write is still true, so the warning
    // must survive it.
    const loadsBefore = adapter.load.mock.calls.length;
    await act(async () => {
      hookApi!.retryLoad();
    });
    await waitFor('the successful reload', () => adapter.load.mock.calls.length > loadsBefore);
    expect(hookApi!.error?.operation).toBe('save');
  });

  it('a load failure shows itself but remembers a pending save warning', async () => {
    adapter.load.mockResolvedValue(blob());
    adapter.listSlots.mockResolvedValue([1]);
    adapter.save.mockRejectedValue(new Error('quota'));
    render(
      createElement(HookProbe, {
        onApi: (api) => {
          hookApi = api;
        },
      }),
    );
    await waitFor('the first load to finish', () => hookApi !== null && !hookApi.loading);

    await act(async () => {
      await hookApi!.dispatch({ type: 'PERSIST', blob: blob() });
    });
    expect(hookApi!.error?.operation).toBe('save');

    // The reload fails: the load error is the urgent truth now.
    adapter.load.mockRejectedValue(new Error('storage broke'));
    const beforeFailure = adapter.load.mock.calls.length;
    await act(async () => {
      hookApi!.retryLoad();
    });
    await waitFor(
      'the load error to replace the warning on screen',
      () => adapter.load.mock.calls.length > beforeFailure && hookApi!.error?.operation === 'load',
    );

    // The reload recovers: the save warning must come back, not vanish.
    adapter.load.mockResolvedValue(blob());
    const beforeRecovery = adapter.load.mock.calls.length;
    await act(async () => {
      hookApi!.retryLoad();
    });
    await waitFor(
      'the remembered save warning',
      () => adapter.load.mock.calls.length > beforeRecovery && hookApi!.error?.operation === 'save',
    );
  });

  it('an unmount before the deferred load starts never reads the adapter', async () => {
    render(
      createElement(HookProbe, {
        onApi: (api) => {
          hookApi = api;
        },
      }),
    );
    // Same macrotask as render: the effect's deferred microtask has not run.
    cleanup();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(adapter.listSlots).not.toHaveBeenCalled();
  });
});

function blob(): SaveBlob {
  return {
    schema_version: '0.1',
    engine_compat: '0.1.0',
    created_at_unix: 1_700_000_000,
    run_id: 'probe',
    chain: {
      life_states: [],
      karma_state: {
        echoes: [],
        accumulated_intent_roots: { care: 0, greed: 0, aversion: 0, delusion: 0 },
        vows: {},
      },
      current_life_index: 0,
    },
  };
}

let hookApi: UseSaveSlotResult | null = null;

function HookProbe({ onApi }: { readonly onApi: (api: UseSaveSlotResult) => void }) {
  const api = useSaveSlot(1);
  useEffect(() => {
    onApi(api);
  }, [api, onApi]);
  return createElement(View, { testID: 'hook-probe' }, createElement(Text, null, 'probe'));
}
