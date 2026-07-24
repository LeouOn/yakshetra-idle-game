// Ambient module declarations for the platform-specific KV backends used by the
// native and web storage adapters.
//
// WHY: `expo-sqlite/kv-store` requires a React Native runtime and `idb-keyval`
// requires a DOM/IndexedDB runtime. Neither package is installed at the project
// root (see package.json), and we must keep `src/persistence/*.ts` loadable in
// a pure Node test environment so `tsc --noEmit` and Vitest can run without the
// RN/DOM platform. The native and web adapters therefore lazy-`import()` these
// modules only when instantiated on their target platform.
//
// These shims declare the *minimal subset* of each backend's API that the
// adapters depend on, typed against plain `string` keys/values (the adapters
// always stringify the slot key and store the canonical envelope JSON string).
// At runtime the real modules ship a compatible signature; if a backend's API
// drifts, tsc will flag the mismatch on this file first.
//
// NOTE on `expo-sqlite/kv-store`: this ambient declaration is the AUTHORITATIVE
// type source for tsc — a `declare module` block in a script (non-module) file
// SHADOWS the package's own shipped types rather than augmenting them, so the
// shape below is what the native adapter is checked against. It mirrors the
// real SDK 57 API exactly: the kv-store module named-exports the `SQLiteStorage`
// class; a dedicated database is opened with `new SQLiteStorage(databaseName)`
// (the SQLite file itself opens lazily on the instance's first method call), and
// the instance exposes the @react-native-async-storage/async-storage-compatible
// `getItem`/`setItem`/`removeItem`/`getAllKeys` methods. There is NO
// `openStorageAsync` on the kv-store module — declaring one would reintroduce
// the exact compile-clean-but-crash-on-device mismatch this file exists to
// prevent.
//
// References:
//   expo-sqlite/kv-store -> https://docs.expo.dev/versions/latest/sdk/sqlite/
//   idb-keyval           -> https://github.com/jakearchibald/idb-keyval

declare module 'expo-sqlite/kv-store' {
  /**
   * Key-value store backed by SQLite. Constructed with the name of the
   * database file to use; the underlying SQLite database is opened lazily on
   * the instance's first method call (guarded by an internal await-lock), so
   * construction itself is cheap and synchronous.
   *
   * Declared here as the minimal subset the native adapter depends on. The real
   * module also ships a default singleton instance (`AsyncStorage`/`Storage`);
   * the adapter deliberately constructs a dedicated instance so saves live in
   * their own database file (`yakshetra-saves`) rather than the shared default.
   */
  export class SQLiteStorage {
    constructor(databaseName: string);
    /** Reads one key. Resolves `null` when the key is absent. */
    getItem(key: string): Promise<string | null>;
    /** Writes (overwrites) a key. */
    setItem(key: string, value: string): Promise<void>;
    /** Removes a key; no-op when absent. */
    removeItem(key: string): Promise<void>;
    /** Returns all keys present in the store. */
    getAllKeys(): Promise<string[]>;
  }
}

declare module 'idb-keyval' {
  /** Reads one key. Resolves `undefined` when the key is absent. */
  export function get(key: string): Promise<string | undefined>;
  /** Writes (overwrites) a key. */
  export function set(key: string, value: string): Promise<void>;
  /** Removes a key; no-op when absent. */
  export function del(key: string): Promise<void>;
  /** Returns all keys present in the default store. */
  export function keys(): Promise<string[]>;
}
