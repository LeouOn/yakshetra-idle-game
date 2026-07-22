// Canonical serialization.
//
// Used by the cross-platform determinism property test (todo 9) and the
// save/load integrity layer (todo 10). The contract: two runs that produce
// structurally-equal engine state MUST serialize to byte-identical JSON, so a
// SHA-256 of the output is a stable replay fingerprint.
//
// Three guarantees make the hash portable across V8 (Node/Hermes-Node) and JSC
// (Hermes/iOS):
//   1. Object keys are emitted in lexicographic order at every depth, so
//      insertion-order differences never reach the digest.
//   2. `Set` is emitted as a sorted array of its canonical encodings; `Map` is
//      emitted as a sorted-key object. Both lose their runtime iteration order.
//   3. `bigint` (which `JSON.stringify` would throw on) is encoded as the
//      single-key object `{"__bigint":"<decimal>"}` so RNG seeds and counts hash
//      identically everywhere.
//
// `sha256` + `serializeSaveBlob` / `deserializeSaveBlob` form the integrity
// layer: a blob is canonicalized, hashed, and the hash is carried alongside the
// payload so a corrupted or hand-edited save is detectable on load (todo 10's
// persistence adapter performs the archival fallback on mismatch).

import { createHash } from 'node:crypto';

import type { SaveBlob } from './types';

/* -------------------------------------------------------------------------------------------------
 * canonicalStringify
 * -----------------------------------------------------------------------------------------------*/

/**
 * Comparator that orders Set elements by their canonical encoding. Sorting on
 * the encoded string (rather than a default `<` compare) keeps ordering
 * deterministic for any element type — strings, numbers, nested objects — and
 * agrees with plain string sort for the common `Set<string>` case (engine
 * `flags` / `fired_once_per_run`).
 */
function compareByEncoding(a: unknown, b: unknown): number {
  const sa = canonicalStringify(a);
  const sb = canonicalStringify(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

/**
 * Produce a canonical JSON string suitable for hashing.
 *
 * Determinism rules:
 *   - primitives render via `JSON.stringify` (booleans/numbers/strings);
 *     non-finite numbers (`NaN`/`Infinity`) collapse to `null`, matching
 *     `JSON.stringify` semantics;
 *   - `bigint` renders as `{"__bigint":"<decimal>"}`;
 *   - arrays recurse element-wise, preserving order (arrays are ordered by
 *     design — `history`, `intent_root_history`, `pending_events`);
 *   - `Set` renders as a sorted array of canonical encodings;
 *   - `Map` renders as an object with stringified keys, then sorted;
 *   - plain objects emit keys in lexicographic order; keys whose value is
 *     `undefined` / function / symbol are dropped (same as `JSON.stringify`).
 *
 * No reliance on `Date`, `Math.random`, or insertion order. Numbers use V8/JSC
 * shortest-round-trip rendering via `JSON.stringify`, which is consistent across
 * modern engines for the integer and ratio values this engine produces.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'bigint') return '{"__bigint":' + JSON.stringify(value.toString(10)) + '}';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value !== 'object') return 'null';

  if (value instanceof Set) {
    const sorted = [...value].sort(compareByEncoding);
    return canonicalStringify(sorted);
  }
  if (value instanceof Map) {
    const record: Record<string, unknown> = {};
    for (const [k, v] of value) record[String(k)] = v;
    return canonicalStringify(record);
  }
  if (Array.isArray(value)) {
    let out = '[';
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out += ',';
      out += canonicalStringify(value[i]);
    }
    return out + ']';
  }

  // Plain record: sorted keys, undefined/function/symbol values dropped.
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  let out = '{';
  let first = true;
  for (const key of keys) {
    const v = record[key];
    const vt = typeof v;
    if (vt === 'undefined' || vt === 'function' || vt === 'symbol') continue;
    if (!first) out += ',';
    first = false;
    out += JSON.stringify(key) + ':' + canonicalStringify(v);
  }
  return out + '}';
}

/* -------------------------------------------------------------------------------------------------
 * sha256
 * -----------------------------------------------------------------------------------------------*/

/**
 * SHA-256 hex digest of a UTF-8 string. Uses Node's built-in `node:crypto`
 * (available since Node 16). The engine stays platform-pure: this is a hash
 * primitive, not a wall-clock, global-RNG, or network source.
 */
export function sha256(str: string): string {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

/* -------------------------------------------------------------------------------------------------
 * SaveBlob integrity envelope (consumed by todo 10 persistence adapters)
 * -----------------------------------------------------------------------------------------------*/

/**
 * On-disk envelope: the original {@link SaveBlob} plus the SHA-256 of its
 * canonical encoding. Storing the hash next to the payload lets the loader
 * detect corruption or hand-edits without re-running the engine.
 */
interface SaveBlobEnvelope {
  payload: SaveBlob;
  integrity_hash: string;
}

/**
 * Canonicalize a {@link SaveBlob} and wrap it with its SHA-256 integrity hash.
 *
 * The returned string is itself canonical (the envelope is re-canonicalized),
 * so the whole file has a stable byte ordering regardless of how the caller
 * assembled `saveBlob`.
 */
export function serializeSaveBlob(saveBlob: SaveBlob): string {
  const integrityHash = sha256(canonicalStringify(saveBlob));
  const envelope: SaveBlobEnvelope = { payload: saveBlob, integrity_hash: integrityHash };
  return canonicalStringify(envelope);
}

/** Result of a successful {@link deserializeSaveBlob} call. */
export interface DeserializedSave {
  saveBlob: SaveBlob;
  integrityHash: string;
}

/**
 * Parse a {@link serializeSaveBlob}-produced string and verify its integrity.
 *
 * @throws {Error} when the JSON is malformed or the recomputed canonical hash of
 *   the payload does not match the stored `integrity_hash`. The todo 10
 *   persistence adapter is responsible for catching this and archiving the
 *   corrupt blob before returning `null` to the caller.
 */
export function deserializeSaveBlob(str: string): DeserializedSave {
  const parsed = JSON.parse(str) as SaveBlobEnvelope;
  const recomputed = sha256(canonicalStringify(parsed.payload));
  if (recomputed !== parsed.integrity_hash) {
    throw new Error(
      'deserializeSaveBlob: integrity hash mismatch (payload corrupted or hand-edited)',
    );
  }
  return { saveBlob: parsed.payload, integrityHash: parsed.integrity_hash };
}
