/**
 * xoshiro128** 1.1 — faithful TypeScript port of Vigna & Blackman's reference.
 *
 * Reference (public domain): https://prng.di.unimi.it/xoshiro128starstar.c
 *
 * This module is the low-level algorithm core. The public `createRng` API
 * (`next`/`nextInt`/`pick`/`shuffle`) is composed in `./rng.ts`.
 *
 * The 128-bit state is held in a `Uint32Array(4)`. All arithmetic is 32-bit
 * wraparound. Intermediate products such as `s1 * 5` stay below 2^35, well
 * within `Number.MAX_SAFE_INTEGER` (2^53), so `>>> 0` yields the exact low
 * 32 bits — no BigInt `>>` operator is used anywhere in the hot path.
 */

/** Raw 32-bit unsigned output stream, identical to Vigna's C `next()`. */
export interface Xoshiro128StarStar {
  /** Returns the next uint32 value in [0, 2^32). */
  nextUint32(): number;
}

/** 2^32, used only for seed decomposition. */
const TWO_POW_32 = 0x100000000n;

/**
 * Splits a non-negative bigint seed into four uint32 state words, big-endian:
 * the most-significant 32 bits become `state[0]`. Thus the bigint
 * `0x12345678_9abcdef0_deadbeef_cafebabe` maps to the state
 * `{0x12345678, 0x9abcdef0, 0xdeadbeef, 0xcafebabe}`.
 *
 * Uses BigInt division and modulo (no `>>` operator) to extract the words.
 */
function seedBigIntToState(seed: bigint): Uint32Array {
  if (seed < 0n) {
    throw new RangeError('xoshiro128**: seed must be a non-negative bigint');
  }
  const state = new Uint32Array(4);
  let remaining = seed;
  for (let i = 3; i >= 0; i--) {
    state[i] = Number(remaining % TWO_POW_32);
    remaining = remaining / TWO_POW_32;
  }
  if (state[0] === 0 && state[1] === 0 && state[2] === 0 && state[3] === 0) {
    // Vigna's contract: the state must not be everywhere zero, or the output
    // is permanently zero. Reject rather than degenerate (never fall back to
    // an unseeded source).
    throw new RangeError('xoshiro128**: seed must not produce an all-zero state');
  }
  return state;
}

/** 32-bit left rotation. */
function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * Reads the four state words as a fully-defined tuple.
 *
 * This is the narrowing device required by `noUncheckedIndexedAccess`
 * (typed-array indexing yields `number | undefined`); the runtime guard is
 * unreachable for a correctly-sized array and is not defensive bloat.
 */
function readState(state: Uint32Array): readonly [number, number, number, number] {
  const s0 = state[0];
  const s1 = state[1];
  const s2 = state[2];
  const s3 = state[3];
  if (s0 === undefined || s1 === undefined || s2 === undefined || s3 === undefined) {
    throw new Error('xoshiro128**: state corrupted (expected 4 uint32 words)');
  }
  return [s0, s1, s2, s3];
}

/** Creates a raw xoshiro128** uint32 stream from a bigint seed. */
export function createXoshiro128StarStar(seed: bigint): Xoshiro128StarStar {
  const state = seedBigIntToState(seed);
  return {
    nextUint32(): number {
      const [s0, s1, s2, s3] = readState(state);

      // Scrambler (Vigna 1.1): result = rotl(s[1] * 5, 7) * 9, all mod 2^32.
      const result = (rotl((s1 * 5) >>> 0, 7) * 9) >>> 0;
      const t = (s1 << 9) >>> 0;

      // New state in closed form, equivalent to Vigna's sequential updates:
      //   s[2]^=s[0]; s[3]^=s[1]; s[1]^=s[2]; s[0]^=s[3]; s[2]^=t; s[3]=rotl(s[3],11);
      state[0] = (s0 ^ s3 ^ s1) >>> 0;
      state[1] = (s0 ^ s2 ^ s1) >>> 0;
      state[2] = (s0 ^ s2 ^ t) >>> 0;
      state[3] = rotl((s3 ^ s1) >>> 0, 11);

      return result;
    },
  };
}
