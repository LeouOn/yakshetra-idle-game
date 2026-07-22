/**
 * Public RNG API for the deterministic engine.
 *
 * `createRng` composes the xoshiro128** core (from `./rng-impl`) into the
 * `Rng` interface (float `next`, bounded `nextInt`, `pick`, `shuffle`). Every
 * method draws exclusively from the seeded stream — the engine never draws
 * from an unseeded global RNG.
 */
import type { Rng } from './types';

import { createXoshiro128StarStar } from './rng-impl';

export type { Rng };

/** 2^-32; multiplying a uint32 by this maps it into [0, 1). */
const INV_TWO_POW_32 = 2.3283064365386963e-10;

/** Maximum integer range supported by `nextInt` (2^32). */
const MAX_NEXT_INT_RANGE = 0x100000000;

/**
 * Narrows a possibly-undefined indexed element to `T`.
 *
 * Required by `noUncheckedIndexedAccess`; the guard is unreachable for indices
 * the caller has validated and is not defensive bloat.
 */
function getElement<T>(arr: readonly T[], index: number): T {
  const value = arr[index];
  if (value === undefined) {
    throw new Error(`rng: index ${index} out of bounds for length ${arr.length}`);
  }
  return value;
}

/** Swaps two in-bounds elements of a mutable array. */
function swap<T>(arr: T[], i: number, j: number): void {
  const a = arr[i];
  const b = arr[j];
  if (a === undefined || b === undefined) {
    throw new Error(`rng: swap out of bounds (indices ${i}, ${j} for length ${arr.length})`);
  }
  arr[i] = b;
  arr[j] = a;
}

/**
 * Creates a deterministic RNG from a bigint seed.
 *
 * The seed is decomposed big-endian into four uint32 state words; see
 * `./rng-impl.ts`. The same seed always yields an identical output sequence.
 */
export function createRng(seed: bigint): Rng {
  const core = createXoshiro128StarStar(seed);
  const nextUint32 = (): number => core.nextUint32();

  const next = (): number => nextUint32() * INV_TWO_POW_32;

  const nextInt = (minInclusive: number, maxExclusive: number): number => {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
      throw new TypeError('nextInt: bounds must be integers');
    }
    const range = maxExclusive - minInclusive;
    if (range <= 0) {
      throw new RangeError('nextInt: maxExclusive must be greater than minInclusive');
    }
    if (range > MAX_NEXT_INT_RANGE) {
      throw new RangeError('nextInt: range must not exceed 2^32');
    }
    // Rejection sampling — eliminates modulo bias when the range is not a
    // power of two. `limit` is the largest multiple of `range` <= 2^32.
    const limit = Math.floor(MAX_NEXT_INT_RANGE / range) * range;
    let r = nextUint32();
    while (r >= limit) {
      r = nextUint32();
    }
    return minInclusive + (r % range);
  };

  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) {
      throw new RangeError('pick: array must be non-empty');
    }
    return getElement(arr, nextInt(0, arr.length));
  };

  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out: T[] = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      swap(out, i, nextInt(0, i + 1));
    }
    return out;
  };

  return { next, nextInt, pick, shuffle };
}
