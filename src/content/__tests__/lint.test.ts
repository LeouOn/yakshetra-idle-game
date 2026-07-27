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
  R_NO_PRACTICE_AS_CURRENCY,
  R_NO_REAL_MANTRA,
  R_NO_SACRED_NAMES,
  R_NO_VISIBLE_KARMA_METER,
} from '../lint';
import { EraPackSchema, PracticeSchema, type EraPack } from '../schema';

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

describe('R-NO-PRACTICE-AS-CURRENCY', () => {
  test('FAIL — a practice with add_resource key "merit_points" is flagged', async () => {
    const pack = await loadFixture('karma-meter-pass');
    const practice = PracticeSchema.parse({
      id: 'chanting',
      label_sid: 'practice.chanting.label_sid',
      description_sid: 'practice.chanting.desc_sid',
      lens: 'collected_attention',
      progressPerTick: 0.5,
      maxProgress: 10,
      effects: [{ op: 'add_resource', key: 'merit_points', delta: 1 }],
    });
    const report = lintPack(pack, [practice]);
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_PRACTICE_AS_CURRENCY);
    // Isolation contract: existing rules scan pack.events only; an external
    // practices array must not bleed into R-NO-KARMA-METER even when the
    // resource key contains the substring "merit".
    expect(ruleIds(report)).toEqual([R_NO_PRACTICE_AS_CURRENCY]);
    expect(report.violations[0]!.message).toContain('merit_points');
    expect(report.violations[0]!.location).toBe('practices[chanting].effects[add_resource].key');
  });

  test('FAIL — a practice description containing "earn merit" is flagged', async () => {
    const pack = await loadFixture('karma-meter-pass');
    const practice = PracticeSchema.parse({
      id: 'sutra-copy',
      label_sid: 'practice.sutra_copy.label_sid',
      description_sid: 'practice.sutra_copy.desc_sid',
      lens: 'joyful_effort',
      progressPerTick: 0.25,
      maxProgress: 40,
      effects: [],
    });
    const i18n = { 'practice.sutra_copy.desc_sid': 'Earn merit by copying sacred texts.' };
    const report = lintPack(pack, [practice], i18n);
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_PRACTICE_AS_CURRENCY);
    expect(ruleIds(report)).toEqual([R_NO_PRACTICE_AS_CURRENCY]);
  });

  test('PASS — a normal practice (no currency framing) lints clean', async () => {
    const pack = await loadFixture('karma-meter-pass');
    const practice = PracticeSchema.parse({
      id: 'alms-round',
      label_sid: 'practice.alms_round.label_sid',
      description_sid: 'practice.alms_round.desc_sid',
      lens: 'generosity',
      progressPerTick: 0.5,
      maxProgress: 12,
      effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
    });
    const i18n = {
      'practice.alms_round.desc_sid': 'Walk the morning route accepting offered food.',
    };
    const report = lintPack(pack, [practice], i18n);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test('lintPack integration — the rule runs alongside the existing five', async () => {
    const cleanReport = lintPack(await loadFixture('karma-meter-pass'));
    expect(cleanReport.passed).toBe(true);
    const withCurrency = lintPack(await loadFixture('karma-meter-pass'), [
      PracticeSchema.parse({
        id: 'greed',
        label_sid: 'practice.greed.label_sid',
        description_sid: 'practice.greed.desc_sid',
        lens: 'generosity',
        progressPerTick: 1,
        maxProgress: 50,
        effects: [{ op: 'add_resource', key: 'gold', delta: 5 }],
      }),
    ]);
    expect(withCurrency.passed).toBe(false);
    expect(ruleIds(withCurrency)).toContain(R_NO_PRACTICE_AS_CURRENCY);
  });

  test('warning severity — a round maxProgress of 1000 is flagged but does not fail the pack', async () => {
    const pack = await loadFixture('karma-meter-pass');
    const practice = PracticeSchema.parse({
      id: 'grand-quest',
      label_sid: 'practice.grand_quest.label_sid',
      description_sid: 'practice.grand_quest.desc_sid',
      lens: 'patient_courage',
      progressPerTick: 1,
      maxProgress: 1000,
      effects: [{ op: 'add_resource', key: 'trust', delta: 1 }],
    });
    const report = lintPack(pack, [practice]);
    // Warning present, but no error ⇒ pack still passes.
    const currencyFindings = report.violations.filter((v) => v.rule === R_NO_PRACTICE_AS_CURRENCY);
    expect(currencyFindings).toHaveLength(1);
    expect(currencyFindings[0]!.severity).toBe('warning');
    expect(currencyFindings[0]!.location).toBe('practices[grand-quest].maxProgress');
    expect(report.passed).toBe(true);
  });
});

describe('lint module import surface', () => {
  test('lintPack is importable via the "@/content/lint" path alias', async () => {
    const mod = (await import('@/content/lint')) as typeof import('../lint');
    expect(typeof mod.lintPack).toBe('function');
  });
});
