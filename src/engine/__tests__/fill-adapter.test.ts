import { describe, expect, it } from 'vitest';

import {
  MANIFEST_COMPILE_VERSION,
  MIN_RESIDUE_TO_DEVELOP,
  compileRequestFromBay,
  createRng,
  createStudioState,
  fillManifestSafe,
  harvestWithFiller,
  queueDevelop,
  recordStudioResidues,
  tableFiller,
  tickStudio,
  type Manifest,
  type ManifestFiller,
} from '../';
import type { ResidueEvent } from '../residue';

function events(n: number): ResidueEvent[] {
  const out: ResidueEvent[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      tick: i + 1,
      type: 'practice_tick',
      ids: ['practice.test'],
      numbers: { progress: 2 },
    });
  }
  return out;
}

function readyStudio() {
  let studio = recordStudioResidues(createStudioState(), events(MIN_RESIDUE_TO_DEVELOP));
  studio = queueDevelop(studio, 'a kept promise', createRng(8n));
  return tickStudio(studio, studio.bay?.cook_ticks_total ?? 0);
}

const BROKEN: ManifestFiller = {
  id: 'broken',
  fill() {
    return { nope: true } as unknown as Manifest;
  },
};

describe('fill adapter', () => {
  it('builds a compile request from a ready bay', () => {
    const studio = readyStudio();
    const bay = studio.bay;
    if (bay === null) {
      throw new Error('expected bay');
    }
    const req = compileRequestFromBay(bay, 0, 0);
    expect(req.schema_version).toBe(MANIFEST_COMPILE_VERSION);
    expect(req.brief).toBe('a kept promise');
    expect(req.residue).toHaveLength(MIN_RESIDUE_TO_DEVELOP);
    expect(req.summary.count).toBe(MIN_RESIDUE_TO_DEVELOP);
  });

  it('falls back to tables when a filler returns garbage', () => {
    const studio = readyStudio();
    const bay = studio.bay;
    if (bay === null) {
      throw new Error('expected bay');
    }
    const req = compileRequestFromBay(bay, 0, 0);
    const manifest = fillManifestSafe(req, createRng(4n), BROKEN);
    expect(manifest.schema_version).toBe('manifest/v1');
    expect(manifest.fill_status).toBe('table');
    expect(manifest.brief).toBe('a kept promise');
  });

  it('harvests through a custom filler when the payload is valid', () => {
    const studio = readyStudio();
    const filler: ManifestFiller = {
      id: 'stub',
      fill(request) {
        return {
          ...tableFiller().fill(request, createRng(1n)),
          name: 'Stubbed token',
          fill_status: 'model',
          provenance: { source: 'model', revision: 'stub/v0' },
        };
      },
    };
    const result = harvestWithFiller(studio, createRng(9n), filler);
    expect(result?.manifest.name).toBe('Stubbed token');
    expect(result?.manifest.fill_status).toBe('model');
    expect(result?.studio.archive).toHaveLength(1);
  });

  it('compile request carries the person scale by default', () => {
    const studio = readyStudio();
    const bay = studio.bay;
    if (bay === null) {
      throw new Error('expected bay');
    }
    const req = compileRequestFromBay(bay, 0, 0);
    expect(req.scale).toBe('person');
  });

  it('migrates a v0-shaped filler payload to v1', () => {
    const studio = readyStudio();
    const bay = studio.bay;
    if (bay === null) {
      throw new Error('expected bay');
    }
    const v0Card = {
      schema_version: 'manifest/v0',
      id: 'm-legacy',
      rng_seed: '7',
      brief: null,
      residue_window_id: 'w-1-3-3',
      kind: 'thing',
      name: 'Sealed token',
      one_liner: 'A small mark that still holds a decision.',
      subject: 'a kept token',
      detail: 'Work pressed a choice into something you can hold.',
      tags: ['token'],
      rarity: 'common',
      fill_status: 'model',
      quality_tier: 0,
      provenance: { source: 'model', revision: 'spacexai/test' },
    } as unknown as Manifest;
    const legacyFiller: ManifestFiller = {
      id: 'legacy/v0',
      fill: () => v0Card,
    };
    const req = compileRequestFromBay(bay, 0, 0);
    const manifest = fillManifestSafe(req, createRng(4n), legacyFiller);
    expect(manifest.schema_version).toBe('manifest/v1');
    expect(manifest.scale).toBe('person');
    expect(manifest.name).toBe('Sealed token');
  });
});
