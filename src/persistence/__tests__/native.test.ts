// NativeStorageAdapter — lazy-init + delegation tests.
//
// The real `expo-sqlite/kv-store` requires a React Native runtime, so this file
// mocks the module and asserts that `NativeStorageAdapter`:
//   1. does NOT touch the kv-store until the first adapter method runs (lazy),
//   2. constructs exactly ONE `SQLiteStorage` for the `yakshetra-saves`
//      database and reuses it across every subsequent method call (memoized),
//   3. delegates load/save/listSlots/deleteSlot to the instance's
//      getItem/setItem/getAllKeys/removeItem with the correct slot keys, and
//   4. round-trips a real SaveBlob through the mocked kv-store unchanged.
//
// Each test re-imports `../native` after `vi.resetModules()` so the adapter's
// module-level instance cache starts empty — that is what lets us assert
// "constructed zero times before the first call" and "constructed exactly once".

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { canonicalStringify } from '@/engine/serialize';
import type { EraId, IntentRoot, LifeId, LifeState, RoleId, SaveBlob } from '@/engine/types';

// ---------------------------------------------------------------------------
// Mock the RN-only kv-store module. `vi.hoisted` makes the mock state available
// to the hoisted `vi.mock` factory (which cannot close over test-local vars).
// The mock `SQLiteStorage` records its database-name arg and returns the shared
// mock instance — returning an object from a constructor overrides `this`, so
// callers receive exactly this surface (matching how `new SQLiteStorage(...)` is
// consumed by the adapter).
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  getAllKeys: vi.fn(),
  SQLiteStorage: vi.fn(function SQLiteStorage(_databaseName: string) {
    return {
      getItem: mocks.getItem,
      setItem: mocks.setItem,
      removeItem: mocks.removeItem,
      getAllKeys: mocks.getAllKeys,
    };
  }),
}));

vi.mock('expo-sqlite/kv-store', () => ({
  SQLiteStorage: mocks.SQLiteStorage,
}));

// ---------------------------------------------------------------------------
// Minimal valid SaveBlob for round-trip assertions.
// ---------------------------------------------------------------------------

function makeBlob(): SaveBlob {
  const life: LifeState = {
    identity: {
      gender: 'woman',
      social_class: 'merchant',
      family_wealth_at_birth: 'modest',
      caste_status: 'none',
      disability_status: 'none',
    },
    id: 'life-001' as LifeId,
    era: 'era-childhood' as EraId,
    role: 'role-monastic-novice' as RoleId,
    age: 7,
    turn: 3,
    resources: { time: 8, energy: 5, provisions: 3, trust: 2, skill: 1, obligation: 0 },
    skills: { meditation: 1 },
    relationships: {},
    flags: new Set(['vow-declared']),
    intent_root_history: ['care'] as IntentRoot[],
    chosen_lens: 'generosity',
    alive: true,
    last_narrative_sid: null,
    event_weights: {},
    cooldowns: {},
    history: ['evt-1', 'evt-2'],
    fired_once_per_run: new Set<string>(),
    pending_events: [],
    schedule_id: null,
    practice_override_id: null,
  };
  return {
    schema_version: '0.1',
    engine_compat: '0.1.0',
    created_at_unix: 1_700_000_000,
    run_id: 'run-abc',
    chain: {
      life_states: [life],
      karma_state: {
        echoes: [],
        accumulated_intent_roots: { care: 1, greed: 0, aversion: 0, delusion: 0 },
        vows: {},
      },
      current_life_index: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NativeStorageAdapter — lazy init + memoization', () => {
  beforeEach(() => {
    // Purge the cached `../native` module so its module-level storage instance
    // starts at null for every test.
    vi.resetModules();
    mocks.getItem.mockReset();
    mocks.setItem.mockReset();
    mocks.removeItem.mockReset();
    mocks.getAllKeys.mockReset();
    mocks.SQLiteStorage.mockClear();
    // Default kv-store behavior: empty store.
    mocks.getItem.mockResolvedValue(null);
    mocks.getAllKeys.mockResolvedValue([]);
  });

  async function freshAdapter() {
    const mod = await import('../native');
    return new mod.NativeStorageAdapter();
  }

  it('does not construct SQLiteStorage until the first adapter method call', async () => {
    await freshAdapter();
    expect(mocks.SQLiteStorage).not.toHaveBeenCalled();
  });

  it('constructs SQLiteStorage lazily for the yakshetra-saves database on first call', async () => {
    const adapter = await freshAdapter();
    await adapter.listSlots();
    expect(mocks.SQLiteStorage).toHaveBeenCalledTimes(1);
    expect(mocks.SQLiteStorage).toHaveBeenCalledWith('yakshetra-saves');
  });

  it('reuses one SQLiteStorage instance across many method calls', async () => {
    const adapter = await freshAdapter();
    await adapter.save(0, makeBlob());
    await adapter.load(0);
    await adapter.listSlots();
    await adapter.deleteSlot(0);
    expect(mocks.SQLiteStorage).toHaveBeenCalledTimes(1);
  });
});

describe('NativeStorageAdapter — delegation', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getItem.mockReset();
    mocks.setItem.mockReset();
    mocks.removeItem.mockReset();
    mocks.getAllKeys.mockReset();
    mocks.SQLiteStorage.mockClear();
    mocks.getItem.mockResolvedValue(null);
    mocks.getAllKeys.mockResolvedValue([]);
  });

  async function freshAdapter() {
    const mod = await import('../native');
    return new mod.NativeStorageAdapter();
  }

  it('load delegates to storage.getItem(slotKey) and returns null when absent', async () => {
    const adapter = await freshAdapter();
    expect(await adapter.load(3)).toBeNull();
    expect(mocks.getItem).toHaveBeenCalledWith('slot-3');
  });

  it('save delegates to storage.setItem with slot key and a wrapped envelope', async () => {
    const adapter = await freshAdapter();
    await adapter.save(2, makeBlob());
    expect(mocks.setItem).toHaveBeenCalledTimes(1);
    const call = mocks.setItem.mock.calls[0] as unknown as [string, string];
    expect(call[0]).toBe('slot-2');
    expect(typeof call[1]).toBe('string');
    const envelope = JSON.parse(call[1]) as { integrity_hash: string };
    expect(typeof envelope.integrity_hash).toBe('string');
  });

  it('listSlots parses slot numbers from getAllKeys, sorted ascending', async () => {
    const adapter = await freshAdapter();
    mocks.getAllKeys.mockResolvedValue(['slot-5', 'slot-0', 'slot-2', 'not-a-slot']);
    expect(await adapter.listSlots()).toEqual([0, 2, 5]);
  });

  it('deleteSlot delegates to storage.removeItem(slotKey)', async () => {
    const adapter = await freshAdapter();
    await adapter.deleteSlot(7);
    expect(mocks.removeItem).toHaveBeenCalledWith('slot-7');
  });

  it('round-trips a SaveBlob through the kv-store unchanged', async () => {
    // Wire the mock instance to a real in-memory map so save→load runs end to end.
    const store = new Map<string, string>();
    mocks.getItem.mockImplementation(async (key: string) => store.get(key) ?? null);
    mocks.setItem.mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
    });

    const adapter = await freshAdapter();
    const blob = makeBlob();
    await adapter.save(1, blob);
    const loaded = await adapter.load(1);
    expect(loaded).not.toBeNull();
    expect(canonicalStringify(loaded as SaveBlob)).toBe(canonicalStringify(blob));
  });
});
