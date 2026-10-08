// card-composer tests — the wave-1 identity move (docs/design/00-direction.md A):
// a card's nouns, hour, practice and tie come from the window that made it, so
// two harvests from one table row do not read alike.

import { describe, expect, it } from 'vitest';

import { composeCard, type ComposeInput } from '../card-composer';
import { CATALOG } from '../manifest-catalog';
import {
  createRng,
  summarizeResidue,
  tableFillManifest,
  type LifeContext,
  type ResidueEvent,
} from '../index';
import type { CatalogEntry } from '../table-catalog';

const SEED = 20260803n;

function windowOf(...ids: string[]): ResidueEvent[] {
  return ids.map((id, i) => ({
    tick: i + 1,
    type: 'practice_tick' as const,
    ids: [id],
    numbers: { progress: 2 },
  }));
}

function contextAt(hour: number, over: Partial<LifeContext['setting']> = {}): LifeContext {
  return {
    schema_version: 'life_context/v0',
    life_id: 'life-1',
    age: 34,
    turn: 12,
    alive: true,
    lens: 'patient_courage',
    setting: {
      era_id: 'tang-china',
      era_name: 'Late Tang China',
      role_id: 'peasant',
      role_name: 'Peasant farmer',
      year: 742,
      month: 4,
      day: 12,
      hour,
      calendar_label: 'Year 742',
      ...over,
    },
    ties: [],
    strongest_tie: 'relationship:old-wu',
    flags: [],
    residue_summary: summarizeResidue(windowOf('practice:tang/alms-round')),
    activity: { work: 12, generosity: 3, beings: 0, learning: 0, meditation: 2, other: 0 },
    world_name: null,
    world_line: null,
  };
}

function input(over: Partial<ComposeInput> = {}): ComposeInput {
  return {
    summary: summarizeResidue(
      windowOf('practice:tang/alms-round', 'bench:person', 'lens:generosity'),
    ),
    lifeContext: contextAt(9),
    focus: null,
    brief: null,
    rarity: 'common',
    qualityTier: 0,
    fire: 'short',
    usedDetails: [],
    usedTitles: [],
    rng: createRng(SEED),
    ...over,
  };
}

const SEALED_TOKEN = CATALOG['thing']?.[0] as CatalogEntry;

