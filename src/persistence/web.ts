// Web (browser) StorageAdapter backed by IndexedDB via `idb-keyval`.
//
// `idb-keyval` requires a DOM/IndexedDB runtime, so the module is lazy-
// `import()`-ed only when an adapter method runs — never at module load. This
// keeps `src/persistence/web.ts` importable from a Node test/Vitest
// environment without a DOM present (the test suite imports only the memory
// adapter; tsc type-checks this file against the ambient shim in
// `./platform-modules.d.ts`).
//
// IndexedDB has no practical size ceiling for a save blob asserted to stay
// < 100KB, and unlike AsyncStorage it survives on web far beyond any 2MB cap.
//
// Corruption archiving (writing `corrupted-slot-N-{ts}.json` to a side-store
// or triggering a download) is deferred to a follow-up todo; until then a
// corrupted slot resolves to `null` via the `noopArchiveSink`.

import type { SaveBlob } from '@/engine/types';

import type { StorageAdapter } from './adapter';
import { noopArchiveSink, unwrapBlob, wrapBlob } from './corruption';

/** Slot key in the underlying IndexedDB default store. */
function slotKey(slot: number): string {
  return `slot-${slot}`;
}

/** The subset of idb-keyval this adapter uses (see platform-modules.d.ts). */
interface IdbKeyvalModule {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * Lazily resolve the idb-keyval module. The dynamic import is deferred to call
 * time so that requiring this file in Node never trigger the DOM-only module.
 */
async function idb(): Promise<IdbKeyvalModule> {
  // idb-keyval ships in the web bundle and is intentionally NOT a root
  // dependency (see package.json), so eslint cannot resolve it here — this is
  // the whole point of the lazy import.
  // eslint-disable-next-line import/no-unresolved
  return (await import('idb-keyval')) as IdbKeyvalModule;
}

export class WebStorageAdapter implements StorageAdapter {
  async load(slot: number): Promise<SaveBlob | null> {
    const { get } = await idb();
    const raw = await get(slotKey(slot));
    if (raw === undefined) return null;
    return unwrapBlob(raw, slot, noopArchiveSink);
  }

  async save(slot: number, blob: SaveBlob): Promise<void> {
    const { set } = await idb();
    await set(slotKey(slot), wrapBlob(blob));
  }

  async listSlots(): Promise<number[]> {
    const { keys } = await idb();
    const all = await keys();
    const slots: number[] = [];
    for (const key of all) {
      const match = /^slot-(\d+)$/.exec(key);
      if (match) slots.push(Number(match[1]));
    }
    return slots.sort((a, b) => a - b);
  }

  async deleteSlot(slot: number): Promise<void> {
    const { del } = await idb();
    await del(slotKey(slot));
  }
}
