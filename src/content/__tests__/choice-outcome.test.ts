import { describe, expect, it } from 'vitest';

import { lintPack, R_NO_KARMA_METER, R_RESOLVABLE_OUTCOME_SID } from '../lint';
import { ChoiceSchema, EraPackSchema, type EraPack } from '../schema';

function makeBasePack(choices: EraPack['events'][0]['choices']): EraPack {
  return {
    id: 'lint-fixture@0.1.0',
    name_sid: 'era.fixture.name_sid',
    locale_default: 'en',
    locale_available: ['en'],
    schema_version: '0.1',
    engine_compat: '^0.1.0',
    lens_set: 'six-paramita-mahayana',
    social: {
      paramitas: ['generosity'],
      relations: ['teacher'],
    },
    calendar: 'lunar',
    content_warnings: [],
    events: [
      {
        id: 'ev_one',
        weight: 1,
        cooldown_turns: 0,
        once_per_run: false,
        content_warnings: [],
        choices,
      },
      {
        id: 'ev_two',
        weight: 1,
        cooldown_turns: 0,
        once_per_run: false,
        content_warnings: [],
        choices: [
          {
            id: 'c_two',
            label_sid: 'test.action.give_alms_label_sid',
            requires: [],
            effects: [],
            forbidden: false,
          },
        ],
      },
      {
        id: 'ev_three',
        weight: 1,
        cooldown_turns: 0,
        once_per_run: false,
        content_warnings: [],
        choices: [
          {
            id: 'c_three',
            label_sid: 'test.action.give_alms_label_sid',
            requires: [],
            effects: [],
            forbidden: false,
          },
        ],
      },
      {
        id: 'ev_four',
        weight: 1,
        cooldown_turns: 0,
        once_per_run: false,
        content_warnings: [],
        choices: [
          {
            id: 'c_four',
            label_sid: 'test.action.give_alms_label_sid',
            requires: [],
            effects: [],
            forbidden: false,
          },
        ],
      },
      {
        id: 'ev_five',
        weight: 1,
        cooldown_turns: 0,
        once_per_run: false,
        content_warnings: [],
        choices: [
          {
            id: 'c_five',
            label_sid: 'test.action.give_alms_label_sid',
            requires: [],
            effects: [],
            forbidden: false,
          },
        ],
      },
      {
        id: 'ev_six',
        weight: 1,
        cooldown_turns: 0,
        once_per_run: false,
        content_warnings: [],
        choices: [
          {
            id: 'c_six',
            label_sid: 'test.action.give_alms_label_sid',
            requires: [],
            effects: [],
            forbidden: false,
          },
        ],
      },
    ],
    lineage_notes_sid: 'era.fixture.lineage_sid',
    glossary: {},
    source_bibliography: [],
    permitted_imagery: [],
    rule_variation: {
      id: 'vow',
      description_sid: 'era.fixture.vow_sid',
      enforces: 'vow',
    },
  };
}

