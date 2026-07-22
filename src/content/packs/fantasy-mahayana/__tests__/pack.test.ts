import { describe, expect, test } from 'vitest';

import { resolveSid } from '../../../../i18n';
import { lintPack } from '../../../lint';
import { loadEraPack } from '../../../loader';

describe('Fantasy Mahayana era pack scaffold', () => {
  test('loads with zero lint violations', async () => {
    const pack = await loadEraPack('fantasy-mahayana');
    const report = lintPack(pack);

    expect(pack.id).toBe('fantasy-mahayana@0.1.0');
    // events are omitted in pack.json5 (default []); authored events live in
    // the sibling events.json5 (todo 22) and are merged at integration time.
    expect(pack.events).toHaveLength(0);
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
});
