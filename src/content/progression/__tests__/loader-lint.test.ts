// Lint-throw wiring for the progression loader.
//
// `loadProgression()` runs the design lint after schema validation and throws
// when `lintReport.passed` is false. The base content always passes, so this
// test mocks `./registry` to return a bundle whose referential integrity is
// broken (one tier points at a milestone id that does not exist). The schema
// parse must still succeed; the throw must come from the lint pass.

import { describe, expect, it, vi } from 'vitest';

// Import AFTER vi.mock so the loader sees the mocked registry.
import { loadProgression } from '../loader';

vi.mock('../registry', () => {
  const tiers = [
    {
      schema_version: 'tier/v0',
      id: 'person',
      scale: 'person',
      index: 0,
      roster_size: { min: 1, max: 1 },
      member_unit: 'life',
      role_table_ref: 'roles/person',
      unlock_milestone: null,
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/person',
    },
    {
      schema_version: 'tier/v0',
      id: 'household',
      scale: 'household',
      index: 1,
      roster_size: { min: 3, max: 8 },
      member_unit: 'person',
      role_table_ref: 'roles/household',
      unlock_milestone: 'unlock-nonexistent',
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/household',
    },
    {
      schema_version: 'tier/v0',
      id: 'org',
      scale: 'org',
      index: 2,
      roster_size: { min: 2, max: 12 },
      member_unit: 'household',
      role_table_ref: 'roles/org',
      unlock_milestone: 'unlock-org',
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/org',
    },
    {
      schema_version: 'tier/v0',
      id: 'town',
      scale: 'town',
      index: 3,
      roster_size: { min: 3, max: 24 },
      member_unit: 'household',
      role_table_ref: 'roles/town',
      unlock_milestone: 'unlock-town',
      fold_cadence: 4,
      endowment_slots: 2,
      visitor_table_ref: 'visitors/town',
    },
    {
      schema_version: 'tier/v0',
      id: 'city',
      scale: 'city',
      index: 4,
      roster_size: { min: 4, max: 40 },
      member_unit: 'household',
      role_table_ref: 'roles/city',
      unlock_milestone: 'unlock-city',
      fold_cadence: 4,
      endowment_slots: 3,
      visitor_table_ref: 'visitors/city',
    },
    {
      schema_version: 'tier/v0',
      id: 'region',
      scale: 'region',
      index: 5,
      roster_size: { min: 2, max: 12 },
      member_unit: 'town',
      role_table_ref: 'roles/region',
      unlock_milestone: 'unlock-region',
      fold_cadence: 4,
      endowment_slots: 4,
      visitor_table_ref: 'visitors/region',
    },
  ];
  const kinds = [
    {
      schema_version: 'kind/v0',
      id: 'change',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/change',
      sid_ns: 'kind.change',
      min_quality: 0,
      match: { dominant: 'practice_level' },
    },
    {
      schema_version: 'kind/v0',
      id: 'outcome',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/outcome',
      sid_ns: 'kind.outcome',
      min_quality: 0,
      match: { dominant: 'event_resolved' },
    },
    {
      schema_version: 'kind/v0',
      id: 'person',
      scale: 'person',
      pinnable: true,
      catalog_ref: 'core/person',
      sid_ns: 'kind.person',
      min_quality: 0,
      match: { social: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'place',
      scale: 'person',
      pinnable: true,
      catalog_ref: 'core/place',
      sid_ns: 'kind.place',
      min_quality: 0,
      match: { spatial: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'thing',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/thing',
      sid_ns: 'kind.thing',
      min_quality: 0,
      match: { no_dominant: true },
    },
    {
      schema_version: 'kind/v0',
      id: 'change',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/change',
      sid_ns: 'kind.change',
      min_quality: 0,
      match: { dominant_in: ['life_ended'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'outcome',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/outcome',
      sid_ns: 'kind.outcome',
      min_quality: 0,
      match: { dominant_in: ['resource_edge'] },
    },
    {
      schema_version: 'kind/v0',
      id: 'thing',
      scale: 'person',
      pinnable: false,
      catalog_ref: 'core/thing',
      sid_ns: 'kind.thing',
      min_quality: 0,
      match: { dominant_in: ['practice_tick', 'lens_chosen'] },
    },
  ];
  const milestones = [
    {
      schema_version: 'milestone/v0',
      id: 'unlock-household',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'world_drafts.total', value: 1 },
          { op: 'gte', key: 'pinned.person', value: 3 },
        ],
      },
      grants: { tier: 'household', ceremony_sid: 'graduation.household' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-org',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.tradition', value: 2 },
          { op: 'gte', key: 'world_drafts.household', value: 1 },
        ],
      },
      grants: { tier: 'org', ceremony_sid: 'graduation.org' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-town',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.charter', value: 1 },
          { op: 'gte', key: 'world_drafts.org', value: 2 },
        ],
      },
      grants: { tier: 'town', ceremony_sid: 'graduation.town' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-city',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.festival', value: 1 },
          { op: 'gte', key: 'pinned.landmark', value: 1 },
          { op: 'gte', key: 'world_drafts.town', value: 2 },
        ],
      },
      grants: { tier: 'city', ceremony_sid: 'graduation.city' },
    },
    {
      schema_version: 'milestone/v0',
      id: 'unlock-region',
      predicate: {
        op: 'and',
        operands: [
          { op: 'gte', key: 'pinned.institution', value: 1 },
          { op: 'gte', key: 'pinned.monument', value: 1 },
          { op: 'gte', key: 'world_drafts.city', value: 2 },
        ],
      },
      grants: { tier: 'region', ceremony_sid: 'graduation.region' },
    },
  ];
  // Minimal but schema-valid: one entry per kind row id, so the catalog
  // lint passes and the ref-integrity violation is the one that throws.
  const catalogEntry = (kind: string) => ({
    name: `Table ${kind}`,
    one_liner: `${kind} one-liner`,
    subject: `a ${kind} subject`,
    detail: `${kind} detail`,
    tags: [kind],
  });
  const catalogs = ['change', 'outcome', 'person', 'place', 'thing'].map((kind) => ({
    kind,
    entries: [catalogEntry(kind)],
  }));
  return {
    getProgressionBundle: () => ({
      tiers: { tiers },
      kinds: { kinds },
      catalogs: { catalogs },
      milestones: { milestones },
      policies: { policies: [] },
      endowment: { endowment: [] },
      visitors: { visitors: [] },
      compendium: { compendium: [] },
    }),
  };
});

describe('loadProgression (lint throw)', () => {
  it('throws when the lint rejects the bundle', () => {
    expect(() => loadProgression()).toThrow('lint rejected');
  });
});