describe('ChoiceSchema outcome_sid and journal_sid', () => {
  it('accepts a choice with valid outcome_sid and journal_sid', () => {
    const validChoice = {
      id: 'comply',
      label_sid: 'test.action.give_alms_label_sid',
      outcome_sid: 'test.consequence.alms_given_sid',
      journal_sid: 'test.journal.alms_memory_sid',
      requires: [],
      effects: [],
      forbidden: false,
    };
    const parsed = ChoiceSchema.safeParse(validChoice);
    expect(parsed.success).toBe(true);
  });

  it('parses an entire EraPack containing choices with outcome_sid and journal_sid', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        outcome_sid: 'test.consequence.alms_given_sid',
        journal_sid: 'test.journal.alms_memory_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const parsed = EraPackSchema.safeParse(pack);
    expect(parsed.success).toBe(true);
  });

  it('accepts a choice without outcome_sid or journal_sid', () => {
    const validChoice = {
      id: 'comply',
      label_sid: 'test.action.give_alms_label_sid',
      requires: [],
      effects: [],
      forbidden: false,
    };
    const parsed = ChoiceSchema.safeParse(validChoice);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid outcome_sid (empty string or not matching SID pattern)', () => {
    const invalidChoice = {
      id: 'comply',
      label_sid: 'test.action.give_alms_label_sid',
      outcome_sid: 'invalid_sid_no_suffix',
      requires: [],
      effects: [],
      forbidden: false,
    };
    const parsed = ChoiceSchema.safeParse(invalidChoice);
    expect(parsed.success).toBe(false);
  });

  it('rejects an invalid journal_sid (empty string)', () => {
    const invalidChoice = {
      id: 'comply',
      label_sid: 'test.action.give_alms_label_sid',
      journal_sid: '',
      requires: [],
      effects: [],
      forbidden: false,
    };
    const parsed = ChoiceSchema.safeParse(invalidChoice);
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown extraneous fields (strict schema)', () => {
    const invalidChoice = {
      id: 'comply',
      label_sid: 'test.action.give_alms_label_sid',
      random_field: 'not_allowed',
      requires: [],
      effects: [],
      forbidden: false,
    };
    const parsed = ChoiceSchema.safeParse(invalidChoice);
    expect(parsed.success).toBe(false);
  });
});

describe('lintPack with outcome_sid and journal_sid', () => {
  it('passes when outcome_sid and journal_sid resolve in en.json', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        outcome_sid: 'test.consequence.alms_given_sid',
        journal_sid: 'test.journal.alms_memory_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const report = lintPack(pack);
    expect(report.passed).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('passes when outcome_sid and journal_sid resolve through passed i18n map', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        outcome_sid: 'custom.event.outcome_sid',
        journal_sid: 'custom.event.journal_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const customI18n = {
      'custom.event.outcome_sid': 'Something happened peacefully.',
      'custom.event.journal_sid': 'Memory carried in peace.',
    };
    const report = lintPack(pack, [], customI18n);
    expect(report.passed).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('fails with R_RESOLVABLE_OUTCOME_SID when outcome_sid does not resolve', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        outcome_sid: 'unresolved.nonexistent.outcome_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const report = lintPack(pack);
    expect(report.passed).toBe(false);
    expect(report.violations.map((v) => v.rule)).toContain(R_RESOLVABLE_OUTCOME_SID);
  });

  it('fails with R_RESOLVABLE_OUTCOME_SID when journal_sid does not resolve', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        journal_sid: 'unresolved.nonexistent.journal_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const report = lintPack(pack);
    expect(report.passed).toBe(false);
    expect(report.violations.map((v) => v.rule)).toContain(R_RESOLVABLE_OUTCOME_SID);
  });

  it('fails with R_NO_KARMA_METER when outcome_sid token contains karma meter keyword', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        outcome_sid: 'event.tang.karma_gain_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const report = lintPack(pack);
    expect(report.passed).toBe(false);
    expect(report.violations.map((v) => v.rule)).toContain(R_NO_KARMA_METER);
  });

  it('fails with R_NO_KARMA_METER when resolved outcome text contains prohibited meter token', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        outcome_sid: 'custom.event.outcome_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const customI18n = {
      'custom.event.outcome_sid': 'You gained 5 merit points.',
    };
    const report = lintPack(pack, [], customI18n);
    expect(report.passed).toBe(false);
    expect(report.violations.map((v) => v.rule)).toContain(R_NO_KARMA_METER);
  });

  it('leaves choices without outcome_sid or journal_sid completely valid', () => {
    const pack = makeBasePack([
      {
        id: 'c_one',
        label_sid: 'test.action.give_alms_label_sid',
        requires: [],
        effects: [],
        forbidden: false,
      },
    ]);
    const report = lintPack(pack);
    expect(report.passed).toBe(true);
    expect(report.violations).toHaveLength(0);
  });
});
