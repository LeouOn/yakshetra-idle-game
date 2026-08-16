// Manifest v1 — a thing, outcome, change, person, or place compiled from residue.
// v1 widens `kind` to `string` and adds `scale` so registry rules may introduce
// higher-scale kinds without bumping the schema. v0 entries migrate via
// `manifest-migration.ts`. Table-fill is deterministic given (window, brief, rng).
// Pure: no Date, no fetch.

import { z } from 'zod';

import type { ManifestFocus } from './focus';
import {
  DEFAULT_KIND_RULES,
  pickKindFromRegistry,
  type CoreManifestKind,
  type KindRule,
} from './kind-registry';
import type { LifeContext } from './life-context';
import { CATALOG } from './manifest-catalog';
import type { Rng } from './rng';
import { residueWindowId, summarizeResidue, type ResidueEvent } from './residue';

export const MANIFEST_SCHEMA_VERSION = 'manifest/v1' as const;
export const MANIFEST_LEGACY_VERSION = 'manifest/v0' as const;
export const SCALE_VALUES = ['person', 'household', 'org', 'town', 'city', 'region'] as const;
export type ManifestScale = (typeof SCALE_VALUES)[number];

export const TABLE_FILL_REVISION = 'table/v0' as const;

export type ManifestKind = CoreManifestKind;
export type ManifestRarity = 'common' | 'uncommon' | 'rare';
export type FillStatus = 'latent' | 'table' | 'model';

export interface ManifestProvenance {
  readonly source: 'table' | 'model';
  readonly revision: string;
}

/** Structured fruit of a develop job. Exportable JSON. */
export interface Manifest {
  readonly schema_version: typeof MANIFEST_SCHEMA_VERSION;
  readonly id: string;
  readonly rng_seed: string;
  readonly brief: string | null;
  readonly residue_window_id: string;
  readonly kind: string;
  readonly scale: ManifestScale;
  readonly name: string;
  readonly one_liner: string;
  readonly subject: string;
  readonly detail: string;
  readonly tags: readonly string[];
  readonly rarity: ManifestRarity;
  readonly fill_status: FillStatus;
  readonly quality_tier: number;
  readonly provenance: ManifestProvenance;
  readonly about_id?: string | undefined;
  readonly about_name?: string | undefined;
}

const RARITY_VALUES = ['common', 'uncommon', 'rare'] as const;
const FILL_VALUES = ['latent', 'table', 'model'] as const;

export const ManifestSchema = z
  .object({
    schema_version: z.literal(MANIFEST_SCHEMA_VERSION),
    id: z.string().min(1),
    rng_seed: z.string().min(1),
    brief: z.string().nullable(),
    residue_window_id: z.string().min(1),
    kind: z.string().min(1),
    scale: z.enum(SCALE_VALUES),
    name: z.string().min(1),
    one_liner: z.string().min(1),
    subject: z.string().min(1),
    detail: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    rarity: z.enum(RARITY_VALUES),
    fill_status: z.enum(FILL_VALUES),
    quality_tier: z.number().int().min(0),
    provenance: z
      .object({
        source: z.enum(['table', 'model']),
        revision: z.string().min(1),
      })
      .strict(),
    about_id: z.string().min(1).optional(),
    about_name: z.string().min(1).optional(),
  })
  .strict();

function pickRarity(count: number, qualityTier: number, rng: Rng): ManifestRarity {
  const roll = rng.next();
  const rareCut = qualityTier >= 1 ? 0.18 : 0.08;
  const uncommonCut = count >= 6 ? 0.42 : 0.22;
  if (roll < rareCut) {
    return 'rare';
  }
  if (roll < rareCut + uncommonCut) {
    return 'uncommon';
  }
  return 'common';
}

function lastSegment(id: string): string {
  const slash = id.lastIndexOf('/');
  const colon = id.lastIndexOf(':');
  const cut = Math.max(slash, colon);
  return cut >= 0 ? id.slice(cut + 1) : id;
}

/**
 * Compile a residue window into a Manifest using authored tables.
 * Same window + brief + rng stream ⇒ same Manifest.
 */
export function tableFillManifest(
  window: readonly ResidueEvent[],
  brief: string | null,
  qualityTier: number,
  rng: Rng,
  rngSeed: string,
  id: string,
  focus: ManifestFocus | null = null,
  lifeContext: LifeContext | null = null,
  scale: ManifestScale = 'person',
  kindRules: readonly KindRule[] = DEFAULT_KIND_RULES,
): Manifest {
  const summary = summarizeResidue(window);
  const kind = pickKindFromRegistry(summary, kindRules);
  const catalog = CATALOG[kind];
  if (catalog === undefined) {
    throw new Error(`tableFillManifest: no table catalog for kind "${kind}"`);
  }
  const entry = rng.pick(catalog);
  const rarity = pickRarity(summary.count, qualityTier, rng);
  const subjectId = summary.ids[0];
  const subject =
    focus !== null
      ? `${entry.subject} — ${focus.name}`
      : subjectId === undefined
        ? entry.subject
        : `${entry.subject} (${lastSegment(subjectId)})`;
  const tags = [...entry.tags];
  if (brief !== null && brief.trim().length > 0) {
    tags.push('briefed');
  }
  if (focus !== null) {
    tags.push('focused', focus.kind);
  }
  if (qualityTier >= 1 && !tags.includes('settled')) {
    tags.push('deepened');
  }
  const briefNote =
    brief !== null && brief.trim().length > 0 ? ` You asked for: ${brief.trim()}.` : '';
  const focusNote = focus !== null ? ` This working is about ${focus.name}.` : '';
  const settingNote =
    lifeContext === null
      ? ''
      : ` It is year ${lifeContext.setting.year} in ${lifeContext.setting.era_id}.`;
  const tieNote =
    lifeContext?.strongest_tie !== null && lifeContext !== null
      ? ` Closest tie: ${lifeContext.strongest_tie}.`
      : '';
  const qualityNote = qualityTier >= 1 ? ' The work went long enough to leave a second mark.' : '';
  const manifest: Manifest = {
    schema_version: MANIFEST_SCHEMA_VERSION,
    id,
    rng_seed: rngSeed,
    brief,
    residue_window_id: residueWindowId(window),
    kind,
    scale,
    name: entry.name,
    one_liner: entry.one_liner,
    subject,
    detail: `${entry.detail}${briefNote}${focusNote}${settingNote}${tieNote}${qualityNote}`,
    tags,
    rarity,
    fill_status: 'table',
    quality_tier: qualityTier,
    provenance: { source: 'table', revision: TABLE_FILL_REVISION },
    ...(focus === null ? {} : { about_id: focus.id, about_name: focus.name }),
  };
  return ManifestSchema.parse(manifest);
}
