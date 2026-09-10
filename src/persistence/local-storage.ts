// Web StorageAdapter backed by `localStorage`, same envelope as the memory
// adapter. Studio already persists on localStorage; the life-chain uses this
// so a reload keeps the campaign. Pure of engine clocks: no Date.now.

import type { SaveBlob } from '@/engine/types';

import type { StorageAdapter } from './adapter';
import { noopArchiveSink, unwrapBlob, wrapBlob } from './corruption';

export const LIFE_SLOT_KEY_PREFIX = 'yakshetra.life.slot.';

function slotKey(slot: number): string {
  return `${LIFE_SLOT_KEY_PREFIX}${slot}`;
}

function store(): Storage | null {
  const candidate = globalThis.localStorage;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    typeof candidate.getItem !== 'function' ||
    typeof candidate.setItem !== 'function'
  ) {
    return null;
  }
  return candidate;
}

export class LocalStorageAdapter implements StorageAdapter {
  async load(slot: number): Promise<SaveBlob | null> {
    const raw = store()?.getItem(slotKey(slot));
    if (raw === null || raw === undefined) {
      return null;
    }
    return unwrapBlob(raw, slot, noopArchiveSink);
  }

  async save(slot: number, blob: SaveBlob): Promise<void> {
    const kv = store();
    if (kv === null) {
      return;
    }
    kv.setItem(slotKey(slot), wrapBlob(blob));
  }

  async listSlots(): Promise<number[]> {
    const kv = store();
    if (kv === null) {
      return [];
    }
    const slots: number[] = [];
    for (let i = 0; i < kv.length; i++) {
      const key = kv.key(i);
      if (key === null || !key.startsWith(LIFE_SLOT_KEY_PREFIX)) {
        continue;
      }
      const n = Number(key.slice(LIFE_SLOT_KEY_PREFIX.length));
      if (Number.isInteger(n) && n >= 0) {
        slots.push(n);
      }
    }
    return slots.sort((a, b) => a - b);
  }

  async deleteSlot(slot: number): Promise<void> {
    store()?.removeItem(slotKey(slot));
  }
}
