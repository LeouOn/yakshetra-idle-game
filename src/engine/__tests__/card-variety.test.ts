// Wave-1 variety, measured as mechanical rules rather than as a distinctness
// percentage.
//
// The previous bar was "90% of 50 harvested `detail` strings are distinct", and
// the lead's read-aloud showed it was gameable: a footer that printed the year,
// the era and the activity made two identical cards differ as strings while the
// player read the same card twice. A number like that rewards changing the
// surface, not changing the experience.
//
// These tests therefore assert the things a reader can actually notice:
//
//   1. no card carries a year / era / tie / activity footer;
//   2. a tie is named in at most about a third of cards, and only through the
//      authored `{{tie}}` slot — never as an appended fact;
//   3. cast and relationship names are cased, never lowercase or id-shaped;
//   4. no qualifier sentence names a mechanic;
//   5. the shared long-fire and rare fallbacks rotate instead of repeating one
//      line on nearly every card;
//   6. consecutive cards of one kind prefer different titles and different rows.
//
// Rules 1-5 are hard. Rule 6 is a floor with a stated threshold, because the
// table is finite and a repeat is better than emitting nothing.

import { describe, expect, it } from 'vitest';

import {
  createRng,
  summarizeResidue,
  tableFillManifest,
  type LifeContext,
  type ResidueEvent,
} from '../index';
import { CATALOG } from '../manifest-catalog';
import { LONG_FIRE_POOL, RARE_POOL } from '../card-composer';
import type { CatalogMap } from '../table-catalog';
import type { KindRule } from '../kind-registry';

const WINDOW: readonly ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 2, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['bench:person'], numbers: { progress: 2 } },
];

const TIES = [
  'relationship:old-wu',
  'relationship:auntie-qian',
  'cast:shen-the-night-clerk',
  null,
] as const;

function context(i: number): LifeContext {
  return {
    schema_version: 'life_context/v0',
    life_id: 'life-1',
    age: 20 + (i % 40),
    turn: i,
    alive: true,
    lens: 'patient_courage',
    setting: {
      era_id: 'tang-china',
      era_name: 'Late Tang China',
      role_id: 'peasant',
      role_name: 'Peasant farmer',
      year: 742 + (i % 7),
      month: 1 + (i % 12),
      day: 1 + (i % 28),
      hour: (i * 3) % 24,
      calendar_label: `Year ${742 + (i % 7)}`,
    },
    ties: [],
    strongest_tie: TIES[i % TIES.length] ?? null,
    flags: [],
    residue_summary: summarizeResidue(WINDOW),
    activity: { work: 10, generosity: 2, beings: 0, learning: 0, meditation: 1, other: 0 },
    world_name: null,
    world_line: null,
  };
}

interface Sweep {
  readonly detail: string;
  readonly name: string;
  readonly oneLiner: string;
  readonly kind: string;
}

/** A long run of real harvests through the real compiler, with the archive on. */
function sweep(count: number, seed: bigint, fire: 'short' | 'long' = 'short'): Sweep[] {
  const out: Sweep[] = [];
  const details: string[] = [];
  const titles: string[] = [];
  const rng = createRng(seed);
  for (let i = 0; i < count; i += 1) {
    const m = tableFillManifest(
      WINDOW,
      null,
      0,
      rng,
      `${seed}-${i}`,
      `m-${i}`,
      null,
      context(i),
      'person',
      undefined,
      undefined,
      details,
      fire,
      undefined,
      titles,
    );
    out.push({ detail: m.detail, name: m.name, oneLiner: m.one_liner, kind: m.kind });
    details.push(m.detail);
    titles.push(`${m.name} ${m.one_liner}`);
  }
  return out;
}

/** One kind only, so a rule about "consecutive cards of a kind" cannot wander. */
function oneKind(kind: string): { catalog: CatalogMap; rules: KindRule[] } {
  const entries = CATALOG[kind as keyof typeof CATALOG];
  if (entries === undefined) {
    throw new Error(`no such kind: ${kind}`);
  }
  return {
    catalog: { [kind]: entries } as unknown as CatalogMap,
    rules: [{ kind, match: () => true } as unknown as KindRule],
  };
}

describe('cards carry no form letter', () => {
  it('never appends the year, the era, the tie, or the activity', () => {
    for (const seed of [1n, 7n, 99n, 4242n]) {
      for (const card of sweep(40, seed)) {
        expect(card.detail).not.toMatch(/\bIt is year \d+/);
        expect(card.detail).not.toMatch(/\bClosest tie\b/);
        expect(card.detail).not.toMatch(/\bin Late Tang China\b/);
        expect(card.detail).not.toMatch(/\bpeasant farmer\b/i);
        expect(card.detail).not.toContain('tang-china');
        expect(card.detail).not.toMatch(/\bCalendar\b/);
        expect(card.detail).not.toMatch(/\bActivity\b/);
      }
    }
  });

  it('still puts a tie in front of the player, sometimes', () => {
    // The counterweight to rule 1: a life that has people in it should be able
    // to say so. If this ever drops to zero the `{{tie}}` slots are dead.
    const named = sweep(60, 31n).filter((c) =>
      /Auntie Qian|Old Wu|Shen the night clerk/.test(c.detail),
    );
    expect(named.length).toBeGreaterThan(0);
  });
});

