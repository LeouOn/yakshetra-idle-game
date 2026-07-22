// In-memory StorageAdapter.
//
// Stores each slot as the canonical envelope JSON string in a plain Map — the
// same opaque-string shape a real KV backend (SQLite kv-store, IndexedDB)
// holds. This is the adapter used by Vitest (no platform APIs) and is the
// reference implementation for the round-trip + corruption-fallback tests.
//
// Inspection hooks (`getRaw`, `setRaw`, `archivedCorruptions`) are exposed so
// the test suite can (a) assert the persisted byte size and (b) simulate disk
// corruption by mangling one byte in the stored string — exactly what a real
// KV backend would surface after a partial write. They are prefixed `getRaw`/
// `setRaw` (not underscore-prefixed) because they document a real property of
// the storage substrate: the canonical envelope string IS the unit of
// durability, and being able to inspect it is the contract, not a back door.

import type { SaveBlob } from '@/engine/types';

import type { StorageAdapter } from './adapter';
import { unwrapBlob, wrapBlob, type ArchivedCorruption } from './corruption';

/**
 * Map-backed adapter. Not thread-safe (single-threaded JS); not persistent
 * across process restarts. Use for tests and ephemeral sessions only.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  /** slot -> canonical envelope JSON string */
  private readonly store = new Map<number, string>();
  /** Corruption archive (real FS archiving deferred to a future todo). */
  readonly archivedCorruptions: ArchivedCorruption[] = [];

  async load(slot: number): Promise<SaveBlob | null> {
    const raw = this.store.get(slot);
    if (raw === undefined) return null;
    return unwrapBlob(raw, slot, (entry) => {
      this.archivedCorruptions.push(entry);
    });
  }

  async save(slot: number, blob: SaveBlob): Promise<void> {
    this.store.set(slot, wrapBlob(blob));
  }

  async listSlots(): Promise<number[]> {
    return [...this.store.keys()].sort((a, b) => a - b);
  }

  async deleteSlot(slot: number): Promise<void> {
    this.store.delete(slot);
  }

  // -------------------------------------------------------------------------
  // Inspection hooks (documented contract, not a private back door).
  // -------------------------------------------------------------------------

  /** The canonical envelope JSON currently stored for a slot (undefined if absent). */
  getRaw(slot: number): string | undefined {
    return this.store.get(slot);
  }

  /**
   * Overwrite the raw envelope string for a slot. Used by tests to simulate
   * disk corruption (flip one byte / rewrite the blob without recomputing the
   * integrity hash) and to seed pre-existing saves.
   */
  setRaw(slot: number, raw: string): void {
    this.store.set(slot, raw);
  }
}
