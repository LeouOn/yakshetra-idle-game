import { describe, expect, it } from 'vitest';

import {
  CompendiumEntrySchema,
  EndowmentTrackSchema,
  VisitorSchema,
} from '@/content/progression/schema';
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

  it('rejects a karma_points add_resource key in endowment rows', () => {
    const registries = loadProgression();
    const row = EndowmentTrackSchema.parse({
      schema_version: 'endowment/v0',
      id: 'endow/person/karma-engine',
      tier: 'person',
      requires: null,
      slot_cost: 1,
      effects: [{ op: 'add_resource', key: 'karma_points', delta: 1 }],
    });
    const broken: ProgressionRegistries = {
      ...registries,
      endowment: [...registries.endowment, row],
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-MODIFIER-KEYS')).toBe(true);
  });

  it('rejects an off-vocabulary add_resource key in visitor rows', () => {
    const registries = loadProgression();
    const row = VisitorSchema.parse({
      schema_version: 'visitor/v0',
      id: 'visitor/person/wanderer',
      tiers: ['person'],
      cadence_ticks: 4,
      jitter_ticks: 1,
      duration_windows: 2,
      effects: [{ op: 'add_resource', key: 'vibe_rate', delta: 1 }],
      sid_ns: 'visitor.wanderer',
    });
    const broken: ProgressionRegistries = {
      ...registries,
      visitors: [...registries.visitors, row],
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-MODIFIER-KEYS')).toBe(true);
  });

  it('rejects an off-vocabulary add_resource key in compendium rewards', () => {
    const registries = loadProgression();
    const row = CompendiumEntrySchema.parse({
      schema_version: 'compendium/v0',
      id: 'compendium/fancy-lamp',
      predicate: { op: 'gte', key: 'harvests.common', value: 1 },
      reward: { effects: [{ op: 'add_resource', key: 'lamp_oil', delta: 1 }] },
      sid_ns: 'compendium.fancy-lamp',
    });
    const broken: ProgressionRegistries = {
      ...registries,
      compendium: [...registries.compendium, row],
    };
    const report = lintProgression(broken);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === 'R-PROG-MODIFIER-KEYS')).toBe(true);
  });

  it('accepts the shipped endowment rows whose keys are all whitelisted', () => {
    const registries = loadProgression();
    expect(registries.endowment.length).toBeGreaterThanOrEqual(4);
    expect(lintProgression(registries).violations).toEqual([]);
  });
});
