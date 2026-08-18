import { describe, expect, it } from 'vitest';

import { DEFAULT_KIND_RULES, pickKindFromRegistry } from '@/engine/kind-registry';
import type { ResidueEvent, ResidueEventType } from '@/engine/residue';
import { summarizeResidue } from '@/engine/residue';
import { validateSchedule } from '@/engine/schedule';

import { loadProgression } from '@/content/progression/loader';
import { loadEraPack } from '@/content/loader';

describe('loadProgression', () => {
  const registries = loadProgression();

  it('loads the six tiers in ladder order', () => {
    expect(registries.tiers.map((t) => t.id)).toEqual([
      'person',
      'household',
      'org',
      'town',
      'city',
      'region',
    ]);
    expect(registries.tiers.map((t) => t.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('person tier is the only one without an unlock milestone', () => {
    const person = registries.tiers.find((t) => t.id === 'person');
    expect(person?.unlock_milestone).toBeNull();
  });

  it('ships kind rules whose person-tier prefix matches the engine defaults', () => {
    // Task 4 appends household-scale rows after the eight person rows; the
    // person-tier prefix stays byte-identical so the table fallback keeps
    // picking the same kind for any residue summary the engine sees at
    // compile time.
    expect(registries.kindRules.slice(0, DEFAULT_KIND_RULES.length)).toEqual(DEFAULT_KIND_RULES);
  });

  it('pins the full kind row order: 8 person, 5 household, 5 org, 5 town', () => {
    // Order is load-bearing (first match wins at compile). The pin includes
    // the TOTAL fallback rows so no scale can ship a partial rule list.
    expect(registries.kindRows.map((r) => r.id)).toEqual([
      // person (8) — mirrors DEFAULT_KIND_RULES
      'change',
      'outcome',
      'person',
      'place',
      'thing',
      'change',
      'outcome',
      'thing',
      // household (5)
      'tradition',
      'heirloom',
      'tradition',
      'tradition',
      'tradition',
      // org (5)
      'charter',
      'ware',
      'charter',
      'ware',
      'ware',
      // town (5)
      'festival',
      'landmark',
      'festival',
      'landmark',
      'landmark',
    ]);
    expect(registries.kindRows).toHaveLength(23);
  });

  it('ships one unlock milestone per non-person tier', () => {
    expect(registries.milestones.map((m) => m.id)).toEqual([
      'unlock-household',
      'unlock-org',
      'unlock-town',
      'unlock-city',
      'unlock-region',
    ]);
  });

  it('gates the household on three archived persons plus one world draft', () => {
    // The gate must be reachable BEFORE any roster exists (members are seeded
    // by graduation itself, and the person bench holds one pin at most), so
    // the operand counts archived person cards, not pins or focus_ids.
    const gate = registries.milestones.find((m) => m.id === 'unlock-household');
    expect(gate?.predicate).toEqual({
      op: 'and',
      operands: [
        { op: 'gte', key: 'world_drafts.total', value: 1 },
        { op: 'gte', key: 'archived.person', value: 3 },
      ],
    });
  });

  it('gates the househeld compendium row on one archived tradition', () => {
    // Tradition/heirloom ship pinnable: false, so a pinned.tradition operand
    // can never flip through the UI; the live path counts archived tradition
    // cards (household harvests produce them).
    const househeld = registries.compendium.find((entry) => entry.id === 'compendium/househeld');
    expect(househeld?.predicate).toEqual({ op: 'gte', key: 'archived.tradition', value: 1 });
  });

  it('gates org through region on archived cards, never pins', () => {
    // Operand policy (Phase 3 Binding Decision 1): every kind past person
    // ships pinnable: false, so pinned.<kind> gates would be unreachable.
    // archived.<kind> counts archive cards and is provably reachable at
    // every scale.
    const expected: Record<string, unknown> = {
      'unlock-org': {
        op: 'and',
        operands: [
          { op: 'gte', key: 'archived.tradition', value: 2 },
          { op: 'gte', key: 'world_drafts.household', value: 1 },
        ],
      },
      'unlock-town': {
        op: 'and',
        operands: [
          { op: 'gte', key: 'archived.charter', value: 1 },
          { op: 'gte', key: 'world_drafts.org', value: 2 },
        ],
      },
      'unlock-city': {
        op: 'and',
        operands: [
          { op: 'gte', key: 'archived.festival', value: 1 },
          { op: 'gte', key: 'archived.landmark', value: 1 },
          { op: 'gte', key: 'world_drafts.town', value: 2 },
        ],
      },
      'unlock-region': {
        op: 'and',
        operands: [
          { op: 'gte', key: 'archived.institution', value: 1 },
          { op: 'gte', key: 'archived.monument', value: 1 },
          { op: 'gte', key: 'world_drafts.city', value: 2 },
        ],
      },
    };
    for (const [id, predicate] of Object.entries(expected)) {
      expect(registries.milestones.find((m) => m.id === id)?.predicate).toEqual(predicate);
    }
  });

  it('keeps every milestone operand on the archived/world_drafts vocabulary', () => {
    const keys: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node === 'object' && node !== null) {
        const op = node as { op?: unknown; key?: unknown; operands?: unknown; operand?: unknown };
        if (typeof op.key === 'string') {
          keys.push(op.key);
        }
        walk(op.operands ?? op.operand ?? []);
      }
    };
    for (const milestone of registries.milestones) {
      walk(milestone.predicate);
    }
    expect(keys.length).toBeGreaterThan(0);
    expect(
      keys.every((key) => key.startsWith('archived.') || key.startsWith('world_drafts.')),
    ).toBe(true);
  });

  it('exposes visitorTables for the seeded sample namespace (Phase 4 Task 2)', () => {
    // The namespace + entries live in catalogs.json5 under `visitor_tables`.
    // No shipped visitor carries `table_ref` yet, but the data shape must
    // survive the loader so the swap unit test can drive it.
    const tables = registries.visitorTables;
    expect(tables['visitor-table/sample-arrival']).toBeDefined();
    expect(tables['visitor-table/sample-arrival']?.length).toBeGreaterThan(0);
    for (const entry of tables['visitor-table/sample-arrival'] ?? []) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.one_liner.length).toBeGreaterThan(0);
      expect(entry.subject.length).toBeGreaterThan(0);
      expect(entry.detail.length).toBeGreaterThan(0);
      expect(entry.tags.length).toBeGreaterThan(0);
    }
  });

  it('ships empty extension files as valid empty registries', () => {
    // Endowment ships four base rows since Phase 2 Task 1 (the rest still
    // empty). The R-PROG-MODIFIER-KEYS lint guarantees every key here is
    // a whitelisted bench modifier — exercised by progression/lint.test.ts.
    expect(registries.endowment.map((t) => t.id)).toEqual([
      'endow/person/swift-cook',
      'endow/person/deep-window',
      'endow/household/hearth-surplus',
      'endow/household/long-absence',
    ]);
    expect(registries.visitors.map((row) => row.id)).toEqual([
      'visitor/gate-yaksa',
      'visitor/traveling-teacher',
      'visitor/festival-day',
      'visitor/sample-arrival',
    ]);
    expect(registries.compendium.map((entry) => entry.id)).toEqual([
      'compendium/first-harvest',
      'compendium/first-world',
      'compendium/three-pins',
      'compendium/five-harvests',
      'compendium/househeld',
    ]);
    // `policies` carries `policy:household-base` since Task 4; covered by
    // the household-scale suite below.
  });
});