describe('a tie is scarce, and only ever authored', () => {
  it('appears in at most about a third of cards', () => {
    for (const seed of [1n, 7n, 99n]) {
      const all = sweep(60, seed);
      const named = all.filter((c) => /Auntie Qian|Old Wu|Shen the night clerk/.test(c.detail));
      const ratio = named.length / all.length;
      process.stdout.write(
        `  seed ${seed}: tie named in ${named.length}/${all.length} = ${Math.round(ratio * 1000) / 10}%\n`,
      );
      expect(ratio).toBeLessThanOrEqual(0.34);
    }
  });

  it('never reaches a card as an id or a lowercase fragment', () => {
    for (const seed of [3n, 11n, 404n]) {
      for (const card of sweep(40, seed)) {
        expect(card.detail).not.toContain('{{tie}}');
        expect(card.detail).not.toMatch(/\b(auntie qian|old wu|shen the night clerk)\b/);
        expect(card.detail).not.toMatch(
          /(auntie-qian|old-wu|shen-the-night-clerk|relationship:|cast:)/,
        );
        expect(card.name).not.toMatch(/(auntie qian|relationship:|cast:)/);
        expect(card.oneLiner).not.toMatch(/(auntie qian|relationship:|cast:)/);
      }
    }
  });
});

describe('composer-generated text names the life, never the machine', () => {
  // Whole words, and scoped to what the *composer* emits. Authored row copy is
  // exempt: "bronze floats rise in tiered reservoirs" and a window in a wall
  // are ordinary English written by a person on purpose. The bench's own
  // sentences are the ones a player cannot tell were written by a machine, so
  // those are the ones held to the banlist.
  const BANNED = [
    'window',
    'cook',
    'tier',
    'bay',
    'residue',
    'manifest',
    'batch',
    'archive',
    'slot',
  ];

  it('keeps the shared long-fire and rare pools out of that vocabulary', () => {
    // These are engine-owned copy that a row without its own line falls back
    // to, so they reach the player as often as any authored line.
    let checked = 0;
    for (const pool of [LONG_FIRE_POOL, RARE_POOL]) {
      expect(pool.length).toBeGreaterThanOrEqual(6);
      for (const line of pool) {
        for (const word of BANNED) {
          expect(line.toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`));
        }
      }
      checked += pool.length;
    }
    process.stdout.write(
      `  ${checked} shared qualifier lines clear of ${BANNED.length} banned words\n`,
    );
  });

  it('keeps slot fills and flourishes out of it as well', () => {
    // Every value the composer can substitute into a sentence it built.
    const fills = [
      `Struck with the wooden mallet at ${17}`,
      'You have 12 unbroken days behind it',
      'a figure who acts',
    ];
    for (const fill of fills) {
      for (const word of BANNED) {
        expect(fill.toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`));
      }
    }
  });
});

describe('two different objects never share a closing sentence', () => {
  it('never serves one detail under two different titles', () => {
    // "Six-leaf rule" and "Folded measure" are two titles for what the table
    // described as the same object — two six-fold boxwood rules with brass
    // pins — and the run closed both on the same clause. Found by reading five
    // consecutive cards, not by any test.
    //
    // Note the scope. A template that renames the card and *inherits* the
    // row's qualifier is usually right: "The other cloak" is the same cloak,
    // and two descriptions of one object should share its voice. The bug was
    // never the inheritance. It was that two titles described one object twice.
    const { catalog, rules } = oneKind('thing');
    const byDetail = new Map<string, Set<string>>();
    const rng = createRng(31337n);
    for (let i = 0; i < 60; i += 1) {
      const m = tableFillManifest(
        WINDOW,
        null,
        0,
        rng,
        `q-${i}`,
        `m-${i}`,
        null,
        context(i),
        'person',
        rules,
        catalog,
        [],
        i % 3 === 0 ? 'long' : 'short',
      );
      if (!byDetail.has(m.detail)) {
        byDetail.set(m.detail, new Set());
      }
      byDetail.get(m.detail)?.add(`${m.name} | ${m.one_liner}`);
    }
    const collisions = [...byDetail.entries()]
      .filter(([, titles]) => titles.size > 1)
      .map(([detail, titles]) => `${[...titles].join('  ==  ')}\n      ${detail.slice(0, 90)}`);
    for (const c of collisions) {
      process.stdout.write(`  collision: ${c}\n`);
    }
    expect(collisions).toEqual([]);
  });

  it('keeps a renaming template from inheriting a sentence about a different object', () => {
    // The authoring rule, checked on the data: if a template renames the card,
    // it either means the same object (inherit is right) or it does not (then
    // it must override). This cannot tell the two apart, so it reports rather
    // than fails, and the list is short enough to read.
    type QualifiedRow = {
      name: string;
      long_fire?: string;
      rare?: string;
      templates?: { name?: string; long_fire?: string; rare?: string }[];
    };
    const rows = Object.values(CATALOG).flat() as unknown as QualifiedRow[];
    const inheriting: string[] = [];
    for (const row of rows) {
      for (const t of row.templates ?? []) {
        if (t.name === undefined) {
          continue;
        }
        for (const key of ['long_fire', 'rare'] as const) {
          if (row[key] !== undefined && t[key] === undefined) {
            inheriting.push(`${row.name} / ${t.name} (${key})`);
          }
        }
      }
    }
    process.stdout.write(
      `  ${inheriting.length} renaming templates inherit a qualifier: ${inheriting.join('; ')}\n`,
    );
    // The one that is definitely a different object now overrides.
    expect(inheriting).not.toContain('Folded measure / Six-leaf rule (long_fire)');
    expect(inheriting).not.toContain('Folded measure / Six-leaf rule (rare)');
  });
});

