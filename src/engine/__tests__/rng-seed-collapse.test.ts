// Seed expansion must not collapse a whole class of seeds onto one sequence.
//
// `expandSeed` used `mix64(lo ^ hi)` for the high state word. That is 0
// whenever lo == hi — which includes seed 0n, and includes every seed of the
// form (X << 64) | X. xoshiro128**'s first output depends on state[1] alone, so
// all of those seeds produced a first draw of exactly 0: the same table row,
// every time.

import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';

const COLLAPSE_CLASS = [0n, 1n, 0x5eedn, 0x9e3779b9n];
const HIGH_MIRRORED = COLLAPSE_CLASS.map((x) => (x << 64n) | x);

describe('seed expansion distributes the degenerate classes', () => {
  it('gives seed 0n a first draw that is not 0', () => {
    const first = createRng(0n).next();
    process.stdout.write(`  createRng(0n).next() = ${first}\n`);
    expect(first).not.toBe(0);
  });

  it('gives the (X << 64) | X class distinct first draws', () => {
    const seen = new Set<number>();
    for (const seed of HIGH_MIRRORED) {
      seen.add(createRng(seed).next());
    }
    process.stdout.write(
      `  ${HIGH_MIRRORED.length} mirrored seeds -> ${seen.size} distinct first draws\n`,
    );
    expect(seen.size).toBe(HIGH_MIRRORED.length);
  });

  it('spreads first nextInt(0, 6) across the class instead of pinning it', () => {
    const counts = new Map<number, number>();
    for (const seed of [...COLLAPSE_CLASS, ...HIGH_MIRRORED]) {
      const v = createRng(seed).nextInt(0, 6);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const distinct = counts.size;
    process.stdout.write(
      `  first nextInt(0,6) over ${COLLAPSE_CLASS.length * 2} seeds: ` +
        `${[...counts.entries()]
          .sort()
          .map(([k, v]) => `${k}x${v}`)
          .join(' ')}\n`,
    );
    expect(distinct).toBeGreaterThan(1);
  });

  it('keeps a small-seed sweep varied end to end, not just on the first draw', () => {
    // The collapse is only interesting if it shows up in real use, where the
    // first draw picks a row and later draws pick a template and a qualifier.
    const firstTwenty = new Set<number>();
    for (let s = 0n; s < 20n; s += 1n) {
      const rng = createRng(s);
      firstTwenty.add(rng.nextInt(0, 6));
    }
    expect(firstTwenty.size).toBeGreaterThan(1);
  });
});
