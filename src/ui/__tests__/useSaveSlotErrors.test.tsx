// Persistence failures must be visible, not silently indistinguishable from
// "nothing saved yet".
//
// The web build shipped a life save that never happened: `node:crypto`'s
// `createHash` does not exist in the browser bundle, so the adapter threw, the
// promise rejected unhandled, and the hook went on reporting `state: null` —
// exactly what a brand-new slot looks like. A player had no way to tell, and no
// test could see it, because every test runs in Node where the hash works.
//
// These tests pin the other half of that fix: the hash is now platform-free
// (see `@/engine/sha256` and its oracle test), and *when* persistence does fail
// for some other reason, the hook reports it through `error` instead of
// swallowing it. If someone removes the error path, these fail.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { Text, View } from 'react-native';

import { render, act } from '@/test/rntl';
import { useSaveSlot, type SaveSlotError } from '@/ui/hooks/useSaveSlot';
import type { SaveBlob } from '@/engine';

/** A minimal SaveBlob-shaped value; these tests never inspect engine state. */
const FAKE_BLOB = { schema_version: '0.2', run_id: 'r' } as unknown as SaveBlob;

interface AdapterStub {
  load: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  listSlots: ReturnType<typeof vi.fn>;
  deleteSlot: ReturnType<typeof vi.fn>;
}

let adapter: AdapterStub;

vi.mock('@/persistence', () => ({
  lifeStorageAdapter: () => adapter,
}));

/** Probe that mirrors how screens consume the hook. */
function Probe() {
  const { state, loading, error, clearError, dispatch, importSlot } = useSaveSlot(1);
  return createElement(
    View,
    { testID: 'probe' },
    createElement(Text, { testID: 'loading' }, loading ? 'yes' : 'no'),
    createElement(Text, { testID: 'state' }, state === null ? 'null' : 'set'),
    createElement(Text, { testID: 'op' }, error === null ? 'none' : error.operation),
    createElement(Text, { testID: 'msg' }, error === null ? '' : error.message),
    createElement(
      Text,
      { testID: 'save', onPress: () => void dispatch({ type: 'PERSIST', blob: FAKE_BLOB }) },
      'save',
    ),
    createElement(
      Text,
      { testID: 'import', onPress: () => void importSlot(1, 'not-base64-envelope') },
      'import',
    ),
    createElement(Text, { testID: 'clear', onPress: clearError }, 'clear'),
  );
}

/** Render and let the mount effect's async body settle. */
async function mount() {
  const result = render(createElement(Probe));
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return result;
}

function textOf(node: { children: readonly unknown[] }): string {
  return node.children.filter((c): c is string => typeof c === 'string').join('');
}

type Rendered = ReturnType<typeof render>;

function read(r: Rendered) {
  const one = (id: string): string => textOf(r.getByTestID(id) as never);
  const op = one('op');
  return {
    loading: one('loading'),
    state: one('state'),
    error: op === 'none' ? null : ({ operation: op, message: one('msg') } as SaveSlotError),
  };
}

beforeEach(() => {
  adapter = {
    load: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
    listSlots: vi.fn(async () => []),
    deleteSlot: vi.fn(async () => undefined),
  };
});

describe('useSaveSlot: a load that throws is reported, not shown as an empty slot', () => {
  it('sets error.operation = load and finishes loading', async () => {
    adapter.listSlots = vi.fn(async () => {
      throw new Error('localStorage unavailable (private mode)');
    });
    const r = await mount();
    const seen = read(r);
    expect(seen.loading).toBe('no'); // it settled rather than hanging
    expect(seen.state).toBe('null');
    expect(seen.error?.operation).toBe('load');
    expect(seen.error?.message).toContain('localStorage unavailable');
  });

  it('does not report an error when the load succeeds', async () => {
    const r = await mount();
    const seen = read(r);
    expect(seen.error).toBeNull();
    expect(seen.loading).toBe('no');
  });
});

describe('useSaveSlot: a save that throws is reported and leaves state untouched', () => {
  it('sets error.operation = save and does not claim the blob is stored', async () => {
    const r = await mount();
    expect(read(r).error).toBeNull();

    adapter.save = vi.fn(async () => {
      throw new Error('QuotaExceededError');
    });
    await act(async () => {
      r.getByTestID('save').props.onPress();
      await Promise.resolve();
    });

    const seen = read(r);
    expect(seen.error?.operation).toBe('save');
    expect(seen.error?.message).toContain('QuotaExceededError');
    expect(seen.state).toBe('null'); // the blob was NOT accepted
    expect(adapter.save).toHaveBeenCalledTimes(1);
  });

  it('records a successful save as no error and keeps the blob in state', async () => {
    const r = await mount();
    await act(async () => {
      r.getByTestID('save').props.onPress();
      await Promise.resolve();
    });
    const seen = read(r);
    expect(seen.error).toBeNull();
    expect(seen.state).toBe('set');
  });
});

describe('useSaveSlot: an import that fails to verify is reported as import', () => {
  it('sets error.operation = import instead of throwing at the call site', async () => {
    const r = await mount();
    await act(async () => {
      r.getByTestID('import').props.onPress();
      await Promise.resolve();
    });
    const seen = read(r);
    expect(seen.error?.operation).toBe('import');
    expect(adapter.save).not.toHaveBeenCalled(); // nothing was written
  });
});

describe('useSaveSlot: clearError', () => {
  it('dismisses the surfaced failure', async () => {
    adapter.save = vi.fn(async () => {
      throw new Error('disk on fire');
    });
    const r = await mount();
    await act(async () => {
      r.getByTestID('save').props.onPress();
      await Promise.resolve();
    });
    expect(read(r).error?.operation).toBe('save');

    await act(async () => {
      r.getByTestID('clear').props.onPress();
      await Promise.resolve();
    });
    expect(read(r).error).toBeNull();
  });
});

describe('PERSIST resolves false on a failing adapter (wave-1 review #4)', () => {
  it('an awaiting caller can tell the write failed without catching', async () => {
    adapter.load.mockResolvedValue(null);
    adapter.save.mockRejectedValue(new Error('disk gone'));
    let resolved: boolean | undefined;
    function Awaiter() {
      const { dispatch } = useSaveSlot(1);
      return createElement(
        Text,
        {
          testID: 'persist',
          onPress: () => {
            void dispatch({ type: 'PERSIST', blob: FAKE_BLOB }).then((ok) => {
              resolved = ok;
            });
          },
        },
        'persist',
      );
    }
    const ui = render(createElement(Awaiter));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    ui.press(ui.getByTestID('persist'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(resolved).toBe(false);
  });
});
