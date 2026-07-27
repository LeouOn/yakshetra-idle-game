// SaveBlob migration: schema version 0.1 -> 0.2.
//
// The engine never breaks existing saves: a 0.1 blob loaded from disk is
// migrated to 0.2 with deterministic defaults before any idle-mode code reads
// it. The migration is PURE — no wall clock, no RNG, no platform APIs. Two
// migrations of the same 0.1 blob produce byte-identical 0.2 blobs (verified
// by the canonical encoder in __tests__/migration.test.ts).
//
// Plan reference: idle-mode followup. Adds three fields to the blob:
//   - last_visited_at_unix  (defaults to created_at_unix)
//   - last_simulated_tick   (defaults to 0n; the idle system populates it)
//   - pending_offline_summary (defaults to null; never synthesized here)

import type { AnySaveBlob, SaveBlob, SaveBlobV2 } from './types';

/** Current schema version this engine build produces and reads natively. */
export const CURRENT_SCHEMA_VERSION = '0.2' as const;

/**
 * Read the schema version pinned on a blob. Pure: reads one field, computes
 * nothing. Used by the loader to decide whether {@link migrateSaveBlob} is
 * needed before the idle system touches the blob.
 */
export function getBlobVersion(blob: AnySaveBlob): string {
  return blob.schema_version;
}

/**
 * True when the blob is not at {@link CURRENT_SCHEMA_VERSION} and therefore
 * must be passed through {@link migrateSaveBlob} before idle-mode code reads
 * it. False for blobs already at the current version.
 */
export function needsMigration(blob: AnySaveBlob): boolean {
  return blob.schema_version !== CURRENT_SCHEMA_VERSION;
}

/**
 * Migrate any supported SaveBlob to the current {@link CURRENT_SCHEMA_VERSION}.
 *
 * - Already 0.2 -> returned unchanged (same reference, no allocation).
 * - 0.1 -> new 0.2 object with the three idle fields set to deterministic
 *   defaults (see {@link migrateFromV01}).
 * - Any other version -> throws. The migration is total over the supported
 *   set; unknown versions surface loudly rather than fabricating defaults.
 *
 * Pure: no Date, no Math.random, no platform APIs. The same input always
 * yields the same output, so the canonical SHA-256 of a migrated blob is a
 * stable replay fingerprint.
 */
export function migrateSaveBlob(blob: AnySaveBlob): SaveBlobV2 {
  const version = blob.schema_version;
  if (version === '0.2') {
    return blob;
  }
  if (version === '0.1') {
    return migrateFromV01(blob);
  }
  throw new Error(`migrateSaveBlob: unsupported schema_version "${version}"`);
}

/**
 * 0.1 -> 0.2 defaulting rule. Pure object construction; the original blob is
 * not mutated (callers may still hold the 0.1 reference for diffing).
 *
 * The `chain` reference is shared between the v0.1 and v0.2 objects: it is a
 * readonly nested structure on SaveBlobV2, and the migration system treats it
 * as opaque (the within-life reducer and echo reducer own its invariants).
 */
function migrateFromV01(blob: SaveBlob): SaveBlobV2 {
  return {
    schema_version: '0.2',
    engine_compat: blob.engine_compat,
    created_at_unix: blob.created_at_unix,
    last_visited_at_unix: blob.created_at_unix,
    last_simulated_tick: 0n,
    run_id: blob.run_id,
    chain: blob.chain,
    pending_offline_summary: null,
  };
}
