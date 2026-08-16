import { describe, expect, it } from 'vitest';

import { CompendiumEntrySchema } from '@/content/progression/schema';
import { lintProgression } from '@/content/progression/lint';
import { loadProgression, type ProgressionRegistries } from '@/content/progression/loader';

describe('lintProgression', () => {
  it('passes the shipped base content', () => {
    const report = lintProgression(loadProgression());
    expect(report.violations).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it('rejects a tier whose unlock milestone is missing', () => {
    const registries = loadProgression();
    const broken: ProgressionRegistries = {
      ...registries,
      milestones: registries.milestones.filter((m) => m.id !== 'unlock-org'),
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-REF-INTEGRITY')).toBe(true);
  });

  it('rejects a milestone granting an unknown tier', () => {
    const registries = loadProgression();
    const broken: ProgressionRegistries = {
      ...registries,
      milestones: registries.milestones.map((m) =>
        m.id === 'unlock-region' ? { ...m, grants: { ...m.grants, tier: 'planet' } } : m,
      ),
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-REF-INTEGRITY')).toBe(true);
  });

  it('rejects a registry missing a core kind', () => {
    const registries = loadProgression();
    const broken: ProgressionRegistries = {
      ...registries,
      kindRows: registries.kindRows.filter((r) => r.id !== 'place'),
      kindRules: registries.kindRules.filter((r) => r.kind !== 'place'),
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-CORE-KINDS')).toBe(true);
  });

  it('rejects meter tokens anywhere in progression data', () => {
    const registries = loadProgression();
    const row = CompendiumEntrySchema.parse({
      schema_version: 'compendium/v0',
      id: 'compendium/merit-badge',
      predicate: { op: 'gte', key: 'pinned.person', value: 1 },
      reward: { unlock: 'merit_meter' },
      sid_ns: 'compendium.merit-badge',
    });
    const broken: ProgressionRegistries = { ...registries, compendium: [row] };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-NO-METER')).toBe(true);
  });
});
