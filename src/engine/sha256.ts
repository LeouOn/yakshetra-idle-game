// SHA-256, implemented in the engine so no platform has to supply one.
//
// WHY THIS EXISTS
// This module used to be `createHash('sha256')` from `node:crypto`, imported
// into `serialize.ts`. That is fine under Node (Vitest, the CLI) and fatal
// everywhere else: the Expo web bundle has no `createHash`, so every life save
// on web threw `TypeError: createHash is not a function` as an *uncaught* page
// error, `localStorage` never received `yakshetra.life.slot.N`, and the unit
// tests stayed green because they all run in Node. A platform-free engine
// should never have reached for a platform API in the first place.
//
// The digest is byte-identical to `createHash('sha256')`: same FIPS 180-4
// algorithm, same lowercase hex output, and — critically for saves already on
// a player's disk — the same bytes, so every envelope written by the old
// implementation still verifies. `src/engine/__tests__/sha256.test.ts` pins
// that against `node:crypto` itself (the test may use Node; the engine may
// not), including the two published FIPS vectors and 200 seeded random strings.
//
// ENGINE PURITY: no wall clock, no global RNG, no console, no environment
// reads, no network, and no imports at all — a hash is a pure function of its
// input, so nothing here needs a platform to ask. (The banned-token list is
// checked by text scan in `src/ai/__tests__/engine-purity.test.ts`, which
// reads comments too, so this paragraph names none of them literally.)
//
// NOT `TextEncoder`: it is a global on web and in Node, but not guaranteed on
// every JS engine the app ships to (Hermes has shipped it inconsistently
// across RN releases). Encoding UTF-8 here keeps the primitive self-contained
// rather than trading one platform dependency for another.
//
// UNPAIRED SURROGATES: a lone high/low surrogate encodes as U+FFFD, matching
// what Node's `Buffer.from(str, 'utf8')` (and therefore the old
// `createHash().update(str, 'utf8')`) produces, so canonical strings carrying
// one still hash the same as they used to.

/* -------------------------------------------------------------------------------------------------
 * UTF-8 encoding
 * -----------------------------------------------------------------------------------------------*/

/**
 * Encode a JS string to its UTF-8 bytes, replacing unpaired surrogates with
 * U+FFFD exactly as Node's UTF-8 encoder does.
 */
function utf8Bytes(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    let cp = str.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff) {
      // high surrogate: valid only when a low surrogate follows
      const next = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = (cp - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        i += 1;
      } else {
        cp = 0xfffd;
      }
    } else if (cp >= 0xdc00 && cp <= 0xdfff) {
      // unpaired low surrogate
      cp = 0xfffd;
    }

    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

/* -------------------------------------------------------------------------------------------------
 * SHA-256 (FIPS 180-4)
 * -----------------------------------------------------------------------------------------------*/

/** First 32 bits of the fractional parts of the cube roots of the first 64 primes. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** Initial hash values: first 32 bits of the fractional parts of the square roots of the first 8 primes. */
const H0 = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

/** 64-byte message schedule window. */
const W = new Uint32Array(64);

/** Rotate a 32-bit word right. Both operands are treated as unsigned. */
function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

/**
 * SHA-256 of raw bytes, as lowercase hex.
 *
 * Split out from {@link sha256} so the padding/loop can be read (and tested)
 * without a string in the way. `bytes` is not mutated.
 */
export function sha256Bytes(bytes: Uint8Array): string {
  const byteLength = bytes.length;
  // Pad: 0x80, then zeros to 56 mod 64, then the 64-bit big-endian bit length.
  // bitLength stays exact well past 2^32 bits (~512 MB) because JS numbers are
  // doubles; the high word is derived by division, not a lossy shift.
  const bitLength = byteLength * 8;
  // Round UP to the next multiple of 64: the message needs 1 byte for the 0x80
  // marker plus 8 for the length field, so the total must satisfy
  // `byteLength + 9 <= paddedLength`. `((byteLength + 9 + 63) >> 6) << 6` is
  // exactly `ceil((byteLength + 9) / 64) * 64`. Writing it as
  // `(((byteLength + 9) >> 6) + 1) << 6` instead would allocate a whole extra
  // block at every length where byteLength + 9 is already a multiple of 64
  // (55, 119, 183, ...), which silently hashes a different padded message; and
  // writing it as `(byteLength + 8 + 63)` would drop a byte at every length
  // where byteLength + 9 is one past a multiple of 64 (56, 120, 184, ...).
  // Both are wrong, and the oracle test catches each on a different residue.
  const paddedLength = ((byteLength + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[byteLength] = 0x80;
  const view = new DataView(padded.buffer);
  const high = Math.floor(bitLength / 0x100000000);
  view.setUint32(paddedLength - 8, high, false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let a = H0[0]!;
  let b = H0[1]!;
  let c = H0[2]!;
  let d = H0[3]!;
  let e = H0[4]!;
  let f = H0[5]!;
  let g = H0[6]!;
  let h = H0[7]!;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const w15 = W[i - 15]!;
      const w2 = W[i - 2]!;
      const s0 = (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) >>> 0;
      const s1 = (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10)) >>> 0;
      W[i] = (W[i - 16]! + s0 + W[i - 7]! + s1) >>> 0;
    }

    let av = a;
    let bv = b;
    let cv = c;
    let dv = d;
    let ev = e;
    let fv = f;
    let gv = g;
    let hv = h;

    for (let i = 0; i < 64; i += 1) {
      const s1 = (rotr(ev, 6) ^ rotr(ev, 11) ^ rotr(ev, 25)) >>> 0;
      const ch = ((ev & fv) ^ (~ev & gv)) >>> 0;
      // Five addends, each < 2^32: the sum stays far below 2^53, so plain
      // addition is exact before the `>>> 0` truncation to 32 bits.
      const t1 = (hv + s1 + ch + K[i]! + W[i]!) >>> 0;
      const s0 = (rotr(av, 2) ^ rotr(av, 13) ^ rotr(av, 22)) >>> 0;
      const maj = ((av & bv) ^ (av & cv) ^ (bv & cv)) >>> 0;
      const t2 = (s0 + maj) >>> 0;

      hv = gv;
      gv = fv;
      fv = ev;
      ev = (dv + t1) >>> 0;
      dv = cv;
      cv = bv;
      bv = av;
      av = (t1 + t2) >>> 0;
    }

    a = (a + av) >>> 0;
    b = (b + bv) >>> 0;
    c = (c + cv) >>> 0;
    d = (d + dv) >>> 0;
    e = (e + ev) >>> 0;
    f = (f + fv) >>> 0;
    g = (g + gv) >>> 0;
    h = (h + hv) >>> 0;
  }

  return [a, b, c, d, e, f, g, h].map((w) => w.toString(16).padStart(8, '0')).join('');
}

/**
 * SHA-256 hex digest of the UTF-8 bytes of `str`.
 *
 * Drop-in replacement for `createHash('sha256').update(str, 'utf8').digest('hex')`:
 * same input bytes, same lowercase 64-character hex output. `serialize.ts`
 * re-exports this as the engine's `sha256`, so no call site changes.
 */
export function sha256(str: string): string {
  return sha256Bytes(utf8Bytes(str));
}
