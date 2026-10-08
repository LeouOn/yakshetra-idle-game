// Chronicle engine tests (wave 3): determinism, monotonic order, entry
// qualification, prose fences (no ids, no banned phrases), empty state.
import { describe, expect, it } from 'vitest';

import {
  buildChronicle,
  chronicleToText,
  figureScene,
  namesFigureOrClearSubject,
  withArticle,
} from '@/engine/chronicle';
import { FIGURE_PEOPLE } from '@/engine/manifest-catalog-figures';
import { tableFillManifest, createRng } from '@/engine';
import type { Manifest } from '@/engine';

const ANCHOR = { year: 618, month: 1, day: 1, hour: 0 } as const;

function card(overrides: Partial<Manifest> & { i: number }): Manifest {
  const base = tableFillManifest(
    [
      { tick: (overrides.i + 1) * 3, type: 'practice_tick', ids: ['practice.test'], numbers: {} },
      { tick: (overrides.i + 1) * 3 + 1, type: 'practice_tick', ids: ['p2'], numbers: {} },
      { tick: (overrides.i + 1) * 3 + 2, type: 'practice_tick', ids: ['p3'], numbers: {} },
    ],
    null,
    0,
    createRng(BigInt(overrides.i + 1)),
    String(overrides.i),
    `m-${overrides.i}`,
  );
  return { ...base, ...overrides } as Manifest;
}

const BANNED = [
  'understood',
  'attained',
  'merit',
  'karma',
  'enlightenment',
  'lesson',
  'you have',
  'rewarded',
  // engine-concept words banned from chronicle prose (wave 3 revision)
  'org',
  'tier',
  'scale',
  'breadth',
  'record opens',
  'work took shape',
];

