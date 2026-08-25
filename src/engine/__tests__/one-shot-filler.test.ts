import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import {
  compileRequestFromBay,
  fillManifestSafe,
  oneShotFiller,
  tableFiller,
} from '../fill-adapter';
import { TABLE_FILL_REVISION, type Manifest } from '../manifest';

const BAY = {
  residue_window_id: 'w-1-2-2',
  residue: [
    { tick: 1, type: 'practice_tick' as const, ids: ['p:test'], numbers: { progress: 1 } },
    { tick: 2, type: 'practice_tick' as const, ids: ['p:test'], numbers: { progress: 1 } },
  ],
  brief: null,
  rng_seed: 'seed-1',
};

function request() {
  return compileRequestFromBay(BAY, 0, 0);
}

// A minimal valid manifest/v1 the "model" could have returned.
function modelPayload(): Record<string, unknown> {
  return {
    schema_version: 'manifest/v1',
    id: 'm-0-seed-1',
    rng_seed: 'seed-1',
    brief: null,
    residue_window_id: 'w-1-2-2',
    kind: 'thing',
    scale: 'person',
    name: 'A model-named card',
    one_liner: 'Written outside the tables.',
    subject: 'a model subject',
    detail: 'The model wrote this sentence.',
    tags: ['model'],
    rarity: 'common',
    fill_status: 'model',
    quality_tier: 0,
    provenance: { source: 'model', revision: 'zai/glm-4.6' },
  };
}

describe('oneShotFiller (SPEC 16.2)', () => {
  it('returns the parsed model payload when it satisfies the schema', () => {
    const filler = oneShotFiller(modelPayload());
    const manifest = filler.fill(request(), createRng(1n));
    expect(manifest.name).toBe('A model-named card');
    expect(manifest.fill_status).toBe('model');
    expect(manifest.provenance.source).toBe('model');
  });

  it('carries the model/one-shot filler id', () => {
    expect(oneShotFiller(modelPayload()).id).toBe('model/one-shot');
  });

  it('throws on garbage so fillManifestSafe falls back to a table card', () => {
    const safe = fillManifestSafe(request(), createRng(2n), oneShotFiller('not json'));
    expect(safe.fill_status).toBe('table');
    expect(safe.provenance).toEqual({ source: 'table', revision: TABLE_FILL_REVISION });
  });

  it('falls back to tables when the model omits a required field', () => {
    const broken = modelPayload();
    delete broken.name;
    const safe = fillManifestSafe(request(), createRng(3n), oneShotFiller(broken));
    expect(safe.fill_status).toBe('table');
  });

  it('accepts a v0 payload through the migration path', () => {
    const v0 = { ...modelPayload(), schema_version: 'manifest/v0' } as Record<string, unknown>;
    delete v0.scale;
    const manifest: Manifest = oneShotFiller(v0).fill(request(), createRng(4n));
    expect(manifest.scale).toBe('person');
  });

  it('table filler stays the default ingest (regression pin)', () => {
    const safe = fillManifestSafe(request(), createRng(5n), tableFiller());
    expect(safe.fill_status).toBe('table');
  });
});
