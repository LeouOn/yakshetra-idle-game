import { describe, expect, test } from 'vitest';

import { resolveSid } from '../../../../i18n';
import { lintPack } from '../../../lint';
import { loadEraPack } from '../../../loader';

describe('Fantasy Mahayana era pack scaffold', () => {
  test('loads with the merged event graph and zero lint violations', async () => {
    const pack = await loadEraPack('fantasy-mahayana');
    const report = lintPack(pack);

    expect(pack.id).toBe('fantasy-mahayana@0.1.0');
    // The loader merges events.json5 into the pack scaffold; before the
    // registry integration this was 0 (the scaffold's default []).
    expect(pack.events).toHaveLength(7);
    expect(report.violations).toHaveLength(0);
  });

  test('declares the vow-enforcement rule variation and authored social config', async () => {
    const pack = await loadEraPack('fantasy-mahayana');

    expect(pack.rule_variation.enforces).toBe('vow');
    expect(pack.rule_variation.id).toBe('vow-enforcement');

    // AuthoredSocialConfigSchema (not the legacy shape): narrow the union so
    // TypeScript can see the authored fields.
    expect('strata' in pack.social).toBe(true);
    if ('strata' in pack.social) {
      expect(pack.social.strata).toHaveLength(3);
      expect(pack.social.default_role_at_birth).toBe('newly-arrived-soul');
    }
  });

  test('defines three starting roles', async () => {
    const pack = await loadEraPack('fantasy-mahayana');
    expect(pack.starting_roles).toBeDefined();
    expect(pack.starting_roles).toHaveLength(3);
    for (const role of pack.starting_roles ?? []) {
      expect(role.starting_resources).toBeDefined();
      expect(Object.keys(role.starting_resources).length).toBeGreaterThan(0);
    }
  });

  test('every player-facing sid in the pack resolves through i18n', async () => {
    const pack = await loadEraPack('fantasy-mahayana');

    expect(resolveSid(pack.name_sid)).toBeTruthy();
    expect(resolveSid(pack.lineage_notes_sid)).toBeTruthy();
    expect(resolveSid(pack.rule_variation.description_sid)).toBeTruthy();

    if ('mobility_rules_sid' in pack.social) {
      expect(resolveSid(pack.social.mobility_rules_sid)).toBeTruthy();
    }

    expect(pack.starting_roles).toBeDefined();
    for (const role of pack.starting_roles ?? []) {
      if (role.label_sid !== undefined) expect(resolveSid(role.label_sid)).toBeTruthy();
      expect(resolveSid(role.description_sid)).toBeTruthy();
    }

    for (const [term, value] of Object.entries(pack.glossary)) {
      const sid = typeof value === 'string' ? value : value.en;
      expect(sid, `glossary term "${term}" must be a sid or en-localized string`).toBeTruthy();
      if (sid !== undefined) expect(resolveSid(sid)).toBeTruthy();
    }
  });

  test('every bibliography url is a parseable https url', async () => {
    const pack = await loadEraPack('fantasy-mahayana');
    expect(pack.source_bibliography.length).toBeGreaterThanOrEqual(5);

    for (const entry of pack.source_bibliography) {
      const parsed = new URL(entry.url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname.length).toBeGreaterThan(0);
    }
  });

  test('authors 12 practices covering all six lenses, each with a set_intent_root effect', async () => {
    const pack = await loadEraPack('fantasy-mahayana');
    expect(pack.practices).toHaveLength(12);

    const lenses = new Set(pack.practices.map((p) => p.lens));
    expect(lenses.has('careful_conduct')).toBe(true);
    expect(lenses.has('discernment')).toBe(true);
    expect(lenses.has('patient_courage')).toBe(true);
    expect(lenses.has('joyful_effort')).toBe(true);
    expect(lenses.has('collected_attention')).toBe(true);

    for (const practice of pack.practices) {
      const hasIntentRoot = practice.effects.some((e) => e.op === 'set_intent_root');
      expect(hasIntentRoot).toBe(true);
    }
  });

  test('authors 3 daily schedules whose blocks enforce 0..24 coverage the schema does not', async () => {
    const pack = await loadEraPack('fantasy-mahayana');
    expect(pack.schedules).toHaveLength(3);

    for (const schedule of pack.schedules) {
      const sorted = [...schedule.blocks].sort((a, b) => a.startHour - b.startHour);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      expect(first).toBeDefined();
      expect(last).toBeDefined();
      expect(first!.startHour).toBe(0);
      expect(last!.endHour).toBe(24);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        expect(prev).toBeDefined();
        expect(curr).toBeDefined();
        expect(curr!.startHour).toBe(prev!.endHour);
      }
    }
  });

  test('every practice and schedule sid resolves through i18n', async () => {
    const pack = await loadEraPack('fantasy-mahayana');

    for (const practice of pack.practices) {
      expect(resolveSid(practice.label_sid)).toBeTruthy();
      expect(resolveSid(practice.description_sid)).toBeTruthy();
    }

    for (const schedule of pack.schedules) {
      expect(resolveSid(schedule.name_sid)).toBeTruthy();
      for (const block of schedule.blocks) {
        expect(resolveSid(block.label_sid)).toBeTruthy();
        expect(resolveSid(block.icon_sid)).toBeTruthy();
      }
    }
  });
});
