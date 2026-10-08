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

const MASK_64 = 0xffffffffffffffffn;
const GOLDEN_GAMMA = 0x9e3779b97f4a7c15n;
const MIX_A = 0xbf58476d1ce4e5b9n;
const MIX_B = 0x94d049bb133111ebn;

/** SplitMix64's output mixer: a bijection on 64 bits. */
function mix64(value: bigint): bigint {
  let z = value & MASK_64;
  z = ((z ^ (z >> 30n)) * MIX_A) & MASK_64;
  z = ((z ^ (z >> 27n)) * MIX_B) & MASK_64;
  return (z ^ (z >> 31n)) & MASK_64;
}

/**
 * Expands a seed of any width into 128 well-mixed bits.
 *
 * The raw big-endian decomposition in `./rng-impl.ts` is faithful to Vigna and
 * is what the known-answer tests pin — so it stays untouched. But a seed below
 * 2^32 only populates the LOW state word, and xoshiro128**'s first output is
 * `rotl(s[1] * 5, 7) * 9`: it depends on `state[1]` alone. Every such seed
 * therefore yielded a first output of exactly 0, and the first draw of every
 * session picked the same table row. The engine's own seeds are all small
 * (`0x5eedn` for the bench, FNV-32 hashes for roster members), so this was not
 * a theoretical edge.
 *
 * Two independent mixers, each seeded from BOTH halves of the input, fix it:
 * a difference anywhere in the seed changes the whole state.
 *
 * The high word is NOT `mix64(lo ^ hi)`. That expression is 0 whenever the two
 * halves are equal, which is seed 0n and every seed of the form
 * `(X << 64n) | X`; and `mix64(0n) === 0n`, so those seeds all left state[1]
 * at 0 and produced a first draw of exactly 0. A nonce term is added to the
 * high word's input, which makes the map injective AND puts every seed of that
 * class in a different place. Distinct seeds stay distinct, so determinism and
 * the injectivity argument above both hold.
 */
function expandSeed(seed: bigint): bigint {
  if (seed < 0n) {
    throw new RangeError('rng: seed must be a non-negative bigint');
  }
  const lo = seed & MASK_64;
  const hi = (seed >> 64n) & MASK_64;
  // SEED_NONCE separates the two mixers' inputs. Without it, `lo ^ hi` is 0 for
  // every seed whose halves agree, and mix64(0) is 0, so the high state word
  // was 0 for that whole class and xoshiro's first draw was 0 for it too.
  const SEED_NONCE = 0x9e3779b97f4a7c15n;
  return (mix64(lo ^ (hi + SEED_NONCE)) << 64n) | mix64((lo + GOLDEN_GAMMA) ^ (hi + MIX_A));
}

/**
 * Creates a deterministic RNG from a bigint seed.
 *
 * The seed is first expanded across all four state words by
 * {@link expandSeed} — see its comment for why raw decomposition is not enough
 * — and the core then decomposes the expanded 128-bit value big-endian. The
 * same seed always yields an identical output sequence.
 */
export function createRng(seed: bigint): Rng {
  const core = createXoshiro128StarStar(expandSeed(seed));
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