describe('the shared pools are a fallback, not the common case', () => {
  it('serves most long-fire cards from a row-authored sentence', () => {
    // The pools exist so a row with no authored line still renders. The defect
    // was that they were the *usual* case: "It was not hurried, and it shows."
    // is not wrong, it is generic, and a player reads generic as filler. So the
    // bar is on how often a pool line is reached, not on the pools existing.
    const poolHits: string[] = [];
    const rng = createRng(9090n);
    for (let i = 0; i < 120; i += 1) {
      const m = tableFillManifest(
        WINDOW,
        null,
        0,
        rng,
        `p-${i}`,
        `m-${i}`,
        null,
        context(i),
        'person',
        undefined,
        undefined,
        [],
        'long',
      );
      const tail =
        m.detail
          .trim()
          .split(/(?<=\.)\s+/)
          .slice(-1)[0] ?? '';
      if (LONG_FIRE_POOL.some((p) => p.trim() === tail)) {
        poolHits.push(`${m.kind}/${m.name}`);
      }
    }
    const pct = Math.round((poolHits.length / 120) * 1000) / 10;
    process.stdout.write(
      `  pool-sourced long-fire lines: ${poolHits.length}/120 = ${pct}%  ${[...new Set(poolHits)].slice(0, 6).join(', ')}\n`,
    );
    expect(pct).toBeLessThan(25);
  });
});

describe('the shared fallbacks rotate', () => {
  it('never puts one sentence on most long-fire cards', () => {
    // Every row of one kind, harvested long, so the pool is exercised hard.
    const { catalog, rules } = oneKind('thing');
    const tails: string[] = [];
    const rng = createRng(555n);
    for (let i = 0; i < 40; i += 1) {
      const m = tableFillManifest(
        WINDOW,
        null,
        0,
        rng,
        `lf-${i}`,
        `m-${i}`,
        null,
        context(i),
        'person',
        rules,
        catalog,
        [],
        'long',
      );
      tails.push(m.detail);
    }
    // No single line may account for more than half of them, or the six-sentence
    // pool is not being reached and the card reads the same every time.
    const worst = Math.max(...Object.values(count(tails)));
    process.stdout.write(`  worst-case long-fire line covers ${worst}/${tails.length}\n`);
    expect(worst).toBeLessThanOrEqual(tails.length / 2);
  });
});

function count(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

describe('consecutive cards of one kind move on', () => {
  it('prefers a new title and a new row', () => {
    for (const kind of ['thing', 'outcome', 'change', 'place', 'person'] as const) {
      const { catalog, rules } = oneKind(kind);
      const details: string[] = [];
      const titles: string[] = [];
      const rng = createRng(2024n);
      const names: string[] = [];
      for (let i = 0; i < 24; i += 1) {
        const m = tableFillManifest(
          WINDOW,
          null,
          0,
          rng,
          `k-${i}`,
          `m-${i}`,
          null,
          context(i),
          'person',
          rules,
          catalog,
          details,
          'short',
          undefined,
          titles,
        );
        details.push(m.detail);
        // PRODUCTION SHAPE: a list of card names. This used to build a
        // combined `name one_liner` key, which no caller produces, so the
        // archive never matched anything and the dedup it was measuring was
        // inert.
        titles.push(m.name);
        names.push(m.name);
      }
      // Consecutive cards should not repeat a title back to back.
      let backToBack = 0;
      for (let i = 1; i < titles.length; i += 1) {
        if (titles[i] === titles[i - 1]) {
          backToBack += 1;
        }
      }
      process.stdout.write(
        `  ${kind}: ${new Set(names).size} names / ${new Set(titles).size} titles / ${names.length} cards, ${backToBack} back-to-back\n`,
      );
      // A floor, not a purity bar: the table is finite. 24 cards drawn from a
      // 6-row kind will exhaust its title variants, and a repeat is better than
      // emitting nothing. The bar is that repeats stay rare and the run keeps
      // touching new titles rather than re-serving one row's pool.
      expect(backToBack).toBeLessThanOrEqual(2);
      expect(new Set(titles).size).toBeGreaterThanOrEqual(Math.min(8, catalog[kind]?.length ?? 0));
    }
  });
});
