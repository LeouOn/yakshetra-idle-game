import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  lintPack,
  R_NO_DONATION_OFFSET,
  R_NO_KARMA_METER,
  R_NO_PRACTICE_AS_CURRENCY,
  R_NO_VISIBLE_KARMA_METER,
  R_RESOLVABLE_SITUATION_SID,
} from '../lint';
import { EraPackSchema, PracticeSchema, type EraPack } from '../schema';
import { loadEraPack } from '../loader';
import {
  collectPredicateKeySpaces,
  isStudioReturnFlag,
  KNOWN_DEAD_GATES,
} from '../lint-predicates';
import { pinFlag, placeFlag, WORLD_ASSEMBLED_FLAG, worldDraftFlag } from '@/engine';
import { MinigameDefSchema } from '../minigame-schema';

/**
 * Game-design lint tests.
 *
 * Remaining rules (karma meter, donation-offset, visible meter, practice-as-
 * currency) still have PASS/FAIL fixtures. Retired sacred-name and mantra
 * rules have a single "this is allowed now" check so they cannot sneak back.
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

describe('retired R-NO-SACRED-NAMES', () => {
  test('a citation naming a Buddha is allowed', async () => {
    const report = lintPack(await loadFixture('sacred-names-fail'));
    expect(report.passed).toBe(true);
    expect(ruleIds(report)).not.toContain('R-NO-SACRED-NAMES');
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

describe('retired R-NO-REAL-MANTRA', () => {
  test('a glossary seed syllable is allowed', async () => {
    const report = lintPack(await loadFixture('real-mantra-fail'));
    expect(report.passed).toBe(true);
    expect(ruleIds(report)).not.toContain('R-NO-REAL-MANTRA');
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

describe('minigame reward scanning', () => {
  /**
   * A minimal breath_count minigame whose only variable is the reward tier's
   * single add_resource effect. Loaded against the clean karma-meter-pass pack
   * so the pack itself contributes zero violations and any finding is owed to
   * the minigame — the isolation contract mirrors the practice-as-currency tests.
   */
  function makeBreathMinigame(rewardKey: string) {
    return MinigameDefSchema.parse({
      id: `breath-${rewardKey}`,
      type: 'breath_count',
      label_sid: `minigame.breath_${rewardKey}.label_sid`,
      description_sid: `minigame.breath_${rewardKey}.desc_sid`,
      lens: 'collected_attention',
      config: { target: 10, maxInputs: 20 },
      rewardTiers: [
        {
          minScore: 5,
          summary_sid: `minigame.breath_${rewardKey}.tier1_sid`,
          rewards: [{ op: 'add_resource', key: rewardKey, delta: 1 }],
        },
      ],
    });
  }

  test('FAIL — a minigame rewarding add_resource key "merit" is flagged (R-NO-KARMA-METER)', async () => {
    const pack = await loadFixture('karma-meter-pass');
    const report = lintPack(pack, [], {}, [makeBreathMinigame('merit')]);
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_KARMA_METER);
    // Isolation: only the minigame-driven R-NO-KARMA-METER fires.
    expect(ruleIds(report)).toEqual([R_NO_KARMA_METER]);
    expect(report.violations[0]!.message).toContain('merit');
    expect(report.violations[0]!.location).toContain('breath-merit');
  });

  test('FAIL — a minigame rewarding add_resource key "karma" is flagged (R-NO-KARMA-METER)', async () => {
    const pack = await loadFixture('karma-meter-pass');
    const report = lintPack(pack, [], {}, [makeBreathMinigame('karma')]);
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain(R_NO_KARMA_METER);
    expect(ruleIds(report)).toEqual([R_NO_KARMA_METER]);
    expect(report.violations[0]!.message).toContain('karma');
    expect(report.violations[0]!.location).toContain('breath-karma');
  });

  test('PASS — a clean minigame (reward key with no prohibited token) lints clean', async () => {
    const pack = await loadFixture('karma-meter-pass');
    const report = lintPack(pack, [], {}, [makeBreathMinigame('focus')]);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });
});

describe('lint module import surface', () => {
  test('lintPack is importable via the "@/content/lint" path alias', async () => {
    const mod = (await import('@/content/lint')) as typeof import('../lint');
    expect(typeof mod.lintPack).toBe('function');
  });
});

