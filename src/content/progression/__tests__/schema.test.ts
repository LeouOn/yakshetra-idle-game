import { describe, expect, it } from 'vitest';

import {
  ArchivePredicateSchema,
  CompendiumEntrySchema,
  EndowmentTrackSchema,
  KindRowSchema,
  MilestoneSchema,
  PolicySchema,
  TierSchema,
  VisitorSchema,
} from '@/content/progression/schema';

describe('TierSchema', () => {
  const tier = {
    schema_version: 'tier/v0',
    id: 'household',
    scale: 'household',
    index: 1,
    roster_size: { min: 3, max: 8 },
    member_unit: 'person',
    role_table_ref: 'roles/household',
    unlock_milestone: 'unlock-household',
    fold_cadence: 4,
    endowment_slots: 2,
    visitor_table_ref: 'visitors/household',
  };

  it('accepts a well-formed tier', () => {
    expect(TierSchema.parse(tier).id).toBe('household');
  });

  it('rejects a fold cadence below 1', () => {
    expect(() => TierSchema.parse({ ...tier, fold_cadence: 0 })).toThrow();
  });

  it('rejects unknown keys', () => {
    expect(() => TierSchema.parse({ ...tier, karma: 1 })).toThrow();
  });
});

describe('KindRowSchema', () => {
  const row = {
    schema_version: 'kind/v0',
    id: 'person',
    scale: 'person',
    pinnable: true,
    catalog_ref: 'core/person',
    sid_ns: 'kind.person',
    min_quality: 0,
    match: { social: true },
  };

  it('accepts a well-formed kind row', () => {
    expect(KindRowSchema.parse(row).id).toBe('person');
  });

  it('rejects a match with no clauses', () => {
    expect(() => KindRowSchema.parse({ ...row, match: {} })).toThrow();
  });

  it('defaults pinnable to false and min_quality to 0', () => {
    const { pinnable: _p, min_quality: _q, ...rest } = row;
    const parsed = KindRowSchema.parse(rest);
    expect(parsed.pinnable).toBe(false);
    expect(parsed.min_quality).toBe(0);
  });
});

describe('ArchivePredicateSchema', () => {
  it('parses a nested and/gte predicate', () => {
    const predicate = {
      op: 'and',
      operands: [
        { op: 'gte', key: 'world_drafts.total', value: 1 },
        { op: 'gte', key: 'pinned.person', value: 3 },
      ],
    };
    expect(ArchivePredicateSchema.parse(predicate).op).toBe('and');
  });

  it('rejects an unknown op', () => {
    expect(() => ArchivePredicateSchema.parse({ op: 'has_flag', key: 'x', value: 1 })).toThrow();
  });
});

describe('remaining progression schemas', () => {
  it('MilestoneSchema accepts the household unlock', () => {
    const milestone = {
      schema_version: 'milestone/v0',
      id: 'unlock-household',
      predicate: { op: 'gte', key: 'pinned.person', value: 3 },
      grants: { tier: 'household', ceremony_sid: 'graduation.household' },
    };
    expect(MilestoneSchema.parse(milestone).grants.tier).toBe('household');
  });

  it('PolicySchema accepts a routine policy', () => {
    const policy = {
      schema_version: 'policy/v0',
      id: 'policy/farmer',
      practices: ['practice:tilling'],
      schedule_ref: 'schedules/farmstead',
      choice_weights: { generosity: 0.4 },
    };
    expect(PolicySchema.parse(policy).id).toBe('policy/farmer');
  });

  it('EndowmentTrackSchema accepts an EffectOp track', () => {
    const track = {
      schema_version: 'endowment/v0',
      id: 'endow/swift-cook',
      tier: 'person',
      requires: null,
      slot_cost: 1,
      effects: [{ op: 'add_resource', key: 'cook_speed', delta: 1 }],
    };
    expect(EndowmentTrackSchema.parse(track).slot_cost).toBe(1);
  });

  it('VisitorSchema requires exactly one of effects or table_ref', () => {
    const base = {
      schema_version: 'visitor/v0',
      id: 'visitor/gate-yaksa',
      tiers: ['person'],
      cadence_ticks: 240,
      jitter_ticks: 60,
      duration_windows: 2,
      sid_ns: 'visitor.gate-yaksa',
    };
    expect(() => VisitorSchema.parse({ ...base })).toThrow();
    expect(() =>
      VisitorSchema.parse({
        ...base,
        effects: [{ op: 'add_resource', key: 'surplus_rate', delta: 1 }],
        table_ref: 'tables/yaksa',
      }),
    ).toThrow();
    expect(VisitorSchema.parse({ ...base, table_ref: 'tables/yaksa' }).table_ref).toBe(
      'tables/yaksa',
    );
  });

  it('CompendiumEntrySchema accepts a predicate + reward', () => {
    const entry = {
      schema_version: 'compendium/v0',
      id: 'compendium/first-world',
      predicate: { op: 'gte', key: 'world_drafts.total', value: 1 },
      reward: { unlock: 'theme/lacquer' },
      sid_ns: 'compendium.first-world',
    };
    expect(CompendiumEntrySchema.parse(entry).id).toBe('compendium/first-world');
  });
});
