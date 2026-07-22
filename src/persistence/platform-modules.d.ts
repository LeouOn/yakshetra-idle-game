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
// References:
//   expo-sqlite/kv-store -> https://docs.expo.dev/versions/latest/sdk/sqlite/
//   idb-keyval           -> https://github.com/jakearchibald/idb-keyval

declare module 'expo-sqlite/kv-store' {
  /** Reads one key. Resolves `null` when the key is absent. */
  export function getItem(key: string): Promise<string | null>;
  /** Writes (overwrites) a key. */
  export function setItem(key: string, value: string): Promise<void>;
  /** Removes a key; no-op when absent. */
  export function removeItem(key: string): Promise<void>;
  /** Returns all keys present in the store. */
  export function getAllKeys(): Promise<string[]>;
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
