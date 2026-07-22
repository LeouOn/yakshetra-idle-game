// Native (React Native / Expo) StorageAdapter backed by `expo-sqlite/kv-store`.
//
// `expo-sqlite/kv-store` requires a React Native runtime, so the module is
// lazy-`import()`-ed only when an adapter method runs — never at module load.
// This keeps `src/persistence/native.ts` importable from a Node test/Vitest
// environment without RN present (the test suite imports only the memory
// adapter; tsc type-checks this file against the ambient shim in
// `./platform-modules.d.ts`).
//
// Per plan todo 10: no AsyncStorage (2MB Android cap). SQLite's KV store has no
// such practical ceiling for a save blob that is asserted to stay < 100KB.
//
// Corruption archiving (writing `corrupted-slot-N-{ts}.json` to the device's
// documents directory) is deferred to a follow-up todo; until then a corrupted
// slot resolves to `null` via the `noopArchiveSink`.

import type { SaveBlob } from '@/engine/types';

import type { StorageAdapter } from './adapter';
import { noopArchiveSink, unwrapBlob, wrapBlob } from './corruption';

/** Slot key in the underlying KV store. */
function slotKey(slot: number): string {
  return `slot-${slot}`;
}

/** The subset of expo-sqlite/kv-store this adapter uses (see platform-modules.d.ts). */
interface KvStoreModule {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

/**
 * Lazily resolve the kv-store module. The dynamic import is deferred to call
 * time so that requiring this file in Node never triggers the RN-only module.
 */
async function kv(): Promise<KvStoreModule> {
  // expo-sqlite/kv-store ships with the RN runtime and is intentionally NOT a
  // root dependency (see package.json), so eslint cannot resolve it here — this
  // is the whole point of the lazy import.
  // eslint-disable-next-line import/no-unresolved
  return (await import('expo-sqlite/kv-store')) as KvStoreModule;
}

export class NativeStorageAdapter implements StorageAdapter {
  async load(slot: number): Promise<SaveBlob | null> {
    const { getItem } = await kv();
    const raw = await getItem(slotKey(slot));
    if (raw === null) return null;
    return unwrapBlob(raw, slot, noopArchiveSink);
  }

  async save(slot: number, blob: SaveBlob): Promise<void> {
    const { setItem } = await kv();
    await setItem(slotKey(slot), wrapBlob(blob));
  }

  async listSlots(): Promise<number[]> {
    const { getAllKeys } = await kv();
    const keys = await getAllKeys();
    const slots: number[] = [];
    for (const key of keys) {
      const match = /^slot-(\d+)$/.exec(key);
      if (match) slots.push(Number(match[1]));
    }
    return slots.sort((a, b) => a - b);
  }

  async deleteSlot(slot: number): Promise<void> {
    const { removeItem } = await kv();
    await removeItem(slotKey(slot));
  }
}
