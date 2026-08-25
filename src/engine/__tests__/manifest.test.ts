import { describe, expect, it } from 'vitest';

import { ManifestSchema, SCALE_VALUES, createRng, tableFillManifest } from '../';
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
    expect(a.detail).toContain('a slower morning');
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
