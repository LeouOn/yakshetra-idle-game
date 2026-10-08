// The dedup contract, driven the way the bench drives it.
//
// The composer's own unit test used to hand-build `usedTitles` in a combined
// "name one_liner" format, which is a format no production caller produces.
// Every caller passes `archive.map((card) => card.name)`. So the combined
// comparison was always false, an unseen title always won, and detail dedup
// never ran once the archive was non-empty. The unit test passed and the bench
// did nothing.
//
// These tests therefore pass titles the way operations.ts and StudioView do:
// a list of names, nothing else.

import { describe, expect, it } from 'vitest';
import {
  createRng,
  summarizeResidue,
  tableFillManifest,
  type KindRule,
  type LifeContext,
  type ResidueEvent,
} from '../index';

const WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 2, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['bench:person'], numbers: { progress: 2 } },
];

const CTX: LifeContext = {
  schema_version: 'life_context/v0',
  life_id: 'life-b',
  age: 34,
  turn: 3,
  alive: true,
  lens: 'patient_courage',
  setting: {
    era_id: 'tang-china',
    era_name: 'Late Tang China',
    role_id: 'peasant',
    role_name: 'Peasant farmer',
    year: 745,
    month: 4,
    day: 9,
    hour: 11,
    calendar_label: 'Year 745',
  },
  ties: [],
  strongest_tie: 'relationship:auntie-qian',
  flags: [],
  residue_summary: summarizeResidue(WINDOW),
  activity: { work: 11, generosity: 2, beings: 0, learning: 0, meditation: 1, other: 0 },
  world_name: null,
  world_line: null,
};

const RULES: KindRule[] = [{ kind: 'thing', match: { dominant: 'practice_tick' } }];

describe('the title-dedup contract as the bench calls it', () => {
  it('never re-serves a title the archive already holds by name', () => {
    // Collect every title the thing table can produce, then offer each one
    // back as if it were already archived. The card must not come back with
    // that same name when the row has another title available.
    const all = new Set<string>();
    const names: string[] = [];
    for (let i = 0; i < 60; i += 1) {
      const m = tableFillManifest(
        WINDOW,
        null,
        0,
        createRng(BigInt(1000 + i)),
        `p${i}`,
        `m${i}`,
        null,
        CTX,
        'person',
        RULES,
      );
      all.add(m.name);
      names.push(m.name);
    }
    expect(all.size).toBeGreaterThan(3);

    const repeats: string[] = [];
    for (const held of all) {
      for (let i = 0; i < 24; i += 1) {
        const m = tableFillManifest(
          WINDOW,
          null,
          0,
          createRng(BigInt(2000 + i)),
          `q${i}`,
          `r${i}`,
          null,
          CTX,
          'person',
          RULES,
          undefined,
          [],
          'short',
          undefined,
          // EXACTLY the production shape: a list of card names.
          [held],
        );
        if (m.name === held) {
          repeats.push(held);
        }
      }
    }
    process.stdout.write(
      `  titles offered once and returned again: ${repeats.length}/${all.size}\n`,
    );
    expect(repeats).toEqual([]);
  });

  it('does not repeat a detail when a title is already held', () => {
    // The other half of the original bug: with a non-empty title archive,
    // `freshTitle` always won, so `unseenDetail` never got to run. Two
    // consecutive harvests of one row must differ in body as well as title.
    const first = tableFillManifest(
      WINDOW,
      null,
      0,
      createRng(777n),
      'a',
      'a',
      null,
      CTX,
      'person',
      RULES,
    );
    let sameBody = 0;
    let tried = 0;
    for (let i = 0; i < 40; i += 1) {
      const next = tableFillManifest(
        WINDOW,
        null,
        0,
        createRng(BigInt(3000 + i)),
        `b${i}`,
        `c${i}`,
        null,
        CTX,
        'person',
        RULES,
        undefined,
        // detail archive holds the first card's body
        [first.detail],
        'short',
        undefined,
        // title archive holds the first card's name
        [first.name],
      );
      if (next.detail === first.detail) {
        sameBody += 1;
      }
      if (next.name === first.name) {
        tried += 1;
      }
    }
    process.stdout.write(`  same body: ${sameBody}/40  |  same title: ${tried}/40\n`);
    expect(sameBody).toBe(0);
  });
});
