// A raw `{{slot}}` must never reach the player.
//
// The composer already refuses an unfillable template `detail` (eligibility
// checks it), but the OTHER clauses had a different rule: when a qualifier or a
// flourish could not be filled they fell back to the RAW authored string. A row
// with `{{tie}}` in its `long_fire` therefore printed "Whatever else {{tie}}
// keeps quiet about" whenever the life had no tie to name.
//
// Today's sweep passes only because no current template puts an optional slot in
// those clauses. That is luck, not a guarantee, and the next person to author a
// `{{tie}}` flourish inherits a card that shows the player its own source
// syntax. This test renders everything with nothing available to fill and
// asserts no `{{` or `}}` survives, which is what closes the path rather than
// the instance.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '../manifest-catalog';
import { composeCard, type ComposeInput } from '../card-composer';
import type { CatalogEntry } from '../table-catalog';
import { buildSlots } from '../card-slots';
import { createRng, summarizeResidue, type ResidueEvent } from '../index';

const WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 1 } },
  { tick: 2, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 1 } },
];

const SUMMARY = summarizeResidue(WINDOW);

/** The sparsest legal input: no tie, no brief, no focus, no era name. */
function sparseInput(over: Partial<ComposeInput> = {}): ComposeInput {
  return {
    summary: SUMMARY,
    lifeContext: null,
    focus: null,
    brief: null,
    rarity: 'rare',
    qualityTier: 1,
    fire: 'long',
    usedDetails: [],
    usedTitles: [],
    rng: createRng(1n),
    ...over,
  };
}

describe('no raw slot syntax can reach a card', () => {
  it('renders every row with nothing to fill and finds no {{ or }}', () => {
    const leaks: string[] = [];
    let rendered = 0;
    for (const [kind, rows] of Object.entries(CATALOG)) {
      for (const row of rows) {
        for (let hour = 0; hour < 24; hour += 1) {
          for (const fire of ['short', 'long'] as const) {
            for (const rarity of ['common', 'uncommon', 'rare'] as const) {
              const card = composeCard(
                row,
                sparseInput({ rng: createRng(BigInt(hour) + 1n), fire, rarity }),
              );
              rendered += 1;
              for (const field of ['name', 'one_liner', 'subject', 'detail'] as const) {
                const value = card[field];
                if (value.includes('{{') || value.includes('}}')) {
                  leaks.push(`${kind}/${row.name} h${hour} ${fire}/${rarity} ${field}: ${value}`);
                }
              }
            }
          }
        }
      }
    }
    process.stdout.write(`  rendered ${rendered} cards with no slots available\n`);
    expect(leaks).toEqual([]);
  });

  it('drops an unfillable qualifier instead of printing its source', () => {
    // The synthetic row is the one the sweep above cannot catch on its own: a
    // `{{tie}}` in a long_fire clause, with no tie in the life to fill it.
    // This is what the next author will write by accident, and it is the shape
    // the `?? owned` fallbacks used to print verbatim.
    const row: CatalogEntry = {
      name: 'A test row with an unfillable clause',
      one_liner: 'It exists only in this test.',
      subject: 'a test fixture',
      detail: 'The fixture body.',
      tags: ['test'],
      long_fire: 'He said nothing, which {{tie}} had already decided.',
      rare: 'Only once, and {{brief}} remembers it.',
      templates: [
        {
          detail: 'A template body with no slots at all.',
          flourish: 'It happens, and {{tie}} does not mind.',
        },
      ],
    };
    const card = composeCard(row, sparseInput({ rng: createRng(2n) }));
    process.stdout.write(`  long fire+rare: ${JSON.stringify(card.detail)}\n`);
    expect(card.detail).not.toMatch(/\{\{|\}\}/);
    // Not merely stripped of braces: the clause that could not be filled must
    // be GONE, not left as a half-sentence with a hole in it.
    expect(card.detail).not.toContain('which  had already decided');
    expect(card.detail).not.toContain('remembers it');
  });

  it('leaves the life context with every slot genuinely unfilled', () => {
    // Guards the guard: if `sparseInput` ever started carrying a tie, the
    // sweep above would pass for the wrong reason.
    const slots = buildSlots(sparseInput());
    expect(slots['{{tie}}']).toBeUndefined();
    expect(slots['{{brief}}']).toBeUndefined();
  });
});
