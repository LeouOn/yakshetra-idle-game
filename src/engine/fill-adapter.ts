// Manifest compiler slot — table is the default filler; a later model adapter
// writes the same slots. The engine never fetches. Invalid filler output
// falls back to table-fill.

import type { ManifestFocus } from './focus';
import type { LifeContext } from './life-context';
import { tableFillManifest, type Manifest, type ManifestScale } from './manifest';
import { parseManifest } from './manifest-migration';
import {
  residueWindowId,
  summarizeResidue,
  type ResidueEvent,
  type ResidueSummary,
} from './residue';
import type { Rng } from './rng';
import type { CatalogEntry, CatalogMap } from './table-catalog';

/** The bay fields the compiler needs. Avoids an operations.ts import cycle. */
export interface CompileBayInput {
  readonly residue_window_id: string;
  readonly residue: readonly ResidueEvent[];
  readonly brief: string | null;
  readonly rng_seed: string;
  readonly focus?: ManifestFocus | null;
}

export const MANIFEST_COMPILE_VERSION = 'manifest_compile/v1' as const;

/** Payload a filler (table or model) must satisfy. */
export interface ManifestCompileRequest {
  readonly schema_version: typeof MANIFEST_COMPILE_VERSION;
  readonly id: string;
  readonly rng_seed: string;
  readonly brief: string | null;
  readonly residue_window_id: string;
  readonly residue: readonly ResidueEvent[];
  readonly summary: ResidueSummary;
  readonly quality_tier: number;
  readonly scale: ManifestScale;
  readonly focus: ManifestFocus | null;
  readonly life_context: LifeContext | null;
}

export interface ManifestFiller {
  readonly id: string;
  fill(request: ManifestCompileRequest, rng: Rng): Manifest;
}

export function compileRequestFromBay(
  bay: CompileBayInput,
  qualityTier: number,
  harvestCount: number,
  lifeContext: LifeContext | null = null,
  scale: ManifestScale = 'person',
): ManifestCompileRequest {
  return {
    schema_version: MANIFEST_COMPILE_VERSION,
    id: `m-${harvestCount}-${bay.rng_seed}`,
    rng_seed: bay.rng_seed,
    brief: bay.brief,
    residue_window_id: bay.residue_window_id || residueWindowId(bay.residue),
    residue: bay.residue,
    summary: summarizeResidue(bay.residue),
    quality_tier: qualityTier,
    scale,
    focus: bay.focus ?? null,
    life_context: lifeContext,
  };
}

export function tableFiller(): ManifestFiller {
  return {
    id: 'table/v0',
    fill(request, rng) {
      return tableFillManifest(
        request.residue,
        request.brief,
        request.quality_tier,
        rng,
        request.rng_seed,
        request.id,
        request.focus,
        request.life_context,
        request.scale,
      );
    },
  };
}

/** Same as tableFiller, but every kind in the catalog returns the supplied
 * entries. Used by the visitor table_ref swap (Phase 4 Task 2). The filler
 * id differs so the harvested manifest's provenance records the swap. */
export function tableFillerWithCatalog(entries: readonly CatalogEntry[]): ManifestFiller {
  const override: CatalogMap = new Proxy(
    {},
    {
      get: (_target, _kind) => entries,
    },
  ) as CatalogMap;
  return {
    id: 'table/visitor-table',
    fill(request, rng) {
      return tableFillManifest(
        request.residue,
        request.brief,
        request.quality_tier,
        rng,
        request.rng_seed,
        request.id,
        request.focus,
        request.life_context,
        request.scale,
        undefined,
        override,
      );
    },
  };
}

/**
 * Run `filler`, validate the Manifest, and fall back to tables on any throw
 * or schema miss. Table failure is not swallowed.
 */
export function fillManifestSafe(
  request: ManifestCompileRequest,
  rng: Rng,
  filler: ManifestFiller,
): Manifest {
  try {
    return parseManifest(filler.fill(request, rng));
  } catch {
    return tableFillManifest(
      request.residue,
      request.brief,
      request.quality_tier,
      rng,
      request.rng_seed,
      request.id,
      request.focus,
      request.life_context,
      request.scale,
    );
  }
}
