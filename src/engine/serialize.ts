// Canonical serialization.
//
// Used by the cross-platform determinism property test (todo 9) and the
// save/load integrity layer (todo 10). The contract: two runs that produce
// structurally-equal engine state MUST serialize to byte-identical JSON, so a
// SHA-256 of the output is a stable replay fingerprint.

/**
 * Produce a canonical JSON string suitable for hashing.
 *
 * STUB: delegates to plain `JSON.stringify`. This is NOT yet safe for
 * cross-platform hash agreement: object key order is not guaranteed, and
 * `Set`/`Map` are not natively serializable. The full implementation
 * (lexicographic key sort, deterministic Set/Map encoding, stable float
 * rendering) lands in todo 9.
 */
export function canonicalStringify(value: unknown): string {
  // TODO(todo-9): stable key sorting, deterministic Set/Map serialization,
  // optional float rounding. Must agree across Node/V8 and Hermes/JSC.
  return JSON.stringify(value);
}
