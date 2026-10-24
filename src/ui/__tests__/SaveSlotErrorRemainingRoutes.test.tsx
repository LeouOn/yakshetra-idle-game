import { createElement, useEffect } from 'react';
import { Text, View } from 'react-native';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { act, render } from '@/test/rntl';
import type { SaveBlob } from '@/engine';
import { useSaveSlot, type UseSaveSlotResult } from '@/ui/hooks/useSaveSlot';

// Round 2B: the routes the first save-error batch did not cover. Bardo and
// chain-complete read the slot and never rendered the bar; both routes' deletes
// went through the hook's direct deleteSlot(), which threw instead of
// surfacing. These tests drive the real route components with the adapter and
// router mocked at module scope.

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() };
vi.mock('expo-router', () => ({
  router,
  useLocalSearchParams: (): Record<string, string> => ({}),
  useRouter: () => router,
}));

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

// Same bounded-wait contract as SaveSlotErrorRoutes.test.tsx (that file's
// helper is not exported; duplicating 30 lines keeps the 2A and 2B commits
// independent).
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

function blob(): SaveBlob {
  return {
    schema_version: '0.1',
    engine_compat: '0.1.0',
    created_at_unix: 1_700_000_000,
    run_id: 'run-test',
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

beforeEach(() => {
  hookApi = null;
  adapter.load.mockReset().mockResolvedValue(null);
  adapter.save.mockReset().mockResolvedValue(undefined);
  adapter.listSlots.mockReset().mockResolvedValue([1]);
  adapter.deleteSlot.mockReset().mockResolvedValue(undefined);
  router.push.mockClear();
  router.replace.mockClear();
});

// Two bounded waits can take 60 s on a loaded box; keep the suite timeout
// above that so the wait's own message is the one a broken run reports.
describe('save-error bar on the remaining slot routes', { timeout: 90_000 }, () => {
  it('bardo: a load that throws paints the bar with Try again', async () => {
    adapter.load.mockRejectedValue(new Error('storage broke'));
    const BardoScreen = (await import('../../../app/bardo')).default;
    const ui = render(createElement(BardoScreen));
    await waitForTestID(ui, 'bardo-screen');
    await waitForTestID(ui, 'save-error-bar');
    expect(() => ui.getByTestID('save-error-retry')).not.toThrow();
  });

  it('chain-complete: a load that throws paints the bar with Try again', async () => {
    adapter.load.mockRejectedValue(new Error('storage broke'));
    const ChainScreen = (await import('../../../app/chain-complete')).default;
    const ui = render(createElement(ChainScreen));
    await waitForTestID(ui, 'chain-complete-screen');
    await waitForTestID(ui, 'save-error-bar');
    expect(() => ui.getByTestID('save-error-retry')).not.toThrow();
  });

  it('chain-complete: an unreadable slot disables Begin and never deletes it', async () => {
    adapter.load.mockRejectedValue(new Error('storage broke'));
    const ChainScreen = (await import('../../../app/chain-complete')).default;
    const ui = render(createElement(ChainScreen));
    await waitForTestID(ui, 'chain-begin-new');
    expect(ui.getByTestID('chain-begin-new').props.disabled).toBe(true);
    // The shim's press calls the handler directly (it does not emulate the
    // platform's disabled gate), so this also proves the route's own guard.
    ui.press(ui.getByTestID('chain-begin-new'));
    expect(adapter.deleteSlot).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('chain-complete: Try again after a failed load re-enables Begin', async () => {
    adapter.load.mockReset().mockRejectedValueOnce(new Error('storage broke'));
    adapter.load.mockResolvedValue(blob());
    const ChainScreen = (await import('../../../app/chain-complete')).default;
    const ui = render(createElement(ChainScreen));
    await waitForTestID(ui, 'save-error-retry');
    expect(ui.getByTestID('chain-begin-new').props.disabled).toBe(true);
    ui.press(ui.getByTestID('save-error-retry'));
    await waitFor('Begin to be enabled after a successful retry', () => {
      try {
        return ui.getByTestID('chain-begin-new').props.disabled !== true;
      } catch {
        return false;
      }
    });
    expect(() => ui.getByTestID('save-error-bar')).toThrow();
  });

  it('chain-complete: a readable slot keeps Begin enabled, deletes, and navigates', async () => {
    adapter.load.mockResolvedValue(blob());
    const ChainScreen = (await import('../../../app/chain-complete')).default;
    const ui = render(createElement(ChainScreen));
    await waitForTestID(ui, 'chain-begin-new');
    expect(ui.getByTestID('chain-begin-new').props.disabled).not.toBe(true);
    ui.press(ui.getByTestID('chain-begin-new'));
    await waitFor(
      'navigation after a successful delete',
      () => router.replace.mock.calls.length > 0,
    );
    expect(adapter.deleteSlot).toHaveBeenCalledWith(1);
  });

  it('chain-complete: a refused delete paints the bar and does not navigate', async () => {
    adapter.load.mockResolvedValue(blob());
    adapter.deleteSlot.mockRejectedValue(new Error('quota'));
    const ChainScreen = (await import('../../../app/chain-complete')).default;
    const ui = render(createElement(ChainScreen));
    await waitForTestID(ui, 'chain-begin-new');
    expect(ui.getByTestID('chain-begin-new').props.disabled).not.toBe(true);
    ui.press(ui.getByTestID('chain-begin-new'));
    await waitForTestID(ui, 'save-error-bar');
    expect(adapter.deleteSlot).toHaveBeenCalledWith(1);
    expect(router.replace).not.toHaveBeenCalled();
    // Try again re-runs the load, not a delete, so it is honestly absent here.
    expect(() => ui.getByTestID('save-error-retry')).toThrow();
  });

  it('settings: a refused delete paints the bar instead of throwing', async () => {
    adapter.load.mockResolvedValue(blob());
    adapter.deleteSlot.mockRejectedValue(new Error('quota'));
    const SettingsScreen = (await import('../../../app/settings')).default;
    const ui = render(createElement(SettingsScreen));
    await waitForTestID(ui, 'settings-slot-1-delete');
    await waitFor('slot 1 delete to be enabled', () => {
      try {
        return ui.getByTestID('settings-slot-1-delete').props.disabled !== true;
      } catch {
        return false;
      }
    });
    ui.press(ui.getByTestID('settings-slot-1-delete'));
    await waitForTestID(ui, 'save-error-bar');
    expect(adapter.deleteSlot).toHaveBeenCalledWith(1);
    expect(() => ui.getByTestID('save-error-retry')).toThrow();
  });

  it('a refused delete reports failure, keeps the loaded slot, and does not clear it', async () => {
    adapter.load.mockResolvedValue(blob());
    adapter.deleteSlot.mockRejectedValue(new Error('quota'));
    render(
      createElement(HookProbe, {
        onApi: (api) => {
          hookApi = api;
        },
      }),
    );
    await waitFor('the first load to finish', () => hookApi !== null && !hookApi.loading);
    expect(hookApi!.state).not.toBeNull();

    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await hookApi!.deleteSlot(1);
    });
    expect(deleted).toBe(false);
    expect(hookApi!.error?.operation).toBe('delete');
    // The slot is still there; navigating away or blanking it would lose it.
    expect(hookApi!.state).not.toBeNull();
  });
});

let hookApi: UseSaveSlotResult | null = null;

function HookProbe({ onApi }: { readonly onApi: (api: UseSaveSlotResult) => void }) {
  const api = useSaveSlot(1);
  useEffect(() => {
    onApi(api);
  }, [api, onApi]);
  return createElement(View, { testID: 'hook-probe' }, createElement(Text, null, 'probe'));
}
