import { describe, expect, test } from 'vitest';

import { resolveSid } from '../../../../i18n';
import { lintPack } from '../../../lint';
import { loadEraPack } from '../../../loader';

describe('Tang China era pack scaffold', () => {
  test('loads with zero lint violations before events are added', async () => {
    const pack = await loadEraPack('tang-china');
    const report = lintPack(pack);

    expect(pack.id).toBe('tang-china@0.1.0');
    expect(pack.events).toHaveLength(0);
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

  test('every bibliography url is a parseable https url', async () => {
    const pack = await loadEraPack('tang-china');
    expect(pack.source_bibliography.length).toBeGreaterThanOrEqual(5);

    for (const entry of pack.source_bibliography) {
      const parsed = new URL(entry.url);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.hostname.length).toBeGreaterThan(0);
    }
  });
});