describe('loadProgression household scale', () => {
  const registries = loadProgression();

  it('ships tradition and heirloom rows at household scale with pinnable false', () => {
    const tradition = registries.kindRows.find((r) => r.id === 'tradition');
    const heirloom = registries.kindRows.find((r) => r.id === 'heirloom');
    expect(tradition?.scale).toBe('household');
    expect(tradition?.pinnable).toBe(false);
    expect(heirloom?.scale).toBe('household');
    expect(heirloom?.pinnable).toBe(false);
  });

  it('appends household rows after the eight person rows', () => {
    const ids = registries.kindRows.map((r) => r.id);
    const traditionIdx = ids.indexOf('tradition');
    const heirloomIdx = ids.indexOf('heirloom');
    expect(traditionIdx).toBeGreaterThanOrEqual(8);
    expect(heirloomIdx).toBeGreaterThanOrEqual(8);
    expect(traditionIdx).toBeLessThan(heirloomIdx);
  });

  it('ships four or more catalog entries for every kind past person', () => {
    for (const kind of ['tradition', 'heirloom', 'charter', 'ware', 'festival', 'landmark']) {
      expect((registries.catalogs[kind] ?? []).length, `kind "${kind}"`).toBeGreaterThanOrEqual(4);
    }
  });

  it('parses policy:household-base with three real tang practice ids', () => {
    const policy = registries.policies.find((p) => p.id === 'policy:household-base');
    expect(policy).toBeDefined();
    expect(policy?.practices.length).toBe(3);
    expect(policy?.practices).toContain('practice:tang/alms-round');
    expect(policy?.practices).toContain('practice:tang/courtyard-beings');
    expect(policy?.practices).toContain('practice:tang/extra-bowl');
    expect(policy?.schedule_ref).toBe('schedule:household-morning');
  });

  it('parses policy:org-base with three real tang practice ids distinct from the household set', () => {
    const org = registries.policies.find((p) => p.id === 'policy:org-base');
    expect(org).toBeDefined();
    expect(org?.practices.length).toBe(3);
    expect(org?.practices).toContain('practice:tang/sutra-copying');
    expect(org?.practices).toContain('practice:tang/breath-sitting');
    expect(org?.practices).toContain('practice:tang/evening-visit');
    expect(org?.schedule_ref).toBe('schedule:workshop-day');
  });

  it('ships exactly the two seated policies in file order', () => {
    expect(registries.policies.map((p) => p.id)).toEqual([
      'policy:household-base',
      'policy:org-base',
    ]);
  });

  it('resolves both policy schedule_refs in the tang pack', () => {
    const pack = loadEraPack('tang-china');
    const scheduleIds = pack.schedules.map((s) => s.id);
    expect(scheduleIds).toContain('schedule:household-morning');
    expect(scheduleIds).toContain('schedule:workshop-day');
  });

  it('covers [0, 24) with no gaps on the org workshop-day schedule', () => {
    const pack = loadEraPack('tang-china');
    const schedule = pack.schedules.find((s) => s.id === 'schedule:workshop-day');
    if (schedule === undefined) {
      throw new Error('tang pack is missing schedule:workshop-day');
    }
    const validation = validateSchedule(schedule);
    expect(validation.valid, validation.errors.join('; ')).toBe(true);
  });

  it('loads the roles file with three roles and three names at household scale', () => {
    expect(registries.roles.household.roles).toEqual(['elder', 'cook', 'runner']);
    expect(registries.roles.household.names).toEqual(['Second Aunt', 'Old Wen', 'Little Shu']);
  });

  it('loads the seated policy on the household roles block', () => {
    expect(registries.roles.household.policy).toBe('policy:household-base');
  });

  it('loads the org roles block with its own seated policy and real content', () => {
    expect(registries.roles.org).toBeDefined();
    expect(registries.roles.org?.policy).toBe('policy:org-base');
    expect(registries.roles.org?.roles).toEqual(['abbot', 'kilnmaster', 'clerk']);
    expect(registries.roles.org?.names).toEqual(['Master Yun', 'Old Shi', 'Young Bao']);
  });

  it('loads the town roles block as real unit content without a policy', () => {
    // Town is a unit tier: its roster rows never run autonomously, so the
    // seated policy field stays absent by design (schema allows omission).
    expect(registries.roles.town).toBeDefined();
    expect(registries.roles.town?.policy).toBeUndefined();
    expect(registries.roles.town?.roles).toEqual(['headman', 'market-warden', 'ferry-keeper']);
    expect(registries.roles.town?.names).toEqual([
      'House of Yun',
      'the Kilnhouse',
      'the River Office',
    ]);
  });

  it('household rule list is total across every residue window shape', () => {
    const householdRules = registries.kindRows.flatMap((row, index) => {
      const rule = registries.kindRules[index];
      if (rule === undefined || row.scale !== 'household') {
        return [];
      }
      return [rule];
    });

    const eventTypes: readonly ResidueEventType[] = [
      'practice_tick',
      'practice_level',
      'lens_chosen',
      'event_resolved',
      'resource_edge',
      'life_ended',
    ];

    for (const type of eventTypes) {
      const event: ResidueEvent = {
        tick: 0,
        type,
        ids: ['practice:tang/alms-round'],
        numbers: {},
      };
      const summary = summarizeResidue([event]);
      const picked = pickKindFromRegistry(summary, householdRules);
      expect(['tradition', 'heirloom']).toContain(picked);
    }

    const emptySummary = summarizeResidue([]);
    const emptyPicked = pickKindFromRegistry(emptySummary, householdRules);
    expect(['tradition', 'heirloom']).toContain(emptyPicked);
  });
});