describe('R-RESOLVABLE-SITUATION-SID', () => {
  // The turn screen renders event.situation_sid as the situation line above
  // the event's choices, so an id that does not resolve would throw at render
  // time; lint must catch it at pack check time instead.
  const withSituation = (pack: EraPack, sid: string | undefined): EraPack => ({
    ...pack,
    events: pack.events.map((evt, index) =>
      index === 0 ? { ...evt, ...(sid === undefined ? {} : { situation_sid: sid }) } : evt,
    ),
  });

  test('PASS — a situation_sid that resolves in i18n lints clean', async () => {
    const pack = withSituation(await loadFixture('karma-meter-pass'), 'situation.pass_sid');
    const report = lintPack(pack, [], { 'situation.pass_sid': 'A traveler waits at the gate.' });
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test('FAIL — a situation_sid that resolves nowhere is an error violation', async () => {
    const pack = withSituation(await loadFixture('karma-meter-pass'), 'situation.ghost_sid');
    const report = lintPack(pack, []);
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toEqual([R_RESOLVABLE_SITUATION_SID]);
    expect(report.violations[0]!.location).toBe('events[ev_one].situation_sid');
  });

  test('FAIL — meter tokens in resolved situation prose are barred', async () => {
    const pack = withSituation(await loadFixture('karma-meter-pass'), 'situation.meter_sid');
    const report = lintPack(pack, [], { 'situation.meter_sid': 'Your karma score rises.' });
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toEqual([R_NO_KARMA_METER]);
    expect(report.violations[0]!.location).toBe('events[ev_one].situation_sid');
  });

  test('absent situation_sid — no violation, nothing required', async () => {
    const pack = withSituation(await loadFixture('karma-meter-pass'), undefined);
    const report = lintPack(pack, []);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });
});

describe('R-RESOLVABLE-PREDICATE-KEY', () => {
  test('FAIL — a made-up predicate key is an error', async () => {
    const pack = structuredClone(await loadFixture('karma-meter-pass'));
    pack.events[0]!.trigger = { op: 'gte', key: 'made-up-key', value: 1 };
    const report = lintPack(pack);
    expect(report.passed).toBe(false);
    expect(ruleIds(report)).toContain('R-RESOLVABLE-PREDICATE-KEY');
  });

  test('FAIL — state.age reintroduced is caught (the age bug class)', async () => {
    const pack = structuredClone(await loadFixture('karma-meter-pass'));
    pack.events[0]!.trigger = { op: 'gte', key: 'state.age', value: 25 };
    const report = lintPack(pack);
    expect(ruleIds(report)).toContain('R-RESOLVABLE-PREDICATE-KEY');
    expect(
      report.violations.find((v) => v.rule === 'R-RESOLVABLE-PREDICATE-KEY')?.message,
    ).toContain('state.age');
  });

  test('PASS — the explicit known-dead exemptions are the only ones that pass', async () => {
    const pack = structuredClone(await loadFixture('karma-meter-pass'));
    const clean = lintPack(pack);
    expect(ruleIds(clean)).not.toContain('R-RESOLVABLE-PREDICATE-KEY');
    // Each exemption must stay a named, commented entry, not a silent default.
    pack.events[0]!.choices[0]!.requires = [
      { op: 'gte', key: 'wealth', value: 3 },
      { op: 'has_flag', key: 'has_brother' },
      { op: 'has_flag', key: 'vow:protect-family' },
      { op: 'has_flag', key: 'victim-of-purge' },
      { op: 'has_flag', key: 'bandit-casualty' },
    ];
    const exempt = lintPack(pack);
    expect(ruleIds(exempt)).not.toContain('R-RESOLVABLE-PREDICATE-KEY');
  });

  test('PASS — a flag the studio return seeds into a new life is a real producer', async () => {
    const pack = structuredClone(await loadFixture('karma-meter-pass'));
    pack.events[0]!.choices[0]!.requires = [
      { op: 'has_flag', key: WORLD_ASSEMBLED_FLAG },
      { op: 'has_flag', key: pinFlag('person-1') },
      { op: 'has_flag', key: placeFlag('place-1') },
      { op: 'has_flag', key: worldDraftFlag('town') },
    ];
    expect(ruleIds(lintPack(pack))).not.toContain('R-RESOLVABLE-PREDICATE-KEY');
    // The list in lint-predicates repeats the engine's shapes; this pins it to them.
    for (const flag of [
      WORLD_ASSEMBLED_FLAG,
      pinFlag('x'),
      placeFlag('x'),
      worldDraftFlag('town'),
    ]) {
      expect(isStudioReturnFlag(flag), flag).toBe(true);
    }
    expect(isStudioReturnFlag('has_brother')).toBe(false);
  });

  test('every exemption is still used by a real pack and still has no producer', () => {
    const used = new Set<string>();
    const walk = (p: unknown): void => {
      const node = p as { key?: string; operands?: unknown[]; operand?: unknown };
      if (typeof node.key === 'string') used.add(node.key);
      node.operands?.forEach(walk);
      if (node.operand !== undefined) walk(node.operand);
    };
    for (const era of ['tang-china', 'fantasy-mahayana']) {
      const pack = loadEraPack(era);
      for (const event of pack.events) {
        if (event.trigger !== undefined) walk(event.trigger);
        event.choices.forEach((choice) => choice.requires.forEach(walk));
      }
      pack.endings.forEach((ending) => walk(ending.trigger));
      const spaces = collectPredicateKeySpaces(pack, pack.practices);
      for (const key of Object.keys(KNOWN_DEAD_GATES)) {
        // A key that gained a producer must leave the list (then the rule guards it again).
        expect(
          spaces.numeric.has(key) || spaces.flags.has(key) || spaces.skills.has(key),
          key,
        ).toBe(false);
      }
    }
    // A stale exemption (no pack reads the key any more) is clutter that hides a future dead gate.
    for (const key of Object.keys(KNOWN_DEAD_GATES)) {
      expect(used.has(key), `${key} is exempt but no real predicate uses it`).toBe(true);
    }
  });

  test('the real packs are green (after c1’s pending age fix)', () => {
    for (const era of ['tang-china', 'fantasy-mahayana']) {
      const pack = loadEraPack(era);
      const report = lintPack(pack, pack.practices, {}, pack.minigames, pack.endings);
      expect(ruleIds(report)).not.toContain('R-RESOLVABLE-PREDICATE-KEY');
    }
  });
});
