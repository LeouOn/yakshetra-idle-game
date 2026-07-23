// Web platform stub for the native storage adapter.
//
// WHY THIS FILE EXISTS:
// The real `NativeStorageAdapter` lives in `./native.ts` and lazy-`import()`s
// `expo-sqlite/kv-store` inside its methods. That lazy import is fine for the
// React Native runtime, but Metro resolves dynamic `import()` calls at BUNDLE
// time (not at call time). On the web platform, following
// `import('expo-sqlite/kv-store')` drags in expo-sqlite's wasm-backed web
// implementation (`./wa-sqlite/wa-sqlite.wasm`), which Metro cannot resolve as a
// JS module — the web build dies there even though `NativeStorageAdapter` is
// never instantiated on web.
//
// THE FIX:
// Metro's platform-extension resolver prefers `native.web.ts` over `native.ts`
// when bundling for the `web` platform, so this stub is selected and the
// expo-sqlite import never enters the web module graph. Native (iOS/Android)
// builds resolve `./native` to the real `native.ts` unchanged, and the Vitest
// Node resolver ignores the `.web.ts` extension and also uses `native.ts`.
//
// `NativeStorageAdapter` remains part of the persistence barrel's public API on
// every platform (the type is identical), but on web any attempt to USE it
// throws immediately and loudly — web callers must use `WebStorageAdapter`.
//
// This stub does not change the real adapter's method bodies (see `./native.ts`)
// and introduces no `as any` / `@ts-ignore` escapes.

import type { SaveBlob } from '@/engine/types';

import type { StorageAdapter } from './adapter';

/** Message used by every method — single source so the wording stays consistent. */
const NOT_AVAILABLE_ON_WEB =
  'NativeStorageAdapter is not available on the web platform. ' +
  'Use WebStorageAdapter (idb-keyval/IndexedDB) instead.';

/**
 * Web-only stub. Implements the full {@link StorageAdapter} contract so the
 * type system stays identical across platforms, but every method rejects so a
 * misplaced call surfaces immediately rather than silently no-op'ing.
 */
export class NativeStorageAdapter implements StorageAdapter {
  async load(_slot: number): Promise<SaveBlob | null> {
    throw new Error(NOT_AVAILABLE_ON_WEB);
  }

  async save(_slot: number, _blob: SaveBlob): Promise<void> {
    throw new Error(NOT_AVAILABLE_ON_WEB);
  }

  async listSlots(): Promise<number[]> {
    throw new Error(NOT_AVAILABLE_ON_WEB);
  }

  async deleteSlot(_slot: number): Promise<void> {
    throw new Error(NOT_AVAILABLE_ON_WEB);
  }
}
