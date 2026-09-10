// Pick a durable StorageAdapter for the life-chain. Studio already uses
// localStorage on web; campaign play used an in-memory adapter and vanished
// on reload. Tests in Node get MemoryStorageAdapter (no DOM).

import type { StorageAdapter } from './adapter';
import { LocalStorageAdapter } from './local-storage';
import { MemoryStorageAdapter } from './memory';
import { NativeStorageAdapter } from './native';

function hasLocalStorage(): boolean {
  const candidate = globalThis.localStorage;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function'
  );
}

function isReactNative(): boolean {
  const nav = (globalThis as { navigator?: { product?: string } }).navigator;
  return nav?.product === 'ReactNative';
}

export function createPlatformStorageAdapter(): StorageAdapter {
  if (hasLocalStorage()) {
    return new LocalStorageAdapter();
  }
  if (isReactNative()) {
    return new NativeStorageAdapter();
  }
  return new MemoryStorageAdapter();
}

let lifeAdapter: StorageAdapter = createPlatformStorageAdapter();

export function lifeStorageAdapter(): StorageAdapter {
  return lifeAdapter;
}

export function setLifeStorageAdapter(adapter: StorageAdapter): void {
  lifeAdapter = adapter;
}

export function resetLifeStorageAdapter(): void {
  lifeAdapter = createPlatformStorageAdapter();
}
