import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  getProhibitedNames,
  getProhibitedNamesLoadError,
  lintPack,
  R_NO_DONATION_OFFSET,
  R_NO_KARMA_METER,
  R_NO_REAL_MANTRA,
  R_NO_SACRED_NAMES,
  R_NO_VISIBLE_KARMA_METER,
} from '../lint';
import { EraPackSchema, type EraPack } from '../schema';

/**
 * Prohibited-mechanics lint tests (plan todo 5).
 *
 * For each of the 5 rules there is a PASS fixture (clean pack, zero
 * violations) and a FAIL fixture (schema-valid pack that injects exactly one
 * violation targeting that rule). Each fixture is loaded from disk and
 * round-tripped through {@link EraPackSchema} so the test also confirms the
 * lint operates on packs the schema accepts (the second-line-of-defense
 * contract): the schema is the first line, the lint is the second.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(HERE, 'fixtures');

async function loadFixture(name: string): Promise<EraPack> {
  const raw = await readFile(resolve(FIXTURES_DIR, `${name}.json`), 'utf8');
  // Confirm the fixture is structurally valid (schema accepts it) before
  // linting — the lint's contract is to catch TEXTUAL violations the schema
  // cannot reach, on packs that already parse.
  return EraPackSchema.parse(JSON.parse(raw));
}

function ruleIds(report: ReturnType<typeof lintPack>): string[] {
  return report.violations.map((v) => v.rule);
}

describe('prohibited-mechanics lint — closed list self-check', () => {
  test('the prohibited-names file loaded successfully from disk', () => {
    expect(
      getProhibitedNamesLoadError(),
      'closed list must be readable at lint time',
    ).toBeUndefined();
  });

  test('the closed list contains the 40 canonical names, including diacritics', async () => {
    const names = getProhibitedNames();
    // The closed list defined in the plan (ASCII + diacritic pairs).
    const expected = [
      'Shakyamuni',
      'Buddha',
      'Amitabha',
      'Amida',
      'Amitayus',
      'Avalokiteshvara',
      'Avalokiteśvara',
      'Guanyin',
      'Kannon',
      'Chenrezig',
      'Manjushri',
      'Mañjuśrī',
      'Wenshu',
      'Monju',
      'Samantabhadra',
      'Puxian',
      'Fugen',
      'Ksitigarbha',
      'Kṣitigarbha',
      'Dizang',
      'Jizo',
      'Mahasthamaprapta',
      'Mahāsthāmaprāpta',
      'Dashizhi',
      'Daesaeji',
      'Seishi',
      'Tara',
      'Tārā',
      'Drolma',
      'Maitreya',
      'Mila',
      'Milarepa',
      'Padmasambhava',
      'Tsongkhapa',
      'Nagarjuna',
      'Nāgārjuna',
      'Atisha',
      'Shantideva',
      'Śāntideva',
      'Bodhidharma',
    ];
    expect(names.length).toBe(expected.length);
    for (const name of expected) {
      expect(names, `closed list must include "${name}"`).toContain(name);
    }
  });

  test('the on-disk file matches the in-memory list exactly', async () => {
    const raw = await readFile(resolve(process.cwd(), 'advisory', 'prohibited-names.txt'), 'utf8');
    const onDisk = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));
    expect(onDisk).toEqual([...getProhibitedNames()]);
  });
});

describe('R-NO-KARMA-METER', () => {
  test('PASS — clean pack lints with zero violations', async () => {
    const report = lintPack(await loadFixture('karma-meter-pass'));
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test('FAIL — a resource key named "karma" is flagged', async () => {
    const report = lintPack(await loadFixture('karma-meter-fail'));
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_KARMA_METER);
    // Isolation: only R-NO-KARMA-METER should fire (no visible-suffix present).
    expect(ruleIds(report)).toEqual([R_NO_KARMA_METER]);
  });
});

describe('R-NO-SACRED-NAMES', () => {
  test('PASS — clean pack lints with zero violations', async () => {
    const report = lintPack(await loadFixture('sacred-names-pass'));
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test('FAIL — a citation mentioning "Buddha" is flagged', async () => {
    const report = lintPack(await loadFixture('sacred-names-fail'));
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_SACRED_NAMES);
    expect(ruleIds(report)).toEqual([R_NO_SACRED_NAMES]);
  });

  test('word-boundary precision — "Buddhahood" does NOT false-positive as "Buddha"', async () => {
    // "Buddhahood" is a common noun, not the proper-name reference we forbid.
    // The Unicode-letter boundary must prevent a substring match.
    const pack = await loadFixture('sacred-names-pass');
    pack.source_bibliography[0]!.citation = 'A study of Buddhahood in later literature.';
    const report = lintPack(pack);
    expect(report.passed).toBe(true);
  });

  test('diacritic names are caught — "Śāntideva" with leading diacritic', async () => {
    // Names beginning/ending with a diacritic (Ś, ī) defeat ASCII \b; the
    // Unicode-letter boundary must still match them.
    const pack = await loadFixture('sacred-names-pass');
    pack.source_bibliography[0]!.citation = 'A commentary by Śāntideva.';
    const report = lintPack(pack);
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_SACRED_NAMES);
  });
});

describe('R-NO-DONATION-OFFSET', () => {
  test('PASS — clean pack lints with zero violations', async () => {
    const report = lintPack(await loadFixture('donation-offset-pass'));
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test('FAIL — a choice pairing harm_* with alms_* is flagged', async () => {
    const report = lintPack(await loadFixture('donation-offset-fail'));
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_DONATION_OFFSET);
    expect(ruleIds(report)).toEqual([R_NO_DONATION_OFFSET]);
  });

  test('harm without donation does NOT fire (the offset pairing is required)', async () => {
    const pack = await loadFixture('donation-offset-pass');
    pack.events[0]!.choices[0]!.effects = [
      { op: 'add_relationship', target: 'harm_villager', delta: -1 },
    ];
    const report = lintPack(pack);
    expect(report.passed).toBe(true);
  });
});

describe('R-NO-VISIBLE-KARMA-METER', () => {
  test('PASS — clean pack lints with zero violations', async () => {
    const report = lintPack(await loadFixture('visible-karma-pass'));
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test('FAIL — an identifier "spiritual_score" is flagged', async () => {
    const report = lintPack(await loadFixture('visible-karma-fail'));
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_VISIBLE_KARMA_METER);
    // "spiritual_score" does NOT contain the exact "spiritual_rank" token, so
    // R-NO-KARMA-METER must stay silent — proving the two rules are distinct.
    expect(ruleIds(report)).toEqual([R_NO_VISIBLE_KARMA_METER]);
  });
});

describe('R-NO-REAL-MANTRA', () => {
  test('PASS — clean pack lints with zero violations', async () => {
    const report = lintPack(await loadFixture('real-mantra-pass'));
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test('FAIL — a glossary value of "oṁ" is flagged', async () => {
    const report = lintPack(await loadFixture('real-mantra-fail'));
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_REAL_MANTRA);
    expect(ruleIds(report)).toEqual([R_NO_REAL_MANTRA]);
  });

  test('line-anchored precision — "om" buried in "welcome" does NOT fire', async () => {
    const pack = await loadFixture('real-mantra-pass');
    pack.glossary['greeting'] = { en: 'welcome to the monastery' };
    const report = lintPack(pack);
    expect(report.passed).toBe(true);
  });
});

describe('lint module import surface', () => {
  test('lintPack is importable via the "@/content/lint" path alias', async () => {
    const mod = (await import('@/content/lint')) as typeof import('../lint');
    expect(typeof mod.lintPack).toBe('function');
  });
});
