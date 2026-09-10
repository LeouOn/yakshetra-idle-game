import { describe, expect, it, beforeEach } from 'vitest';

import { createLifeState, snapshotLifeChain } from '@/engine';
import { LIFE_SLOT_KEY_PREFIX, LocalStorageAdapter } from '../local-storage';

class MemoryLocalStorage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryLocalStorage(),
    });
  });

  it('round-trips a life-chain blob and lists the slot', async () => {
    const life = createLifeState({
      id: 'life-store' as ReturnType<typeof createLifeState>['id'],
      era: 'tang-china' as ReturnType<typeof createLifeState>['era'],
      role: 'wanderer' as ReturnType<typeof createLifeState>['role'],
      identity: {
        gender: 'unset',
        social_class: 'unset',
        family_wealth_at_birth: 'unset',
        caste_status: 'unset',
        disability_status: 'unset',
      },
    });
    const blob = snapshotLifeChain({ ...life, turn: 6 }, null, 50);
    const kv = new LocalStorageAdapter();
    await kv.save(1, blob);
    const loaded = await kv.load(1);
    expect(loaded?.chain.life_states[0]?.turn).toBe(6);
    expect(await kv.listSlots()).toEqual([1]);
    expect(globalThis.localStorage.getItem(`${LIFE_SLOT_KEY_PREFIX}1`)).toContain('integrity_hash');
    await kv.deleteSlot(1);
    expect(await kv.load(1)).toBeNull();
  });
});
