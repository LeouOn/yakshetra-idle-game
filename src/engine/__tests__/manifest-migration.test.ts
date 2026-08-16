import { describe, expect, it } from 'vitest';

import { parseManifest } from '@/engine/manifest-migration';
import { MANIFEST_SCHEMA_VERSION } from '@/engine/manifest';

const V0_MANIFEST = {
  schema_version: 'manifest/v0',
  id: 'm-0-1',
  rng_seed: '42',
  brief: null,
  residue_window_id: 'w-1-3-3',
  kind: 'person',
  name: 'The night clerk',
  one_liner: 'Remembers what you owe before you do.',
  subject: 'a keeper of small debts',
  detail: 'The ledger stays open at strange hours.',
  tags: ['clerk', 'debts'],
  rarity: 'common',
  fill_status: 'table',
  quality_tier: 0,
  provenance: { source: 'table', revision: 'table/v0' },
} as const;

describe('parseManifest', () => {
  it('passes a v1 manifest through unchanged', () => {
    const v1 = { ...V0_MANIFEST, schema_version: 'manifest/v1', scale: 'person' };
    const parsed = parseManifest(v1);
    expect(parsed.schema_version).toBe('manifest/v1');
    expect(parsed.scale).toBe('person');
  });

  it('migrates a v0 manifest to v1 with scale person', () => {
    const parsed = parseManifest(V0_MANIFEST);
    expect(parsed.schema_version).toBe(MANIFEST_SCHEMA_VERSION);
    expect(parsed.scale).toBe('person');
    expect(parsed.name).toBe('The night clerk');
  });

  it('keeps v0 optional about fields through migration', () => {
    const parsed = parseManifest({ ...V0_MANIFEST, about_id: 'm-x', about_name: 'X' });
    expect(parsed.about_id).toBe('m-x');
    expect(parsed.about_name).toBe('X');
  });

  it('throws on garbage', () => {
    expect(() => parseManifest({ schema_version: 'manifest/v9' })).toThrow();
    expect(() => parseManifest(null)).toThrow();
  });
});

describe('migrateManifestV0', () => {
  it('is additive: only version and scale change', () => {
    const migrated = parseManifest(V0_MANIFEST);
    expect(migrated.kind).toBe('person');
    expect(migrated.rarity).toBe('common');
    expect(migrated.tags).toEqual(['clerk', 'debts']);
  });
});
