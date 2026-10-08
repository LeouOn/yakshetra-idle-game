// Rendered-prose quality. Asserted against RENDERED output across the full
// sweep — every row, both eras, all 24 hours, 12 seeds, short and long fire —
// because the defects this catches only appear where a slot meets a frame, and
// a template that is never rendered with a given hour never gets caught.
//
// This file exists because the previous check could not fail. It exempted any
// lower-case sentence start whose first word was in a long connector allowlist,
// and that allowlist contained `a`, `in`, `at`, `the` and `with` — precisely the
// openers of the defects it was supposed to be watching for. A sentence that
// begins lower case after a full stop is always wrong; a connector after a comma
// or a semicolon is not a new sentence and is not this rule's business. So the
// allowlist is gone, and the split is on sentence-final punctuation only.

import { describe, expect, it } from 'vitest';

import { CATALOG } from '../manifest-catalog';
import { composeCard } from '../card-composer';
import { createRng, summarizeResidue, type LifeContext, type ResidueEvent } from '../index';
import type { CatalogEntry } from '../table-catalog';

const WINDOW: ResidueEvent[] = [
  { tick: 1, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 2, type: 'practice_tick', ids: ['practice:tang/alms-round'], numbers: { progress: 2 } },
  { tick: 3, type: 'practice_tick', ids: ['bench:person'], numbers: { progress: 2 } },
];

const ERAS = [
  { era_id: 'tang-china', era_name: 'Late Tang China' },
  { era_id: 'fantasy-mahayana', era_name: 'The Garden of Arrivals' },
] as const;

/** Function words that must never double up: "the the", "of of". */
const FUNCTION_WORDS = [
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'by',
  'with',
  'and',
  'or',
  'but',
  'from',
  'into',
  'over',
  'under',
  'as',
  'is',
  'was',
  'it',
  'its',
  'that',
  'this',
  'you',
  'your',
  'they',
  'them',
  'their',
  'her',
  'his',
  'she',
];

interface Rendered {
  readonly where: string;
  readonly field: string;
  readonly text: string;
}

/** The full sweep: every row, every era, every hour, 12 seeds, both fires. */
function sweepAll(): Rendered[] {
  const out: Rendered[] = [];
  const rows: CatalogEntry[] = Object.values(CATALOG).flat() as CatalogEntry[];
  for (const row of rows) {
    for (const era of ERAS) {
      for (let hour = 0; hour < 24; hour += 1) {
        for (let seedIdx = 1; seedIdx <= 12; seedIdx += 1) {
          const seed = BigInt(seedIdx);
          const rung = seedIdx % 3;
          for (const fire of ['short', 'long'] as const) {
            const ctx = context(era, hour);
            const card = composeCard(row, {
              summary: summarizeResidue(WINDOW),
              lifeContext: ctx,
              focus: null,
              brief: null,
              // Exercise both ends of the gate ladder: a gated template that
              // only renders at rare must be rendered, or this sweep misses it.
              rarity: rung === 0 ? 'rare' : rung === 1 ? 'uncommon' : 'common',
              qualityTier: 0,
              fire,
              usedDetails: [],
              usedTitles: [],
              rng: createRng(seed * 31n + BigInt(hour)),
            });
            const where = `${row.name} / ${era.era_id} / h${hour} / s${seed} / ${fire}`;
            out.push({ where, field: 'detail', text: card.detail });
            out.push({ where, field: 'name', text: card.name });
            out.push({ where, field: 'one_liner', text: card.one_liner });
          }
        }
      }
    }
  }
  return out;
}

function context(
  era: { readonly era_id: string; readonly era_name: string },
  hour: number,
): LifeContext {
  return {
    schema_version: 'life_context/v0',
    life_id: 'life-1',
    age: 34,
    turn: 9,
    alive: true,
    lens: 'patient_courage',
    setting: {
      era_id: era.era_id,
      era_name: era.era_name,
      role_id: 'peasant',
      role_name: 'Peasant farmer',
      year: 742,
      month: 3,
      day: 1,
      hour,
      calendar_label: 'Year 742',
    },
    ties: [],
    strongest_tie: 'relationship:auntie-qian',
    flags: [],
    residue_summary: summarizeResidue(WINDOW),
    activity: { work: 9, generosity: 2, beings: 0, learning: 0, meditation: 1, other: 0 },
    world_name: null,
    world_line: null,
  };
}

describe('rendered prose is clean', () => {
  const rendered = sweepAll();

  it('renders a large enough sweep to be worth asserting on', () => {
    // A sweep that silently collapses to a handful of cards would make every
    // assertion below pass for the wrong reason.
    process.stdout.write(`\n  swept ${rendered.length} rendered fields\n`);
    expect(rendered.length).toBeGreaterThan(10000);
  });

  it('never starts a sentence lower case', () => {
    const bad: string[] = [];
    for (const r of rendered) {
      for (const sentence of r.text.split(/(?<=[.!?])\s+/)) {
        const trimmed = sentence.trim();
        if (trimmed.length === 0) {
          continue;
        }
        if (/^[a-z]/.test(trimmed)) {
          bad.push(`${r.field} @ ${r.where}: ${JSON.stringify(trimmed.slice(0, 60))}`);
        }
      }
    }
    const sample = [...new Set(bad)].slice(0, 12);
    for (const b of sample) {
      process.stdout.write(`  lower: ${b}\n`);
    }
    process.stdout.write(
      `  ${bad.length} lower-case sentence starts, ${new Set(bad).size} distinct\n`,
    );
    expect(sample).toEqual([]);
  });

  it('never starts or ends a field with whitespace', () => {
    const bad: string[] = [];
    for (const r of rendered) {
      if (r.text !== r.text.trim()) {
        bad.push(`${r.field} @ ${r.where}: ${JSON.stringify(r.text.slice(0, 40))}`);
      }
    }
    for (const b of [...new Set(bad)].slice(0, 10)) {
      process.stdout.write(`  pad: ${b}\n`);
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('never doubles a space or a function word', () => {
    const bad: string[] = [];
    for (const r of rendered) {
      if (/\s{2,}/.test(r.text)) {
        bad.push(`double space @ ${r.field} ${r.where}: ${JSON.stringify(r.text.slice(0, 50))}`);
      }
      for (const w of FUNCTION_WORDS) {
        const re = new RegExp(`\\b${w}\\s+${w}\\b`, 'i');
        if (re.test(r.text)) {
          bad.push(
            `stutter "${w}" @ ${r.field} ${r.where}: ${JSON.stringify(r.text.slice(0, 60))}`,
          );
        }
      }
    }
    for (const b of [...new Set(bad)].slice(0, 10)) {
      process.stdout.write(`  ${b}\n`);
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('leaves no slot marker in anything the player sees', () => {
    const bad = rendered.filter((r) => r.text.includes('{{'));
    expect(bad.map((r) => `${r.field} @ ${r.where}`).slice(0, 5)).toEqual([]);
  });
});