describe('composeCard — determinism', () => {
  it('same inputs produce the same card', () => {
    const a = composeCard(SEALED_TOKEN, input());
    const b = composeCard(SEALED_TOKEN, input());
    expect(a).toEqual(b);
  });

  it('different seeds can pick different templates from the same row', () => {
    // At `rare` the sealed token row has two eligible templates (one ungated,
    // one rare-gated); at `common` it has exactly one, so the rotation has
    // nothing to choose between. Assert the case that actually has a choice.
    const seen = new Set<string>();
    for (let s = 1n; s <= 40n; s += 1n) {
      seen.add(composeCard(SEALED_TOKEN, input({ rarity: 'rare', rng: createRng(s) })).detail);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('composeCard — the row is the floor', () => {
  it('returns the verbatim row when it has no templates', () => {
    const bare: CatalogEntry = {
      name: 'Plain row',
      one_liner: 'A one liner.',
      subject: 'a plain subject',
      detail: 'A plain detail.',
      tags: ['plain'],
    };
    const card = composeCard(bare, input());
    expect(card.name).toBe('Plain row');
    expect(card.one_liner).toBe('A one liner.');
    expect(card.detail).toContain('A plain detail.');
  });

  it('a template needing an unavailable slot is skipped, not half-written', () => {
    const needsEra: CatalogEntry = {
      ...SEALED_TOKEN,
      templates: [{ detail: 'Only in {{era}}.' }],
    };
    // No life context at all: the era slot cannot be filled.
    const card = composeCard(needsEra, input({ lifeContext: null }));
    expect(card.detail).not.toContain('{{era}}');
    expect(card.detail).toContain(SEALED_TOKEN.detail);
  });
});

describe('composeCard — the window writes the card', () => {
  it('the hour reaches the prose', () => {
    // Sweep seeds rather than trusting one rotation, since a row's templates
    // do not all carry a {{hour}} slot.
    const texts: string[] = [];
    for (let s = 1n; s <= 12n; s += 1n) {
      texts.push(
        composeCard(SEALED_TOKEN, input({ lifeContext: contextAt(5), rng: createRng(s) })).detail,
      );
      texts.push(
        composeCard(SEALED_TOKEN, input({ lifeContext: contextAt(23), rng: createRng(s) })).detail,
      );
    }
    expect(texts.some((t) => t.includes('first light'))).toBe(true);
    expect(texts.some((t) => t.includes('last watch'))).toBe(true);
  });

  it('never prints an era id, and no longer prints the era at all', () => {
    // The footer is gone (the lead read thirty cards and heard a form letter),
    // so a card carries no year and no era name. The era decides which
    // phrasings the row may use; it is not narrated.
    for (const s of [1n, 2n, 3n, 7n]) {
      const card = composeCard(SEALED_TOKEN, input({ rng: createRng(s) }));
      expect(card.detail).not.toContain('tang-china');
      expect(card.detail).not.toContain('Late Tang China');
      expect(card.detail).not.toMatch(/year \d/i);
      expect(card.detail).not.toMatch(/Closest tie/);
    }
  });

  it('a residue id is humanized before it can reach prose', () => {
    const card = composeCard(SEALED_TOKEN, input({ rarity: 'uncommon' }));
    expect(card.detail).not.toMatch(/practice:|bench:|lens:|@\d/);
  });
});

describe('composeCard — rarity changes the text, not only the label', () => {
  it('a rare card can carry a template a common card cannot reach', () => {
    const row = CATALOG['thing']?.[0] as CatalogEntry;
    const gated = (row.templates ?? []).find((t) => t.gate === 'rare');
    expect(gated).toBeDefined();
    // Compare on the template's own opening, since the composed card may carry
    // a qualifier sentence the bare template does not.
    const opener = (gated?.detail ?? 'SETTLER').split('{{')[0] ?? 'SETTLER';
    let sawGated = false;
    for (let s = 1n; s <= 80n && !sawGated; s += 1n) {
      if (
        composeCard(row, input({ rarity: 'rare', rng: createRng(s) })).detail.startsWith(opener)
      ) {
        sawGated = true;
      }
    }
    expect(sawGated).toBe(true);
    for (let s = 1n; s <= 80n; s += 1n) {
      expect(
        composeCard(row, input({ rarity: 'common', rng: createRng(s) })).detail.startsWith(opener),
      ).toBe(false);
    }
  });

  it('a common card never receives a rare-only flourish', () => {
    const row = CATALOG['thing']?.[0] as CatalogEntry;
    const flourish = row.templates?.find((t) => t.flourish !== undefined)?.flourish ?? '';
    for (let s = 1n; s <= 40n; s += 1n) {
      const card = composeCard(row, input({ rarity: 'common', rng: createRng(s) }));
      expect(card.detail).not.toContain(flourish);
    }
  });
});

describe('composeCard — the brief is a real lever', () => {
  it('three briefs on the same window give three different cards', () => {
    // Each brief's own words land in a different phrasing of this row, so the
    // steering is visible rather than incidental. docs/design/eval/05 prints
    // these three verbatim.
    const row = CATALOG['thing']?.[3] as CatalogEntry;
    const briefs = [
      'a mallet that interrupts the workshop noise',
      'washed fleece steadies the hand before a cut',
      'not tuned to anything you could name',
    ];
    const cards = briefs.map((brief) =>
      composeCard(row, input({ brief, rng: createRng(SEED), rarity: 'uncommon' })),
    );
    expect(new Set(cards.map((c) => c.detail)).size).toBe(3);
  });

  it('a brief steers the phrasing, and is not echoed as a footer', () => {
    // The request is visible by what the card answers, not by a line saying
    // "you asked for" — the footer that carried it is gone.
    const row = CATALOG['thing']?.[3] as CatalogEntry;
    const matching = composeCard(row, input({ brief: 'washed fleece', rarity: 'uncommon' }));
    expect(matching.detail).toContain('washed fleece');
    expect(matching.detail).not.toMatch(/you asked for/i);
    // The steering is deterministic: the same brief picks the same phrasing on
    // every seed, which is what makes the brief a request rather than a hint.
    for (let s = 1n; s <= 8n; s += 1n) {
      expect(
        composeCard(row, input({ brief: 'washed fleece', rarity: 'uncommon', rng: createRng(s) }))
          .detail,
      ).toBe(matching.detail);
    }
  });
});

describe('composeCard — the dedup guard', () => {
  it('prefers a detail the archive does not already hold', () => {
    const row = CATALOG['thing']?.[0] as CatalogEntry;
    // `rare` so the row has two candidates and the guard has somewhere to go.
    const first = composeCard(row, input({ rarity: 'rare', rng: createRng(7n) }));
    const second = composeCard(
      row,
      input({
        rarity: 'rare',
        rng: createRng(7n),
        usedDetails: [first.detail],
        // The PRODUCTION shape: a list of card names, which is what
        // `archive.map((card) => card.name)` hands over. This line used to
        // build a combined `name one_liner` key that no caller ever produces,
        // which is how a dead title-dedup shipped green.
        usedTitles: [first.name],
      }),
    );
    expect(second.detail).not.toBe(first.detail);
  });

  it('treats usedTitles as titles, not as a name/one-liner pair', () => {
    const row = CATALOG['thing']?.[0] as CatalogEntry;
    const first = composeCard(row, input({ rarity: 'rare', rng: createRng(7n) }));
    const second = composeCard(
      row,
      input({ rarity: 'rare', rng: createRng(7n), usedTitles: [first.name] }),
    );
    expect(second.name).not.toBe(first.name);
  });

  it('falls back to a repeat rather than emitting nothing', () => {
    const row = CATALOG['thing']?.[0] as CatalogEntry;
    // Block every detail this row can actually *render* — the raw template
    // strings contain {{slot}} markers and would never match a filled card.
    const seen: string[] = [];
    for (let s = 1n; s <= 24n; s += 1n) {
      seen.push(composeCard(row, input({ rng: createRng(s) })).detail);
    }
    const card = composeCard(row, input({ rng: createRng(3n), usedDetails: seen }));
    expect(card.detail.length).toBeGreaterThan(0);
    expect(seen).toContain(card.detail);
  });
});

describe('the composed pool in the real catalog', () => {
  it('no template leaks a build-internal id pattern', () => {
    const forbidden = /studio-bench@|figure:|practice:|bench:|member:|@\d+\.\d/;
    for (const rows of Object.values(CATALOG)) {
      for (const row of rows) {
        for (const t of row.templates ?? []) {
          for (const value of [t.detail, t.flourish ?? '', t.name ?? '', t.subject ?? '']) {
            expect(value).not.toMatch(forbidden);
          }
        }
      }
    }
  });

  it('every template slot is one the composer can actually fill', () => {
    const known = new Set([
      'era',
      'role',
      'hour',
      'year',
      'tie',
      'lens',
      'work',
      'count',
      'focus',
      'brief',
    ]);
    for (const rows of Object.values(CATALOG)) {
      for (const row of rows) {
        for (const t of row.templates ?? []) {
          for (const value of [t.detail, t.flourish ?? '', t.name ?? '', t.subject ?? '']) {
            for (const m of value.matchAll(/\{\{(\w+)\}\}/g)) {
              expect(known.has(m[1] ?? '')).toBe(true);
            }
          }
        }
      }
    }
  });

  it('each of the five kinds ships at least five templates', () => {
    for (const kind of ['thing', 'outcome', 'change', 'person', 'place']) {
      const rows = CATALOG[kind] ?? [];
      const count = rows.reduce((n, r) => n + (r.templates?.length ?? 0), 0);
      expect(count, `${kind} templates`).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('pickRarity — the floor is additive and only raises', () => {
  it('a long fire never yields a common card', () => {
    // The wave-1 promise: cooking longer buys at least an uncommon card.
    for (let s = 1n; s <= 40n; s += 1n) {
      const long = tableFillManifest(
        windowOf('practice:tang/alms-round'),
        null,
        0,
        createRng(s),
        String(s),
        `m-${s}`,
        null,
        contextAt(9),
        'person',
        undefined,
        undefined,
        [],
        'long',
      );
      expect(long.rarity).not.toBe('common');
    }
  });

  it('a long-fire card reads differently from a short-fire card of the same row', () => {
    const short = tableFillManifest(
      windowOf('practice:tang/alms-round'),
      null,
      0,
      createRng(3n),
      '3',
      'm-s',
      null,
      contextAt(9),
      'person',
      undefined,
      undefined,
      [],
      'short',
    );
    const long = tableFillManifest(
      windowOf('practice:tang/alms-round'),
      null,
      0,
      createRng(3n),
      '3',
      'm-l',
      null,
      contextAt(9),
      'person',
      undefined,
      undefined,
      [],
      'long',
    );
    expect(long.rarity).not.toBe('common');
    // The floor only ever raises, and a long fire reads differently even when
    // the short roll was already rare.
    expect(['common', 'uncommon', 'rare'].indexOf(long.rarity)).toBeGreaterThanOrEqual(
      ['common', 'uncommon', 'rare'].indexOf(short.rarity),
    );
    expect(short.detail).not.toBe(long.detail);
    // No global long-fire sentence any more; the row's own voice marks it.
    expect(long.detail).not.toContain('cooling');
    expect(long.detail).not.toContain('window');
  });

  it('an explicit floor overrides the long-fire default', () => {
    const forced = tableFillManifest(
      windowOf('practice:tang/alms-round'),
      null,
      0,
      createRng(3n),
      '3',
      'm-f',
      null,
      contextAt(9),
      'person',
      undefined,
      undefined,
      [],
      'short',
      'rare',
    );
    expect(forced.rarity).toBe('rare');
  });
});
