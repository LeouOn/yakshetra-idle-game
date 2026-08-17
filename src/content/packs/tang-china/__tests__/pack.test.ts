import { describe, expect, test } from 'vitest';

import { resolveSid } from '../../../../i18n';
import { lintPack } from '../../../lint';
import { loadEraPack } from '../../../loader';

describe('Tang China era pack scaffold', () => {
  test('loads with the merged event graph and zero lint violations', async () => {
    const pack = await loadEraPack('tang-china');
    const report = lintPack(pack);

    expect(pack.id).toBe('tang-china@0.1.0');
    // The loader merges events.json5 into the pack scaffold; before the
    // registry integration this was 0 (the scaffold's default []).
    expect(pack.events).toHaveLength(7);
    expect(report.violations).toHaveLength(0);
  });

  test('every player-facing sid in the pack resolves through i18n', async () => {
    const pack = await loadEraPack('tang-china');

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

  test('every sid referenced by the tang schedules resolves through i18n', async () => {
    const pack = await loadEraPack('tang-china');
    expect(pack.schedules.length).toBeGreaterThanOrEqual(2);

    for (const schedule of pack.schedules) {
      expect(resolveSid(schedule.name_sid), `schedule ${schedule.id} name_sid`).toBeTruthy();
      for (const block of schedule.blocks) {
        expect(resolveSid(block.label_sid), `block ${block.id} label_sid`).toBeTruthy();
        expect(resolveSid(block.icon_sid), `block ${block.id} icon_sid`).toBeTruthy();
      }
    }
  });

  test('every bibliography url is a parseable https url', async () => {
    const pack = await loadEraPack('tang-china');
    expect(pack.source_bibliography.length).toBeGreaterThanOrEqual(5);

    for (const entry of pack.source_bibliography) {
      const parsed = new URL(entry.url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname.length).toBeGreaterThan(0);
    }
  });

  test('sacred-text collections have the expected counts', async () => {
    const pack = await loadEraPack('tang-china');

    // 12 core Tang figures + 20 Buddhas of the past (Bhadrakalpa lineage).
    expect(pack.figures).toHaveLength(32);
    expect(pack.mantras).toHaveLength(10);
    expect(pack.sutras).toHaveLength(7);
  });

  test('every figure, mantra, and sutra sid resolves through i18n', async () => {
    const pack = await loadEraPack('tang-china');

    for (const figure of pack.figures) {
      expect(resolveSid(figure.display_name_sid)).toBeTruthy();
      expect(resolveSid(figure.primary_attribute_sid)).toBeTruthy();
      expect(resolveSid(figure.iconography_sid)).toBeTruthy();
      expect(resolveSid(figure.reverence_note_sid)).toBeTruthy();
    }

    for (const mantra of pack.mantras) {
      expect(resolveSid(mantra.label_sid)).toBeTruthy();
      expect(resolveSid(mantra.transliteration_sid)).toBeTruthy();
      expect(resolveSid(mantra.translation_sid)).toBeTruthy();
      expect(resolveSid(mantra.description_sid)).toBeTruthy();
    }

    for (const sutra of pack.sutras) {
      expect(resolveSid(sutra.title_sid)).toBeTruthy();
      expect(resolveSid(sutra.transliterated_title_sid)).toBeTruthy();
      expect(resolveSid(sutra.translator_sid)).toBeTruthy();
      expect(resolveSid(sutra.translation_era_sid)).toBeTruthy();
      expect(resolveSid(sutra.description_sid)).toBeTruthy();
      expect(resolveSid(sutra.excerpt_sid)).toBeTruthy();
      expect(resolveSid(sutra.attribution_note_sid)).toBeTruthy();
    }
  });
});