describe('loadProgression org and town scales', () => {
  const registries = loadProgression();

  const rulesAtScale = (scale: 'org' | 'town') =>
    registries.kindRows.flatMap((row, index) => {
      const rule = registries.kindRules[index];
      if (rule === undefined || row.scale !== scale) {
        return [];
      }
      return [rule];
    });

  it('ships charter and ware rows at org scale with pinnable false', () => {
    const charter = registries.kindRows.find((r) => r.id === 'charter');
    const ware = registries.kindRows.find((r) => r.id === 'ware');
    expect(charter?.scale).toBe('org');
    expect(charter?.pinnable).toBe(false);
    expect(ware?.scale).toBe('org');
    expect(ware?.pinnable).toBe(false);
  });

  it('ships festival and landmark rows at town scale with pinnable false', () => {
    const festival = registries.kindRows.find((r) => r.id === 'festival');
    const landmark = registries.kindRows.find((r) => r.id === 'landmark');
    expect(festival?.scale).toBe('town');
    expect(festival?.pinnable).toBe(false);
    expect(landmark?.scale).toBe('town');
    expect(landmark?.pinnable).toBe(false);
  });

  it('appends org rows after the household rows and town rows after org', () => {
    const scales = registries.kindRows.map((r) => r.scale);
    const firstOrg = scales.indexOf('org');
    const firstTown = scales.indexOf('town');
    const lastHousehold = scales.lastIndexOf('household');
    const lastOrg = scales.lastIndexOf('org');
    expect(firstOrg).toBeGreaterThan(lastHousehold);
    expect(firstTown).toBeGreaterThan(lastOrg);
    expect(scales.filter((s) => s === 'org')).toHaveLength(5);
    expect(scales.filter((s) => s === 'town')).toHaveLength(5);
  });

  it('org rule list is total across every residue window shape', () => {
    const orgRules = rulesAtScale('org');
    const eventTypes: readonly ResidueEventType[] = [
      'practice_tick',
      'practice_level',
      'lens_chosen',
      'event_resolved',
      'resource_edge',
      'life_ended',
    ];

    for (const type of eventTypes) {
      const event: ResidueEvent = {
        tick: 0,
        type,
        ids: ['practice:tang/sutra-copying'],
        numbers: {},
      };
      const summary = summarizeResidue([event]);
      const picked = pickKindFromRegistry(summary, orgRules);
      expect(['charter', 'ware']).toContain(picked);
    }

    const emptyPicked = pickKindFromRegistry(summarizeResidue([]), orgRules);
    expect(['charter', 'ware']).toContain(emptyPicked);
  });

  it('town rule list is total across every residue window shape', () => {
    const townRules = rulesAtScale('town');
    const eventTypes: readonly ResidueEventType[] = [
      'practice_tick',
      'practice_level',
      'lens_chosen',
      'event_resolved',
      'resource_edge',
      'life_ended',
    ];

    for (const type of eventTypes) {
      const event: ResidueEvent = {
        tick: 0,
        type,
        ids: ['practice:tang/sutra-copying'],
        numbers: {},
      };
      const summary = summarizeResidue([event]);
      const picked = pickKindFromRegistry(summary, townRules);
      expect(['festival', 'landmark']).toContain(picked);
    }

    const emptyPicked = pickKindFromRegistry(summarizeResidue([]), townRules);
    expect(['festival', 'landmark']).toContain(emptyPicked);
  });
});
