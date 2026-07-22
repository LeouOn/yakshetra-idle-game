// Seeded deterministic RNG (xoshiro128**).
//
// Reference: https://prng.di.unimi.it/xoshiro128starstar.c
// Full implementation — known-answer vectors, property tests, BigInt-seeded
// Uint32Array(4) state — lands in todo 3. This file exists so the rest of the
// engine can depend on a stable `Rng` interface and `createRng` symbol now.

/** Deterministic random source. All methods consume the seeded stream only. */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Integer in [minInclusive, maxExclusive). */
  nextInt(minInclusive: number, maxExclusive: number): number;
  /** Pick one element from a non-empty array using the seeded stream. */
  pick<T>(arr: readonly T[]): T;
  /** Return a NEW shuffled array; the input is not mutated. */
  shuffle<T>(arr: readonly T[]): T[];
}

/**
 * Create a deterministic RNG from a >=128-bit bigint seed.
 *
 * STUB: throws. Replaced by the xoshiro128** implementation in todo 3.
 */
export function createRng(_seed: bigint): Rng {
  // TODO(todo-3): seed-split into Uint32Array(4), implement xoshiro128** next(),
  // nextInt(), pick(), shuffle() — all consuming only the seeded stream.
  throw new Error('createRng: not implemented (todo 3)');
}
