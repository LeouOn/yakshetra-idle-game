// Native (React Native / Expo) StorageAdapter backed by `expo-sqlite/kv-store`.
//
// `expo-sqlite/kv-store` requires a React Native runtime, so the module is
// lazy-`import()`-ed only when an adapter method runs — never at module load.
// This keeps `src/persistence/native.ts` importable from a Node test/Vitest
// environment without RN present (the test suite imports only the memory
// adapter; tsc type-checks this file against the ambient shim in
// `./platform-modules.d.ts`).
//
// API SHAPE (expo-sqlite SDK 57): the kv-store module named-exports the
// `SQLiteStorage` class. A dedicated database is opened with
// `new SQLiteStorage(databaseName)`; the underlying SQLite file is itself opened
// lazily on the instance's first method call, so construction is cheap. The
// instance exposes the @react-native-async-storage/async-storage-compatible
// methods `getItem`/`setItem`/`removeItem`/`getAllKeys`. There is NO
// `openStorageAsync` on the kv-store module — that name does not exist in
// expo-sqlite, so the adapter resolves + constructs the instance itself.
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

/**
 * Dedicated SQLite database file backing the kv-store on device. Using a
 * dedicated name (rather than the module's shared default store) isolates save
 * data from any other library that targets the default `AsyncStorage` database.
 */
const SAVE_DB_NAME = 'yakshetra-saves';

/**
 * Minimal `SQLiteStorage` instance surface this adapter uses (the real class
 * ships many more async/sync methods — see `./platform-modules.d.ts`). Narrowed
 * to plain `string` values because the adapter always stores the canonical
 * envelope JSON string.
 */
interface KvStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

/**
 * Cached `SQLiteStorage` instance, or `null` before the first method call.
 * Module-scoped so every {@link NativeStorageAdapter} shares one connection to
 * the `yakshetra-saves` database instead of re-opening it per call.
 */
let storageInstance: KvStore | null = null;

/**
 * Lazily resolve + construct the kv-store instance. The dynamic `import()` is
 * deferred to the first call so importing this file in Node never triggers the
 * RN-only module; the `SQLiteStorage` constructor itself only stores the
 * database name, so the underlying SQLite file opens on the instance's own first
 * method call. The constructed instance is memoized in {@link storageInstance}
 * so all subsequent adapter calls reuse it.
 */
async function storage(): Promise<KvStore> {
  if (storageInstance) return storageInstance;
  // tsc resolves `expo-sqlite/kv-store` via the ambient shim in
  // ./platform-modules.d.ts (which shadows the package's own types); the
  // dynamic import is deferred so a Node/Vitest import of this file never
  // pulls the RN-only module into the graph before a method actually runs.
  const { SQLiteStorage } = await import('expo-sqlite/kv-store');
  storageInstance = new SQLiteStorage(SAVE_DB_NAME);
  return storageInstance;
}

export class NativeStorageAdapter implements StorageAdapter {
  async load(slot: number): Promise<SaveBlob | null> {
    const kv = await storage();
    const raw = await kv.getItem(slotKey(slot));
    if (raw === null) return null;
    return unwrapBlob(raw, slot, noopArchiveSink);
  }

  async save(slot: number, blob: SaveBlob): Promise<void> {
    const kv = await storage();
    await kv.setItem(slotKey(slot), wrapBlob(blob));
  }

  async listSlots(): Promise<number[]> {
    const kv = await storage();
    const keys = await kv.getAllKeys();
    const slots: number[] = [];
    for (const key of keys) {
      const match = /^slot-(\d+)$/.exec(key);
      if (match) slots.push(Number(match[1]));
    }
    return slots.sort((a, b) => a - b);
  }

  async deleteSlot(slot: number): Promise<void> {
    const kv = await storage();
    await kv.removeItem(slotKey(slot));
  }
}
