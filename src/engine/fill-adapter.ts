// Manifest compiler slot — table is the default filler; a later model adapter
// writes the same slots. The engine never fetches. Invalid filler output
// falls back to table-fill.

import type { ManifestFocus } from './focus';
import type { LifeContext } from './life-context';
import {
  tableFillManifest,
  type Manifest,
  type ManifestFire,
  type ManifestScale,
} from './manifest';
import { parseManifest } from './manifest-migration';
import { pickKindFromRegistry, type KindRule } from './kind-registry';
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
  /** Cook length chosen at the bench (lane B). Absent = short fire. */
  readonly fire?: CookFire;
  /** Sought-encounter figure (wave 3): the resolved recipe's figure id.
   * When set, the fill prefers that figure's catalog row. */
  readonly encounter_figure_id?: string | undefined;
}

/** Cook length for a develop job. `short` is the classic cook. `long` costs
 * more ticks (operations.ts) and instructs fillers to raise the rarity floor
 * and give a matching figure row first call — the filler contract for the
 * shared A+B seam (docs/design/00-direction.md). Alias of `ManifestFire`
 * (manifest.ts owns the union; both names are the same type). */
export type CookFire = ManifestFire;

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
  /** The kind the engine's registry rules pick for this window. Present only
   * when the caller supplied rules; the model prompt pins it. */
  readonly compiled_kind?: string;
  /** Cook length (lane B). Absent = short fire (classic behavior). A filler
   * that understands it treats `long` as: rarity floor uncommon, a catalog
   * figure row whose tag matches a window id gets first call. */
  readonly fire?: CookFire;
  /** Sought-encounter figure id (wave 3): the table fill prefers this
   * figure's row deterministically — the summons the player aimed. */
  readonly encounter_figure_id?: string | undefined;
  /**
   * `detail` strings already in the archive. Additive (lane A): the table
   * composer uses them to avoid writing a card the player already holds. A
   * caller that omits this simply loses the dedup guard, never a card.
   */
  readonly archive_details?: readonly string[];
  readonly archive_titles?: readonly string[];
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
  kindRules?: readonly KindRule[],
  archiveDetails: readonly string[] = [],
  archiveTitles: readonly string[] = [],
): ManifestCompileRequest {
  const summary = summarizeResidue(bay.residue);
  return {
    schema_version: MANIFEST_COMPILE_VERSION,
    id: `m-${harvestCount}-${bay.rng_seed}`,
    rng_seed: bay.rng_seed,
    brief: bay.brief,
    residue_window_id: bay.residue_window_id || residueWindowId(bay.residue),
    residue: bay.residue,
    summary,
    quality_tier: qualityTier,
    scale,
    focus: bay.focus ?? null,
    life_context: lifeContext,
    archive_details: archiveDetails,
    archive_titles: archiveTitles,
    ...(bay.fire === undefined ? {} : { fire: bay.fire }),
    ...(bay.encounter_figure_id === undefined
      ? {}
      : { encounter_figure_id: bay.encounter_figure_id }),
    ...(kindRules === undefined ? {} : { compiled_kind: pickKindFromRegistry(summary, kindRules) }),
  };
}

/**
 * How long the cook ran, read off the request. `fire` is lane B's field
 * (fill-adapter.ts); absent means a short cook, which is the classic
 * behavior, so an old caller or an old save needs no migration.
 */
export function fireOf(request: ManifestCompileRequest): CookFire {
  return request.fire === 'long' ? 'long' : 'short';
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
        undefined,
        undefined,
        request.archive_details ?? [],
        fireOf(request),
        undefined,
        request.archive_titles ?? [],
        request.encounter_figure_id,
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
        request.archive_details ?? [],
        fireOf(request),
        undefined,
        request.archive_titles ?? [],
        request.encounter_figure_id,
      );
    },
  };
}

/**
 * A filler whose fill result is an externally produced payload (SPEC §16.2 —
 * the model path). Parsing happens here so `fillManifestSafe` remains the
 * only ingest: garbage throws, and the safe wrapper falls back to tables.
 * The payload's own `fill_status`/`provenance` must already say "model";
 * a table fallback is never stamped model.
 */
export function oneShotFiller(raw: unknown): ManifestFiller {
  return {
    id: 'model/one-shot',
    fill: () => parseManifest(raw),
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
      undefined,
      undefined,
      request.archive_details ?? [],
      fireOf(request),
      undefined,
      request.archive_titles ?? [],
    );
  }
}
