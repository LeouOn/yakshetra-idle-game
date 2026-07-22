// Storage adapter interface + the SaveBlob type re-export.
//
// This file is deliberately platform-pure: it imports ONLY a type from
// `@/engine/types`. Native (expo-sqlite) and web (idb-keyval) backends are
// lazy-imported inside `native.ts` / `web.ts` so that importing this interface
// file (or the memory adapter) in a Node test environment never pulls in a
// platform-only module.
//
// Plan reference: todo 10 — Save/load with versioning.
//   load   : read one slot; return null if absent OR if the integrity check
//            fails (see ./corruption.ts — a corrupted slot is archived then
//            surfaces to the caller as "no save", so the UI offers a fresh
//            start rather than crashing on a half-written blob).
//   save   : write one slot, atomically wrapping the blob with a SHA-256
//            integrity envelope.
//   listSlots : the occupied slot numbers, ascending.
//   deleteSlot: remove a slot; no-op when absent.

import type { SaveBlob } from '@/engine/types';

/**
 * Minimal storage contract every backend implements.
 *
 * Slot numbers are opaque, non-negative integers chosen by the caller (the
 * save/load coordinator). Adapters MUST treat them as opaque — no slot-0
 * special meaning, no implicit auto-increment.
 */
export interface StorageAdapter {
  /**
   * Load a slot. Resolves `null` when the slot is absent or when the stored
   * blob fails its integrity check (in which case the bad payload is archived
   * via the adapter's corruption sink before this resolves).
   */
  load(slot: number): Promise<SaveBlob | null>;
  /** Save a slot, wrapping it with an integrity envelope. */
  save(slot: number, blob: SaveBlob): Promise<void>;
  /** List occupied slot numbers, ascending. */
  listSlots(): Promise<number[]>;
  /** Delete a slot. No-op when the slot is absent. */
  deleteSlot(slot: number): Promise<void>;
}

/**
 * The save blob persisted per slot. The literal `schema_version: '0.1'` is a
 * string-literal type, so loading a future or past incompatible blob fails at
 * the type boundary; the runtime schema check lives in the engine serialize
 * layer (todo 9 canonical form + a future zod guard).
 *
 * `created_at_unix` is advisory metadata ONLY — the engine MUST NOT read it
 * for game logic. It exists so the UI can show "last played 2 hours ago". The
 * persistence layer treats it as opaque.
 */
export type { SaveBlob };
