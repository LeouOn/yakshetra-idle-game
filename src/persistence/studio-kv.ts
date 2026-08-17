// Key-value store for the studio session. Separate from the life-chain
// SaveBlob so the bench can persist without a 0.3 migration.
//
// Tests inject a memory backend. Web uses localStorage when present.

import { canonicalStringify } from '@/engine';
import { parseStudioSession, type StudioSession } from '@/engine/studio-session';

export const STUDIO_SESSION_KEY = 'yakshetra.studio.v0';

export interface StudioKv {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

export function createMemoryStudioKv(seed: Readonly<Record<string, string>> = {}): StudioKv {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    async get(key) {
      return map.get(key);
    },
    async set(key, value) {
      map.set(key, value);
    },
    async del(key) {
      map.delete(key);
    },
  };
}

function localStorageKv(): StudioKv | null {
  const store = globalThis.localStorage;
  if (
    typeof store !== 'object' ||
    store === null ||
    typeof store.getItem !== 'function' ||
    typeof store.setItem !== 'function'
  ) {
    return null;
  }
  return {
    async get(key) {
      const value = store.getItem(key);
      return value === null ? undefined : value;
    },
    async set(key, value) {
      store.setItem(key, value);
    },
    async del(key) {
      store.removeItem(key);
    },
  };
}

let defaultKv: StudioKv = createMemoryStudioKv();

/** Replace the default backend (tests). */
export function setStudioKv(kv: StudioKv): void {
  defaultKv = kv;
}

export function resetStudioKv(): void {
  defaultKv = localStorageKv() ?? createMemoryStudioKv();
}

resetStudioKv();

export async function loadStudioSession(
  kv: StudioKv = defaultKv,
  key: string = STUDIO_SESSION_KEY,
): Promise<StudioSession | null> {
  const raw = await kv.get(key);
  if (raw === undefined) {
    return null;
  }
  try {
    return parseStudioSession(JSON.parse(raw) as unknown);
  } catch {
    await kv.del(key);
    return null;
  }
}

export async function saveStudioSession(
  session: StudioSession,
  kv: StudioKv = defaultKv,
  key: string = STUDIO_SESSION_KEY,
): Promise<void> {
  await kv.set(key, canonicalStringify(session));
}

export async function clearStudioSession(
  kv: StudioKv = defaultKv,
  key: string = STUDIO_SESSION_KEY,
): Promise<void> {
  await kv.del(key);
}
