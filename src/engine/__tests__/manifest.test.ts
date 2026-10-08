import { describe, expect, it } from 'vitest';

import { ManifestSchema, SCALE_VALUES, createRng, summarizeResidue, tableFillManifest } from '../';
import type { ResidueEvent } from '../residue';

const WINDOW: readonly ResidueEvent[] = [
  { tick: 4, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 8 } },
  { tick: 8, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 8 } },
  { tick: 8, type: 'practice_level', ids: ['practice.test'], numbers: {} },
];

describe('tableFillManifest', () => {
  it('parses against ManifestSchema and prefers change when a level-up is present', () => {
    const manifest = tableFillManifest(WINDOW, null, 0, createRng(7n), '7', 'm-0-7');
    expect(ManifestSchema.parse(manifest)).toEqual(manifest);
    expect(manifest.kind).toBe('change');
    expect(manifest.fill_status).toBe('table');
    expect(manifest.schema_version).toBe('manifest/v1');
    expect(manifest.scale).toBe('person');
  });

  it('is deterministic for the same window, brief, tier, and seed', () => {
    const a = tableFillManifest(WINDOW, 'a slower morning', 1, createRng(99n), '99', 'm-1');
    const b = tableFillManifest(WINDOW, 'a slower morning', 1, createRng(99n), '99', 'm-1');
    expect(a).toEqual(b);
    expect(a.tags).toContain('briefed');
    expect(a.tags).toContain('deepened');
    // The brief steers which phrasing is used; it is not echoed as a footer.
    expect(a.detail).not.toMatch(/you asked for/i);
  });

  it('compiles event-heavy windows as outcomes', () => {
    const events: ResidueEvent[] = [
      { tick: 1, type: 'event_resolved', ids: ['c1'], numbers: {} },
      { tick: 2, type: 'event_resolved', ids: ['c2'], numbers: {} },
      { tick: 3, type: 'practice_tick', ids: ['p'], numbers: { progress: 1 } },
    ];
    const manifest = tableFillManifest(events, null, 0, createRng(3n), '3', 'm-out');
    expect(manifest.kind).toBe('outcome');
  });

  it('compiles a social window as a person and still parses ManifestSchema', () => {
    const social: readonly ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    ];
    const manifest = tableFillManifest(social, null, 0, createRng(11n), '11', 'm-person');
    expect(ManifestSchema.parse(manifest)).toEqual(manifest);
    expect(manifest.kind).toBe('person');
    expect(manifest.fill_status).toBe('table');
  });

  it('compiles two practices as a place', () => {
    const spatial: readonly ResidueEvent[] = [
      { tick: 1, type: 'practice_tick', ids: ['practice.alms'], numbers: { progress: 2 } },
      { tick: 2, type: 'practice_tick', ids: ['practice.copy'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.alms'], numbers: { progress: 2 } },
    ];
    const manifest = tableFillManifest(spatial, null, 0, createRng(5n), '5', 'm-place');
    expect(manifest.kind).toBe('place');
    expect(ManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it('does not compile a single-id lens window as a person', () => {
    const solitary: readonly ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['lens.test'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['lens.test'], numbers: { progress: 2 } },
    ];
    const manifest = tableFillManifest(solitary, null, 0, createRng(11n), '11', 'm-thing');
    expect(manifest.kind).not.toBe('person');
  });

  it('is deterministic for a person window with a brief and quality tier', () => {
    const social: readonly ResidueEvent[] = [
      { tick: 1, type: 'lens_chosen', ids: ['lens.test'], numbers: {} },
      { tick: 2, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
      { tick: 3, type: 'practice_tick', ids: ['practice.test'], numbers: { progress: 2 } },
    ];
    const a = tableFillManifest(social, 'the night clerk', 1, createRng(13n), '13', 'm-p1');
    const b = tableFillManifest(social, 'the night clerk', 1, createRng(13n), '13', 'm-p1');
    expect(a.kind).toBe('person');
    expect(a).toEqual(b);
    expect(a.tags).toContain('briefed');
    expect(a.tags).toContain('deepened');
  });

  it('tags and flavors manifest with dominant activity from lifeContext', () => {
    const context = {
      schema_version: 'life_context/v0' as const,
      life_id: 'l-1',
      age: 30,
      turn: 10,
      alive: true,
      lens: 'patient_courage',
      setting: {
        era_id: 'tang-china',
        role_id: 'merchant',
        year: 742,
        month: 4,
        day: 12,
        hour: 9,
        calendar_label: 'Tianbao 1',
      },
      ties: [],
      strongest_tie: null,
      flags: [],
      residue_summary: summarizeResidue(WINDOW),
      activity: {
        work: 25,
        generosity: 0,
        beings: 0,
        learning: 0,
        meditation: 4,
        other: 0,
      },
      world_name: null,
      world_line: null,
    };
    const manifest = tableFillManifest(WINDOW, null, 0, createRng(7n), '7', 'm-act', null, context);
    expect(manifest.tags).toContain('activity:work');
    // Activity totals stay in the tags. They left the card text: the lead read
    // thirty cards and heard the same activity sentence on nearly all of them.
    expect(manifest.detail).not.toContain('physical craft and patient labor');
  });
});

describe('no build-internal era tokens reach a harvested card', () => {
  /**
   * Regression: the setting sentence used to interpolate `setting.era_id`
   * directly, so a harvested card ended "It is year 1 in studio-bench@0.1.0."
   * The bench stand-in life has no era pack, so it supplies no `era_name`, and
   * the sentence is omitted rather than filled with the token.
   */
  const benchLifeContext = {
    schema_version: 'life_context/v0' as const,
    life_id: 'studio-bench',
    age: 0,
    turn: 0,
    alive: true,
    lens: null,
    setting: {
      era_id: 'studio-bench@0.1.0',
      role_id: 'operator',
      year: 1,
      month: 1,
      day: 1,
      hour: 0,
      calendar_label: 'Year 1, month 1, day 1',
    },
    ties: [],
    strongest_tie: null,
    flags: [],
    residue_summary: summarizeResidue(WINDOW),
    activity: { work: 0, generosity: 0, beings: 0, learning: 0, meditation: 0, other: 0 },
    world_name: null,
    world_line: null,
  };

  it('omits the setting sentence when no era_name is supplied', () => {
    const manifest = tableFillManifest(
      WINDOW,
      null,
      0,
      createRng(11n),
      '11',
      'm-noera',
      null,
      benchLifeContext,
    );
    expect(manifest.detail).not.toContain('studio-bench@');
    expect(manifest.detail).not.toContain('@0.');
    expect(manifest.detail).not.toContain('It is year');
  });

  it('uses the player-facing era name when one is supplied', () => {
    const context = {
      ...benchLifeContext,
      setting: { ...benchLifeContext.setting, era_id: 'tang-china', era_name: 'Late Tang China' },
    };
    const manifest = tableFillManifest(
      WINDOW,
      null,
      0,
      createRng(11n),
      '11',
      'm-era',
      null,
      context,
    );
    // The era decides the row's vocabulary; the card no longer narrates it.
    expect(manifest.detail).not.toContain('It is year 1 in Late Tang China.');
    expect(manifest.detail).not.toContain('tang-china');
    expect(manifest.detail).not.toContain('tang-china');
  });

  it('never emits an era-id or semver pattern, across seeds and tiers', () => {
    const forbidden = /studio-bench@|@\d+\.\d+|bench@/;
    for (let seed = 1; seed <= 60; seed += 1) {
      for (const tier of [0, 1]) {
        const manifest = tableFillManifest(
          WINDOW,
          null,
          tier,
          createRng(BigInt(seed)),
          String(seed),
          `m-${seed}-${tier}`,
          null,
          benchLifeContext,
        );
        expect(manifest.detail).not.toMatch(forbidden);
        expect(manifest.one_liner).not.toMatch(forbidden);
        expect(manifest.subject).not.toMatch(forbidden);
      }
    }
  });
});

describe('SCALE_VALUES', () => {
  it('carries all eight scales in ladder order', () => {
    // Eight tiers since the phase-8 amendment (SPEC §1.1).
    expect(SCALE_VALUES).toEqual([
      'person',
      'household',
      'org',
      'town',
      'city',
      'region',
      'nation',
      'world',
    ]);
  });
});
