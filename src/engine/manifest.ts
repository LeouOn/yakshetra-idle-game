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
import { evaluateLifeActivity } from './activities';
import type { LifeContext } from './life-context';
import { composeCard, eraFamilyOf } from './card-composer';
import { pickCatalogRow, pickRarity, type ManifestRarity } from './manifest-pick';
// Structurally identical to CatalogMap in ./table-catalog (its local
// CatalogEntry has the same shape), so the default slots into the param.
import { CATALOG as DEFAULT_CATALOG } from './manifest-catalog';
import type { Rng } from './rng';
import { residueWindowId, summarizeResidue, type ResidueEvent } from './residue';
import type { CatalogMap } from './table-catalog';

export const MANIFEST_SCHEMA_VERSION = 'manifest/v1' as const;
export const MANIFEST_LEGACY_VERSION = 'manifest/v0' as const;
// Eight tiers since the phase-8 amendment (SPEC §1.1): nation is a
// member-bearing tier; world is the terminal unit tier.
export const SCALE_VALUES = [
  'person',
  'household',
  'org',
  'town',
  'city',
  'region',
  'nation',
  'world',
] as const;
export type ManifestScale = (typeof SCALE_VALUES)[number];

export const TABLE_FILL_REVISION = 'table/v0' as const;

export type ManifestKind = CoreManifestKind;
export type { ManifestRarity };
export type FillStatus = 'latent' | 'table' | 'model';

/** How long the cook ran. A long fire sets a rarity floor (wave 1, lane B). */
export type ManifestFire = 'short' | 'long';

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
  catalog: CatalogMap = DEFAULT_CATALOG,
  archiveDetails: readonly string[] = [],
  fire: ManifestFire = 'short',
  rarityFloor?: ManifestRarity,
  archiveTitles: readonly string[] = [],
  encounterFigureId?: string,
): Manifest {
  const summary = summarizeResidue(window);
  const predictedKind = pickKindFromRegistry(summary, kindRules);
  const entries = catalog[predictedKind];
  if (entries === undefined) {
    throw new Error(`tableFillManifest: no table catalog for kind "${predictedKind}"`);
  }
  // The era decides which ROWS this life may harvest at all, which is a
  // different question from which phrasings a row uses (the composer handles
  // that one). Same source for both, so the two can never disagree.
  const era = eraFamilyOf(lifeContext?.setting.era_id) ?? undefined;
  const row = pickCatalogRow(
    predictedKind,
    entries,
    summary,
    catalog,
    rng,
    archiveTitles,
    era,
    encounterFigureId,
  );
  const kind = row.kind;
  const entry = row.entry;
  const figureAbout = row.about;
  // A long fire is the wave-1 upgrade lane's lever: it buys a rarity floor,
  // and rarity buys text (gated templates and a rare flourish).
  const floor = rarityFloor ?? (fire === 'long' ? 'uncommon' : undefined);
  const rarity = pickRarity(summary.count, qualityTier, rng, floor);
  // The subject is player-facing prose. Residue ids used to be appended here as
  // a "(tea)" / "(knot)" parenthetical; a raw id segment is not a word, so the
  // suffix is gone. A card that is about a figure already says so in its name
  // and one-liner, and a focused card names the pin. Nothing internal leaks.
  const subject = focus !== null ? `${entry.subject} — ${focus.name}` : entry.subject;
  const card = composeCard(entry, {
    summary,
    lifeContext,
    focus,
    brief,
    rarity,
    qualityTier,
    fire,
    usedDetails: archiveDetails,
    usedTitles: archiveTitles,
    rng,
  });
  const tags = [...entry.tags, ...card.tags];
  if (brief !== null && brief.trim().length > 0) {
    tags.push('briefed');
  }
  if (focus !== null) {
    tags.push('focused', focus.kind);
  }
  if (qualityTier >= 1 && !tags.includes('settled')) {
    tags.push('deepened');
  }
  const activityEval = evaluateLifeActivity(lifeContext?.activity);
  if (activityEval.tag !== null) {
    tags.push(activityEval.tag);
  }
  const manifest: Manifest = {
    schema_version: MANIFEST_SCHEMA_VERSION,
    id,
    rng_seed: rngSeed,
    brief,
    residue_window_id: residueWindowId(window),
    kind,
    scale,
    name: card.name,
    one_liner: card.one_liner,
    subject,
    detail: card.detail,
    tags,
    rarity,
    fill_status: 'table',
    quality_tier: qualityTier,
    provenance: { source: 'table', revision: TABLE_FILL_REVISION },
    ...(focus !== null
      ? { about_id: focus.id, about_name: focus.name }
      : figureAbout !== null
        ? { about_id: figureAbout.id, about_name: figureAbout.name }
        : {}),
  };
  return ManifestSchema.parse(manifest);
}
