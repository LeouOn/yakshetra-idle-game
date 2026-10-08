// Era sweeps (Garden integration, lane b1) — a Fantasy life never draws a
// Tang-only row, a Tang life never draws a Garden row, no core table carries
// a duplicated name, and neither era can hit rowsForEra's starvation
// fallback. These run the REAL fill path (tableFillManifest) with a life
// context whose era decides the row pool.
import { describe, expect, it } from 'vitest';

import {
  tableFillManifest,
  createRng,
  summarizeResidue,
  type LifeContext,
  type Manifest,
  type ResidueEvent,
} from '@/engine';
import { CATALOG } from '@/engine/manifest-catalog';
import { rowsForEra, type CatalogEra } from '@/engine/manifest-pick';
import { forbiddenTerms } from '../../content/progression/garden-do-not';

const CORE_KINDS = ['thing', 'outcome', 'change', 'person', 'place'] as const;

function lifeContext(eraId: string, hour: number, window: readonly ResidueEvent[]): LifeContext {
  return {
    schema_version: 'life_context/v0',
    life_id: 'sweep',
    age: 30,
    turn: hour,
    alive: true,
    lens: null,
    setting: {
      era_id: eraId,
      role_id: 'sweep-role',
      year: 1,
      month: 1,
      day: 1 + Math.floor(hour / 24),
      hour: hour % 24,
      calendar_label: 'sweep',
    },
    ties: [],
    strongest_tie: null,
    flags: [],
    residue_summary: summarizeResidue(window),
    activity: {
      work: 0,
      generosity: 0,
      beings: 0,
      learning: 0,
      meditation: 0,
      other: 0,
    },
    world_name: null,
    world_line: null,
  };
}

/** A window that predicts `kind` under the default rules. */
function windowFor(kind: (typeof CORE_KINDS)[number]): readonly ResidueEvent[] {
  if (kind === 'change') {
    return [
      { tick: 1, type: 'practice_tick', ids: ['practice:sweep'], numbers: {} },
      { tick: 2, type: 'practice_level', ids: ['practice:sweep'], numbers: {} },
    ];
  }
  if (kind === 'person') {
    return [
      { tick: 1, type: 'lens_chosen', ids: ['lens', 'other'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice:sweep'], numbers: {} },
    ];
  }
  if (kind === 'place') {
    return [
      { tick: 1, type: 'practice_tick', ids: ['a', 'b'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['a', 'c'], numbers: {} },
    ];
  }
  if (kind === 'outcome') {
    return [
      { tick: 1, type: 'event_resolved', ids: ['event:sweep'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice:sweep'], numbers: {} },
    ];
  }
  return [
    { tick: 1, type: 'practice_tick', ids: ['practice:sweep'], numbers: {} },
    { tick: 2, type: 'practice_tick', ids: ['practice:sweep'], numbers: {} },
  ];
}

const eraOfRow = new Map<string, string | undefined>();
for (const rows of Object.values(CATALOG)) {
  for (const row of rows) {
    eraOfRow.set(row.name, row.era);
  }
}

function sweep(eraId: string, fire: 'short' | 'long'): Manifest[] {
  const out: Manifest[] = [];
  for (const kind of CORE_KINDS) {
    const window = windowFor(kind);
    for (let hour = 0; hour < 24; hour += 1) {
      for (let seed = 1; seed <= 12; seed += 1) {
        out.push(
          tableFillManifest(
            window,
            null,
            0,
            createRng(BigInt(seed * 100 + hour)),
            String(seed),
            `sweep-${eraId}-${kind}-${hour}-${seed}`,
            null,
            lifeContext(eraId, hour, window),
            'person',
            undefined,
            undefined,
            [],
            fire,
          ),
        );
      }
    }
  }
  return out;
}

describe('era sweeps over the shipped catalog', () => {
  it('a Fantasy life draws only fantasy/neutral rows, with no Tang vocabulary', () => {
    const offenders: string[] = [];
    for (const card of sweep('fantasy-mahayana@0.1.0', 'short').concat(
      sweep('fantasy-mahayana@0.1.0', 'long'),
    )) {
      const rowEra = eraOfRow.get(card.name);
      if (rowEra === 'tang') {
        offenders.push(`tang row drawn: ${card.name}`);
      }
      const prose = `${card.name} ${card.one_liner} ${card.subject} ${card.detail}`;
      for (const term of forbiddenTerms(prose)) {
        offenders.push(`do-not term ${term} in: ${card.name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('a Tang life never draws a Garden row', () => {
    const offenders: string[] = [];
    for (const card of sweep('tang-china@0.1.0', 'short').concat(
      sweep('tang-china@0.1.0', 'long'),
    )) {
      if (eraOfRow.get(card.name) === 'fantasy') {
        offenders.push(card.name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no row name appears twice in any core table (the pollution guard)', () => {
    for (const kind of CORE_KINDS) {
      const rows = CATALOG[kind] ?? [];
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.name)) {
          throw new Error(`duplicate name in ${kind}: ${row.name}`);
        }
        seen.add(row.name);
      }
    }
  });

  it('neither era ever hits the rowsForEra starvation fallback', () => {
    for (const kind of CORE_KINDS) {
      const rows = CATALOG[kind] ?? [];
      for (const era of ['tang', 'fantasy'] as const) {
        const eligible = rows.filter((e) => e.era === undefined || e.era === era);
        expect(
          eligible.length,
          `${kind}/${era}: rowsForEra would return EVERYTHING (starvation fallback)`,
        ).toBeGreaterThan(0);
        expect(rowsForEra(rows, era as CatalogEra)).toHaveLength(eligible.length);
      }
    }
  });
});
