/**
 * Tang China endings tests (plan todo 18).
 *
 * Validates the four authored endings in
 * `src/content/packs/tang-china/endings.json5`:
 *   - the file is parseable as JSON5
 *   - each entry parses against {@link EndingSchema}
 *   - the four ending ids match the plan-canonical set
 *   - every trigger predicate is well-formed and uses the existing predicate
 *     vocabulary (gte, lte, lt, has_flag, and, or)
 *   - every narrative_sid resolves through the i18n string table
 *   - no narrative claims nirvāṇa, buddhahood, or depicts an afterlife
 *
 * The endings file is a standalone artifact (like events.json5); the loader
 * reads only pack.json5. This test exercises the standalone validation path.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import JSON5 from 'json5';
import { describe, expect, test } from 'vitest';

import { resolveSid } from '../../../../i18n';
import { EndingSchema, type Ending } from '../../../schema';

const EXPECTED_ENDING_IDS = [
  'ending:tang/old-age',
  'ending:tang/illness',
  'ending:tang/violence',
  'ending:tang/starvation',
] as const;

interface EndingsFile {
  endings: Ending[];
}

/** Resolve and parse the endings file relative to this test. */
async function loadEndings(): Promise<readonly Ending[]> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, '..', 'endings.json5');
  const raw = await readFile(path, 'utf8');
  const parsed = JSON5.parse(raw) as EndingsFile;
  return parsed.endings;
}

describe('Tang China endings.json5', () => {
  test('parses as JSON5', async () => {
    const endings = await loadEndings();
    expect(endings).toBeDefined();
  });

  test('contains exactly 4 endings with the plan-canonical ids', async () => {
    const endings = await loadEndings();
    expect(endings).toHaveLength(4);
    expect(endings.map((e) => e.id)).toEqual([...EXPECTED_ENDING_IDS]);
  });

  test('each ending parses against EndingSchema', async () => {
    const endings = await loadEndings();
    for (const ending of endings) {
      const result = EndingSchema.safeParse(ending);
      expect(result.success, `ending "${ending.id}" must validate`).toBe(true);
    }
  });

  test('each ending has a non-empty echo_implications with at least one field', async () => {
    const endings = await loadEndings();
    for (const ending of endings) {
      const fields = Object.keys(ending.echo_implications);
      expect(
        fields.length,
        `ending "${ending.id}" must describe at least one echo implication`,
      ).toBeGreaterThan(0);
    }
  });

  test('every narrative_sid resolves through the i18n string table', async () => {
    const endings = await loadEndings();
    for (const ending of endings) {
      const text = resolveSid(ending.narrative_sid);
      expect(text.length, `narrative for "${ending.id}" must be non-empty`).toBeGreaterThan(0);
    }
  });

  test('no narrative claims nirvāṇa, buddhahood, or depicts an afterlife greeting', async () => {
    const endings = await loadEndings();
    const forbidden = /nirv[āa]ṇa|buddhahood|bodhisattva|greeted by|welcomed into|attained/i;
    for (const ending of endings) {
      const text = resolveSid(ending.narrative_sid);
      expect(
        text,
        `narrative for "${ending.id}" must not make doctrinal claims or depict afterlife`,
      ).not.toMatch(forbidden);
    }
  });

  test('every narrative names death explicitly (named, not euphemized)', async () => {
    const endings = await loadEndings();
    for (const ending of endings) {
      const text = resolveSid(ending.narrative_sid);
      expect(text, `narrative for "${ending.id}" must name death directly`).toMatch(
        /\bdied\b|\bdeath\b/i,
      );
    }
  });

  test('old-age trigger fires at age >= 60 with energy > 0', async () => {
    const endings = await loadEndings();
    const ending = endings.find((e) => e.id === 'ending:tang/old-age');
    expect(ending).toBeDefined();
    expect(ending?.trigger).toEqual({
      op: 'and',
      operands: [
        { op: 'gte', key: 'age', value: 60 },
        { op: 'gt', key: 'energy', value: 0 },
      ],
    });
  });

  test('illness trigger fires at energy <= 0 before age 60', async () => {
    const endings = await loadEndings();
    const ending = endings.find((e) => e.id === 'ending:tang/illness');
    expect(ending).toBeDefined();
    expect(ending?.trigger).toEqual({
      op: 'and',
      operands: [
        { op: 'lte', key: 'energy', value: 0 },
        { op: 'lt', key: 'age', value: 60 },
      ],
    });
  });

  test('violence trigger fires on victim-of-purge or bandit-casualty flag', async () => {
    const endings = await loadEndings();
    const ending = endings.find((e) => e.id === 'ending:tang/violence');
    expect(ending).toBeDefined();
    expect(ending?.trigger).toEqual({
      op: 'or',
      operands: [
        { op: 'has_flag', key: 'victim-of-purge' },
        { op: 'has_flag', key: 'bandit-casualty' },
      ],
    });
  });

  test('starvation trigger fires at provisions <= 0 before age 50', async () => {
    const endings = await loadEndings();
    const ending = endings.find((e) => e.id === 'ending:tang/starvation');
    expect(ending).toBeDefined();
    expect(ending?.trigger).toEqual({
      op: 'and',
      operands: [
        { op: 'lte', key: 'provisions', value: 0 },
        { op: 'lt', key: 'age', value: 50 },
      ],
    });
  });
});
