import { describe, expect, it } from 'vitest';

import { DEFAULT_KIND_RULES, pickKindFromRegistry } from '@/engine/kind-registry';
import type { ResidueEvent, ResidueEventType } from '@/engine/residue';
import { summarizeResidue } from '@/engine/residue';

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

  it('ships four or more catalog entries for tradition and heirloom', () => {
    expect((registries.catalogs['tradition'] ?? []).length).toBeGreaterThanOrEqual(4);
    expect((registries.catalogs['heirloom'] ?? []).length).toBeGreaterThanOrEqual(4);
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

  it('resolves the policy schedule_ref in the tang pack', () => {
    const pack = loadEraPack('tang-china');
    const scheduleIds = pack.schedules.map((s) => s.id);
    expect(scheduleIds).toContain('schedule:household-morning');
  });

  it('loads the roles file with three roles and three names at household scale', () => {
    expect(registries.roles.household.roles).toEqual(['elder', 'cook', 'runner']);
    expect(registries.roles.household.names).toEqual(['Second Aunt', 'Old Wen', 'Little Shu']);
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