describe('buildChronicle', () => {
  const archive: readonly Manifest[] = [
    card({
      i: 0,
      kind: 'person',
      scale: 'person',
      about_id: 'figure:amitabha',
      about_name: 'Amitābha',
    }),
    card({ i: 1, kind: 'place', scale: 'person' }),
    card({
      i: 2,
      kind: 'person',
      scale: 'person',
      about_id: 'figure:amitabha',
      about_name: 'Amitābha',
    }),
    card({
      i: 3,
      kind: 'person',
      scale: 'person',
      about_id: 'm-pin',
      about_name: 'The river stair',
    }),
    card({
      i: 4,
      kind: 'person',
      scale: 'person',
      about_id: 'm-pin',
      about_name: 'The river stair',
    }),
    card({ i: 5, kind: 'tradition', scale: 'household' }),
  ];

  it('is deterministic: same inputs, same chronicle', () => {
    const a = buildChronicle(archive, [{ scale: 'household' }], ANCHOR);
    const b = buildChronicle(archive, [{ scale: 'household' }], ANCHOR);
    expect(a).toEqual(b);
  });

  it('orders entries monotonically by date', () => {
    const entries = buildChronicle(archive, [{ scale: 'household' }], ANCHOR);
    for (let i = 1; i < entries.length; i += 1) {
      const prev = entries[i - 1]!;
      const cur = entries[i]!;
      expect(cur.ordinal).toBe(prev.ordinal + 1);
      expect(cur.date.year * 10000 + cur.date.month * 100 + cur.date.day).toBeGreaterThanOrEqual(
        prev.date.year * 10000 + prev.date.month * 100 + prev.date.day,
      );
    }
  });

  it('qualifies: firsts, figure first+return, kept once, tier founding, world draft', () => {
    const entries = buildChronicle(archive, [{ scale: 'household' }], ANCHOR);
    const texts = entries.map((entry) => entry.text).join('\n');
    expect(texts).toContain('Amitābha');
    expect(entries.filter((e) => e.text.includes('Amitābha')).length).toBe(2); // first meeting AND a return
    expect(entries.filter((entry) => /first/i.test(entry.text)).length).toBeGreaterThan(0);
    // figure: first + return (2); kept: once for m-pin (1); first-of-kind
    // for person/place/tradition (3) EXCEPT where the card also founds its
    // scale (the founding entry carries it; person scale never founds):
    // person(1)+place(1)+tradition founding(1). The world draft does NOT
    // qualify: one household card cannot assemble a pair.
    expect(entries).toHaveLength(6);
  });

  it('never prints an id-shaped token or a banned phrase', () => {
    const entries = buildChronicle(archive, [{ scale: 'household' }], ANCHOR);
    for (const entry of entries) {
      expect(/m-\d|m-[a-f0-9]{6}/i.test(entry.text)).toBe(false);
      expect(/:[a-z]+\//.test(entry.text)).toBe(false);
      for (const banned of BANNED) {
        expect(entry.text.toLowerCase()).not.toContain(banned);
      }
    }
  });

  it('an empty archive gives a clean empty chronicle', () => {
    expect(buildChronicle([], [], ANCHOR)).toEqual([]);
    expect(chronicleToText([], null, null)).toBe('');
  });

  it('the plain-text form uses prose dates under the world name', () => {
    const entries = buildChronicle(archive, [], ANCHOR);
    const text = chronicleToText(entries, 'A street that is still deciding', 'line');
    expect(text.startsWith('A street that is still deciding\nline\n\nThe ')).toBe(true);
    expect(text).toMatch(/The \d+(st|nd|rd|th) day of the \w+ month/);
    expect(text).not.toContain('\n\n\n');
  });

  it("entries are built around the card's own authored sentence", () => {
    const entries = buildChronicle(archive, [], ANCHOR);
    const texts = entries.map((entry) => entry.text).join('\n');
    expect(texts).toContain(archive[1]!.one_liner);
    expect(texts).toContain(archive[0]!.about_name ?? '');
  });

  it('no frame appears on more than 25% of entries over a long archive', () => {
    const long: Manifest[] = [];
    for (let i = 0; i < 40; i += 1) {
      long.push(
        card({
          i,
          kind: i % 3 === 0 ? 'person' : i % 3 === 1 ? 'place' : 'thing',
          scale: 'person',
          about_id: i % 6 === 0 ? `figure:f${i}` : undefined,
          about_name: i % 6 === 0 ? `Figure ${i}` : undefined,
        }),
      );
    }
    const entries = buildChronicle(long, [], ANCHOR);
    const counts = new Map<string, number>();
    for (const entry of entries) {
      const frame = entry.text.split(/[:.—]/)[0]?.trim() ?? entry.text;
      counts.set(frame, (counts.get(frame) ?? 0) + 1);
    }
    const max = Math.max(...counts.values());
    expect(max / entries.length).toBeLessThanOrEqual(0.25);
  });

  it('dates inherit the nearest preceding person card for tier entries', () => {
    const mixed: Manifest[] = [
      card({ i: 0, kind: 'person', scale: 'person' }),
      card({ i: 1, kind: 'person', scale: 'person' }),
      card({ i: 2, kind: 'tradition', scale: 'household' }),
    ];
    const entries = buildChronicle(mixed, [], ANCHOR);
    const personTick = 3 * 1; // card 0's window firstTick
    const household = entries.find((entry) => entry.scale === 'household');
    const person = entries.find((entry) => entry.scale === 'person' && entry.kind === 'person');
    expect(household?.date).toEqual(person?.date);
    expect(personTick).toBeGreaterThan(0);
  });

  it('world draft entries never precede the founding of their scale', () => {
    // Household cards with fold-window ids (tick 0) following person cards at ticks 24, 48
    const cards: Manifest[] = [
      card({ i: 0, kind: 'person', scale: 'person', residue_window_id: 'w-24-27-3' }),
      card({ i: 1, kind: 'person', scale: 'person', residue_window_id: 'w-48-51-3' }),
      card({ i: 2, kind: 'tradition', scale: 'household', residue_window_id: 'w-0-3-1' }),
      card({ i: 3, kind: 'tradition', scale: 'household', residue_window_id: 'w-0-3-2' }),
    ];
    const drafts = [{ scale: 'household' }];
    const entries = buildChronicle(cards, drafts, ANCHOR);
    const foundingIndex = entries.findIndex(
      (e) =>
        e.text.includes('first stone of the household') ||
        e.text.includes('household took shape') ||
        e.text.includes('household began') ||
        e.text.includes('household gathered') ||
        e.text.includes('household anchored') ||
        e.text.includes('household formed') ||
        e.text.includes('household started') ||
        e.text.includes('household grew'),
    );
    const draftIndex = entries.findIndex((e) => e.scale === 'household' && e.cardId === null);
    expect(foundingIndex).toBeGreaterThanOrEqual(0);
    expect(draftIndex).toBeGreaterThanOrEqual(0);
    expect(draftIndex).toBeGreaterThan(foundingIndex);
  });

  it('figure returns quote the card scene and never repeat a return frame twice within 4 entries', () => {
    const figureCards: Manifest[] = [];
    for (let i = 0; i < 10; i += 1) {
      figureCards.push(
        card({
          i,
          kind: 'person',
          scale: 'person',
          about_id: 'figure:bhai',
          about_name: 'Bhaiṣajyaguru',
          detail: `Bhaiṣajyaguru was observed at the clinic during scene ${i + 1}. He spoke quietly.`,
          residue_window_id: `w-${(i + 1) * 24}-${(i + 1) * 24 + 3}-3`,
        }),
      );
    }
    const entries = buildChronicle(figureCards, [], ANCHOR);
    // Card 0: firstKind + figureFirst. Cards 1..9: figureReturn.
    const returnEntries = entries.filter((_, idx) => idx > 1);
    expect(returnEntries.length).toBe(9);
    // Every return entry quotes the scene from detail
    for (let i = 0; i < returnEntries.length; i += 1) {
      expect(returnEntries[i]!.text).toContain(
        `Bhaiṣajyaguru was observed at the clinic during scene ${i + 2}.`,
      );
    }

    // Extract return frame (the phrasing before the scene)
    function extractReturnFrame(text: string): string {
      const match = text.match(/^(.*?[.:—])\s+[A-Z]/);
      return match ? match[1]!.replace('Bhaiṣajyaguru', '{figure}').trim() : text;
    }

    for (let i = 0; i < entries.length; i += 1) {
      const e1 = entries[i]!;
      if (!returnEntries.includes(e1)) continue;
      const frame1 = extractReturnFrame(e1.text);
      for (let j = i + 1; j < Math.min(entries.length, i + 4); j += 1) {
        const e2 = entries[j]!;
        if (!returnEntries.includes(e2)) continue;
        const frame2 = extractReturnFrame(e2.text);
        expect(frame1).not.toBe(frame2);
      }
    }
  });

  it('figure scene quotes detail only if figure named or clear subject pronoun, testing all 12 figures x 4 bodies', () => {
    expect(FIGURE_PEOPLE).toHaveLength(12);

    for (const fig of FIGURE_PEOPLE) {
      const bodies = [
        { name: fig.name, one_liner: fig.one_liner, detail: fig.detail },
        ...(fig.templates ?? []).map((t) => ({
          name: t.name ?? fig.name,
          one_liner: t.one_liner ?? fig.one_liner,
          detail: t.detail,
        })),
      ];
      expect(bodies.length).toBeGreaterThanOrEqual(4);

      for (const body of bodies) {
        const testCard = card({
          i: 0,
          name: body.name,
          one_liner: body.one_liner,
          detail: body.detail,
          about_id: fig.tags.find((t) => t.startsWith('figure:')),
          about_name: fig.name,
        });

        const quoted = figureScene(testCard);
        expect(quoted.length).toBeGreaterThan(0);

        const isOneLiner =
          quoted === body.one_liner ||
          quoted === `${body.one_liner}.` ||
          body.one_liner.startsWith(quoted.replace(/\.$/, ''));
        const namesOrClear = namesFigureOrClearSubject(quoted, fig.name);
        expect(isOneLiner || namesOrClear).toBe(true);
      }
    }

    // Specific regression test for Bhaiṣajyaguru's kiln scene:
    // "Where the kiln is stoked, the men who work it get burnt hands most weeks."
    // MUST fall back to one_liner because "the men" is the subject, not Bhaiṣajyaguru.
    const bhai = FIGURE_PEOPLE.find((f) => f.tags.includes('figure:medicine-buddha'))!;
    const kilnTemplate = bhai.templates?.find((t) =>
      t.detail.includes('Where the kiln is stoked'),
    )!;
    expect(kilnTemplate).toBeDefined();

    const kilnCard = card({
      i: 0,
      name: bhai.name,
      one_liner: kilnTemplate.one_liner ?? bhai.one_liner,
      detail: kilnTemplate.detail,
      about_id: 'figure:medicine-buddha',
      about_name: bhai.name,
    });
    const kilnQuoted = figureScene(kilnCard);
    expect(kilnQuoted).not.toContain('Where the kiln is stoked');
    expect(kilnQuoted).toContain('bitter draught');
  });

  it('withArticle handles vowel-initial words and silent-h exceptions', () => {
    expect(withArticle('edict')).toBe('an edict');
    expect(withArticle('tradition')).toBe('a tradition');
    expect(withArticle('hour')).toBe('an hour');
    expect(withArticle('heirloom')).toBe('a heirloom');
  });
});
