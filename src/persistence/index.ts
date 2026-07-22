// Public barrel for the persistence subpackage.
//
// Re-exports the platform-agnostic interface and SaveBlob type, plus the three
// adapters. Importing `NativeStorageAdapter` / `WebStorageAdapter` is safe in
// any environment: their platform modules (`expo-sqlite/kv-store`,
// `idb-keyval`) are lazy-`import()`-ed inside each METHOD, not at module load,
// so merely importing the class never touches RN/DOM. The Vitest suite only
// exercises `MemoryStorageAdapter`.

export type { SaveBlob, StorageAdapter } from './adapter';
export {
  type ArchivedCorruption,
  type ArchiveSink,
  type CorruptionReason,
  type PersistedEnvelope,
  computeIntegrity,
  noopArchiveSink,
  unwrapBlob,
  wrapBlob,
} from './corruption';
export { MemoryStorageAdapter } from './memory';
export { NativeStorageAdapter } from './native';
export { WebStorageAdapter } from './web';
