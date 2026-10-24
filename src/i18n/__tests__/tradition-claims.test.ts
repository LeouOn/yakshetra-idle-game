// Claims that were checked against sources and found wrong or unsupported, kept out of the
// string table so they cannot drift back in. Each entry names what the sources say instead.
// (Cycle-2 voice pass; the sources ledger lives with the handoff, not in the repo.)

import { describe, expect, it } from 'vitest';

import en from '../en.json';

interface StringTable {
  readonly [key: string]: string | StringTable;
}

function flatten(table: StringTable, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(table)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      out.set(path, value);
    } else {
      for (const [k, v] of flatten(value, path)) {
        out.set(k, v);
      }
    }
  }
  return out;
}

const strings = flatten(en as unknown as StringTable);

/** [pattern, what the sources say instead] */
const RETIRED: readonly (readonly [RegExp, string])[] = [
  [/Nanjio|Bibliotheca Otaniensis/, "the 1884 Lotus Sutra is H. Kern's (SBE 21), from Sanskrit"],
  [
    /de Groot/,
    'de Groot published no Amitābha Sutra translation (his 1892 book is on funeral rites)',
  ],
  [
    /Willemen/,
    'no Vimalakīrti translation by Willemen is on any list; 1976 is Thurman, from Tibetan',
  ],
  [/colophon dates his translation/, 'T 251 has no dated colophon; 649 is from a 730 catalogue'],
  [
    /anonymous in the Sanskrit/,
    'the Sanskrit text is argued to derive from the Chinese (Nattier 1992)',
  ],
  [/Later Qin, 403/, "Kumārajīva's Diamond Sutra is dated 401 or 402"],
  [/Shenzhou/, 'the Śūraṅgama was translated at Guangzhou (T 945 colophon)'],
  [/Śiwúwèi/, 'the monk is Shànwúwèi (Śubhakarasiṃha)'],
  [/later Tang recensions/i, 'later Platform Sutra editions are Song and Yuan'],
  [/kept an empty stool ready/, 'no source for it; Tang Maitreya devotion was rebirth in Tuṣita'],
  [/village building guilds/, 'no source for Samantabhadra as a guild patron'],
  [/blue banners/, 'the Medicine Buddha sutra prescribes five-colored banners'],
  [/Tang dispensary halls/, 'no source links Medicine Buddha to Tang dispensaries'],
  [/caravan depots/, 'no source for a named Tang institution; the Western Market is documented'],
  [/porcelain vase/, 'Guanyin holds a water vase; "porcelain" has no source'],
  [/six-ringed staff/, 'a ringed staff; "six-ringed" has no source'],
  [/straw sandal/, 'the Bodhidharma tale is of a single shoe'],
  [/\bWCAG\b|axe-core|Expo Router/, 'developer references do not belong in the About screen'],
  [/Saved at/, 'the slot stamp is when the chain was begun, not when it was last played'],
];

describe('retired tradition claims', () => {
  for (const [pattern, instead] of RETIRED) {
    it(`no string matches ${pattern} (${instead})`, () => {
      const hits = [...strings].filter(([, text]) => pattern.test(text)).map(([key]) => key);
      expect(hits).toEqual([]);
    });
  }

  it('cites the Medicine Buddha sutra of Xuanzang as T 450, not T 451', () => {
    const note = strings.get('sutra.medicine-buddha.attribution_note_sid') ?? '';
    expect(note).toContain('T 450');
    expect(note).not.toContain('T 451');
  });
});

describe('the Buddhas of the past', () => {
  const ordinals = [
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'eighth',
    'ninth',
    'tenth',
    'eleventh',
    'twelfth',
    'thirteenth',
    'fourteenth',
    'fifteenth',
    'sixteenth',
    'seventeenth',
    'eighteenth',
    'nineteenth',
    'twentieth',
    'twenty-first',
    'twenty-second',
    'twenty-third',
    'twenty-fourth',
  ];

  it('numbers each figure by the Buddhavaṃsa ordinal (the game omits Dīpaṅkara, so N + 1)', () => {
    ordinals.forEach((word, index) => {
      const attribute = strings.get(`figure.bhadrakalpa.${index + 1}.attribute_sid`) ?? '';
      expect(attribute.startsWith(`The ${word} of the twenty-four Buddhas`)).toBe(true);
    });
  });

  it('places exactly the last three in the present aeon', () => {
    const present = ordinals
      .map((_, index) => index + 1)
      .filter((n) =>
        /present aeon/.test(strings.get(`figure.bhadrakalpa.${n}.attribute_sid`) ?? ''),
      );
    expect(present).toEqual([21, 22, 23]);
  });

  it('makes no liturgical or devotional claim about any of them', () => {
    for (let n = 1; n <= 23; n += 1) {
      for (const field of ['attribute', 'iconography', 'reverence']) {
        const text = strings.get(`figure.bhadrakalpa.${n}.${field}_sid`) ?? '';
        expect(text).not.toMatch(/liturg|confession|invoked|reverenced/i);
      }
    }
  });
});
