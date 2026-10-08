// Oracle test for the engine's SHA-256.
//
// The engine used to call `node:crypto`'s `createHash('sha256')`. That works
// in Node — which is where every test in this repo runs — and nowhere else,
// which is how a web-breaking bug stayed green for so long. This file closes
// that gap by holding the engine's pure-TypeScript digest against the exact
// implementation it replaced.
//
// `node:crypto` appears HERE and ONLY here. `src/engine/sha256.ts` must stay
// platform-free, so if this import ever moves into the engine, the guarantee
// this test exists to provide is gone.
//
// Byte-identity is the load-bearing property, not just "a valid hex string":
// saves already on a player's disk were written with `createHash` digests, so
// a subtly different digest would make every existing save fail verification
// and be discarded by the corruption fallback.

import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';

import { createRng } from '@/engine/rng';
import { sha256, sha256Bytes } from '@/engine/sha256';

/** The implementation this module replaces. */
function oracle(str: string): string {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

/** A string of exactly `bytes` ASCII bytes, so byte length === char length. */
function asciiOfLength(bytes: number, fill = 'a'): string {
  return fill.repeat(bytes);
}

describe('sha256: published vectors', () => {
  it('matches the FIPS 180-4 / NIST SHA-256 vectors', () => {
    // The three canonical vectors, pinned independently of Node so a broken
    // oracle could not hide behind a broken implementation.
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('agrees with node:crypto on those same vectors', () => {
    for (const v of ['', 'abc', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq']) {
      expect(sha256(v)).toBe(oracle(v));
    }
  });
});

describe('sha256: padding boundaries against node:crypto', () => {
  // 55/56/63/64/65 straddle the two places padding can go wrong: the byte
  // that forces an extra 64-byte block (56..63 -> 2 blocks; 64..119 -> 2
  // blocks) and the byte that lands the length field exactly at the block end.
  const LENGTHS = [0, 1, 2, 3, 54, 55, 56, 57, 63, 64, 65, 118, 119, 120, 127, 128, 129];

  it.each(LENGTHS)('agrees on a %i-byte ASCII string', (n) => {
    const s = asciiOfLength(n);
    expect(Buffer.byteLength(s, 'utf8')).toBe(n); // the length is what we think it is
    expect(sha256(s)).toBe(oracle(s));
  });

  it('agrees across a multi-block sweep (200 B .. 40 KB)', () => {
    for (let n = 200; n < 40_000; n += 997) {
      const s = asciiOfLength(n, 'x');
      expect(sha256(s), `length ${n}`).toBe(oracle(s));
    }
  });

  it('agrees at EVERY length from 0 to 320 (exhaustive padding residues)', () => {
    // The parameterized boundary list above is a hand-picked sample; this is the
    // proof that no residue class of the padding rule is wrong. 320 covers five
    // full blocks, so every (length mod 64) case is exercised several times
    // over, including the ones a hand-picked list reliably misses.
    const failures: number[] = [];
    for (let n = 0; n <= 320; n += 1) {
      const s = asciiOfLength(n, 'q');
      if (sha256(s) !== oracle(s)) failures.push(n);
    }
    expect(failures).toEqual([]);
  });

  it('agrees on a few KB of realistic canonical-JSON-shaped text', () => {
    // Built from a real engine-shaped envelope rather than a one-liner, so the
    // length assertion below is doing the job the test name claims.
    const turns = Array.from({ length: 40 }, (_, i) => ({
      turn: i,
      lens: ['generosity', 'discernment', 'patient-courage'][i % 3],
      events: [{ id: `e-${i}`, kind: 'residue', delta: (i % 7) - 3 }],
      note: `A day around the courtyard; day ${i} of the watch, with notes.`,
    }));
    const blob = JSON.stringify({
      payload: { schema_version: '0.2', chain: { life: 3, turns }, nested: { a: [1, 2, 3] } },
      integrity_hash: 'ignored-for-this-check',
    });
    expect(blob.length).toBeGreaterThan(1000);
    expect(sha256(blob)).toBe(oracle(blob));
  });
});

describe('sha256: multi-byte UTF-8 against node:crypto', () => {
  const CASES: readonly (readonly [string, string])[] = [
    ['2-byte (Latin-1 supplement)', 'café naïve Ångström'],
    ['3-byte (CJK)', '\u6d4b\u8bd5\u4e2d\u6587\u6f22\u5b57'],
    ['3-byte (punctuation / full width)', '。、「」'],
    ['4-byte (emoji, surrogate pairs)', '🏮🕯️🙏'],
    ['mixed widths', 'aé漢🏮b'],
    ['BMP + astral interleaved', 'Śākyamuni 🪷 阿弥陀仏 🪷'],
    ['combining marks', 'e\u0301a\u0300u\u0308'],
    // escape sequences, not literal control characters: a raw NUL makes this file
    // read as binary to grep/diff tooling.
    ['NUL and control bytes', '\u0000\u0001\u007f\u009f\u07ff\u0800'],
  ];

  it.each(CASES)('agrees on %s', (_label, s) => {
    expect(sha256(s)).toBe(oracle(s));
  });

  it('agrees on unpaired surrogates (both hash as U+FFFD)', () => {
    // A lone high surrogate, a lone low surrogate, and a broken pair. Node
    // replaces each with U+FFFD; if our encoder did anything else, every save
    // containing a stray surrogate would fail verification on load.
    for (const s of ['\ud800', '\udc00', 'a\ud800b', '\ud800\ud800', 'ok\udc00tail']) {
      expect(sha256(s), JSON.stringify(s)).toBe(oracle(s));
    }
    expect(sha256('\ud800')).toBe(sha256('�'));
  });
});

describe('sha256: 200 seeded random strings against node:crypto', () => {
  it('agrees on 200 strings drawn from the engine RNG', () => {
    // Seeded, not Math.random: a failure must be reproducible from the seed
    // alone. createRng is the engine's own xoshiro128** stream, so this also
    // exercises the two together.
    const rng = createRng(0x5eed_1234_abcd_0001n);
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    const failures: string[] = [];

    for (let i = 0; i < 200; i += 1) {
      const len = rng.nextInt(0, 300);
      let s = '';
      for (let j = 0; j < len; j += 1) {
        s += alphabet[rng.nextInt(0, alphabet.length)];
      }
      const mine = sha256(s);
      const theirs = oracle(s);
      if (mine !== theirs) failures.push(`#${i} len=${len} mine=${mine} theirs=${theirs}`);
    }

    expect(failures).toEqual([]);
  });

  it('agrees on 200 random strings built from a wider alphabet incl. astral chars', () => {
    const rng = createRng(0x5eed_1234_abcd_0002n);
    const alphabet = [...'aA0 -_.\n\t{}[]",:\\é漢🏮ś'];
    const failures: string[] = [];

    for (let i = 0; i < 200; i += 1) {
      const len = rng.nextInt(0, 400);
      let s = '';
      for (let j = 0; j < len; j += 1) {
        s += alphabet[rng.nextInt(0, alphabet.length)];
      }
      const mine = sha256(s);
      const theirs = oracle(s);
      if (mine !== theirs) failures.push(`#${i} len=${len} mine=${mine} theirs=${theirs}`);
    }

    expect(failures).toEqual([]);
  });
});

describe('sha256: output shape and purity', () => {
  it('always returns 64 lowercase hex characters', () => {
    const samples = ['', 'a', 'abc', asciiOfLength(1000), '🏮', asciiOfLength(64)];
    for (const s of samples) {
      expect(sha256(s)).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('is deterministic and input-stable (no shared mutable state across calls)', () => {
    const s = asciiOfLength(500, 'q');
    const first = sha256(s);
    // interleave a different hash to prove W/H scratch is fully reset
    sha256(asciiOfLength(300, 'z'));
    expect(sha256(s)).toBe(first);
  });

  it('does not mutate the caller byte array', () => {
    const bytes = Uint8Array.from([1, 2, 3, 250, 251, 252]);
    const before = Array.from(bytes);
    sha256Bytes(bytes);
    expect(Array.from(bytes)).toEqual(before);
  });

  it('hashes raw bytes identically to the string path for the same UTF-8 bytes', () => {
    const s = 'café漢🏮';
    const bytes = new Uint8Array(Buffer.from(s, 'utf8'));
    expect(sha256Bytes(bytes)).toBe(sha256(s));
  });
});
